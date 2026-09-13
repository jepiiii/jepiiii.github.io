'use strict';

(function () {
  const cfg = window.ECE_SUPABASE_CONFIG || {};
  const PLACEHOLDER = /YOUR-|YOUR_|example/i;
  const configured = Boolean(
    cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY &&
    !PLACEHOLDER.test(cfg.SUPABASE_URL) && !PLACEHOLDER.test(cfg.SUPABASE_ANON_KEY)
  );

  let client = null;
  let currentUser = null;
  let currentProfile = null;
  let authSubscription = null;
  let searchTimer = null;
  let lastSearchResults = [];

  function q(selector) { return document.querySelector(selector); }
  function qa(selector) { return [...document.querySelectorAll(selector)]; }
  function toast(message) {
    if (window.ECEApp?.notify) window.ECEApp.notify(message);
    else console.info(message);
  }
  function text(el, value) { if (el) el.textContent = value == null ? '' : String(value); }
  function setHidden(el, hidden) { if (el) el.classList.toggle('hidden', Boolean(hidden)); }
  function cloudReady() { return configured && Boolean(window.supabase?.createClient); }
  function requireCloud() {
    if (!cloudReady()) throw new Error('Cloud features are not configured yet. See SETUP.md.');
    if (!client) throw new Error('Cloud client is not initialized.');
    return client;
  }
  function requireUser() {
    if (!currentUser) throw new Error('Sign in to use this feature.');
    return currentUser;
  }
  function cleanString(value, max) {
    return String(value ?? '').trim().slice(0, max);
  }

  async function loadProfile() {
    if (!client || !currentUser) { currentProfile = null; return null; }
    const { data, error } = await client.from('profiles').select('id,username,created_at').eq('id', currentUser.id).maybeSingle();
    if (error) throw error;
    currentProfile = data || null;
    return currentProfile;
  }

  async function refreshAuthState() {
    if (!client) return;
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    currentUser = data.session?.user || null;
    await loadProfile();
    renderAccountState();
    if (currentUser) await renderMyUploads();
  }

  async function signUp(email, password, username) {
    const c = requireCloud();
    email = cleanString(email, 320);
    username = cleanString(username, 32);
    if (!email || !password || username.length < 3) throw new Error('Enter a valid email, password, and username of at least 3 characters.');
    const { data, error } = await c.auth.signUp({
      email,
      password,
      options: { data: { username } }
    });
    if (error) throw error;
    return data;
  }

  async function signIn(email, password) {
    const c = requireCloud();
    const { data, error } = await c.auth.signInWithPassword({ email: cleanString(email, 320), password });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    const c = requireCloud();
    const { error } = await c.auth.signOut();
    if (error) throw error;
  }

  async function updateUsername(username) {
    const c = requireCloud();
    const user = requireUser();
    username = cleanString(username, 32);
    if (username.length < 3 || !/^[A-Za-z0-9_][A-Za-z0-9_.-]*$/.test(username)) {
      throw new Error('Username must be 3–32 characters using letters, numbers, underscore, dot, or hyphen.');
    }
    const { data, error } = await c.from('profiles').update({ username }).eq('id', user.id).select('id,username').single();
    if (error) throw error;
    currentProfile = data;
    renderAccountState();
    return data;
  }

  async function searchBanks(query = '') {
    const c = requireCloud();
    const { data, error } = await c.rpc('search_public_banks', { search_term: cleanString(query, 160), limit_count: 60 });
    if (error) throw error;
    lastSearchResults = Array.isArray(data) ? data : [];
    return lastSearchResults;
  }

  async function getBankDetails(bankId) {
    const c = requireCloud();
    const { data: bank, error: bankError } = await c
      .from('banks')
      .select('id,name,subject,description,owner_id,visibility,created_at,updated_at')
      .eq('id', bankId)
      .single();
    if (bankError) throw bankError;
    const { data: owner, error: ownerError } = await c.from('profiles').select('username').eq('id', bank.owner_id).single();
    if (ownerError) throw ownerError;
    const { data: entries, error: entriesError } = await c.from('bank_entries').select('term,definition,position').eq('bank_id', bankId).order('position', { ascending: true });
    if (entriesError) throw entriesError;
    return { ...bank, uploader_username: owner.username, entries: entries || [] };
  }

  async function publishBank(localBank, metadata = {}) {
    const c = requireCloud();
    const user = requireUser();
    if (!localBank?.name || !Array.isArray(localBank.entries) || !localBank.entries.length) throw new Error('Choose a non-empty local bank first.');
    const payload = {
      owner_id: user.id,
      name: cleanString(metadata.name || localBank.name, 120),
      subject: cleanString(metadata.subject, 120),
      description: cleanString(metadata.description, 1000),
      visibility: metadata.visibility === 'private' ? 'private' : 'public'
    };
    const { data: bank, error: bankError } = await c.from('banks').insert(payload).select('id,name,subject,description,visibility').single();
    if (bankError) throw bankError;
    const entries = localBank.entries.map((entry, position) => ({
      bank_id: bank.id,
      position,
      term: String(entry.term ?? '').trim(),
      definition: String(entry.definition ?? '').trim()
    })).filter(entry => entry.term && entry.definition);
    const { error: entriesError } = await c.from('bank_entries').insert(entries);
    if (entriesError) {
      await c.from('banks').delete().eq('id', bank.id);
      throw entriesError;
    }
    return bank;
  }

  async function updatePublishedBank(bankId, localBank, metadata = {}) {
    const c = requireCloud();
    requireUser();
    if (!localBank?.entries?.length) throw new Error('The local bank has no definitions.');
    const patch = {
      name: cleanString(metadata.name || localBank.name, 120),
      subject: cleanString(metadata.subject, 120),
      description: cleanString(metadata.description, 1000),
      visibility: metadata.visibility === 'private' ? 'private' : 'public'
    };
    const { error: bankError } = await c.from('banks').update(patch).eq('id', bankId);
    if (bankError) throw bankError;
    const { error: deleteError } = await c.from('bank_entries').delete().eq('bank_id', bankId);
    if (deleteError) throw deleteError;
    const rows = localBank.entries.map((entry, position) => ({ bank_id: bankId, position, term: String(entry.term).trim(), definition: String(entry.definition).trim() }));
    const { error: insertError } = await c.from('bank_entries').insert(rows);
    if (insertError) throw insertError;
    return true;
  }

  async function getMyUploads() {
    const c = requireCloud();
    const user = requireUser();
    const { data, error } = await c.from('banks').select('id,name,subject,description,visibility,created_at,updated_at').eq('owner_id', user.id).order('updated_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async function deletePublishedBank(bankId) {
    const c = requireCloud();
    requireUser();
    const { error } = await c.from('banks').delete().eq('id', bankId);
    if (error) throw error;
    return true;
  }

  async function saveCommunityBankLocally(bankId) {
    const details = await getBankDetails(bankId);
    if (!window.ECEApp?.addLocalBank) throw new Error('Local bank integration is unavailable.');
    const created = window.ECEApp.addLocalBank({
      name: details.name,
      entries: details.entries.map(({ term, definition }) => ({ term, definition })),
      community: { bankId: details.id, uploader: details.uploader_username, subject: details.subject }
    });
    return { details, created };
  }

  function renderCloudStatus() {
    const status = q('#cloudSetupStatus');
    if (!status) return;
    if (cloudReady()) {
      status.className = 'cloud-status ready';
      status.textContent = 'cloud connected';
    } else {
      status.className = 'cloud-status';
      status.textContent = 'cloud setup required — see SETUP.md';
    }
  }

  function renderAccountState() {
    renderCloudStatus();
    const signedOut = q('#signedOutAccount');
    const signedIn = q('#signedInAccount');
    setHidden(signedOut, Boolean(currentUser));
    setHidden(signedIn, !currentUser);
    text(q('#accountEmail'), currentUser?.email || '');
    const usernameInput = q('#profileUsername');
    if (usernameInput) usernameInput.value = currentProfile?.username || '';
    const accountButton = q('#accountBtn');
    if (accountButton) accountButton.textContent = currentProfile?.username ? `@${currentProfile.username}` : (currentUser ? 'account' : 'sign in');
  }

  function resultCard(item) {
    const card = document.createElement('article');
    card.className = 'community-card';
    const top = document.createElement('div');
    top.className = 'community-card-top';
    const titleWrap = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = item.name;
    const meta = document.createElement('div');
    meta.className = 'community-meta';
    meta.textContent = `${item.subject || 'Uncategorized'} • ${item.entry_count} definitions • uploaded by @${item.uploader_username}`;
    titleWrap.append(title, meta);
    const add = document.createElement('button');
    add.className = 'primary small-primary';
    add.textContent = 'add bank';
    add.addEventListener('click', async () => {
      add.disabled = true;
      try {
        const { created } = await saveCommunityBankLocally(item.id);
        toast(`Added "${created.name}" to your local banks.`);
      } catch (error) { toast(error.message); }
      finally { add.disabled = false; }
    });
    top.append(titleWrap, add);
    card.append(top);
    if (item.description) {
      const desc = document.createElement('p');
      desc.className = 'community-description';
      desc.textContent = item.description;
      card.append(desc);
    }
    return card;
  }

  async function renderSearchResults(query = '') {
    const results = q('#communityResults');
    if (!results) return;
    if (!cloudReady()) {
      results.innerHTML = '<div class="empty-state">Connect Supabase first to browse community banks.</div>';
      return;
    }
    results.innerHTML = '<div class="empty-state">searching…</div>';
    try {
      const rows = await searchBanks(query);
      results.innerHTML = '';
      if (!rows.length) {
        results.innerHTML = '<div class="empty-state">No public banks matched your search.</div>';
        return;
      }
      rows.forEach(row => results.append(resultCard(row)));
    } catch (error) {
      results.innerHTML = `<div class="empty-state">${String(error.message || error)}</div>`;
    }
  }

  function myUploadCard(item) {
    const row = document.createElement('div');
    row.className = 'upload-row';
    const info = document.createElement('div');
    const name = document.createElement('strong');
    name.textContent = item.name;
    const meta = document.createElement('div');
    meta.className = 'community-meta';
    meta.textContent = `${item.subject || 'Uncategorized'} • ${item.visibility}`;
    info.append(name, meta);
    const del = document.createElement('button');
    del.className = 'secondary danger';
    del.textContent = 'delete';
    del.addEventListener('click', async () => {
      if (!confirm(`Delete published bank "${item.name}"?`)) return;
      try { await deletePublishedBank(item.id); await renderMyUploads(); await renderSearchResults(q('#communitySearch')?.value || ''); toast('Published bank deleted.'); }
      catch (error) { toast(error.message); }
    });
    row.append(info, del);
    return row;
  }

  async function renderMyUploads() {
    const host = q('#myUploads');
    if (!host) return;
    if (!currentUser) { host.innerHTML = '<div class="empty-state">Sign in to see your uploads.</div>'; return; }
    try {
      const rows = await getMyUploads();
      host.innerHTML = '';
      if (!rows.length) { host.innerHTML = '<div class="empty-state">You have not published any banks yet.</div>'; return; }
      rows.forEach(row => host.append(myUploadCard(row)));
    } catch (error) { host.innerHTML = `<div class="empty-state">${String(error.message || error)}</div>`; }
  }

  async function publishActiveLocalBank() {
    if (!currentUser) {
      toast('Sign in before publishing a bank.');
      window.ECEApp?.openDrawer?.('#accountDrawer');
      return;
    }
    const bank = window.ECEApp?.getActiveBank?.();
    if (!bank) { toast('Choose a local bank in Bank Manager first.'); return; }
    const subject = q('#cloudPublishSubject')?.value || '';
    const description = q('#cloudPublishDescription')?.value || '';
    const visibility = q('#cloudPublishVisibility')?.value || 'public';
    const button = q('#publishCloudBtn');
    if (button) button.disabled = true;
    try {
      const published = await publishBank(bank, { subject, description, visibility });
      toast(`Published "${published.name}".`);
      await renderMyUploads();
      await renderSearchResults(q('#communitySearch')?.value || '');
    } catch (error) { toast(error.message); }
    finally { if (button) button.disabled = false; }
  }

  function bindUI() {
    q('#communityBtn')?.addEventListener('click', () => { window.ECEApp?.openDrawer?.('#communityDrawer'); renderSearchResults(q('#communitySearch')?.value || ''); });
    q('#accountBtn')?.addEventListener('click', () => { window.ECEApp?.openDrawer?.('#accountDrawer'); renderAccountState(); if (currentUser) renderMyUploads(); });
    q('#communitySearch')?.addEventListener('input', event => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => renderSearchResults(event.target.value), 220);
    });
    q('#loginBtn')?.addEventListener('click', async () => {
      try { await signIn(q('#authEmail').value, q('#authPassword').value); toast('Signed in.'); }
      catch (error) { toast(error.message); }
    });
    q('#signupBtn')?.addEventListener('click', async () => {
      try {
        const data = await signUp(q('#authEmail').value, q('#authPassword').value, q('#authUsername').value);
        toast(data.session ? 'Account created and signed in.' : 'Account created. Check your email to confirm it.');
      } catch (error) { toast(error.message); }
    });
    q('#logoutBtn')?.addEventListener('click', async () => { try { await signOut(); toast('Signed out.'); } catch (error) { toast(error.message); } });
    q('#saveUsernameBtn')?.addEventListener('click', async () => { try { await updateUsername(q('#profileUsername').value); toast('Username updated.'); } catch (error) { toast(error.message); } });
    q('#publishCloudBtn')?.addEventListener('click', publishActiveLocalBank);
    q('#refreshUploadsBtn')?.addEventListener('click', renderMyUploads);
    qa('[data-open-community]').forEach(el => el.addEventListener('click', () => { window.ECEApp?.openDrawer?.('#communityDrawer'); renderSearchResults(''); }));
    qa('[data-open-account]').forEach(el => el.addEventListener('click', () => { window.ECEApp?.openDrawer?.('#accountDrawer'); renderAccountState(); if (currentUser) renderMyUploads(); }));
  }

  async function init() {
    bindUI();
    renderCloudStatus();
    if (!cloudReady()) {
      renderAccountState();
      renderSearchResults('');
      return false;
    }
    client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    await refreshAuthState();
    const { data } = client.auth.onAuthStateChange(async (_event, session) => {
      currentUser = session?.user || null;
      try { await loadProfile(); } catch (error) { console.error(error); }
      renderAccountState();
      await renderMyUploads();
    });
    authSubscription = data?.subscription || null;
    await renderSearchResults('');
    return true;
  }

  window.ECECloud = {
    init,
    signUp,
    signIn,
    signOut,
    updateUsername,
    searchBanks,
    getBankDetails,
    publishBank,
    updatePublishedBank,
    getMyUploads,
    deletePublishedBank,
    saveCommunityBankLocally,
    isConfigured: () => cloudReady(),
    getCurrentUser: () => currentUser,
    getCurrentProfile: () => currentProfile,
    destroy: () => authSubscription?.unsubscribe?.()
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init().catch(console.error));
  else init().catch(console.error);
})();

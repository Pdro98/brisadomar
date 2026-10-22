const STORAGE_KEY = 'brisa-atlantico-trips';
const SETTINGS_KEY = 'brisa-atlantico-settings';
const supabaseConfig = window.BRISA_SUPABASE_CONFIG || {};
const supabaseClient = supabaseConfig.url && supabaseConfig.anonKey && window.supabase
  ? window.supabase.createClient(supabaseConfig.url, supabaseConfig.anonKey)
  : null;

const teamMembers = [
  { name: 'Kaylla', image: 'imagens/WhatsApp Image 2026-10-21 at 22.27.52.jpeg' },
  { name: 'Gabrielly', image: 'imagens/WhatsApp Image 2026-10-21 at 22.27.53.jpeg' },
  { name: 'Ana Bassani', image: 'imagens/WhatsApp Image 2026-10-21 at 22.27.54.jpeg' },
  { name: 'Marjury', image: 'imagens/WhatsApp Image 2026-10-21 at 22.27.56.jpeg' },
  { name: 'Natália', image: 'imagens/eeeee.jpeg' }
];

const starterTrips = [
  {
    id: 'maragogi',
    title: 'Maragogi, Alagoas',
    description: 'Piscinas naturais, mar transparente e dias que passam sem pressa.',
    price: 1890,
    image: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1100&q=82',
    tag: 'Mar cristalino'
  },
  {
    id: 'fernando-de-noronha',
    title: 'Fernando de Noronha',
    description: 'Praias preservadas e paisagens que merecem todo o seu tempo.',
    price: 3240,
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1100&q=82',
    tag: 'Natureza sem igual'
  },
  {
    id: 'jeri',
    title: 'Jericoacoara, Ceará',
    description: 'Dunas douradas, lagoas tranquilas e um pôr do sol inesquecível.',
    price: 2160,
    image: 'https://images.unsplash.com/photo-1473116763249-2faaef81ccda?auto=format&fit=crop&w=1100&q=82',
    tag: 'Ritmo leve'
  }
];

const tripGrid = document.querySelector('#trip-grid');
const emptyState = document.querySelector('#empty-state');
const adminDialog = document.querySelector('#admin-dialog');
const loginForm = document.querySelector('#login-form');
const adminPanel = document.querySelector('#admin-panel');
const settingsForm = document.querySelector('#settings-form');
const teamPhoto = document.querySelector('#team-photo');
const teamName = document.querySelector('#team-name');
const teamCounter = document.querySelector('#team-counter');
let activeTeamMember = 0;
let tripsCache = null;
let settingsCache = readStorage(SETTINGS_KEY, {});

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function saveStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getTrips() {
  if (tripsCache) return tripsCache;
  const trips = readStorage(STORAGE_KEY, null);
  return Array.isArray(trips) ? trips : starterTrips;
}

function fromSupabaseTrip(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    price: Number(row.price),
    image: row.image_url,
    tag: row.tag
  };
}

function toSupabaseTrip(trip) {
  return {
    title: trip.title,
    description: trip.description,
    price: trip.price,
    image_url: trip.image,
    tag: trip.tag
  };
}

function showTripLoadError(message) {
  const error = document.querySelector('#trip-load-error');
  error.textContent = message;
  error.hidden = !message;
}

async function refreshTrips() {
  if (!supabaseClient) {
    tripsCache = null;
    renderTrips();
    return;
  }

  const { data, error } = await supabaseClient
    .from('trips')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) {
    showTripLoadError('Não foi possível carregar as viagens compartilhadas. Verifique a configuração do Supabase e tente novamente.');
    console.error('Falha ao carregar destinos do Supabase:', error.message);
    return;
  }

  tripsCache = data.map(fromSupabaseTrip);
  showTripLoadError('');
  renderTrips();
  if (!adminPanel.hidden) renderAdminTrips();
}

async function refreshSettings() {
  if (!supabaseClient) return settingsCache;
  const { data, error } = await supabaseClient
    .from('site_settings')
    .select('whatsapp')
    .eq('id', 'main')
    .maybeSingle();
  if (error) {
    console.error('Falha ao carregar configurações do Supabase:', error.message);
    throw new Error('Não foi possível carregar as configurações do site.');
  }
  settingsCache = { whatsapp: data?.whatsapp || '' };
  return settingsCache;
}

function formatPrice(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
}

function safeImageSource(value) {
  if (typeof value !== 'string') return '';
  if (/^data:image\/(?:jpeg|png|webp);base64,/i.test(value)) return value;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function renderTrips() {
  const trips = getTrips();
  tripGrid.replaceChildren();
  emptyState.hidden = trips.length > 0;

  trips.forEach((trip, index) => {
    const card = makeElement('article', 'trip-card');
    card.style.animationDelay = `${index * 90}ms`;

    const imageWrap = makeElement('div', 'trip-image-wrap');
    const image = makeElement('img', 'trip-image');
    image.src = safeImageSource(trip.image);
    image.alt = `Paisagem de ${trip.title}`;
    image.loading = 'lazy';
    image.addEventListener('error', () => {
      image.hidden = true;
      imageWrap.append(makeElement('p', 'trip-image-error', 'Imagem indisponível. Verifique o link cadastrado.'));
    }, { once: true });
    imageWrap.append(image);

    if (trip.tag) imageWrap.append(makeElement('span', 'trip-tag', trip.tag));

    const content = makeElement('div', 'trip-content');
    content.append(makeElement('h3', '', trip.title));
    content.append(makeElement('p', 'trip-description', trip.description));

    const bottom = makeElement('div', 'trip-bottom');
    const priceBlock = makeElement('div', 'trip-price-block');
    priceBlock.append(makeElement('span', 'trip-price-label', 'a partir de'));
    priceBlock.append(makeElement('span', 'trip-price', formatPrice(trip.price)));
    const reserveButton = makeElement('button', 'reserve-button', 'Reservar via WhatsApp');
    reserveButton.type = 'button';
    reserveButton.addEventListener('click', () => reserveTrip(trip));
    bottom.append(priceBlock, reserveButton);
    content.append(bottom);
    card.append(imageWrap, content);
    tripGrid.append(card);
  });
}

function renderAdminTrips() {
  const list = document.querySelector('#admin-trip-list');
  list.replaceChildren();

  getTrips().forEach((trip) => {
    const item = makeElement('article', 'admin-trip-item');
    const details = makeElement('div', 'admin-trip-details');
    details.append(makeElement('strong', '', trip.title));
    details.append(makeElement('span', '', formatPrice(trip.price)));

    const actions = makeElement('div', 'admin-trip-actions');
    const editButton = makeElement('button', 'text-button', 'Editar');
    editButton.type = 'button';
    editButton.addEventListener('click', () => beginTripEdit(trip));
    const deleteButton = makeElement('button', 'text-button admin-delete-button', 'Excluir');
    deleteButton.type = 'button';
    deleteButton.addEventListener('click', () => deleteTrip(trip.id));
    actions.append(editButton, deleteButton);
    item.append(details, actions);
    list.append(item);
  });
}

function beginTripEdit(trip) {
  const form = document.querySelector('#trip-form');
  form.elements.tripId.value = trip.id;
  form.elements.title.value = trip.title;
  form.elements.description.value = trip.description;
  form.elements.price.value = trip.price;
  form.elements.image.value = safeImageSource(trip.image).startsWith('data:') ? '' : safeImageSource(trip.image);
  form.elements.imageFile.value = '';
  document.querySelector('#trip-form h3').textContent = 'Editar destino';
  document.querySelector('#trip-submit').innerHTML = 'Salvar alterações <span aria-hidden="true">✓</span>';
  document.querySelector('#cancel-trip-edit').hidden = false;
  document.querySelector('#trip-form-error').hidden = true;
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetTripForm() {
  const form = document.querySelector('#trip-form');
  form.reset();
  form.elements.tripId.value = '';
  document.querySelector('#trip-form h3').textContent = 'Adicionar destino';
  document.querySelector('#trip-submit').innerHTML = 'Publicar destino <span aria-hidden="true">+</span>';
  document.querySelector('#cancel-trip-edit').hidden = true;
  document.querySelector('#trip-form-error').hidden = true;
}

async function deleteTrip(tripId) {
  const trip = getTrips().find((item) => item.id === tripId);
  if (!trip || !window.confirm(`Excluir o destino "${trip.title}"?`)) return;

  const errorMessage = document.querySelector('#admin-trips-error');
  errorMessage.hidden = true;
  if (supabaseClient) {
    const { error } = await supabaseClient.from('trips').delete().eq('id', tripId);
    if (error) {
      errorMessage.textContent = 'Não foi possível excluir o destino. Verifique se sua conta tem permissão de administrador.';
      errorMessage.hidden = false;
      console.error('Falha ao excluir destino no Supabase:', error.message);
      return;
    }
    tripsCache = tripsCache.filter((item) => item.id !== tripId);
  } else {
    const remainingTrips = getTrips().filter((item) => item.id !== tripId);
    try {
      saveStorage(STORAGE_KEY, remainingTrips);
    } catch {
      errorMessage.textContent = 'Não foi possível salvar a alteração no navegador.';
      errorMessage.hidden = false;
      return;
    }
  }

  if (document.querySelector('#trip-form').elements.tripId.value === tripId) resetTripForm();
  renderTrips();
  renderAdminTrips();
}

function imageFileToBlob(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Selecione um arquivo de imagem válido.'));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      reject(new Error('A imagem deve ter no máximo 10 MB.'));
      return;
    }

    const reader = new FileReader();
    reader.addEventListener('load', () => {
      const source = new Image();
      source.addEventListener('load', () => {
        const maxDimension = 1600;
        const scale = Math.min(1, maxDimension / Math.max(source.width, source.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(source.width * scale);
        canvas.height = Math.round(source.height * scale);
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('Não foi possível processar a imagem neste navegador.'));
          return;
        }
        context.drawImage(source, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Não foi possível processar a imagem neste navegador.'));
        }, 'image/jpeg', 0.82);
      }, { once: true });
      source.addEventListener('error', () => reject(new Error('Não foi possível abrir o arquivo de imagem.')), { once: true });
      source.src = reader.result;
    }, { once: true });
    reader.addEventListener('error', () => reject(new Error('Não foi possível ler o arquivo selecionado.')), { once: true });
    reader.readAsDataURL(file);
  });
}

async function uploadImageBlob(blob) {
  const path = `${crypto.randomUUID()}.jpg`;
  const { error } = await supabaseClient.storage
    .from('trip-images')
    .upload(path, blob, { contentType: 'image/jpeg', upsert: false });
  if (error) throw new Error('Não foi possível enviar a imagem ao Supabase. Verifique o bucket e as permissões.');
  return supabaseClient.storage.from('trip-images').getPublicUrl(path).data.publicUrl;
}

async function saveImage(file) {
  const blob = await imageFileToBlob(file);
  if (!supabaseClient) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener('load', () => resolve(reader.result), { once: true });
      reader.addEventListener('error', () => reject(new Error('Não foi possível ler a imagem processada.')), { once: true });
      reader.readAsDataURL(blob);
    });
  }

  return uploadImageBlob(blob);
}

async function migrateLocalTrips() {
  if (!supabaseClient) return;
  const migrationKey = `${STORAGE_KEY}-migrated-${supabaseConfig.url}`;
  if (localStorage.getItem(migrationKey)) return;

  const localTrips = readStorage(STORAGE_KEY, []);
  const customTrips = Array.isArray(localTrips)
    ? localTrips.filter((trip) => typeof trip.id === 'string' && trip.id.startsWith('destino-'))
    : [];
  if (!customTrips.length) return;
  if (!window.confirm(`Encontramos ${customTrips.length} viagem(ns) salvas somente neste dispositivo. Deseja importá-las para que apareçam em todos os aparelhos?`)) return;

  const migrationError = document.querySelector('#trip-form-error');
  const imported = [];
  try {
    for (const trip of customTrips) {
      const { data: existing, error: lookupError } = await supabaseClient
        .from('trips')
        .select('id')
        .eq('legacy_id', trip.id)
        .maybeSingle();
      if (lookupError) throw lookupError;
      if (existing) continue;

      let image = trip.image;
      if (typeof image === 'string' && image.startsWith('data:image/')) {
        const imageBlob = await fetch(image).then((response) => response.blob());
        image = await uploadImageBlob(imageBlob);
      }
      const { error } = await supabaseClient.from('trips').insert({
        legacy_id: trip.id,
        ...toSupabaseTrip({ ...trip, image })
      });
      if (error) throw error;
      imported.push(trip.title);
    }
    localStorage.setItem(migrationKey, 'true');
    await refreshTrips();
    if (imported.length) {
      migrationError.textContent = `${imported.length} viagem(ns) deste dispositivo foram importadas para o site.`;
      migrationError.hidden = false;
    }
  } catch (error) {
    migrationError.textContent = 'Não foi possível importar todas as viagens locais. Confira as configurações e tente novamente.';
    migrationError.hidden = false;
    console.error('Falha ao migrar viagens locais:', error.message);
  }
}

function verifyImageUrl(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(url), { once: true });
    image.addEventListener('error', () => reject(new Error('Não foi possível carregar a imagem pelo link. Confira se o endereço é público e aponta diretamente para uma imagem.')), { once: true });
    image.src = url;
  });
}

function showTeamMember(index) {
  activeTeamMember = (index + teamMembers.length) % teamMembers.length;
  const member = teamMembers[activeTeamMember];
  teamPhoto.classList.remove('team-photo-enter');
  void teamPhoto.offsetWidth;
  teamPhoto.src = member.image;
  teamPhoto.alt = `${member.name}, integrante da equipe`;
  teamName.textContent = member.name;
  teamPhoto.classList.add('team-photo-enter');
  teamCounter.firstChild.textContent = `${String(activeTeamMember + 1).padStart(2, '0')} `;
}

document.querySelector('#team-previous').addEventListener('click', () => {
  showTeamMember(activeTeamMember - 1);
});

document.querySelector('#team-next').addEventListener('click', () => {
  showTeamMember(activeTeamMember + 1);
});

async function reserveTrip(trip) {
  if (supabaseClient) {
    try {
      await refreshSettings();
    } catch (error) {
      window.alert(error.message);
      return;
    }
  }

  const phone = (settingsCache.whatsapp || '').replace(/\D/g, '');
  if (!phone) {
    window.alert('O contato de WhatsApp ainda não foi configurado.');
    return;
  }

  const message = `Olá! Vim pelo site Brisa do Mar Atlântico e gostaria de reservar a viagem ${trip.title}. Pode me passar mais informações?`;
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  window.location.assign(url);
}

function setAdminView(isLoggedIn) {
  loginForm.hidden = isLoggedIn;
  adminPanel.hidden = !isLoggedIn;
  if (isLoggedIn) {
    refreshSettings().then((settings) => {
      settingsForm.elements.whatsapp.value = settings.whatsapp || '';
    }).catch((error) => {
      const saved = document.querySelector('#settings-saved');
      saved.textContent = error.message;
      saved.hidden = false;
    });
    renderAdminTrips();
  }
}

async function checkAdminSession() {
  if (!supabaseClient) return false;
  const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
  if (sessionError || !session) return false;
  const { data, error } = await supabaseClient.rpc('is_site_admin');
  if (error) {
    console.error('Falha ao verificar permissões de administrador:', error.message);
    return false;
  }
  return data === true;
}

document.querySelector('#open-admin').addEventListener('click', async () => {
  setAdminView(false);
  document.querySelector('#login-error').hidden = true;
  if (await checkAdminSession()) {
    setAdminView(true);
    await refreshTrips();
  }
  adminDialog.showModal();
});

document.querySelector('#close-admin').addEventListener('click', () => adminDialog.close());
adminDialog.addEventListener('click', (event) => {
  if (event.target === adminDialog) adminDialog.close();
});

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const errorMessage = document.querySelector('#login-error');
  errorMessage.hidden = true;
  if (!supabaseClient) {
    errorMessage.textContent = 'O Supabase ainda não está configurado. Preencha a URL e a chave pública em supabase-config.js.';
    errorMessage.hidden = false;
    return;
  }

  const formData = new FormData(loginForm);
  const { error } = await supabaseClient.auth.signInWithPassword({
    email: formData.get('email'),
    password: formData.get('password')
  });
  if (error) {
    errorMessage.textContent = 'E-mail ou senha incorretos.';
    errorMessage.hidden = false;
    return;
  }
  if (!await checkAdminSession()) {
    await supabaseClient.auth.signOut();
    errorMessage.textContent = 'Esta conta não tem permissão de administrador.';
    errorMessage.hidden = false;
    return;
  }

  loginForm.reset();
  setAdminView(true);
  await migrateLocalTrips();
  await refreshTrips();
});

document.querySelector('#logout-admin').addEventListener('click', () => {
  if (supabaseClient) supabaseClient.auth.signOut();
  setAdminView(false);
});

document.querySelector('#cancel-trip-edit').addEventListener('click', resetTripForm);

document.querySelector('#trip-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const errorMessage = document.querySelector('#trip-form-error');
  const imageFile = formData.get('imageFile');
  const imageUrl = formData.get('image').trim();
  const editingId = formData.get('tripId');
  const trips = getTrips();
  const existingTrip = editingId ? trips.find((trip) => trip.id === editingId) : null;
  errorMessage.hidden = true;
  errorMessage.textContent = '';

  if (!imageFile.size && !imageUrl && !existingTrip) {
    errorMessage.textContent = 'Adicione um link ou escolha um arquivo de imagem.';
    errorMessage.hidden = false;
    return;
  }

  let image = existingTrip ? existingTrip.image : '';
  try {
    if (imageFile.size) image = await saveImage(imageFile);
    else if (imageUrl) image = await verifyImageUrl(safeImageSource(imageUrl));
  } catch (error) {
    errorMessage.textContent = error.message;
    errorMessage.hidden = false;
    return;
  }

  const updatedTrip = {
    ...(editingId ? { id: editingId } : {}),
    title: formData.get('title').trim(),
    description: formData.get('description').trim(),
    price: Number(formData.get('price')),
    image,
    tag: existingTrip?.tag || 'Novo destino'
  };
  if (supabaseClient) {
    const query = existingTrip
      ? supabaseClient.from('trips').update(toSupabaseTrip(updatedTrip)).eq('id', editingId)
      : supabaseClient.from('trips').insert(toSupabaseTrip(updatedTrip));
    const { data, error } = await query.select('*').single();
    if (error) {
      errorMessage.textContent = 'Não foi possível salvar o destino. Confira a conexão e as permissões da conta.';
      errorMessage.hidden = false;
      console.error('Falha ao salvar destino no Supabase:', error.message);
      return;
    }
    if (existingTrip) {
      tripsCache = trips.map((trip) => trip.id === editingId ? fromSupabaseTrip(data) : trip);
    } else {
      tripsCache = [fromSupabaseTrip(data), ...trips];
    }
  } else {
    if (existingTrip) {
      const index = trips.findIndex((trip) => trip.id === editingId);
      trips[index] = updatedTrip;
    } else {
      updatedTrip.id = `destino-${Date.now()}`;
      trips.unshift(updatedTrip);
    }
    try {
      saveStorage(STORAGE_KEY, trips);
    } catch {
      errorMessage.textContent = 'O armazenamento do navegador está cheio. Remova alguns destinos ou use uma imagem menor.';
      errorMessage.hidden = false;
      return;
    }
  }
  renderTrips();
  renderAdminTrips();
  resetTripForm();
  adminDialog.close();
  document.querySelector('#viagens').scrollIntoView({ behavior: 'smooth' });
});

settingsForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const phone = new FormData(settingsForm).get('whatsapp').replace(/\D/g, '');
  const saved = document.querySelector('#settings-saved');
  if (supabaseClient) {
    const { error } = await supabaseClient
      .from('site_settings')
      .upsert({ id: 'main', whatsapp: phone });
    if (error) {
      saved.textContent = 'Não foi possível salvar o contato no Supabase.';
      saved.hidden = false;
      console.error('Falha ao salvar configurações no Supabase:', error.message);
      return;
    }
  } else {
    saveStorage(SETTINGS_KEY, { whatsapp: phone });
  }
  settingsCache = { whatsapp: phone };
  saved.textContent = 'Contato atualizado.';
  saved.hidden = false;
  window.setTimeout(() => { saved.hidden = true; }, 2600);
});

document.querySelector('#current-year').textContent = new Date().getFullYear();
if (!supabaseClient) {
  document.querySelector('#storage-note').textContent = 'Modo local: configure o Supabase para compartilhar viagens entre dispositivos.';
}
renderTrips();
refreshTrips();
refreshSettings().catch((error) => console.error(error.message));

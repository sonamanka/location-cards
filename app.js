const SUPABASE_URL = 'https://zohvnrjtbcbsimrvoxlr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_LqLRZ8EcyoyIZRdlhYW6NA_y9PBQ-5D';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── State ──────────────────────────────────────────
let editingId = null;
let deletingId = null;

// ── DOM refs ───────────────────────────────────────
const cardsContainer  = document.getElementById('cardsContainer');
const loadingMsg      = document.getElementById('loadingMsg');
const modal           = document.getElementById('modal');
const modalTitle      = document.getElementById('modalTitle');
const fieldName       = document.getElementById('fieldName');
const fieldDesc       = document.getElementById('fieldDescription');
const fieldAddress    = document.getElementById('fieldAddress');
const fieldImage      = document.getElementById('fieldImage');
const imagePreview    = document.getElementById('imagePreview');
const deleteModal     = document.getElementById('deleteModal');

// ── Load & Render ──────────────────────────────────
async function loadLocations() {
  loadingMsg.classList.remove('hidden');
  const { data, error } = await db.from('locations').select('*').order('created_at', { ascending: false });
  loadingMsg.classList.add('hidden');
  if (error) { alert('Error loading locations'); return; }
  renderCards(data);
}

function renderCards(locations) {
  cardsContainer.innerHTML = '';
  if (!locations.length) {
    cardsContainer.innerHTML = '<p id="loadingMsg">No locations yet. Add one!</p>';
    return;
  }
  locations.forEach(loc => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <img src="${loc.image_url || 'https://placehold.co/400x180?text=No+Image'}" alt="${loc.name}" />
      <div class="card-body">
        <h3>${loc.name}</h3>
        <p>${loc.description || ''}</p>
        <p class="address">📍 ${loc.address || ''}</p>
      </div>
      <div class="card-actions">
        <button class="edit-btn"   onclick="openEdit('${loc.id}')">✏️ Edit</button>
        <button class="delete-btn" onclick="openDelete('${loc.id}')">🗑️ Delete</button>
      </div>`;
    cardsContainer.appendChild(card);
  });
}

// ── Add / Edit Modal ───────────────────────────────
document.getElementById('openAddModal').onclick = () => {
  editingId = null;
  modalTitle.textContent = 'Add Location';
  fieldName.value = fieldDesc.value = fieldAddress.value = '';
  fieldImage.value = '';
  imagePreview.src = '';
  imagePreview.classList.add('hidden');
  modal.classList.remove('hidden');
};

async function openEdit(id) {
  const { data, error } = await db.from('locations').select('*').eq('id', id).single();
  if (error) { alert('Could not load location'); return; }
  editingId = id;
  modalTitle.textContent = 'Edit Location';
  fieldName.value    = data.name        || '';
  fieldDesc.value    = data.description || '';
  fieldAddress.value = data.address     || '';
  fieldImage.value   = '';
  if (data.image_url) {
    imagePreview.src = data.image_url;
    imagePreview.classList.remove('hidden');
  } else {
    imagePreview.classList.add('hidden');
  }
  modal.classList.remove('hidden');
}

fieldImage.addEventListener('change', () => {
  const file = fieldImage.files[0];
  if (!file) return;
  imagePreview.src = URL.createObjectURL(file);
  imagePreview.classList.remove('hidden');
});

document.getElementById('cancelBtn').onclick = () => modal.classList.add('hidden');

document.getElementById('saveBtn').onclick = async () => {
  const name = fieldName.value.trim();
  if (!name) { alert('Name is required'); return; }

  let image_url = null;

  // Upload image if selected
  if (fieldImage.files[0]) {
    const file = fieldImage.files[0];
    const fileName = `${Date.now()}-${file.name}`;
    const { error: uploadError } = await db.storage
      .from('location-images')
      .upload(fileName, file);
    if (uploadError) { alert('Image upload failed'); return; }
    const { data: urlData } = db.storage.from('location-images').getPublicUrl(fileName);
    image_url = urlData.publicUrl;
  }

  const payload = {
    name,
    description: fieldDesc.value.trim(),
    address:     fieldAddress.value.trim(),
    ...(image_url && { image_url })
  };

  if (editingId) {
    const { error } = await db.from('locations').update(payload).eq('id', editingId);
    if (error) { alert('Update failed'); return; }
  } else {
    const { error } = await db.from('locations').insert(payload);
    if (error) { alert('Insert failed'); return; }
  }

  modal.classList.add('hidden');
  loadLocations();
};

// ── Delete Modal ───────────────────────────────────
function openDelete(id) {
  deletingId = id;
  deleteModal.classList.remove('hidden');
}

document.getElementById('cancelDeleteBtn').onclick  = () => deleteModal.classList.add('hidden');

document.getElementById('confirmDeleteBtn').onclick = async () => {
  const { error } = await db.from('locations').delete().eq('id', deletingId);
  if (error) { alert('Delete failed'); return; }
  deleteModal.classList.add('hidden');
  loadLocations();
};

// ── Init ───────────────────────────────────────────
loadLocations();
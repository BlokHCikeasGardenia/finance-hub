// Penghuni form module
// Handles form creation, validation, and submission

import { showModal, closeModal } from '../../ui.js';
import { showToast } from '../../utils.js';
import { addPenghuni, updatePenghuni, loadPenghuni } from './penghuni-data.js';

// Show add form for penghuni
async function showAddForm(entity) {
    if (entity !== 'penghuni') return;

    const formHtml = `
        <form id="penghuni-form">
            <div class="mb-3">
                <label for="nama_kepala_keluarga" class="form-label">Nama Kepala Keluarga:</label>
                <input type="text" class="form-control" id="nama_kepala_keluarga" required
                       placeholder="Masukkan nama lengkap kepala keluarga">
            </div>
            <div class="mb-3">
                <label for="agama" class="form-label">Agama:</label>
                <input type="text" class="form-control" id="agama" placeholder="Contoh: Islam, Kristen, dll">
            </div>
            <div class="mb-3">
                <label for="status" class="form-label">Status:</label>
                <select class="form-select" id="status">
                    <option value="">Pilih Status</option>
                    <option value="pemilik">Pemilik</option>
                    <option value="pengontrak">Pengontrak</option>
                    <option value="lainnya">Lainnya</option>
                </select>
            </div>
            <div class="mb-3 form-check">
                <input type="checkbox" class="form-check-input" id="kondisi_khusus">
                <label class="form-check-label" for="kondisi_khusus">
                    Kondisi Khusus - Centang jika penghuni memiliki kebutuhan khusus (lanjut usia, penyandang disabilitas, dll)
                </label>
            </div>
            <div class="d-flex gap-2">
                <button type="submit" class="btn btn-primary">Simpan</button>
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>
            </div>
        </form>
    `;

    showModal(`Tambah Penghuni`, formHtml);

    setTimeout(() => {
        const form = document.getElementById('penghuni-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleFormSubmit(entity, null);
        });
    }, 100);
}

// Show edit form for penghuni
async function editPenghuni(id) {
    try {
        const { supabase } = await import('../../config.js');

        const { data, error } = await supabase
            .from('penghuni')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        const editFormHtml = `
            <form id="penghuni-form">
                <div class="mb-3">
                    <label for="nama_kepala_keluarga" class="form-label">Nama Kepala Keluarga:</label>
                    <input type="text" class="form-control" id="nama_kepala_keluarga" value="${data.nama_kepala_keluarga}" required>
                </div>
                <div class="mb-3">
                    <label for="agama" class="form-label">Agama:</label>
                    <input type="text" class="form-control" id="agama" value="${data.agama || ''}">
                </div>
                <div class="mb-3">
                    <label for="status" class="form-label">Status:</label>
                    <select class="form-select" id="status">
                        <option value="">Pilih Status</option>
                        <option value="pemilik" ${data.status === 'pemilik' ? 'selected' : ''}>Pemilik</option>
                        <option value="pengontrak" ${data.status === 'pengontrak' ? 'selected' : ''}>Pengontrak</option>
                        <option value="lainnya" ${data.status === 'lainnya' ? 'selected' : ''}>Lainnya</option>
                    </select>
                </div>
                <div class="mb-3 form-check">
                    <input type="checkbox" class="form-check-input" id="kondisi_khusus" ${data.kondisi_khusus ? 'checked' : ''}>
                    <label class="form-check-label" for="kondisi_khusus">Kondisi Khusus</label>
                </div>
                <div class="d-flex gap-2">
                    <button type="submit" class="btn btn-primary">Update</button>
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>
                </div>
            </form>
        `;

        showModal('Edit Penghuni', editFormHtml);

        setTimeout(() => {
            const form = document.getElementById('penghuni-form');
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await handleFormSubmit('penghuni', id);
            });
        }, 100);

    } catch (error) {
        console.error('Error loading penghuni for edit:', error);
        showToast('Error loading data', 'danger');
    }
}

// Handle form submission
async function handleFormSubmit(entity, id) {
    const formData = {
        nama_kepala_keluarga: document.getElementById('nama_kepala_keluarga').value,
        agama: document.getElementById('agama').value || null,
        status: document.getElementById('status').value || null,
        kondisi_khusus: document.getElementById('kondisi_khusus').checked
    };

    let result;
    if (id) {
        result = await updatePenghuni(id, formData);
    } else {
        result = await addPenghuni(formData);
    }

    if (result.success) {
        closeModal();
        await loadPenghuni(); // Reload the table
        showToast(`${entity.charAt(0).toUpperCase() + entity.slice(1)} ${id ? 'updated' : 'added'} successfully`, 'success');
    } else {
        showToast('Error: ' + result.error, 'danger');
    }
}

// Confirm delete penghuni
async function confirmDeletePenghuni(id) {
    if (typeof showConfirm === 'function') {
        const confirmed = await showConfirm('Apakah Anda yakin ingin menghapus penghuni ini?\n\nPeringatan: Menghapus penghuni yang masih memiliki data rumah atau transaksi dapat menyebabkan inkonsistensi data.');
        if (confirmed) {
            const { deletePenghuni } = await import('./penghuni-data.js');
            const result = await deletePenghuni(id);
            if (result.success) {
                await loadPenghuni(); // Reload the table
                showToast('Penghuni berhasil dihapus', 'success');
            } else {
                showToast('Error deleting: ' + result.error, 'danger');
            }
        }
    }
}

export {
    showAddForm,
    editPenghuni,
    confirmDeletePenghuni,
    handleFormSubmit
};

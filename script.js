// ---- Configuração -----------------------------------------------------
// Troque pelo link real do grupo do WhatsApp da turma.
const WHATSAPP_GROUP_LINK = 'https://chat.whatsapp.com/SEU-LINK-AQUI';

// Endpoint opcional para enviar o lead (webhook do RD Station, ActiveCampaign,
// Google Sheets, etc.). Deixe null para funcionar apenas no front-end.
const FORM_ENDPOINT = null;

// ---- Máscara de telefone -----------------------------------------------
const phoneInput = document.getElementById('phone');
phoneInput.addEventListener('input', () => {
  let digits = phoneInput.value.replace(/\D/g, '').slice(0, 11);
  if (digits.length > 10) {
    phoneInput.value = digits.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim();
  } else if (digits.length > 5) {
    phoneInput.value = digits.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim();
  } else if (digits.length > 2) {
    phoneInput.value = digits.replace(/(\d{2})(\d{0,5})/, '($1) $2').trim();
  } else {
    phoneInput.value = digits;
  }
});

// ---- Envio do formulário ------------------------------------------------
const form = document.getElementById('leadForm');
const submitBtn = document.getElementById('submitBtn');
const formSuccess = document.getElementById('formSuccess');
const whatsappLink = document.getElementById('whatsappLink');

whatsappLink.href = WHATSAPP_GROUP_LINK;

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const data = {
    name: form.name.value.trim(),
    email: form.email.value.trim(),
    phone: form.phone.value.trim(),
  };

  submitBtn.disabled = true;
  submitBtn.querySelector('span').textContent = 'ENVIANDO...';

  try {
    if (FORM_ENDPOINT) {
      await fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    }

    form.hidden = true;
    formSuccess.hidden = false;
    formSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (err) {
    submitBtn.disabled = false;
    submitBtn.querySelector('span').textContent = 'QUERO PARTICIPAR DA AULA';
    alert('Não foi possível enviar seus dados agora. Tente novamente em instantes.');
  }
});

// ---- CTA final rola até o formulário -------------------------------------
document.getElementById('finalCta').addEventListener('click', (event) => {
  event.preventDefault();
  document.getElementById('leadForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
  document.getElementById('name').focus({ preventScroll: true });
});

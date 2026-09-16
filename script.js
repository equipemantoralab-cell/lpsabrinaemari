// ---- Configuração -----------------------------------------------------
// Troque pelo link real do grupo do WhatsApp da turma.
const WHATSAPP_GROUP_LINK = 'https://chat.whatsapp.com/SEU-LINK-AQUI';

// URL do Google Apps Script (App da Web) que salva o lead na planilha.
// Gerada ao implantar google-apps-script/Code.gs (veja instruções no arquivo).
// Deixe null para o formulário funcionar apenas no front-end, sem salvar em lugar nenhum.
const FORM_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwBgSNR7sQP9akrCUNbzwwKgUlCPNHhrix4IMDqZ1ch5fIdBYl4zH_CL-GcpQ1WnFPz4w/exec';

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
      // Apps Script não retorna cabeçalhos CORS legíveis por fetch, então usamos
      // no-cors: a requisição é enviada e a planilha é atualizada, mas não dá
      // pra ler a resposta — por isso seguimos direto pra tela de sucesso.
      await fetch(FORM_ENDPOINT, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
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

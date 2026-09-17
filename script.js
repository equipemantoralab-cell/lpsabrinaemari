// ---- Configuração -----------------------------------------------------
// Troque pelo link real do grupo do WhatsApp da turma.
const WHATSAPP_GROUP_LINK = 'https://chat.whatsapp.com/CzoNsEnmoXQERbUqT0MWzN';

// URL do Google Apps Script (App da Web) que salva o lead na planilha.
// Gerada ao implantar google-apps-script/Code.gs (veja instruções no arquivo).
// Deixe null para pular esse canal.
const FORM_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwBgSNR7sQP9akrCUNbzwwKgUlCPNHhrix4IMDqZ1ch5fIdBYl4zH_CL-GcpQ1WnFPz4w/exec';

// Todo envio grava em dois lugares ao mesmo tempo, de forma independente:
// 1) na planilha, via Apps Script (FORM_ENDPOINT acima);
// 2) no Netlify Forms — nativo do próprio hospedeiro do site, sem OAuth do
//    Google e sem precisar "reautorizar" nada. As respostas ficam em
//    Site settings > Forms no painel do Netlify.
// Se um canal falhar o outro ainda captura o lead. Só entra na fila local
// (abaixo) se os dois falharem ao mesmo tempo.
const NETLIFY_FORM_NAME = 'leadForm';

// Backup local: usado só quando TODOS os canais acima falham (rede fora do
// ar, por exemplo). Fica guardado no navegador da pessoa e o site tenta
// reenviar sozinho na próxima vez que a página carregar.
const PENDING_LEADS_KEY = 'lpBlackFriday_pendingLeads';

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

// ---- Backup local de leads não confirmados ------------------------------
function readPendingLeads() {
  try {
    return JSON.parse(localStorage.getItem(PENDING_LEADS_KEY)) || [];
  } catch (err) {
    return [];
  }
}

function savePendingLeads(leads) {
  try {
    localStorage.setItem(PENDING_LEADS_KEY, JSON.stringify(leads));
  } catch (err) {
    // localStorage indisponível (modo privado, storage cheio etc.) — segue sem backup local.
  }
}

function queuePendingLead(data) {
  const pending = readPendingLeads();
  pending.push({ ...data, queuedAt: new Date().toISOString() });
  savePendingLeads(pending);
}

// ---- Canal 1: Google Sheets via Apps Script -----------------------------
// Usamos mode:"no-cors" porque o Web App do Apps Script não devolve
// cabeçalhos CORS legíveis pelo fetch — dá pra saber se a requisição saiu
// da rede com sucesso, mas não dá pra ler a resposta nem detectar um erro
// interno do script que ainda assim responda HTTP 200. O timeout abaixo é
// a forma prática de pegar falhas (rede fora do ar, endpoint indisponível).
async function sendToAppsScript(data, { timeoutMs = 10000 } = {}) {
  if (!FORM_ENDPOINT) throw new Error('FORM_ENDPOINT não configurado');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    await fetch(FORM_ENDPOINT, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(data),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

// ---- Canal 2: Netlify Forms ----------------------------------------------
// Recurso nativo do Netlify: o formulário tem data-netlify="true" no HTML,
// o que faz o Netlify detectar e registrar o formulário no deploy do site.
// Como o JS intercepta o submit (pra validar e controlar o redirecionamento),
// mandamos os dados manualmente pro Netlify no formato que ele espera.
// Só funciona depois de publicado no Netlify — não funciona rodando local
// nem no preview do Artifact.
async function sendToNetlify(data, { timeoutMs = 10000 } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const body = new URLSearchParams({ 'form-name': NETLIFY_FORM_NAME, ...data }).toString();
    const response = await fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Netlify Forms respondeu ${response.status}`);
  } finally {
    clearTimeout(timeout);
  }
}

// Tenta reenviar, em segundo plano, leads que ficaram pendentes de uma visita anterior.
async function flushPendingLeads() {
  const pending = readPendingLeads();
  if (!pending.length) return;

  const stillPending = [];
  for (const lead of pending) {
    const results = await Promise.allSettled([sendToAppsScript(lead), sendToNetlify(lead)]);
    const allFailed = results.every((r) => r.status === 'rejected');
    if (allFailed) stillPending.push(lead);
  }
  savePendingLeads(stillPending);
}

flushPendingLeads();

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

  const results = await Promise.allSettled([sendToAppsScript(data), sendToNetlify(data)]);
  const allFailed = results.every((r) => r.status === 'rejected');
  if (allFailed) {
    // Os dois canais falharam ao mesmo tempo (rede fora do ar etc.): guarda
    // localmente pra não perder o lead. O acesso à aula não pode depender disso.
    queuePendingLead(data);
  }

  form.hidden = true;
  formSuccess.hidden = false;
  formSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });

  window.setTimeout(() => {
    window.location.href = WHATSAPP_GROUP_LINK;
  }, 1200);
});

// ---- CTA final rola até o formulário -------------------------------------
document.getElementById('finalCta').addEventListener('click', (event) => {
  event.preventDefault();
  document.getElementById('leadForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
  document.getElementById('name').focus({ preventScroll: true });
});

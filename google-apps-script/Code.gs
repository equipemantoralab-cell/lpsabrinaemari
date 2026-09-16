/**
 * Recebe os dados do formulário da landing page (nome, e-mail, telefone) e
 * salva cada inscrição como uma nova linha na aba "Leads" da planilha.
 *
 * COMO INSTALAR
 * 1. Abra a planilha "Leads - Aula Black Friday (Sabrina & Mariana)".
 * 2. Menu Extensões > Apps Script.
 * 3. Apague o conteúdo padrão de Code.gs e cole todo este arquivo.
 * 4. Clique em Implantar > Nova implantação.
 * 5. Tipo: "App da Web".
 *    - Executar como: Eu (sua conta)
 *    - Quem pode acessar: Qualquer pessoa
 * 6. Clique em Implantar, autorize o acesso quando solicitado.
 * 7. Copie a URL do app da Web gerada (termina em /exec).
 * 8. Cole essa URL na constante FORM_ENDPOINT em script.js da landing page.
 *
 * Sempre que editar este código, gere uma NOVA implantação (ou uma nova
 * versão da implantação existente) para as mudanças entrarem em vigor.
 */

const SHEET_NAME = 'Leads';

function doPost(e) {
  try {
    const sheet = getOrCreateSheet_();
    const data = JSON.parse(e.postData.contents);

    sheet.appendRow([
      new Date(),
      data.name || '',
      data.email || '',
      data.phone || '',
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput('Endpoint ativo. Use POST para enviar dados.');
}

function getOrCreateSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['Data/Hora', 'Nome', 'E-mail', 'Telefone']);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

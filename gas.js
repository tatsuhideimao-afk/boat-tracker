/**
 * Google Apps Script — レース収支管理バックエンド
 *
 * 使い方:
 *  1. Google スプレッドシートを新規作成し、シート名を「records」に変更
 *  2. 拡張機能 → Apps Script を開き、このファイルの内容をすべて貼り付けて保存
 *  3. デプロイ → 新しいデプロイ → 種類「ウェブアプリ」
 *     - 次のユーザーとして実行: 自分
 *     - アクセスできるユーザー: 全員
 *  4. デプロイ後に表示されるURLを config.js の GAS_URL に設定
 */

const SHEET_NAME = 'records';
const HEADERS = ['id', 'date', 'sport', 'venue', 'race', 'bet', 'payout', 'memo', 'createdAt', 'updatedAt'];

// ── GET: 全レコード取得 ──────────────────────────────────
function doGet(e) {
  try {
    const sheet = getSheet();
    ensureHeaders(sheet);

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return respond({ success: true, records: [] });
    }

    const records = data.slice(1).map(row => {
      const obj = {};
      HEADERS.forEach((h, i) => {
        let v = row[i];
        if (v === '' || v === null || v === undefined) v = null;
        obj[h] = v;
      });
      if (obj.race   !== null) obj.race   = Number(obj.race);
      if (obj.bet    !== null) obj.bet    = Number(obj.bet);
      if (obj.payout !== null) obj.payout = Number(obj.payout);
      return obj;
    }).filter(r => r.id);  // 空行を除外

    return respond({ success: true, records });
  } catch (err) {
    return respond({ success: false, error: err.message }, true);
  }
}

// ── POST: 追加 / 更新 / 削除 ─────────────────────────────
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const { action, record } = payload;
    const sheet = getSheet();
    ensureHeaders(sheet);

    if (action === 'add') {
      sheet.appendRow(HEADERS.map(h => record[h] ?? ''));
      return respond({ success: true });
    }

    if (action === 'update') {
      const rowIdx = findRowById(sheet, record.id);
      if (rowIdx < 0) return respond({ success: false, error: 'Record not found' });
      HEADERS.forEach((h, i) => {
        sheet.getRange(rowIdx, i + 1).setValue(record[h] ?? '');
      });
      return respond({ success: true });
    }

    if (action === 'delete') {
      const rowIdx = findRowById(sheet, record.id);
      if (rowIdx < 0) return respond({ success: false, error: 'Record not found' });
      sheet.deleteRow(rowIdx);
      return respond({ success: true });
    }

    return respond({ success: false, error: `Unknown action: ${action}` });
  } catch (err) {
    return respond({ success: false, error: err.message }, true);
  }
}

// ── Helpers ──────────────────────────────────────────────
function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  return sheet;
}

function ensureHeaders(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length)
      .setFontWeight('bold')
      .setBackground('#e8f4f8');
  }
}

function findRowById(sheet, id) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) return i + 1;
  }
  return -1;
}

function respond(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

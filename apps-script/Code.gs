/**
 * Test Quest – Google Apps Script for the class ranking and saved progress.
 * Paste this whole file into Extensions > Apps Script of a Google Sheet,
 * then Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone).
 *
 * Sheets created automatically:
 *  - Players : one row per student (total XP, PIN key, saved progress)
 *  - Attempts: one row per finished activity (for the teacher)
 *  - Missed  : how often each question was answered wrongly (for the teacher)
 *
 * Forgotten PIN: delete the text in that student's "PIN key" cell. The next PIN
 * the student types becomes their new PIN, and their progress is kept.
 */

var HEAD = ['Student ID', 'Name', 'Group', 'XP', 'Stars', 'Badges', 'Last update', 'PIN key', 'Progress (do not edit)'];

function sheet_(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(headers); sh.setFrozenRows(1); }
  return sh;
}

function hashId_(id) {
  var h = 0, s = String(id);
  for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

function findPlayer_(ps, id) {
  var vals = ps.getDataRange().getValues();
  for (var i = 1; i < vals.length; i++) if (String(vals[i][0]) === id) return { row: i + 1, v: vals[i] };
  return null;
}

function parse_(s) { try { return s ? JSON.parse(s) : {}; } catch (e) { return {}; } }

// keep the better result of each activity
function merge_(a, b) {
  var out = {}, k;
  for (k in a) out[k] = a[k];
  for (k in b) {
    var l = out[k], r = b[k];
    if (!l || (Number(r.xp) || 0) > (Number(l.xp) || 0)) { out[k] = r; if (l && l.pass) out[k].pass = true; }
    else if (r.pass) l.pass = true;
  }
  return out;
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var d = JSON.parse(e.postData.contents);
    var id = String(d.id || '').replace(/\D/g, '');
    if (!id) return out_({ ok: false });
    var now = new Date();
    var ps = sheet_('Players', HEAD);
    var p = findPlayer_(ps, id);

    // PIN check: once a PIN key is saved, only the same key can update this student
    if (p && p.v[7] && d.key && String(p.v[7]) !== String(d.key)) return out_({ ok: false, error: 'wrong key' });

    var progress = merge_(p ? parse_(p.v[8]) : {}, d.progress || {});
    var xp = 0; for (var k in progress) xp += Number(progress[k].xp) || 0;
    xp = Math.max(xp, Number(d.xp) || 0, p ? Number(p.v[3]) || 0 : 0);
    var stars = Math.max(Number(d.stars) || 0, p ? Number(p.v[4]) || 0 : 0);
    var badges = Math.max(Number(d.badges) || 0, p ? Number(p.v[5]) || 0 : 0);
    var row = [id, String(d.name || (p ? p.v[1] : '')).slice(0, 40), String(d.group || (p ? p.v[2] : '')), xp, stars, badges, now,
      (p && p.v[7]) ? p.v[7] : (d.key || ''), JSON.stringify(progress)];
    if (p) ps.getRange(p.row, 1, 1, HEAD.length).setValues([row]); else ps.appendRow(row);

    if (d.activity && d.activity !== 'sign-in' && d.activity !== 'sign-out') {
      sheet_('Attempts', ['Time', 'Student ID', 'Name', 'Group', 'Activity', 'Score', 'Max', 'Total XP'])
        .appendRow([now, id, d.name, d.group, d.activity, d.score, d.max, xp]);
    }

    var wrong = d.wrong || [];
    if (wrong.length) {
      var ms = sheet_('Missed', ['Test / passage', 'Question', 'Times missed']);
      var mv = ms.getDataRange().getValues(), idx = {};
      for (var j = 1; j < mv.length; j++) idx[mv[j][0] + '|' + mv[j][1]] = j + 1;
      wrong.slice(0, 40).forEach(function (w) {
        var key = w.test + '|' + w.q;
        if (idx[key]) { var c = ms.getRange(idx[key], 3); c.setValue((Number(c.getValue()) || 0) + 1); }
        else { ms.appendRow([w.test, w.q, 1]); idx[key] = ms.getLastRow(); }
      });
    }
    return out_({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  var q = (e && e.parameter) || {};
  var ps = sheet_('Players', HEAD);

  // restore progress on another device
  if (q.action === 'load') {
    var p = findPlayer_(ps, String(q.id || '').replace(/\D/g, ''));
    if (!p) return out_({ status: 'new' });
    if (p.v[7] && String(p.v[7]) !== String(q.key)) return out_({ status: 'wrong' });
    return out_({ status: 'ok', progress: parse_(p.v[8]) });
  }

  // class ranking (no student IDs or PINs are sent)
  var vals = ps.getDataRange().getValues(), list = [];
  for (var i = 1; i < vals.length; i++) {
    if (!vals[i][0]) continue;
    list.push({ id_hash: hashId_(vals[i][0]), name: vals[i][1], group: vals[i][2], xp: Number(vals[i][3]) || 0, stars: Number(vals[i][4]) || 0, badges: Number(vals[i][5]) || 0 });
  }
  list.sort(function (a, b) { return b.xp - a.xp; });
  return out_({ players: list });
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Lightweight syntax highlighter — no external dependencies.
 * Returns an HTML string with <span class="hl-*"> tokens.
 */
const KEYWORDS = {
  java: new Set(['abstract','assert','boolean','break','byte','case','catch','char','class',
    'const','continue','default','do','double','else','enum','extends','final','finally',
    'float','for','if','implements','import','instanceof','int','interface','long','native',
    'new','null','package','private','protected','public','return','short','static',
    'super','switch','synchronized','this','throw','throws','true','false','try','void',
    'volatile','while','var','record']),
  python: new Set(['False','None','True','and','as','assert','async','await','break','class',
    'continue','def','del','elif','else','except','finally','for','from','global','if',
    'import','in','is','lambda','nonlocal','not','or','pass','raise','return','try',
    'while','with','yield','self','cls']),
  typescript: new Set(['abstract','any','as','async','await','boolean','break','case','catch',
    'class','const','continue','declare','default','delete','do','else','enum','export',
    'extends','false','finally','for','from','function','if','implements','import','in',
    'interface','let','new','null','number','object','private','protected','public',
    'readonly','return','static','string','super','switch','this','throw','true','try',
    'type','typeof','undefined','unknown','var','void','while','yield']),
};

function esc(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

export function highlight(code, language = 'java') {
  const lang = (language || 'java').toLowerCase().replace('typescript','typescript');
  const kws  = KEYWORDS[lang] || KEYWORDS.java;

  return code.split('\n').map(line => {
    let out = '';
    let i = 0;
    while (i < line.length) {
      const ch = line[i];

      // Single-line comment
      if ((lang !== 'python' && ch === '/' && line[i+1] === '/') ||
          (lang === 'python' && ch === '#')) {
        out += `<span class="hl-comment">${esc(line.slice(i))}</span>`;
        break;
      }
      // String " or '
      if (ch === '"' || ch === "'") {
        let j = i + 1;
        while (j < line.length && !(line[j] === ch && line[j-1] !== '\\')) j++;
        j++;
        out += `<span class="hl-string">${esc(line.slice(i, j))}</span>`;
        i = j; continue;
      }
      // Template literal
      if (ch === '`') {
        let j = i + 1;
        while (j < line.length && line[j] !== '`') j++;
        j++;
        out += `<span class="hl-string">${esc(line.slice(i, j))}</span>`;
        i = j; continue;
      }
      // Number
      if (/\d/.test(ch) && (i === 0 || /\W/.test(line[i-1]))) {
        let j = i;
        while (j < line.length && /[\d._xXbBfFlL]/.test(line[j])) j++;
        out += `<span class="hl-number">${esc(line.slice(i, j))}</span>`;
        i = j; continue;
      }
      // Word (keyword / type / function / identifier)
      if (/[a-zA-Z_$]/.test(ch)) {
        let j = i;
        while (j < line.length && /[\w$]/.test(line[j])) j++;
        const word = line.slice(i, j);
        if (kws.has(word)) {
          out += `<span class="hl-keyword">${esc(word)}</span>`;
        } else if (/^[A-Z]/.test(word)) {
          out += `<span class="hl-type">${esc(word)}</span>`;
        } else if (line[j] === '(') {
          out += `<span class="hl-function">${esc(word)}</span>`;
        } else {
          out += esc(word);
        }
        i = j; continue;
      }
      // Annotation / decorator
      if (ch === '@') {
        let j = i + 1;
        while (j < line.length && /[\w]/.test(line[j])) j++;
        out += `<span class="hl-annotation">${esc(line.slice(i, j))}</span>`;
        i = j; continue;
      }

      out += esc(ch);
      i++;
    }
    return out;
  }).join('\n');
}

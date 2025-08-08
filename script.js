const fileInput = document.getElementById('fileInput');
const analyzeBtn = document.getElementById('analyzeBtn');
const convertBtn = document.getElementById('convertBtn');
const textInput = document.getElementById('textInput');
const multiResults = document.getElementById('multiResults');
const typeButtons = document.querySelectorAll('.convert-type');

let selectedConvertType = 'Simple';

// 変換タイプ選択
typeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    typeButtons.forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedConvertType = btn.dataset.type;
  });
});
// 初期選択
document.querySelector('.convert-type[data-type="Simple"]').classList.add('selected');

// clauses を抽出する
function getClauses(text) {
  return text
    .split(/(?<=[.!?])\s+/) // 文ごと
    .flatMap(sentence =>
      sentence.split(/[,;]?\s*(?:and|but|or|nor|so|for|yet|because|although|while|when|since|though|unless)\b/gi)
    )
    .map(clause =>
      clause
        .trim()
        // 文頭の不要なカンマ・セミコロンを除去
        .replace(/^[,;]+/, '')
        // 文尾の句読点をすべて除去
        .replace(/[\.,!?;]+$/, '')
    )
    .filter(Boolean);
}

function detectSentenceType(text) {
  if (language === 'ja') {
    return detectJaSentenceType(text);
  }

  // 1) 文ごとに分割
  const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim());
  const sentenceCount = sentences.length;

  // 2) 全体の節数を取得
  const clauses = getClauses(text);
  const clauseCount = clauses.length;

  // 3.a) 従属接続詞の有無を調べる
  const hasSubordinatingConj = /\b(because|although|since|when|while|if|after|before|though|unless)\b/i.test(text); // 1単語だけでないものなど、他にも存在する

  // 3.b) 等位接続詞の有無を調べる
  const hasCoordinatingConj = /\b(and|but|or|nor|so|for|yet)\b/i.test(text);

  // 4) 純粋な複数単文（節と文の数が同じ／接続詞なし）の場合は Simple
  if (sentenceCount >= 2 && clauseCount === sentenceCount && !hasCoordinatingConj && !hasSubordinatingConj) {
    return "Simple";
  }

  // 5) 判定
  if (clauseCount >= 2 && hasSubordinatingConj && hasCoordinatingConj) {
    return "Compound & Complex"
  } else if (clauseCount >= 2 && hasSubordinatingConj) {
    return "Complex";
  } else if (clauseCount >= 2) {
    return "Compound";
  } else {
    return "Simple";
  }
}


// ===== Simple: すべてを独立文に =====
function convertToSimple(text) {
  const clauses = getClauses(text);
  return clauses
    .map(c => c.charAt(0).toUpperCase() + c.slice(1) + '.')
    .join(' ');
}

// ===== Compound: 「, and」または「, but」で連結 =====
// 否定ワードを判定するヘルパー
function hasNegation(clause) {
  // n't, not, never, no (単語), none, neither, nor, without, hardly, barely, scarcely
  return /\b(?:not|never|none|neither|nor|without|hardly|barely|scarcely)\b/i.test(clause) 
         || /n't\b/i.test(clause);
}

// 対照マーカー（しかし系）を見つけたら強制的に but を使う
function hasContrastMarker(clause) {
  return /\b(?:but|however|although|though|yet|whereas|conversely|on the other hand)\b/i.test(clause);
}

// 改良版 convertToCompound: 節ごとに connector を決める（pairwise）
function convertToCompound(text) {
  const clauses = getClauses(text).map(c => c.trim()).filter(Boolean);
  if (clauses.length <= 1) return clauses[0] ? clauses[0] + '.' : text;

  const parts = [];
  for (let i = 0; i < clauses.length; i++) {
    const clause = clauses[i].replace(/^[\s,;]+|[.,!?;]+$/g, '');
    if (i === 0) {
      // 先頭はそのまま（先頭だけ大文字にする）
      parts.push(clause.charAt(0).toUpperCase() + clause.slice(1));
    } else {
      // 前節と現節で接続詞を決定
      const prev = clauses[i - 1];
      const useBut = (hasContrastMarker(prev) || hasContrastMarker(clause)) ||
                     (hasNegation(prev) !== hasNegation(clause)); // XOR: 否定の有無が異なるなら but

      const connector = useBut ? 'but' : 'and';
      parts.push(`${connector} ${clause.toLowerCase()}`);
    }
  }

  // join 部分：先頭はそのまま、残りは ", " で繋ぐ（自然にするため先頭以外はカンマを入れる）
  const result = parts[0] + (parts.length > 1 ? ', ' + parts.slice(1).join(', ') : '');
  return result.replace(/\s+([,.!?])/g, '$1') + '.';
}

// ===== Complex: 「because」等で1文に =====
function convertToComplex(text) {
  const clauses = getClauses(text);
  if (clauses.length <= 1) return clauses[0] ? clauses[0] + '.' : text;

  const subConj = ['because', 'although', 'while', 'since', 'when'];
  const connector = subConj[Math.floor(Math.random() * subConj.length)];

  const first = clauses[0];
  const rest = clauses.slice(1).map(c => c.toLowerCase());
  return (
    first.charAt(0).toUpperCase() +
    first.slice(1) +
    ', ' +
    connector +
    ' ' +
    rest.join(', ') +
    '.'
  );
}

// // ===== convertSentenceは呼び出すだけ =====  => 英日統合した
// function convertSentence(text, targetType) {
//   const orig = detectSentenceType(text);
//   if (orig === targetType) return text;
//   switch (targetType) {
//     case 'Simple':
//       return convertToSimple(text);
//     case 'Compound':
//       return convertToCompound(text);
//     case 'Complex':
//       return convertToComplex(text);
//     default:
//       return text;
//   }
// }

// 結果ブロック生成
function createResultBlock({ titleText, originalText, detectedType, convertedText }) {
  const container = document.createElement('div');
  container.classList.add('output');
  container.innerHTML = `
    <h2>${titleText}</h2>
    <p><strong>Original:</strong> <span>${originalText}</span></p>
    <p><strong>Detected Type:</strong> <span>${detectedType}</span></p>
    <p><strong>Converted Sentence:</strong></p>
    <div class="output-box">${convertedText}</div>
  `;
  return container;
}

// 一括表示
function showResults(results) {
  multiResults.innerHTML = '';
  results.forEach(res => {
    multiResults.appendChild(createResultBlock(res));
  });
}

// ファイル処理（入力順を保持）
function processFiles(files, callback) {
  const results = new Array(files.length);
  let count = 0;
  Array.from(files).forEach((file, idx) => {
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target.result.trim();
      const detected = detectSentenceType(text);
      const converted = convertSentence(text, selectedConvertType);
      // 元のインデックスで保存
      results[idx] = {
        titleText: `Result: ${file.name}`,
        originalText: text,
        detectedType: detected,
        convertedText: converted
      };
      count++;
      if (count === files.length) {
        callback(results);
      }
    };
    reader.readAsText(file);
  });
}

// Analyzeボタン：テキストエリアのみ分類
analyzeBtn.addEventListener('click', () => {
  const text = textInput.value.trim();
  if (!text) {
    alert('Please enter text to analyze.');
    return;
  }
  const detected = detectSentenceType(text);
  showResults([{
    titleText: 'Result',
    originalText: text,
    detectedType: detected,
    convertedText: ''
  }]);
});

// Convertボタン：テキストエリア or ファイルを変換
convertBtn.addEventListener('click', () => {
  const text = textInput.value.trim();
  if (text) {
    const detected = detectSentenceType(text);
    const converted = convertSentence(text, selectedConvertType);
    showResults([{
      titleText: 'Result',
      originalText: text,
      detectedType: detected,
      convertedText: converted
    }]);
  } else if (fileInput.files.length > 0) {
    processFiles(fileInput.files, fileResults => showResults(fileResults));
  } else {
    alert('Please provide text or upload files to convert.');
  }
});

// ファイル選択時：自動でファイルごとに分類＆変換
fileInput.addEventListener('change', () => {
  if (fileInput.files.length > 0) {
    processFiles(fileInput.files, fileResults => showResults(fileResults));
  }
});


// JP-mode
// === 日本語モード対応スクリプト ===
// kuromoji.js を使った形態素解析ベースの句抽出と文タイプ変換

// --- 言語切替用フラグ ---
let language = 'en'; // 'en' | 'ja'

// HTML に言語選択ドロップダウンを追加して、ここで設定を切り替える想定。
// 例: <select id="langSelect"><option value="en">English</option><option value="ja">日本語</option></select>
const langSelect = document.getElementById('langSelect');
if (langSelect) {
  langSelect.addEventListener('change', () => {
    language = langSelect.value;
  });
}

// --- 日本語解析用 kuromoji.js セットアップ ---
let jpTokenizer;
kuromoji.builder({ dicPath: 'https://unpkg.com/kuromoji@0.1.2/dict/' }).build((err, tokenizer) => {
  if (err) { console.error(err); return; }
  jpTokenizer = tokenizer;
});

// --- 日本語: 句（clause）抽出 ---
function getJaClauses(text) {
  if (!jpTokenizer) return [text];
  const tokens = jpTokenizer.tokenize(text);
  const clauses = [];
  let buffer = '';

  tokens.forEach((tok, idx) => {
    buffer += tok.surface_form;

    const next = tokens[idx + 1];

    // 明示的な句点で終了
    if (tok.surface_form === '。') {
      clauses.push(buffer.trim().replace(/。$/, ''));
      buffer = '';
      return;
    }

    // 接続助詞 + 読点のパターン (e.g. して、 / し、)
    if ((tok.surface_form === 'し' || tok.surface_form === 'て') && next && next.surface_form === '、') {
      buffer += next.surface_form; // 読点も含める
      clauses.push(buffer.trim().replace(/[、。]$/, ''));
      buffer = '';
    }

    // 明示的な読点で文節を区切る場合（単純な切り方）
    else if (tok.surface_form === '、') {
      clauses.push(buffer.trim().replace(/[、。]$/, ''));
      buffer = '';
    }
  });

  if (buffer.trim()) {
    clauses.push(buffer.trim().replace(/[、。]$/, ''));
  }

  return clauses.filter(c => c.trim());
}


// --- 日本語: 文タイプ判定 ---
function detectJaSentenceType(text) {
  if (!jpTokenizer) return 'Simple';
  const tokens = jpTokenizer.tokenize(text);

  let hasSubordinate = false;
  let hasCoordinate = false;

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];

    // --- 複文（Complex）判定 ---
    if (
      tok.surface_form === 'から' || tok.surface_form === 'ので' ||
      (tok.pos === '接続助詞' && ['から', 'ので'].includes(tok.surface_form))
    ) {
      hasSubordinate = true;
    }

    // --- 重文（Compound）判定 ---
    if (
      tok.surface_form === 'して' || tok.surface_form === 'し' || tok.surface_form === 'そして' || tok.surface_form === 'それから' ||
      (tok.pos === '接続助詞' && ['て', 'し'].includes(tok.surface_form)) ||
      (tok.pos === '接続詞' && ['そして', 'それから'].includes(tok.surface_form))
    ) {
      hasCoordinate = true;
    }
  }

  if (hasSubordinate) return 'Complex';
  if (hasCoordinate) return 'Compound';

  // 単純な複数の文をSimpleとして認識（単文の連続）
  const sentenceCount = text.split(/。\s*/).filter(s => s.trim()).length;
  if (sentenceCount > 1) return 'Simple';

  return 'Simple';
}

// --- 日本語: 変換ロジック ---
function convertJaSimple(text) {
  const clauses = getJaClauses(text);
  return clauses.map(c => c.replace(/[、。]$/, '') + '。').join('');
}

function convertJaCompound(text) {
  const clauses = getJaClauses(text);
  if (clauses.length <= 1) return text;
  return clauses.map(c => c.replace(/[、。]$/, '')).join('、そして') + '。';
}

function convertJaComplex(text) {
  const clauses = getJaClauses(text);
  if (clauses.length <= 1) return text;
  const first = clauses[0].replace(/[、。]$/, '');
  const rest = clauses.slice(1).map(c => c.replace(/[、。]$/, ''));
  return first + '、だから' + rest.join('、') + '。';
}

// --- 英日統合 convertSentence ---
function convertSentence(text, targetType) {
  if (language === 'ja') {
    const orig = detectJaSentenceType(text);
    if (orig === targetType) return text;
    switch (targetType) {
      case 'Simple': return convertJaSimple(text);
      case 'Compound': return convertJaCompound(text);
      case 'Complex': return convertJaComplex(text);
      default: return text;
    }
  } else {
    // 既存の英語処理
    const orig = detectSentenceType(text);
    if (orig === targetType) return text;
    switch (targetType) {
      case 'Simple': return convertToSimple(text);
      case 'Compound': return convertToCompound(text);
      case 'Complex': return convertToComplex(text);
      default: return text;
    }
  }
}

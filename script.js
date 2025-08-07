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
      sentence.split(/[,;]?\s*(?:and|but|or|so|because|although|while|when|since|though|unless)\b/gi)
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

// 置き換える detectSentenceType 全体
function detectSentenceType(text) {
  // 1) 文ごとに分割
  const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim());
  const sentenceCount = sentences.length;

  // 2) 全体の節数を取得
  const clauses = getClauses(text);
  const clauseCount = clauses.length;

  // 3) 従属接続詞の有無を調べる
  const hasSubordinatingConj = /\b(because|although|since|when|while|if|after|before|though|unless)\b/i.test(text);

  // 4) 純粋な複数単文（節と文の数が同じ／接続詞なし）の場合は Simple
  const hasAnyConj = /[,;]?\s*(?:and|but|or|so)\b/i.test(text);
  if (sentenceCount >= 2 && clauseCount === sentenceCount && !hasAnyConj && !hasSubordinatingConj) {
    return "Simple";
  }

  // 5) 判定
  if (clauseCount >= 2 && hasSubordinatingConj) {
    return "Complex";
  } else if (clauseCount >= 2) {
    return "Compound";
  } else {
    return "Simple";
  }
}


// === 新しい変換関数たち ===
// ===== Simple: すべてを独立文に =====
function convertToSimple(text) {
  const clauses = getClauses(text);
  return clauses
    .map(c => c.charAt(0).toUpperCase() + c.slice(1) + '.')
    .join(' ');
}

// ===== Compound: 「, and」で連結 =====
function convertToCompound(text) {
  const clauses = getClauses(text);
  if (clauses.length <= 1) return clauses[0] ? clauses[0] + '.' : text;
  return clauses
    .map(c => c.toLowerCase())
    .join(', and ')
    .replace(/^./, str => str.toUpperCase()) + '.';
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

// ===== convertSentenceは呼び出すだけ =====
function convertSentence(text, targetType) {
  const orig = detectSentenceType(text);
  if (orig === targetType) return text;
  switch (targetType) {
    case 'Simple':
      return convertToSimple(text);
    case 'Compound':
      return convertToCompound(text);
    case 'Complex':
      return convertToComplex(text);
    default:
      return text;
  }
}

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

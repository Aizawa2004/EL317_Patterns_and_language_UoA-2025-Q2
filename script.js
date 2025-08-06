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

// 文タイプ判定（簡易）
function detectSentenceType(text) {
  if (/(\band\b|\bbut\b|\bor\b)/i.test(text)) return 'Compound';
  if (/(\balthough\b|\bbecause\b|\bwhile\b|\bsince\b)/i.test(text)) return 'Complex';
  return 'Simple';
}

// 変換ロジック（簡易テンプレート）
function convertSentence(text, targetType) {
  const orig = detectSentenceType(text);
  if (orig === targetType) return text;
  switch (targetType) {
    case 'Simple':
      return text
        .split(/,|and|but|or|although|because|while|since/i)
        .map(s => s.trim())
        .filter(Boolean)
        .map(s => s.charAt(0).toUpperCase() + s.slice(1).replace(/\.$/, '') + '.')
        .join(' ');
    case 'Compound':
      return text.split('.').map(s => s.trim()).filter(Boolean).join(' and ');
    case 'Complex':
      return text.split('.').map(s => s.trim()).filter(Boolean).join(' although ');
    default:
      return text;
  }
}

// 結果ブロック生成
function createResultBlock({ titleText, detectedType, convertedText }) {
  const container = document.createElement('div');
  container.classList.add('output');
  container.innerHTML = `
    <h2>${titleText}</h2>
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

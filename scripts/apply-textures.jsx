// apply-textures.jsx
// Photoshop 2026 バッチ処理スクリプト
//
// 戦略: 外スマートオブジェクト ("Double Click to Add Your Texture Here") の
//       コンテンツを直接 placedLayerReplaceContents で差し替える。
//       PSB を開閉しないので状態キャッシュ問題を回避できる。

#target photoshop

var inputFile = new File("/tmp/cococase-designs.json");
inputFile.open("r");
var json = inputFile.read();
inputFile.close();

var inputData   = eval("(" + json + ")");
var designs     = inputData.designs || inputData;
var PSD_DIR     = inputData.psdDir || "/Volumes/PSScratch/UserData/Downloads/Airpods Pro Case Mockup 12 in 1/";
var MOCKUPS_DIR = inputData.mockupsDir || "/Users/tsuji/cococase-app/public/mockups";
if (MOCKUPS_DIR.charAt(MOCKUPS_DIR.length - 1) !== "/") MOCKUPS_DIR += "/";

var POSITIONS = [
  {
    psd:         "airpods-pro-pos1[2d smart object].psd",
    out:         "pos01.png",
    patternsDir: "/tmp/patterns-pos01/"
  },
  {
    psd:         "airpods-pro-pos2[2d smart object].psd",
    out:         "pos02.png",
    patternsDir: "/tmp/patterns-pos02/"
  }
];

// ── ユーティリティ ────────────────────────────────────────────────────────────

function slug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

var logFile = new File("/tmp/cococase-progress.log");
logFile.open("w"); logFile.close();

function log(msg) {
  logFile.open("a");
  logFile.writeln(msg);
  logFile.close();
}

function findLayer(container, name) {
  for (var i = 0; i < container.layers.length; i++) {
    if (container.layers[i].name === name) return container.layers[i];
    try {
      if (container.layers[i].layers && container.layers[i].layers.length > 0) {
        var f = findLayer(container.layers[i], name);
        if (f) return f;
      }
    } catch(e) {}
  }
  return null;
}

// ── ポジションごとに処理 ───────────────────────────────────────────────────────

app.displayDialogs = DialogModes.NO;

for (var p = 0; p < POSITIONS.length; p++) {
  var pos = POSITIONS[p];
  log("=== " + pos.out + " ===");

  var psdFile = new File(PSD_DIR + pos.psd);
  if (!psdFile.exists) { log("ERROR: PSD not found - " + pos.psd); continue; }

  // PSD を開く（チャンク内で1回だけ）
  app.open(psdFile);
  var templateDoc = app.activeDocument;

  // pos02: "Change Background Color" レイヤーをグレー(225,225,225)に変更
  // DONOTSAVECHANGES で閉じるので PSD は汚れない
  if (pos.out === "pos02.png") {
    var bgColorLayer = findLayer(templateDoc, "Change Background Color");
    if (bgColorLayer) {
      templateDoc.activeLayer = bgColorLayer;
      var setDesc = new ActionDescriptor();
      var setRef = new ActionReference();
      setRef.putEnumerated(stringIDToTypeID("contentLayer"), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
      setDesc.putReference(charIDToTypeID("null"), setRef);
      var contentDesc = new ActionDescriptor();
      var colorDesc = new ActionDescriptor();
      colorDesc.putDouble(charIDToTypeID("Rd  "), 225.0);
      colorDesc.putDouble(charIDToTypeID("Grn "), 225.0);
      colorDesc.putDouble(charIDToTypeID("Bl  "), 225.0);
      contentDesc.putObject(charIDToTypeID("Clr "), charIDToTypeID("RGBC"), colorDesc);
      setDesc.putObject(charIDToTypeID("T   "), stringIDToTypeID("solidColorLayer"), contentDesc);
      executeAction(stringIDToTypeID("set"), setDesc, DialogModes.NO);
    }
  }

  // 外 SmartObject を特定
  var outerSO = findLayer(templateDoc, "Double Click to Add Your Texture Here");
  if (!outerSO) {
    log("ERROR: outer SO not found");
    templateDoc.close(SaveOptions.DONOTSAVECHANGES);
    continue;
  }

  // ── デザインループ ────────────────────────────────────────────────────────
  for (var d = 0; d < designs.length; d++) {
    var design  = designs[d];
    var sl      = slug(design.name);
    var outDir  = MOCKUPS_DIR + design.id + "_" + sl + "/";
    var outPath = outDir + pos.out;

    if (new File(outPath).exists) {
      log("SKIP: " + design.id + " " + pos.out);
      continue;
    }

    var patternPath = pos.patternsDir + design.id + "_" + sl + ".jpg";
    if (!new File(patternPath).exists) {
      log("WARN: tiled pattern missing - " + design.id);
      continue;
    }

    try {
      // 外SOを選択
      app.activeDocument = templateDoc;
      templateDoc.activeLayer = outerSO;

      // 直接 Replace Contents（PSB を開かない）
      var replaceDesc = new ActionDescriptor();
      replaceDesc.putPath(charIDToTypeID("null"), new File(patternPath));
      executeAction(stringIDToTypeID("placedLayerReplaceContents"), replaceDesc, DialogModes.NO);

      // PNG エクスポート
      var outFolder = new Folder(outDir);
      if (!outFolder.exists) outFolder.create();

      var saveOpts = new PNGSaveOptions();
      saveOpts.compression = 6;
      templateDoc.saveAs(new File(outPath), saveOpts, true, Extension.LOWERCASE);

      // スクラッチディスク解放
      try { app.purge(PurgeTarget.ALLCACHES); } catch(e) {}

      log("OK: " + design.id + " " + design.name + " " + pos.out);

    } catch(e) {
      log("ERROR: " + design.id + " " + pos.out + " - " + e.toString());
      try { app.purge(PurgeTarget.ALLCACHES); } catch(e2) {}
    }
  }

  // PSD を閉じる
  try { templateDoc.close(SaveOptions.DONOTSAVECHANGES); } catch(e) {}
  log("=== " + pos.out + " done ===");
}

log("ALL DONE");

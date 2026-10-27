/**
 * PTI093_DATA_API
 * Backend Google Apps Script cho App giám định ảnh PTI093.
 *
 * Bản tối ưu:
 * - Giữ nguyên cấu trúc Drive / INDEX / project.pti.
 * - Upload ảnh chống trùng theo SHA-256 phía server.
 * - Có uploadStatus + JSONP để frontend xác nhận ảnh đã lưu.
 * - Giữ tương thích với frontend cũ dùng iframe + postMessage.
 * - Không tự xóa các ảnh cũ đang tồn tại trong Drive.
 */
const PTI093_FOLDER_ID = '1OPf_P8x8nOtndzpBsV2xvpZReQ2ufas9';


const INDEX_FOLDER_NAME = '_INDEX';


const INDEX_SHEET_NAME = 'PTI093_INDEX';


/**


 * Tạo hệ thống INDEX cho PTI093.


 *


 * Kết quả:


 * PTI093_DATA


 * └── _INDEX


 *     └── PTI093_INDEX


 */


function setupIndex() {


  const root = DriveApp.getFolderById(PTI093_FOLDER_ID);


  // Tạo hoặc lấy thư mục _INDEX


  const indexFolder = getOrCreateFolder(


    root,


    INDEX_FOLDER_NAME


  );


  // Kiểm tra Google Sheet INDEX đã tồn tại chưa


  const files = indexFolder.getFilesByName(INDEX_SHEET_NAME);


  if (files.hasNext()) {


    const file = files.next();


    Logger.log('INDEX đã tồn tại.');


    Logger.log('Tên: ' + file.getName());


    Logger.log('ID: ' + file.getId());


    return;


  }


  // Tạo Google Sheet mới


  const spreadsheet = SpreadsheetApp.create(


    INDEX_SHEET_NAME


  );


  const file = DriveApp.getFileById(


    spreadsheet.getId()


  );


  // Đưa Sheet vào thư mục _INDEX


  file.moveTo(indexFolder);


  const sheet = spreadsheet.getSheets()[0];


  // Tiêu đề INDEX


  const headers = [


    'Record ID',


    'Số hồ sơ PTI',


    'BKS',


    'GĐV',


    'Ngày tạo',


    'Cập nhật',


    'Trạng thái',


    'Folder ID',


    'Có PDF'


  ];


  sheet


    .getRange(1, 1, 1, headers.length)


    .setValues([headers]);


  // Định dạng tiêu đề


  sheet


    .getRange(1, 1, 1, headers.length)


    .setFontWeight('bold');


  // Cố định hàng đầu


  sheet.setFrozenRows(1);


  // Tự điều chỉnh cột


  sheet.autoResizeColumns(


    1,


    headers.length


  );


  Logger.log('Đã tạo INDEX thành công.');


  Logger.log('Tên: ' + INDEX_SHEET_NAME);


  Logger.log('ID: ' + spreadsheet.getId());


}


/**


 * Tạo một hồ sơ thử nghiệm theo cấu trúc mới.


 */


function createTestRecord() {
  return createRecordFromApp({
    bks: '15A-123.55',
    caseNumber: '',
    gdv: 'Phạm Duy Thái',
    status: 'Đang xử lý'
  });
}

function getIndexSpreadsheet() {


  const root =


    DriveApp.getFolderById(


      PTI093_FOLDER_ID


    );


  const indexFolder =


    getOrCreateFolder(


      root,


      INDEX_FOLDER_NAME


    );


  const files =


    indexFolder.getFilesByName(


      INDEX_SHEET_NAME


    );


  if (files.hasNext()) {


    return SpreadsheetApp.openById(


      files.next().getId()


    );


  }


  throw new Error(


    'Chưa có PTI093_INDEX. ' +


    'Hãy chạy setupIndex trước.'


  );


}


/**


 * Lấy thư mục đã có


 * hoặc tạo mới nếu chưa có.


 */


function getOrCreateFolder(


  parentFolder,


  folderName


) {


  const folders =


    parentFolder.getFoldersByName(


      folderName


    );


  if (folders.hasNext()) {


    return folders.next();


  }


  return parentFolder.createFolder(


    folderName


  );


}/**


 * Tìm hồ sơ trong INDEX.


 *


 * Có thể tìm bằng:


 * - Record ID


 * - Số hồ sơ PTI


 * - BKS


 * - GĐV


 * - ngày


 * - trạng thái


 */


function searchRecords(keyword) {


  if (!keyword) {


    Logger.log('Chưa nhập từ khóa tìm kiếm.');


    return [];


  }


  const sheet = getIndexSpreadsheet()


    .getSheets()[0];


  const data = sheet.getDataRange().getValues();


  if (data.length <= 1) {


    Logger.log('INDEX chưa có hồ sơ.');


    return [];


  }


  const key = String(keyword)


    .trim()


    .toLowerCase()


    .replace(/[\s.-]/g, '');


  const results = [];


  for (let i = 1; i < data.length; i++) {


    const row = data[i];


    const searchableText = row


      .slice(0, 9)


      .map(value => String(value))


      .join(' ')


      .toLowerCase()


      .replace(/[\s.-]/g, '');


    if (searchableText.includes(key)) {


      results.push({


        recordId: row[0],


        caseNumber: row[1],


        bks: row[2],


        gdv: row[3],


        createdAt: row[4],


        updatedAt: row[5],


        status: row[6],


        folderId: row[7],


        hasPdf: row[8]


      });


    }


  }


  Logger.log(


    'Tìm kiếm: ' +


    keyword +


    ' → ' +


    results.length +


    ' hồ sơ'


  );


  results.forEach((item, index) => {


    Logger.log(


      (index + 1) +


      '. ' +


      item.recordId +


      ' | BKS: ' +


      item.bks +


      ' | GĐV: ' +


      item.gdv


    );


  });


  return results;


}


/**


 * Hàm kiểm tra tìm kiếm.


 *


 * Đang thử tìm BKS của hồ sơ TEST.


 */


function testSearch() {


  const results =


    searchRecords('15A-123.55');


  Logger.log(


    JSON.stringify(


      results,


      null,


      2


    )


  );


}/**


 * Mở một hồ sơ theo Record ID.


 *


 * Trả về dữ liệu từ project.pti


 * và thông tin thư mục lưu trữ.


 */


function openRecord(recordId) {


  if (!recordId) {


    throw new Error('Chưa cung cấp Record ID.');


  }


  const indexSpreadsheet = getIndexSpreadsheet();


  const sheet = indexSpreadsheet.getSheets()[0];


  const data = sheet.getDataRange().getValues();


  if (data.length <= 1) {


    throw new Error('INDEX chưa có hồ sơ.');


  }


  let record = null;


  // Tìm Record ID trong INDEX


  for (let i = 1; i < data.length; i++) {


    if (String(data[i][0]).trim() === String(recordId).trim()) {


      record = {


        recordId: data[i][0],


        caseNumber: data[i][1],


        bks: data[i][2],


        gdv: data[i][3],


        createdAt: data[i][4],


        updatedAt: data[i][5],


        status: data[i][6],


        folderId: data[i][7],


        hasPdf: data[i][8]


      };


      break;


    }


  }


  if (!record) {


    throw new Error(


      'Không tìm thấy Record ID: ' +


      recordId


    );


  }


  // Lấy thư mục hồ sơ


  const caseFolder =


    DriveApp.getFolderById(


      record.folderId


    );


  // Tìm project.pti


  const projectFiles =


    caseFolder.getFilesByName(


      'project.pti'


    );


  if (!projectFiles.hasNext()) {


    throw new Error(


      'Không tìm thấy project.pti trong hồ sơ: ' +


      recordId


    );


  }


  const projectFile =


    projectFiles.next();


  // Đọc nội dung project.pti


  const projectText =


    projectFile.getBlob()


      .getDataAsString('UTF-8');


  let projectData;


  try {


    projectData =


      JSON.parse(projectText);


  } catch (error) {


    throw new Error(


      'project.pti không phải JSON hợp lệ.'


    );


  }


  // Lấy thư mục images


  let imageFolderId = '';


  const imageFolders =


    caseFolder.getFoldersByName(


      'images'


    );


  if (imageFolders.hasNext()) {


    imageFolderId =


      imageFolders.next().getId();


  }


  // Lấy thư mục pdf


  let pdfFolderId = '';


  const pdfFolders =


    caseFolder.getFoldersByName(


      'pdf'


    );


  if (pdfFolders.hasNext()) {


    pdfFolderId =


      pdfFolders.next().getId();


  }

  const images=[]; if(imageFolderId){const imageFolder=DriveApp.getFolderById(imageFolderId),imageFiles=imageFolder.getFiles();while(imageFiles.hasNext()){const f=imageFiles.next();images.push({fileId:f.getId(),fileName:f.getName(),mimeType:f.getMimeType(),createdAt:f.getDateCreated().toISOString(),size:f.getSize()});}images.sort((a,b)=>a.createdAt.localeCompare(b.createdAt));}

  const result={record:record,project:projectData,images:images,storage:{caseFolderId:caseFolder.getId(),imageFolderId:imageFolderId,pdfFolderId:pdfFolderId,projectFileId:projectFile.getId()}};


  Logger.log(


    'Đã mở hồ sơ: ' +


    record.recordId


  );


  Logger.log(


    'project.pti: ' +


    projectFile.getId()


  );


  Logger.log(


    JSON.stringify(


      result,


      null,


      2


    )


  );


  return result;


}


/**


 * Kiểm tra chức năng mở hồ sơ.


 */


function testOpenRecord() {


  const recordId =


    'PTI093-20261009-073757-C9E6CE98';


  const result =


    openRecord(recordId);


  Logger.log(


    JSON.stringify(


      result,


      null,


      2


    )


  );


}/**


 * API PTI093_DATA_API


 *


 * Không có action:


 *   → kiểm tra kết nối


 *

 * action=createRecord:


 *   → tạo một hồ sơ mới trên Drive


 */


function doGet(e) {
  const params = (e && e.parameter) ? e.parameter : {};
  const action = String(params.action || '').trim();

  // Không có action: kiểm tra API.
  if (!action) {
    return pti093JsonResponse_({
      success: true,
      app: 'PTI093_DATA_API',
      message: 'PTI093 API đang hoạt động',
      time: new Date().toISOString()
    });
  }

  // Kiểm tra trạng thái upload. Endpoint này hỗ trợ JSONP
  // để App ghép ảnh có thể xác nhận ảnh đã được lưu mà không
  // phụ thuộc vào postMessage của iframe.
  if (action === 'uploadStatus') {
    try {
      const recordId = String(params.recordId || '').trim();
      const uploadKey = String(params.uploadKey || '').trim();
      const callback = String(params.callback || '').trim();
      if (!recordId) throw new Error('Thiếu recordId.');
      if (!/^sha256:[a-f0-9]{64}$/i.test(uploadKey)) throw new Error('uploadKey không hợp lệ.');
      const meta = readPTI093DriveUploadEntry_(recordId, uploadKey);
      return pti093JsonpResponse_({
        success: true, found: !!meta, pendingIndex: !!(meta && meta.pendingIndex), recordId: recordId, uploadKey: uploadKey,
        fileId: meta ? meta.fileId : '', fileName: meta ? meta.fileName : '',
        fileUrl: meta ? meta.fileUrl : '', createdAt: meta ? meta.createdAt : '',
        size: meta ? Number(meta.size || 0) : 0, clientKey: meta ? meta.clientKey || '' : ''
      }, callback);
    } catch (error) {
      return pti093JsonpResponse_({ success: false, found: false, error: error && error.message ? error.message : String(error) }, String(params.callback || '').trim());
    }
  }

  if (action === 'createRecord') {
    try {
      const result = createRecordFromApp({
        bks: String(params.bks || '').trim(),
        caseNumber: String(params.caseNumber || '').trim(),
        gdv: String(params.gdv || '').trim(),
        status: String(params.status || 'Đang xử lý').trim()
      });
      return pti093JsonResponse_(result);
    } catch (error) {
      return pti093JsonResponse_({
        success: false,
        error: error && error.message ? error.message : String(error)
      });
    }
  }

  if (action === 'searchRecords') {
    try {
      const keyword = String(params.keyword || '').trim();
      return pti093JsonResponse_({
        success: true,
        keyword: keyword,
        results: searchRecords(keyword)
      });
    } catch (error) {
      return pti093JsonResponse_({
        success: false,
        error: error && error.message ? error.message : String(error)
      });
    }
  }

  if (action === 'openRecord') {
    try {
      const recordId = String(params.recordId || '').trim();
      return pti093JsonResponse_(Object.assign(
        { success: true },
        openRecord(recordId)
      ));
    } catch (error) {
      return pti093JsonResponse_({
        success: false,
        error: error && error.message ? error.message : String(error)
      });
    }
  }

  if (action === 'projectStatus') {
    try {
      const recordId = String(params.recordId || '').trim();
      const revision = String(params.revision || '').trim();
      return pti093JsonResponse_(getProjectStatus(recordId, revision));
    } catch (error) {
      return pti093JsonResponse_({
        success: false,
        error: error && error.message ? error.message : String(error)
      });
    }
  }

  if (action === 'getImage') {
    try {
      const fileId = String(params.fileId || '').trim();
      if (!fileId) throw new Error('Thiếu fileId.');

      const file = DriveApp.getFileById(fileId);
      const blob = file.getBlob();

      return pti093JsonResponse_({
        success: true,
        fileId: fileId,
        fileName: file.getName(),
        mimeType: blob.getContentType() || 'image/jpeg',
        base64: Utilities.base64Encode(blob.getBytes())
      });
    } catch (error) {
      return pti093JsonResponse_({
        success: false,
        error: error && error.message ? error.message : String(error)
      });
    }
  }

  return pti093JsonResponse_({
    success: false,
    error: 'Action không hợp lệ: ' + action
  });
}

/**
 * Trả JSON chuẩn cho các API GET/POST thông thường.
 */
function pti093JsonResponse_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Trả JSONP cho uploadStatus.
 *
 * Chỉ cho phép callback có tên JavaScript hợp lệ; nếu không có
 * callback thì trả JSON thường.
 */
function pti093JsonpResponse_(data, callback) {
  const json = JSON.stringify(data);
  const cb = String(callback || '').trim();

  if (cb && /^[A-Za-z_$][A-Za-z0-9_$]*(\.[A-Za-z_$][A-Za-z0-9_$]*)*$/.test(cb)) {
    return ContentService
      .createTextOutput(cb + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Phản hồi cho iframe bridge của App cũ.
 * Giữ tương thích với frontend dùng postMessage.
 */
function pti093BridgeResponse_(data) {
  return HtmlService.createHtmlOutput(
    '<!doctype html><html><body><script>' +
    'window.top.postMessage(' +
    JSON.stringify(Object.assign({ source: 'PTI093_DATA_API' }, data)) +
    ', "*");' +
    '</script></body></html>'
  );
}

function createRecordFromApp(data) {


  const root = DriveApp.getFolderById(


    PTI093_FOLDER_ID


  );


  const now = new Date();


  const timezone =


    Session.getScriptTimeZone();


  // =========================


  // TẠO RECORD ID


  // =========================


  const datePart =


    Utilities.formatDate(


      now,


      timezone,


      'yyyyMMdd'


    );


  const timePart =


    Utilities.formatDate(


      now,


      timezone,


      'HHmmss'


    );


  const uuid =


    Utilities


      .getUuid()


      .replace(/-/g, '')


      .substring(0, 8)


      .toUpperCase();


  const recordId =


    'PTI093-' +


    datePart +


    '-' +


    timePart +


    '-' +


    uuid;


  // =========================


  // DỮ LIỆU HỒ SƠ


  // =========================


  const bks =


    String(data.bks || '').trim();


  const caseNumber =


    String(data.caseNumber || '').trim();


  const gdv =


    String(data.gdv || '').trim();


  const status =


    String(


      data.status || 'Đang xử lý'


    ).trim();


  // =========================


  // TẠO THƯ MỤC NĂM / THÁNG


  // =========================


  const yearName =


    Utilities.formatDate(


      now,


      timezone,


      'yyyy'


    );


  const monthName =


    Utilities.formatDate(


      now,


      timezone,


      'MM'


    );


  const yearFolder =


    getOrCreateFolder(


      root,


      yearName


    );


  const monthFolder =


    getOrCreateFolder(


      yearFolder,


      monthName


    );


  // =========================


  // TẠO THƯ MỤC HỒ SƠ


  // =========================


  const caseFolder =


    monthFolder.createFolder(


      recordId


    );


  // =========================


  // TẠO THƯ MỤC ẢNH


  // =========================


  const imageFolder =


    caseFolder.createFolder(


      'images'


    );


  // =========================


  // TẠO THƯ MỤC PDF


  // =========================


  const pdfFolder =


    caseFolder.createFolder(


      'pdf'


    );


  // =========================


  // TẠO PROJECT.PTI


  // =========================


  const projectData = {


    version: 'PTI093-1.0',


    recordId: recordId,


    caseNumber: caseNumber,


    bks: bks,


    maHoSo: caseNumber,


    gdv: gdv,


    status: status,


    createdAt: now.toISOString(),


    updatedAt: now.toISOString(),


    settings: {


      paperSize: 'A4',


      orientation: 'portrait',


      imagesPerPage: 6


    },


    sections: [],


    storage: {


      folderId:


        caseFolder.getId(),


      imageFolderId:


        imageFolder.getId(),


      pdfFolderId:


        pdfFolder.getId()


    }


  };


  caseFolder.createFile(


    'project.pti',


    JSON.stringify(


      projectData,


      null,


      2


    ),


    MimeType.PLAIN_TEXT


  );


  // =========================


  // GHI VÀO INDEX


  // =========================


  const indexSpreadsheet =


    getIndexSpreadsheet();


  const sheet =


    indexSpreadsheet


      .getSheets()[0];


  sheet.appendRow([


    recordId,


    caseNumber,


    bks,


    gdv,


    now,


    now,


    status,


    caseFolder.getId(),


    'Không'


  ]);


  // =========================


  // TRẢ KẾT QUẢ CHO APP


  // =========================


  return {


    success: true,


    message:


      'Tạo hồ sơ thành công',


    recordId: recordId,


    bks: bks,


    caseNumber: caseNumber,


    gdv: gdv,


    status: status,


    createdAt:


      now.toISOString(),


    storage: {


      caseFolderId:


        caseFolder.getId(),


      imageFolderId:


        imageFolder.getId(),


      pdfFolderId:


        pdfFolder.getId()


    }


  };


}/**


 * TEST tạo hồ sơ từ App


 */


function testCreateRecordFromApp() {


  const result = createRecordFromApp({


    bks: 'TEST-API-093',


    caseNumber: '',


    gdv: 'Nguyễn Minh Ngọc',


    status: 'Đang xử lý'


  });


  Logger.log(


    JSON.stringify(


      result,


      null,


      2


    )


  );


}/**


 * API nhận ảnh từ App ghép ảnh


 *


 * action=uploadImage


 * Dữ liệu gửi dạng JSON:


 * {


 *   recordId: "...",


 *   fileName: "...",


 *   mimeType: "image/jpeg",


 *   base64: "..."


 * }


 */


/**



 * API nhận ảnh từ App ghép ảnh.



 *



 * Hỗ trợ 2 kiểu POST:



 * 1) JSON trực tiếp: e.postData.contents



 * 2) Form bridge: e.parameter.payload (dùng iframe để tránh CORS/no-cors)



 *



 * action=uploadImage



 * {



 *   action: 'uploadImage',



 *   recordId: '...',



 *   fileName: '...',



 *   mimeType: 'image/jpeg',



 *   base64: '...'



 * }



 */



/**



 * API nhận ảnh từ App ghép ảnh



 *



 * Chống trùng phía SERVER:



 * - Mỗi ảnh mới phải có clientKey từ App.



 * - Server lưu danh sách clientKey đã nhận trong file



 *   .pti093_upload_index.json của từng hồ sơ.



 * - Cùng Record ID + cùng clientKey => KHÔNG tạo file mới.



 * - Có LockService để tránh 2 request đồng thời cùng tạo trùng.



 *



 * Vẫn hỗ trợ:



 * 1) JSON trực tiếp: e.postData.contents



 * 2) Form bridge: e.parameter.payload



 */



/**
 * API nhận dữ liệu từ App ghép ảnh.
 *
 * Hỗ trợ:
 * 1) JSON trực tiếp: e.postData.contents
 * 2) Form bridge: e.parameter.payload (iframe)
 *
 * action=saveProject
 * action=uploadImage
 */
function doPost(e) {
  const _ptiPerf = { startedAt: Date.now(), marks: {}, stages: {} };
  const _ptiStart = function(name) { _ptiPerf.marks[name] = Date.now(); };
  const _ptiEnd = function(name) { if (_ptiPerf.marks[name] !== undefined) _ptiPerf.stages[name + 'Ms'] = Date.now() - _ptiPerf.marks[name]; };
  const _ptiLog = function(outcome) { try { Logger.log('PTI093_UPLOAD_PERF ' + JSON.stringify({ outcome: outcome, totalMs: Date.now() - _ptiPerf.startedAt, stages: _ptiPerf.stages })); } catch (ignore) {} };
  let isBridge = false;
  let requestRecordId = '';
  let requestUploadKey = '';

  try {
    let data;

    if (e && e.parameter && e.parameter.payload) {
      data = JSON.parse(String(e.parameter.payload));
      isBridge = true;
    } else if (e && e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else {
      throw new Error('Không nhận được dữ liệu POST.');
    }

    if (!data || !data.action) {
      throw new Error('Thiếu action.');
    }

    // ------------------------------------------------------------
    // SAVE PROJECT
    // ------------------------------------------------------------
    if (data.action === 'saveProject') {
      const recordId = String(data.recordId || '').trim();
      const revision = String(data.revision || '').trim();
      const project = data.project;

      if (!recordId) throw new Error('Thiếu recordId.');
      if (!revision) throw new Error('Thiếu revision.');
      if (!project || typeof project !== 'object') {
        throw new Error('Thiếu dữ liệu project.');
      }

      const root = DriveApp.getFolderById(PTI093_FOLDER_ID);
      const caseFolder = findPTI093RecordFolder(root, recordId);
      if (!caseFolder) {
        throw new Error('Không tìm thấy hồ sơ: ' + recordId);
      }

      const projectFiles = caseFolder.getFilesByName('project.pti');
      if (!projectFiles.hasNext()) {
        throw new Error('Không tìm thấy project.pti.');
      }

      const projectFile = projectFiles.next();
      const lock = LockService.getScriptLock();
      lock.waitLock(30000);

      try {
        let previousProject = {};
        try {
          const previousText = projectFile.getBlob().getDataAsString('UTF-8');
          previousProject = previousText.trim() ? JSON.parse(previousText) : {};
        } catch (ignore) {}

        const saved = Object.assign({}, project, {
          uploadIndex: previousProject.uploadIndex && typeof previousProject.uploadIndex === 'object' ? previousProject.uploadIndex : {},
          uploadIndexVersion: Number(previousProject.uploadIndexVersion || 0),
          recordId: recordId,
          revision: revision,
          updatedAt: new Date().toISOString(),
          storage: Object.assign(
            {},
            project.storage || {},
            { folderId: caseFolder.getId() }
          )
        });

        projectFile.setContent(JSON.stringify(saved, null, 2));
        updatePTI093IndexRow(recordId, saved);

        const result = {
          success: true,
          recordId: recordId,
          revision: revision,
          updatedAt: saved.updatedAt
        };
        return isBridge
          ? pti093BridgeResponse_(result)
          : pti093JsonResponse_(result);

      } finally {
        lock.releaseLock();
      }
    }

    // ------------------------------------------------------------
    // UPLOAD IMAGE — nguồn sự thật là project.pti trong đúng hồ sơ Drive.
// Ghi chỉ mục theo lô: chỉ một lần đọc/ghi project.pti cho cả nhóm ảnh.
    if (data.action === 'commitUploadIndex') {
      const recordId = String(data.recordId || '').trim();
      const batchUploadKey = String(data.uploadKey || '').trim().toLowerCase();
      requestRecordId = recordId;
      requestUploadKey = batchUploadKey;
      if (!recordId) throw new Error('Thiếu recordId cho commit nhóm.');
      if (!/^sha256:[a-f0-9]{64}$/i.test(batchUploadKey)) throw new Error('Mã SHA-256 của commit nhóm không hợp lệ.');
      const items = Array.isArray(data.items) ? data.items : [];
      if (!items.length) throw new Error('Không có ảnh để ghi chỉ mục nhóm.');
      if (items.length > 100) throw new Error('Nhóm commit vượt giới hạn 100 ảnh.');

      const root = DriveApp.getFolderById(PTI093_FOLDER_ID);
      const caseFolder = findPTI093RecordFolder(root, recordId);
      if (!caseFolder) throw new Error('Không tìm thấy hồ sơ: ' + recordId);
      const imageFolders = caseFolder.getFoldersByName('images');
      if (!imageFolders.hasNext()) throw new Error('Không tìm thấy thư mục images.');
      const imageFolder = imageFolders.next();
      const projectFiles = caseFolder.getFilesByName('project.pti');
      if (!projectFiles.hasNext()) throw new Error('Không tìm thấy project.pti.');
      const projectFile = projectFiles.next();
      const lock = LockService.getScriptLock();
      let batchResult;

      _ptiStart('batchCommitLockWait');
      lock.waitLock(30000);
      _ptiEnd('batchCommitLockWait');
      _ptiStart('batchCommitWork');
      try {
        const text = projectFile.getBlob().getDataAsString('UTF-8');
        const project = text.trim() ? JSON.parse(text) : {};
        if (!project || typeof project !== 'object' || Array.isArray(project)) {
          throw new Error('project.pti không phải JSON hồ sơ hợp lệ.');
        }
        const index = project.uploadIndex && typeof project.uploadIndex === 'object' && !Array.isArray(project.uploadIndex)
          ? project.uploadIndex : {};

        // Migration an toàn nếu lô này gặp hồ sơ chưa khởi tạo uploadIndex.
        if (Number(project.uploadIndexVersion || 0) < 1) {
          const oldFiles = imageFolder.getFiles();
          while (oldFiles.hasNext()) {
            const oldFile = oldFiles.next();
            if (oldFile.isTrashed()) continue;
            const oldBytes = oldFile.getBlob().getBytes();
            const oldKey = 'sha256:' + sha256HexPTI093(oldBytes);
            if (!index[oldKey]) {
              const marker = 'PTI093_UPLOAD_KEY=' + oldKey;
              const description = oldFile.getDescription() || '';
              if (description.indexOf(marker) < 0) oldFile.setDescription((description + '\n' + marker).trim());
              index[oldKey] = {
                fileId: oldFile.getId(),
                fileName: oldFile.getName(),
                fileUrl: oldFile.getUrl(),
                createdAt: oldFile.getDateCreated().toISOString(),
                clientKey: '',
                size: oldBytes.length
              };
            }
          }
        }

        const isInImagesFolder = function(file) {
          const parents = file.getParents();
          while (parents.hasNext()) {
            if (parents.next().getId() === imageFolder.getId()) return true;
          }
          return false;
        };

        const committedItems = [];
        for (let i = 0; i < items.length; i++) {
          const item = items[i] || {};
          const imageKey = String(item.uploadKey || '').trim().toLowerCase();
          const requestedFileId = String(item.fileId || '').trim();
          const clientKey = String(item.clientKey || '').trim();
          if (!/^sha256:[a-f0-9]{64}$/i.test(imageKey)) {
            throw new Error('uploadKey không hợp lệ ở phần tử ' + (i + 1) + '.');
          }

          let candidate = null;
          if (requestedFileId) {
            try {
              const possible = DriveApp.getFileById(requestedFileId);
              if (!possible.isTrashed()) candidate = possible;
            } catch (ignore) {}
          }

          let existing = null;
          const prior = index[imageKey];
          if (prior && prior.fileId) {
            try {
              const possible = DriveApp.getFileById(String(prior.fileId));
              if (!possible.isTrashed() && isInImagesFolder(possible)) existing = possible;
            } catch (ignore) {}
          }

          let meta;
          let duplicate = false;
          if (existing) {
            if (candidate && candidate.getId() !== existing.getId()) {
              try {
                const marker = 'PTI093_UPLOAD_KEY=' + imageKey;
                if (isInImagesFolder(candidate) && (candidate.getDescription() || '').indexOf(marker) >= 0) {
                  candidate.setTrashed(true);
                  duplicate = true;
                }
              } catch (ignore) {}
            }
            meta = {
              fileId: existing.getId(),
              fileName: existing.getName(),
              fileUrl: existing.getUrl(),
              createdAt: existing.getDateCreated().toISOString(),
              clientKey: prior.clientKey || clientKey,
              size: existing.getSize()
            };
            index[imageKey] = meta;
          } else {
            if (!candidate) throw new Error('Không tìm thấy ảnh chờ commit: ' + imageKey);
            if (!isInImagesFolder(candidate)) throw new Error('Ảnh chờ commit không nằm trong thư mục images của hồ sơ.');
            const marker = 'PTI093_UPLOAD_KEY=' + imageKey;
            if ((candidate.getDescription() || '').indexOf(marker) < 0) {
              throw new Error('Dấu SHA-256 trên ảnh không khớp uploadKey: ' + imageKey);
            }
            meta = {
              fileId: candidate.getId(),
              fileName: candidate.getName(),
              fileUrl: candidate.getUrl(),
              createdAt: candidate.getDateCreated().toISOString(),
              clientKey: clientKey,
              size: candidate.getSize()
            };
            index[imageKey] = meta;
          }

          committedItems.push({
            success: true,
            uploadKey: imageKey,
            fileId: meta.fileId,
            fileName: meta.fileName,
            fileUrl: meta.fileUrl,
            createdAt: meta.createdAt,
            size: Number(meta.size || 0),
            clientKey: meta.clientKey || clientKey,
            duplicate: duplicate
          });
        }

        project.uploadIndex = index;
        project.uploadIndexVersion = 1;
        _ptiStart('batchProjectIndexWrite');
        projectFile.setContent(JSON.stringify(project));
        _ptiEnd('batchProjectIndexWrite');

        for (let i = 0; i < committedItems.length; i++) {
          const item = committedItems[i];
          cachePTI093DriveUploadEntry_(recordId, item.uploadKey, {
            success: true,
            recordId: recordId,
            uploadKey: item.uploadKey,
            fileId: item.fileId,
            fileName: item.fileName,
            fileUrl: item.fileUrl,
            createdAt: item.createdAt,
            size: item.size,
            clientKey: item.clientKey,
            pendingIndex: false
          });
        }

        batchResult = {
          success: true,
          found: true,
          pendingIndex: false,
          recordId: recordId,
          uploadKey: batchUploadKey,
          items: committedItems
        };
      } finally {
        lock.releaseLock();
        _ptiEnd('batchCommitWork');
      }

      // Cho phép frontend xác minh lại commit nếu phản hồi iframe bị mất.
      try {
        CacheService.getScriptCache().put(
          'pti093:upload:' + recordId + ':' + batchUploadKey,
          JSON.stringify({ success: true, recordId: recordId, uploadKey: batchUploadKey, pendingIndex: false, batchCommit: true }),
          90
        );
      } catch (ignore) {}
      _ptiLog('batch-commit-success');
      return isBridge ? pti093BridgeResponse_(batchResult) : pti093JsonResponse_(batchResult);
    }

    if (data.action !== 'uploadImage') throw new Error('Action không hợp lệ: ' + String(data.action || ''));

    const recordId = String(data.recordId || '').trim();
    requestRecordId = recordId;
    const clientKey = String(data.clientKey || '').trim();
    const fileName = String(data.fileName || 'image.jpg').trim();
    const mimeType = String(data.mimeType || 'image/jpeg').trim();
    const base64 = String(data.base64 || '').trim();
    if (!recordId) throw new Error('Thiếu recordId.');
    if (!base64) throw new Error('Thiếu dữ liệu ảnh.');
    if (base64.length > 18000000) throw new Error('Ảnh vượt giới hạn payload 18 MB.');
    _ptiStart('base64Decode');
    const bytes = Utilities.base64Decode(base64);
    _ptiEnd('base64Decode');
    _ptiStart('sha256');
    const computedKey = 'sha256:' + sha256HexPTI093(bytes);
    _ptiEnd('sha256');
    const uploadKey = String(data.uploadKey || computedKey).trim().toLowerCase();
    requestUploadKey = uploadKey;
    if (uploadKey !== computedKey) throw new Error('Mã SHA-256 phía trình duyệt không khớp dữ liệu ảnh.');
    const uploadCacheKey = 'pti093:upload:' + recordId + ':' + uploadKey;
    try { CacheService.getScriptCache().put(uploadCacheKey, '__UPLOADING__', 90); } catch (ignore) {}
    _ptiStart('driveFolderLookup');
    const root = DriveApp.getFolderById(PTI093_FOLDER_ID);
    const caseFolder = findPTI093RecordFolder(root, recordId);
    if (!caseFolder) throw new Error('Không tìm thấy hồ sơ: ' + recordId);
    const imageFolders = caseFolder.getFoldersByName('images');
    if (!imageFolders.hasNext()) throw new Error('Không tìm thấy thư mục images.');
    const imageFolder = imageFolders.next();
    const projectFiles = caseFolder.getFilesByName('project.pti');
    if (!projectFiles.hasNext()) throw new Error('Không tìm thấy project.pti.');
    const projectFile = projectFiles.next();
    _ptiEnd('driveFolderLookup');
    let lock = LockService.getScriptLock();
    let project = {};
    let index = {};
    _ptiStart('firstLockWait');
    lock.waitLock(30000);
    _ptiEnd('firstLockWait');
    _ptiStart('firstLockWork');
    try {
      const text = projectFile.getBlob().getDataAsString('UTF-8');
      project = text.trim() ? JSON.parse(text) : {};
      if (!project || typeof project !== 'object' || Array.isArray(project)) throw new Error('project.pti không phải JSON hồ sơ hợp lệ.');
      index = project.uploadIndex && typeof project.uploadIndex === 'object' && !Array.isArray(project.uploadIndex) ? project.uploadIndex : {};
      if (Number(project.uploadIndexVersion || 0) < 1) {
        const files = imageFolder.getFiles();
        while (files.hasNext()) {
          const oldFile = files.next();
          if (oldFile.isTrashed()) continue;
          const oldBytes = oldFile.getBlob().getBytes();
          const oldKey = 'sha256:' + sha256HexPTI093(oldBytes);
          if (!index[oldKey]) {
            const marker = 'PTI093_UPLOAD_KEY=' + oldKey;
            const description = oldFile.getDescription() || '';
            if (description.indexOf(marker) < 0) oldFile.setDescription((description + '\n' + marker).trim());
            index[oldKey] = { fileId: oldFile.getId(), fileName: oldFile.getName(), fileUrl: oldFile.getUrl(), createdAt: oldFile.getDateCreated().toISOString(), clientKey: '', size: oldBytes.length };
          }
        }
        project.uploadIndex = index;
        project.uploadIndexVersion = 1;
        projectFile.setContent(JSON.stringify(project));
      }
      // Khôi phục chỉ mục nếu lần POST trước đã tạo file nhưng không kịp ghi project.pti.
      if (!index[uploadKey]) {
        const marker = 'PTI093_UPLOAD_KEY=' + uploadKey;
        const filesToCheck = imageFolder.getFiles();
        while (filesToCheck.hasNext()) {
          const candidate = filesToCheck.next();
          if (candidate.isTrashed()) continue;
          const description = candidate.getDescription() || '';
          if (description.indexOf(marker) >= 0) {
            index[uploadKey] = { fileId: candidate.getId(), fileName: candidate.getName(), fileUrl: candidate.getUrl(), createdAt: candidate.getDateCreated().toISOString(), clientKey: clientKey, size: candidate.getSize() };
            project.uploadIndex = index;
            project.uploadIndexVersion = 1;
            projectFile.setContent(JSON.stringify(project));
            break;
          }
        }
      }
      const old = index[uploadKey];
      if (old && old.fileId) {
        try {
          const existing = DriveApp.getFileById(String(old.fileId));
          if (!existing.isTrashed()) {
            const result = { success: true, duplicate: true, message: 'Ảnh đã tồn tại, không lưu lại lần 2.', recordId: recordId, fileName: existing.getName(), fileId: existing.getId(), fileUrl: existing.getUrl(), clientKey: old.clientKey || clientKey, uploadKey: uploadKey };
            cachePTI093DriveUploadEntry_(recordId, uploadKey, result);
            return isBridge ? pti093BridgeResponse_(result) : pti093JsonResponse_(result);
          }
        } catch (ignore) {}
        delete index[uploadKey];
      }
    } finally {
      lock.releaseLock();
      _ptiEnd('firstLockWork');
    }

    // Drive createFile là thao tác chậm; chạy ngoài khóa để 5 upload trong một lô thực sự song song.
    let createdFile = null;
    try {
      const blob = Utilities.newBlob(bytes, mimeType, fileName);
      _ptiStart('driveCreateFile');
      createdFile = imageFolder.createFile(blob);
      _ptiEnd('driveCreateFile');
      _ptiStart('driveSetDescription');
      createdFile.setDescription('PTI093_UPLOAD_KEY=' + uploadKey);
      _ptiEnd('driveSetDescription');
      _ptiStart('driveMetadataRead');
      const meta = { fileId: createdFile.getId(), fileName: createdFile.getName(), fileUrl: createdFile.getUrl(), createdAt: createdFile.getDateCreated().toISOString(), clientKey: clientKey, size: bytes.length };
      _ptiEnd('driveMetadataRead');

      if (data.deferIndex === true) {
        const pendingResult = {
          success: true,
          pendingIndex: true,
          duplicate: false,
          message: 'Ảnh đã tải lên Drive; đang chờ ghi chỉ mục nhóm.',
          recordId: recordId,
          fileName: meta.fileName,
          fileId: meta.fileId,
          fileUrl: meta.fileUrl,
          createdAt: meta.createdAt,
          clientKey: clientKey,
          uploadKey: uploadKey,
          size: meta.size
        };
        cachePTI093DriveUploadEntry_(recordId, uploadKey, pendingResult);
        createdFile = null;
        _ptiLog('pending-index');
        return isBridge ? pti093BridgeResponse_(pendingResult) : pti093JsonResponse_(pendingResult);
      }

      // Khóa ngắn lần hai để chống trùng khi hai request cùng hash đến đồng thời.
      lock = LockService.getScriptLock();
      _ptiStart('secondLockWait');
      lock.waitLock(30000);
      _ptiEnd('secondLockWait');
      _ptiStart('secondLockWork');
      try {
        const latestText = projectFile.getBlob().getDataAsString('UTF-8');
        const latestProject = latestText.trim() ? JSON.parse(latestText) : {};
        const latestIndex = latestProject.uploadIndex && typeof latestProject.uploadIndex === 'object' && !Array.isArray(latestProject.uploadIndex) ? latestProject.uploadIndex : {};
        const prior = latestIndex[uploadKey];
        if (prior && prior.fileId) {
          try {
            const existing = DriveApp.getFileById(String(prior.fileId));
            if (!existing.isTrashed()) {
              createdFile.setTrashed(true);
              createdFile = null;
              const result = { success: true, duplicate: true, message: 'Ảnh đã tồn tại, không lưu lại lần 2.', recordId: recordId, fileName: existing.getName(), fileId: existing.getId(), fileUrl: existing.getUrl(), clientKey: prior.clientKey || clientKey, uploadKey: uploadKey };
              cachePTI093DriveUploadEntry_(recordId, uploadKey, result);
              return isBridge ? pti093BridgeResponse_(result) : pti093JsonResponse_(result);
            }
          } catch (ignore) {}
        }
        latestIndex[uploadKey] = meta;
        latestProject.uploadIndex = latestIndex;
        latestProject.uploadIndexVersion = 1;
        try {
          _ptiStart('projectIndexWrite');
          projectFile.setContent(JSON.stringify(latestProject));
          _ptiEnd('projectIndexWrite');
          cachePTI093DriveUploadEntry_(recordId, uploadKey, meta);
          createdFile = null;
        } catch (indexError) {
          throw new Error('Ảnh đã tạo nhưng không ghi được chỉ mục vào project.pti: ' + (indexError && indexError.message ? indexError.message : String(indexError)));
        }
      } finally {
        lock.releaseLock();
        _ptiEnd('secondLockWork');
      }
      _ptiLog('success');
      const result = { success: true, duplicate: false, message: 'Đã lưu ảnh', recordId: recordId, fileName: meta.fileName, fileId: meta.fileId, fileUrl: meta.fileUrl, clientKey: clientKey, uploadKey: uploadKey };
      return isBridge ? pti093BridgeResponse_(result) : pti093JsonResponse_(result);
    } catch (uploadError) {
      if (createdFile) { try { createdFile.setTrashed(true); } catch (ignore) {} }
      throw uploadError;
    }

  } catch (error) {
    _ptiLog('error:' + (error && error.message ? error.message : String(error)));
    try { const cache = CacheService.getScriptCache(); const key = 'pti093:upload:' + requestRecordId + ':' + requestUploadKey; if (cache.get(key) === '__UPLOADING__') cache.remove(key); } catch (ignore) {}
    const result = {
      success: false,
      duplicate: false,
      recordId: requestRecordId,
      uploadKey: requestUploadKey,
      error: error && error.message ? error.message : String(error)
    };

    if (e && e.parameter && e.parameter.payload) {
      return pti093BridgeResponse_(result);
    }

    return pti093JsonResponse_(result);
  }
}

function updatePTI093IndexRow(recordId,project){try{const sheet=getIndexSpreadsheet().getSheets()[0],data=sheet.getDataRange().getValues();for(let i=1;i<data.length;i++){if(String(data[i][0]).trim()===String(recordId).trim()){const row=i+1;if(project.caseNumber!==undefined)sheet.getRange(row,2).setValue(project.caseNumber||'');if(project.bks!==undefined)sheet.getRange(row,3).setValue(project.bks||'');if(project.gdv!==undefined)sheet.getRange(row,4).setValue(project.gdv||'');sheet.getRange(row,6).setValue(new Date());if(project.status!==undefined)sheet.getRange(row,7).setValue(project.status||'');return;}}}catch(ignore){}}

function getProjectStatus(recordId,revision){const root=DriveApp.getFolderById(PTI093_FOLDER_ID),caseFolder=findPTI093RecordFolder(root,recordId);if(!caseFolder)throw new Error('Không tìm thấy hồ sơ: '+recordId);const files=caseFolder.getFilesByName('project.pti');if(!files.hasNext())throw new Error('Không tìm thấy project.pti.');const project=JSON.parse(files.next().getBlob().getDataAsString('UTF-8')||'{}');return {success:true,found:String(project.revision||'')===String(revision||''),revision:project.revision||'',updatedAt:project.updatedAt||''};}



function cachePTI093DriveUploadEntry_(recordId, uploadKey, meta) {
  try { CacheService.getScriptCache().put('pti093:upload:' + recordId + ':' + uploadKey, JSON.stringify(meta), 90); } catch (ignore) {}
}

function readPTI093DriveUploadEntry_(recordId, uploadKey) {
  const cache = CacheService.getScriptCache();
  const cacheKey = 'pti093:upload:' + recordId + ':' + uploadKey;
  try {
    const cached = cache.get(cacheKey);
    if (cached === '__UPLOADING__') return null;
    if (cached) return JSON.parse(cached);
  } catch (ignore) {}

  const root = DriveApp.getFolderById(PTI093_FOLDER_ID);
  const caseFolder = findPTI093RecordFolder(root, recordId);
  if (!caseFolder) throw new Error('Không tìm thấy hồ sơ: ' + recordId);
  const projectFiles = caseFolder.getFilesByName('project.pti');
  if (!projectFiles.hasNext()) throw new Error('Không tìm thấy project.pti.');
  const projectFile = projectFiles.next();
  const projectText = projectFile.getBlob().getDataAsString('UTF-8');
  const project = projectText.trim() ? JSON.parse(projectText) : {};
  const index = project && project.uploadIndex && typeof project.uploadIndex === 'object' ? project.uploadIndex : {};
  let meta = index[uploadKey];
  let file = null;

  if (meta && meta.fileId) {
    try {
      const candidate = DriveApp.getFileById(String(meta.fileId));
      const marker = 'PTI093_UPLOAD_KEY=' + uploadKey;
      if (!candidate.isTrashed() && (candidate.getDescription() || '').indexOf(marker) >= 0) file = candidate;
    } catch (ignore) {}
  }

  // Tự sửa chỉ mục nếu tệp đã tồn tại nhưng project.pti chưa kịp ghi mã băm.
  if (!file) {
    const imageFolders = caseFolder.getFoldersByName('images');
    if (!imageFolders.hasNext()) return null;
    const imageFolder = imageFolders.next();
    const marker = 'PTI093_UPLOAD_KEY=' + uploadKey;
    const files = imageFolder.getFiles();
    while (files.hasNext()) {
      const candidate = files.next();
      if (candidate.isTrashed()) continue;
      let matches = (candidate.getDescription() || '').indexOf(marker) >= 0;
      if (!matches) {
        try {
          const actualKey = 'sha256:' + sha256HexPTI093(candidate.getBlob().getBytes());
          matches = actualKey === uploadKey;
        } catch (ignore) {}
      }
      if (matches) {
        file = candidate;
        try {
          const description = candidate.getDescription() || '';
          if (description.indexOf(marker) < 0) candidate.setDescription((description + '\n' + marker).trim());
        } catch (ignore) {}
        break;
      }
    }
    if (!file) return null;

    meta = { fileId: file.getId(), fileName: file.getName(), fileUrl: file.getUrl(), createdAt: file.getDateCreated().toISOString(), size: file.getSize(), clientKey: meta && meta.clientKey || '' };
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const latestText = projectFile.getBlob().getDataAsString('UTF-8');
      const latestProject = latestText.trim() ? JSON.parse(latestText) : {};
      const latestIndex = latestProject.uploadIndex && typeof latestProject.uploadIndex === 'object' && !Array.isArray(latestProject.uploadIndex) ? latestProject.uploadIndex : {};
      const current = latestIndex[uploadKey];
      if (!current || !current.fileId || String(current.fileId) === file.getId()) {
        latestIndex[uploadKey] = meta;
        latestProject.uploadIndex = latestIndex;
        latestProject.uploadIndexVersion = 1;
        projectFile.setContent(JSON.stringify(latestProject, null, 2));
      } else {
        meta = current;
      }
    } finally {
      lock.releaseLock();
    }
  } else {
    meta = { fileId: file.getId(), fileName: file.getName(), fileUrl: file.getUrl(), createdAt: file.getDateCreated().toISOString(), size: Number(meta.size || file.getSize() || 0), clientKey: meta.clientKey || '' };
  }

  const result = { fileId: file.getId(), fileName: file.getName(), fileUrl: file.getUrl(), createdAt: meta.createdAt || file.getDateCreated().toISOString(), size: Number(meta.size || file.getSize() || 0), clientKey: meta.clientKey || '' };
  try { cache.put(cacheKey, JSON.stringify(result), 90); } catch (ignore) {}
  return result;
}

function sha256HexPTI093(bytes) {


  const digest =



    Utilities.computeDigest(



      Utilities.DigestAlgorithm.SHA_256,



      bytes



    );


  return digest



    .map(function(byte) {


      const value =



        byte < 0



          ? byte + 256



          : byte;


      return ('0' + value.toString(16))



        .slice(-2);


    })



    .join('');


}


/**



 * Tìm thư mục hồ sơ PTI093 theo Record ID.



 * Không cần tìm đệ quy toàn bộ Drive, nên nhanh và ổn định hơn.



 */



function findPTI093RecordFolder(root, recordId) {



  const match = String(recordId).match(/^PTI093-(\d{8})-\d{6}-[A-Z0-9]{8}$/i);


  if (!match) {



    // Fallback: tìm trực tiếp dưới các thư mục con của root.



    return findFolderByNameRecursiveSafe(root, recordId);



  }


  const datePart = match[1];



  const yearName = datePart.substring(0, 4);



  const monthName = datePart.substring(4, 6);


  const yearFolders = root.getFoldersByName(yearName);



  if (!yearFolders.hasNext()) return null;



  const yearFolder = yearFolders.next();


  const monthFolders = yearFolder.getFoldersByName(monthName);



  if (!monthFolders.hasNext()) return null;



  const monthFolder = monthFolders.next();


  const caseFolders = monthFolder.getFoldersByName(recordId);



  return caseFolders.hasNext() ? caseFolders.next() : null;



}


/**



 * Fallback tìm tên thư mục trong cây thư mục.



 * Chỉ dùng khi Record ID không đúng định dạng chuẩn PTI093.



 */



function findFolderByNameRecursiveSafe(parentFolder, folderName) {



  const direct = parentFolder.getFoldersByName(folderName);



  if (direct.hasNext()) return direct.next();


  const children = parentFolder.getFolders();



  while (children.hasNext()) {



    const child = children.next();



    const found = findFolderByNameRecursiveSafe(child, folderName);



    if (found) return found;



  }


  return null;



}
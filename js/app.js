
var chosenEntry = null;
var chooseFileButton = document.querySelector('#choose_file');
var chooseDirButton = document.querySelector('#choose_dir');
var saveFileButton = document.querySelector('#save_file');
var output = document.querySelector('output');
var textarea = document.querySelector('textarea');


function errorHandler(e) {
  console.error(e);
}




function displayEntryData(theEntry) {
  if (theEntry.isFile) {
    chrome.fileSystem.getDisplayPath(theEntry, function(path) {
      document.querySelector('#file_path').textContent = path;
    });
    theEntry.getMetadata(function(data) {
      document.querySelector('#file_size').textContent = data.size;
    });    
  }
  else {
    document.querySelector('#file_path').textContent = theEntry.fullPath;
    document.querySelector('#file_size').textContent = "N/A";
  }
}




function readAsText(fileEntry, callback) {
  fileEntry.file(function(file) {
    var reader = new FileReader();

    reader.onerror = errorHandler;
    reader.onload = function(e) {
      callback(e.target.result);
    };

    reader.readAsText(file);
  });
}




function writeFileEntry(writableEntry, opt_blob, callback) {
  if (!writableEntry) {
    output.textContent = 'Nothing selected.';
    return;
  }

  writableEntry.createWriter(function(writer) {

    writer.onerror = errorHandler;
    writer.onwriteend = callback;

    // If we have data, write it to the file. Otherwise, just use the file we
    // loaded.
    if (opt_blob) {
      writer.truncate(opt_blob.size);
      waitForIO(writer, function() {
        writer.seek(0);
        writer.write(opt_blob);
      });
    } 
    else {
      chosenEntry.file(function(file) {
        writer.truncate(file.fileSize);
        waitForIO(writer, function() {
          writer.seek(0);
          writer.write(file);
        });
      });
    }
  }, errorHandler);
}




function waitForIO(writer, callback) {
  // set a watchdog to avoid eventual locking:
  var start = Date.now();
  // wait for a few seconds
  var reentrant = function() {
    if (writer.readyState===writer.WRITING && Date.now()-start<4000) {
      setTimeout(reentrant, 100);
      return;
    }
    if (writer.readyState===writer.WRITING) {
      console.error("Write operation taking too long, aborting!"+
        " (current writer readyState is "+writer.readyState+")");
      writer.abort();
    } 
    else {
      callback();
    }
  };
  setTimeout(reentrant, 100);
}





// for files, read the text content into the textarea
function loadFileEntry(_chosenEntry) {
  chosenEntry = _chosenEntry;
  chosenEntry.file(function(file) {
    readAsText(chosenEntry, function(result) {

      textarea.value = result;
      $('#result').empty();
      $('#result').append(result);
    });
    // Update display.
    saveFileButton.disabled = false; // allow the user to save the content
    displayEntryData(chosenEntry);
  });
}





// for directories, read the contents of the top-level directory (ignore sub-dirs)
// and put the results into the textarea, then disable the Save As button
function loadDirEntry(_chosenEntry, target) {
  chosenEntry = _chosenEntry;
  if (chosenEntry.isDirectory) {
    var dirReader = chosenEntry.createReader();
    var entries = [];
    var parent;    
    if(target){
      //called by click event
      parent = target;
    }else{
      //called by open dir button
      var id = createUUID();
    }
    // Call the reader.readEntries() until no more results are returned.
    var readEntries = function() {
       dirReader.readEntries (function(results) {
        if (!results.length) {
          textarea.value = entries.join("\n");
          saveFileButton.disabled = true; // don't allow saving of the list
          displayEntryData(chosenEntry);
        } 
        else {
          results.forEach(function(item) {
            var id = createUUID();
            
            if(item.isDirectory){              
              //bind DirEventListener
              var html = createDirHtml(id, item.name);

              if(target){
                target.next(".files").prepend(html);
              }else{
                $("#dir").prepend(html);
              }
              var label = document.getElementById(id);
              addEventHandler(label, "click", onDirectoryClick, item);
            } else{
              //bind FileEventListener 
              var html = createFileHtml(id, item.name);
              if(target){
                  target.next(".files").append(html);
              }else{
                $("#dir").append(html);
              }
              var label = document.getElementById(id);
              addEventHandler(label, "click", onFileClick, item);
            }
            
            
            //entries = entries.concat(item.fullPath);
          });
          //push the data;
          readEntries();
        }
      }, errorHandler);
    };

    readEntries(); // Start reading dirs.    
  }
}

function onDirectoryClick(directoryEntry, _target){
    //3statu
    //1.data unload
    //2.data loaded
    var target = $(_target);
    if((target.attr("status"))&&(target.attr("status")=="load")){
      target.next(".files").animate({height: 'toggle', opacity: 'toggle'}, "slow");
    }else{
      loadDirEntry(directoryEntry, target);
      target.attr("status","load");
    }
} 

function onFileClick(fileEntry){
  loadFileEntry(fileEntry);
}



function loadInitialFile(launchData) {
  if (launchData && launchData.items && launchData.items[0]) {
    loadFileEntry(launchData.items[0].entry);
  } 
  else {
    // see if the app retained access to an earlier file or directory
    chrome.storage.local.get('chosenFile', function(items) {
      if (items.chosenFile) {
        // if an entry was retained earlier, see if it can be restored
        chrome.fileSystem.isRestorable(items.chosenFile, function(bIsRestorable) {
          // the entry is still there, load the content
          console.info("Restoring " + items.chosenFile);
          chrome.fileSystem.restoreEntry(items.chosenFile, function(chosenEntry) {
            if (chosenEntry) {
              chosenEntry.isFile ? loadFileEntry(chosenEntry) : loadDirEntry(chosenEntry);
            }
          });
        });
      }
    });
  }
}





chooseFileButton.addEventListener('click', function(e) {
  var accepts = [{
    mimeTypes: ['text/*'],
    extensions: ['js', 'css', 'txt', 'html', 'xml', 'tsv', 'csv', 'rtf']
  }];
  chrome.fileSystem.chooseEntry({type: 'openFile', accepts: accepts}, function(theEntry) {
    if (!theEntry) {
      output.textContent = 'No file selected.';
      return;
    }
    // use local storage to retain access to this file
    chrome.storage.local.set({'chosenFile': chrome.fileSystem.retainEntry(theEntry)});
    loadFileEntry(theEntry);
  });
});

chooseDirButton.addEventListener('click', function(e) {
  chrome.fileSystem.chooseEntry({type: 'openDirectory'}, function(theEntry) {
    if (!theEntry) {
      output.textContent = 'No Directory selected.';
      return;
    }
    //clear nav
    $('#dir').empty();
    // use local storage to retain access to this file
    chrome.storage.local.set({'chosenFile': chrome.fileSystem.retainEntry(theEntry)});
    loadDirEntry(theEntry);
  });
});

saveFileButton.addEventListener('click', function(e) {
  var config = {type: 'saveFile', suggestedName: chosenEntry.name};
  chrome.fileSystem.chooseEntry(config, function(writableEntry) {
    var blob = new Blob([textarea.value], {type: 'text/plain'});
    writeFileEntry(writableEntry, blob, function(e) {
      output.textContent = 'Write complete :)';
    });
  });
});

// Support dropping a single file onto this app.
var dnd = new DnDFileController('body', function(data) {
  chosenEntry = null;
  for (var i = 0; i < data.items.length; i++) {
    var item = data.items[i];
    if (item.kind == 'file' &&
        item.type.match('text/*') &&
        item.webkitGetAsEntry()) {
      chosenEntry = item.webkitGetAsEntry();
      break;
    }
  };

  if (!chosenEntry) {
    output.textContent = "Sorry. That's not a text file.";
    return;
  } 
  else {
    output.textContent = "";
  }

  readAsText(chosenEntry, function(result) {
    textarea.value = result;
  });
  // Update display.
  saveFileButton.disabled = false;
  displayEntryData(chosenEntry);
});
$("#navigation").jqueryAccordionMenu();

  $("#dir li").click(function(){
    $("#dir li.active").removeClass("active")
    $(this).addClass("active");
  }) ; 
loadInitialFile(launchData);

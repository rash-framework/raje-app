/**
 * 
 * Initilize TinyMCE editor with all required options
 */

// Invisible space constants
const ZERO_SPACE = '&#8203;'
const RAJE_SELECTOR = 'body#tinymce'

// Selector constants (to move inside a new const file)
const HEADER_SELECTOR = 'header.page-header.container.cgen'
const FIRST_HEADING = `${RAJE_SELECTOR}>section:first>h1:first`

const TINYMCE_TOOLBAR_HEIGTH = 76

let ipcRenderer, webFrame

if (hasBackend) {

  ipcRenderer = require('electron').ipcRenderer
  webFrame = require('electron').webFrame

  /**
   * Initilise TinyMCE 
   */
  $(document).ready(function () {

    // Override the margin botton given by RASH for the footer
    $('body').css({
      'margin-bottom': 0
    })

    //hide footer
    $('footer.footer').remove()

    //attach whole body inside a placeholder div
    $('body').html(`<div id="raje_root">${$('body').html()}</div>`)

    // 
    setNonEditableHeader()

    tinymce.init({

      // Select the element to wrap
      selector: '#raje_root',

      // Set window size
      height: window.innerHeight - TINYMCE_TOOLBAR_HEIGTH,

      // Set the styles of the content wrapped inside the element
      content_css: ['css/bootstrap.min.css', 'css/rash.css', 'css/raje-core.css'],

      // Set plugins
      plugins: "raje_inlineFigure fullscreen link codesample raje_externalLink raje_inlineCode raje_inlineQuote raje_section table image noneditable raje_image raje_codeblock raje_table raje_listing raje_inline_formula raje_formula raje_crossref raje_footnotes raje_metadata raje_lists raje_save",

      // Remove menubar
      menubar: false,

      // Custom toolbar
      toolbar: 'undo redo bold italic link superscript subscript raje_inlineCode raje_inlineQuote raje_inline_formula raje_crossref raje_footnotes | raje_ol raje_ul raje_codeblock blockquote raje_table raje_image raje_listing raje_formula | raje_section raje_metadata raje_save',

      // Setup full screen on init
      setup: function (editor) {

        let pasteBookmark

        // Set fullscreen 
        editor.on('init', function (e) {

          editor.execCommand('mceFullScreen')

          // Move caret at the first h1 element of main section
          // Or right after heading
          tinymce.activeEditor.selection.setCursorLocation(tinymce.activeEditor.dom.select(FIRST_HEADING)[0], 0)
        })

        editor.on('keyDown', function (e) {

          // Prevent shift+enter
          if (e.keyCode == 13 && e.shiftKey)
            e.preventDefault()

          if (e.keyCode == 86 && e.metaKey) {

            if ($(tinymce.activeEditor.selection.getNode()).is('pre')) {

              e.preventDefault()
              e.stopImmediatePropagation()

              pasteBookmark = tinymce.activeEditor.selection.getBookmark()
            }
          }
        })

        /**
         * 
         */
        editor.on('click', function (e) {

          // Capture the triple click event
          if (e.detail == 3) {

            e.preventDefault()
            e.stopImmediatePropagation()

            let wrapper = $(tinymce.activeEditor.selection.getRng().startContainer).parents('p,figcaption,:header').first()
            let startContainer = wrapper[0]
            let endContainer = wrapper[0]
            let range = document.createRange()

            // Check if the wrapper has more text node inside
            if (wrapper.contents().length > 1) {

              // If the first text node is a not editable strong, the selection must start with the second element
              if (wrapper.contents().first().is('strong[contenteditable=false]'))
                startContainer = wrapper.contents()[1]

              // In this case the endContainer will be the last text node
              endContainer = wrapper.contents().last()[0]
            }

            range.setStart(startContainer, 0)

            if (wrapper.is('figcaption'))
              range.setEnd(endContainer, endContainer.length)

            else
              range.setEnd(endContainer, 1)

            tinymce.activeEditor.selection.setRng(range)
          }

        })

        // Prevent span 
        editor.on('nodeChange', function (e) {

          let selectedElement = $(tinymce.activeEditor.selection.getNode())

          // Move caret to first heading if is after or before not editable header
          if (selectedElement.is('p') && (selectedElement.next().is(HEADER_SELECTOR) || (selectedElement.prev().is(HEADER_SELECTOR) && tinymce.activeEditor.dom.select(FIRST_HEADING).length)))
            tinymce.activeEditor.selection.setCursorLocation(tinymce.activeEditor.dom.select(FIRST_HEADING)[0], 0)

          // If the current element isn't inside header, only in section this is permitted
          if (selectedElement.parents('section').length) {

            if (selectedElement.is('span#_mce_caret[data-mce-bogus]') || selectedElement.parent().is('span#_mce_caret[data-mce-bogus]')) {

              // Remove span normally created with bold
              if (selectedElement.parent().is('span#_mce_caret[data-mce-bogus]'))
                selectedElement = selectedElement.parent()

              let bm = tinymce.activeEditor.selection.getBookmark()
              selectedElement.replaceWith(selectedElement.html())
              tinymce.activeEditor.selection.moveToBookmark(bm)
            }
          }

          updateDocumentState()
        })

        // Update saved content on undo and redo events
        editor.on('Undo', function (e) {
          tinymce.triggerSave()
        })

        editor.on('Redo', function (e) {
          tinymce.triggerSave()
        })

        editor.on('Paste', function (e) {

          let target = $(e.target)

          // If the paste event is called inside a listing
          if (pasteBookmark && target.parents('figure:has(pre:has(code))').length) {

            let data = e.clipboardData.getData('Text')

            // Restore the selection saved on cmd+v
            tinymce.activeEditor.selection.moveToBookmark(pasteBookmark)

            // Update the content
            tinymce.activeEditor.selection.setContent(e.clipboardData.getData('Text'))

            pasteBookmark = null
          }
        })
      },

      // Set default target
      default_link_target: "_blank",

      // Prepend protocol if the link starts with www
      link_assume_external_targets: true,

      // Hide target list
      target_list: false,

      // Hide title
      link_title: false,

      // Set formats
      formats: {
        underline: {}
      },

      // Remove "powered by tinymce"
      branding: false,

      // Prevent auto br on element insert
      apply_source_formatting: false,

      // Prevent non editable object resize
      object_resizing: false,

      // Update the table popover layout
      table_toolbar: "tableinsertrowbefore tableinsertrowafter tabledeleterow | tableinsertcolbefore tableinsertcolafter tabledeletecol",

      image_advtab: true,

      paste_block_drop: true,

      extended_valid_elements: "svg[*],defs[*],pattern[*],desc[*],metadata[*],g[*],mask[*],path[*],line[*],marker[*],rect[*],circle[*],ellipse[*],polygon[*],polyline[*],linearGradient[*],radialGradient[*],stop[*],image[*],view[*],text[*],textPath[*],title[*],tspan[*],glyph[*],symbol[*],switch[*],use[*]",

      formula: {
        path: 'node_modules/tinymce-formula/'
      },

      cleanup_on_startup: false,
      trim_span_elements: false,
      verify_html: false,
      cleanup: false,
      convert_urls: false
    })
  })

  /**
   * Open and close the headings dropdown
   */
  $(window).load(function () {

    // Open and close menu headings Näive way
    $(`div[aria-label='heading']`).find('button').trigger('click')
    $(`div[aria-label='heading']`).find('button').trigger('click')
  })


  /**
   * Update content in the iframe, with the one stored by tinymce
   * And save/restore the selection
   */
  function updateIframeFromSavedContent() {

    // Save the bookmark 
    let bookmark = tinymce.activeEditor.selection.getBookmark(2, true)

    // Update iframe content
    tinymce.activeEditor.setContent($('#raje_root').html())

    // Restore the bookmark 
    tinymce.activeEditor.selection.moveToBookmark(bookmark)
  }

  /**
   * Accept a js object that exists in frame
   * @param {*} element 
   */
  function moveCaret(element, toStart) {
    tinymce.activeEditor.selection.select(element, true)
    tinymce.activeEditor.selection.collapse(toStart)

    tinymce.activeEditor.focus()
  }

  /**
   * 
   */
  function selectRange(startContainer, startOffset, endContainer, endOffset) {

    let range = document.createRange()
    range.setStart(startContainer, startOffset)

    // If these properties are not in the signature use the start
    if (!endContainer && !endOffset) {
      endContainer = startContainer
      endOffset = startOffset
    }

    range.setEnd(endContainer, endOffset)
    tinymce.activeEditor.selection.setRng(range)
  }

  /**
   * 
   * @param {*} element 
   */
  function moveCursorToEnd(element) {

    let heading = element
    let offset = 0

    if (heading.contents().length) {

      heading = heading.contents().last()

      // If the last node is a strong,em,q etc. we have to take its text 
      if (heading[0].nodeType != 3)
        heading = heading.contents().last()

      offset = heading[0].wholeText.length
    }

    tinymce.activeEditor.focus()
    tinymce.activeEditor.selection.setCursorLocation(heading[0], offset)
  }

  /**
   * 
   * @param {*} element 
   */
  function moveCursorToStart(element) {

    let heading = element
    let offset = 0

    tinymce.activeEditor.focus()
    tinymce.activeEditor.selection.setCursorLocation(heading[0], offset)
  }


  /**
   * Create custom into notification
   * @param {*} text 
   * @param {*} timeout 
   */
  function notify(text, type, timeout) {

    // Display only one notification, blocking all others
    if (tinymce.activeEditor.notificationManager.getNotifications().length == 0) {

      let notify = {
        text: text,
        type: type ? type : 'info',
        timeout: timeout ? timeout : 1000
      }

      tinymce.activeEditor.notificationManager.open(notify)
    }
  }

  /**
   * 
   * @param {*} elementSelector 
   */
  function scrollTo(elementSelector) {
    $(tinymce.activeEditor.getBody()).find(elementSelector).get(0).scrollIntoView();
  }

  /**
   * 
   */
  function getSuccessiveElementId(elementSelector, SUFFIX) {

    let lastId = 0

    $(elementSelector).each(function () {
      let currentId = parseInt($(this).attr('id').replace(SUFFIX, ''))
      lastId = currentId > lastId ? currentId : lastId
    })

    return `${SUFFIX}${lastId+1}`
  }

  /**
   * 
   */
  function headingDimension() {
    $('h1,h2,h3,h4,h5,h6').each(function () {

      if (!$(this).parents(HEADER_SELECTOR).length) {
        var counter = 0;
        $(this).parents("section").each(function () {
          if ($(this).children("h1,h2,h3,h4,h5,h6").length > 0) {
            counter++;
          }
        });
        $(this).replaceWith("<h" + counter + ">" + $(this).html() + "</h" + counter + ">")
      }
    });
  }

  /**
   * 
   */
  function checkIfPrintableChar(keycode) {

    return (keycode > 47 && keycode < 58) || // number keys
      (keycode == 32 || keycode == 13) || // spacebar & return key(s) (if you want to allow carriage returns)
      (keycode > 64 && keycode < 91) || // letter keys
      (keycode > 95 && keycode < 112) || // numpad keys
      (keycode > 185 && keycode < 193) || // ;=,-./` (in order)
      (keycode > 218 && keycode < 223); // [\]' (in order)
  }

  /**
   * 
   */
  function markTinyMCE() {
    $('div[id^=mceu_]').attr('data-rash-original-content', '')
  }

  /**
   * 
   */
  function setNonEditableHeader() {
    $(HEADER_SELECTOR).addClass('mceNonEditable')
  }

  /**
   * 
   */
  function checkIfApp() {
    return ipcRenderer.sendSync('isAppSync')
  }

  /**
   * 
   */
  function selectImage() {
    return ipcRenderer.sendSync('selectImageSync')
  }



  /**
   * Send a message to the backend, notify the structural change
   * 
   * If the document is draft state = true
   * If the document is saved state = false
   */
  function updateDocumentState() {

    // Get the Iframe content not in xml 
    let JqueryIframe = $(`<div>${tinymce.activeEditor.getContent()}</div>`)
    let JquerySavedContent = $(`#raje_root`)

    // True if they're different, False is they're equal
    ipcRenderer.send('updateDocumentState', JqueryIframe.html() != JquerySavedContent.html())
  }

  /**
   * 
   */
  function saveAsArticle(options) {
    return ipcRenderer.send('saveAsArticle', options)
  }

  /**
   * 
   */
  function saveArticle(options) {
    return ipcRenderer.send('saveArticle', options)
  }

  /**
   * Start the save as process getting the data and sending it
   * to the main process
   */
  ipcRenderer.on('executeSaveAs', (event, data) => {
    saveManager.saveAs()
  })

  /**
   * Start the save process getting the data and sending it
   * to the main process
   */
  ipcRenderer.on('executeSave', (event, data) => {
    saveManager.save()
  })

  /**
   * 
   */
  ipcRenderer.on('notify', (event, data) => {
    notify(data.text, data.type, data.timeout)
  })

  /**
   * 
   */
  ipcRenderer.on('updateContent', (event, data) => {
    tinymce.triggerSave()
  })
}
tinymce.PluginManager.add('raje_codeblock', function (editor, url) {})
tinymce.PluginManager.add('raje_crossref', function (editor, url) {

  // Add a button that handle the inline element
  editor.addButton('raje_crossref', {
    title: 'raje_crossref',
    icon: 'icon-anchor',
    tooltip: 'Cross-reference',
    disabledStateSelector: DISABLE_SELECTOR_FIGURES,

    // Button behaviour
    onclick: function () {

      tinymce.triggerSave()

      let referenceableList = {
        sections: crossref.getAllReferenceableSections(),
        tables: crossref.getAllReferenceableTables(),
        figures: crossref.getAllReferenceableFigures(),
        listings: crossref.getAllReferenceableListings(),
        formulas: crossref.getAllReferenceableFormulas(),
        references: crossref.getAllReferenceableReferences()
      }

      editor.windowManager.open({
          title: 'Cross-reference editor',
          url: 'js/raje-core/plugin/raje_crossref.html',
          width: 500,
          height: 800,
          onClose: function () {

            /**
             * 
             * This behaviour is called when user press "ADD NEW REFERENCE" 
             * button from the modal
             */
            if (tinymce.activeEditor.createNewReference) {

              tinymce.activeEditor.undoManager.transact(function () {

                // Get successive biblioentry id
                let id = getSuccessiveElementId(BIBLIOENTRY_SELECTOR, BIBLIOENTRY_SUFFIX)

                // Create the reference that points to the next id
                crossref.add(id)

                // Add the next biblioentry
                section.addBiblioentry(id)

                // Update the reference
                crossref.update()

                // Move caret to start of the new biblioentry element
                // Issue #105 Firefox + Chromium
                tinymce.activeEditor.selection.setCursorLocation($(tinymce.activeEditor.dom.get(id)).find('p')[0], false)
                scrollTo(`${BIBLIOENTRY_SELECTOR}#${id}`)
              })

              // Set variable null for successive usages
              tinymce.activeEditor.createNewReference = null
            }

            /**
             * This is called if a normal reference is selected from modal
             */
            else if (tinymce.activeEditor.reference) {

              tinymce.activeEditor.undoManager.transact(function () {

                // Create the empty anchor and update its content
                crossref.add(tinymce.activeEditor.reference)
                crossref.update()

                let selectedNode = $(tinymce.activeEditor.selection.getNode())

                // This select the last element (last by order) and collapse the selection after the node
                // #105 Firefox + Chromium
                //tinymce.activeEditor.selection.setCursorLocation($(tinymce.activeEditor.dom.select(`a[href="#${tinymce.activeEditor.reference}"]:last-child`))[0], false)
              })

              // Set variable null for successive usages
              tinymce.activeEditor.reference = null
            }
          }
        },

        // List of all referenceable elements
        referenceableList)
    }
  })

  crossref = {
    getAllReferenceableSections: function () {

      let sections = []

      $('section').each(function () {

        let level = ''

        // Sections without role have :after
        if (!$(this).attr('role')) {

          // Save its deepness
          let parentSections = $(this).parentsUntil('div#raje_root')

          if (parentSections.length) {

            // Iterate its parents backwards (higer first)
            for (let i = parentSections.length; i--; i > 0) {
              let section = $(parentSections[i])
              level += `${section.parent().children(SECTION_SELECTOR).index(section)+1}.`
            }
          }

          // Current index
          level += `${$(this).parent().children(SECTION_SELECTOR).index($(this))+1}.`
        }

        sections.push({
          reference: $(this).attr('id'),
          text: $(this).find(':header').first().text(),
          level: level
        })
      })

      return sections
    },

    getAllReferenceableTables: function () {
      let tables = []

      $('figure:has(table)').each(function () {
        tables.push({
          reference: $(this).attr('id'),
          text: $(this).find('figcaption').text()
        })
      })

      return tables
    },

    getAllReferenceableListings: function () {
      let listings = []

      $('figure:has(pre:has(code))').each(function () {
        listings.push({
          reference: $(this).attr('id'),
          text: $(this).find('figcaption').text()
        })
      })

      return listings
    },

    getAllReferenceableFigures: function () {
      let figures = []

      $('figure:has(p:has(img)),figure:has(p:has(svg))').each(function () {
        figures.push({
          reference: $(this).attr('id'),
          text: $(this).find('figcaption').text()
        })
      })

      return figures
    },

    getAllReferenceableFormulas: function () {
      let formulas = []

      $(formulabox_selector).each(function () {

        formulas.push({
          reference: $(this).parents(FIGURE_SELECTOR).attr('id'),
          text: `Formula ${$(this).parents(FIGURE_SELECTOR).find('span.cgen').text()}`
        })
      })

      return formulas
    },

    getAllReferenceableReferences: function () {
      let references = []

      $('section[role=doc-bibliography] li').each(function () {
        references.push({
          reference: $(this).attr('id'),
          text: $(this).text(),
          level: $(this).index() + 1
        })
      })

      return references
    },

    add: function (reference, next) {

      // Create the empty reference with a whitespace at the end
      tinymce.activeEditor.selection.setContent(`<a contenteditable="false" href="#${reference}">&nbsp;</a>&nbsp;`)
      tinymce.triggerSave()
    },

    update: function () {

      // Update the reference (in saved content)
      references()

      // Prevent adding of nested a as footnotes
      $('a>sup>a').each(function () {
        $(this).parent().html($(this).text())
      })

      // Update editor with the right references
      updateIframeFromSavedContent()
    }
  }
})

tinymce.PluginManager.add('raje_footnotes', function (editor, url) {

  editor.addButton('raje_footnotes', {
    title: 'raje_footnotes',
    icon: 'icon-footnotes',
    tooltip: 'Footnote',
    disabledStateSelector: DISABLE_SELECTOR_FIGURES,

    // Button behaviour
    onclick: function () {

      tinymce.activeEditor.undoManager.transact(function () {

        // Get successive biblioentry id
        let reference = getSuccessiveElementId(ENDNOTE_SELECTOR, ENDNOTE_SUFFIX)

        // Create the reference that points to the next id
        crossref.add(reference)

        // Add the next biblioentry
        section.addEndnote(reference)

        // Update the reference
        crossref.update()

        // Move caret at the end of p in last inserted endnote
        tinymce.activeEditor.selection.setCursorLocation(tinymce.activeEditor.dom.select(`${ENDNOTE_SELECTOR}#${reference}>p`)[0], 1)
      })
    }
  })
})

function references() {
  /* References */
  $("a[href]").each(function () {
    if ($.trim($(this).text()) == '') {
      var cur_id = $(this).attr("href");
      original_content = $(this).html()
      original_reference = cur_id
      referenced_element = $(cur_id);

      if (referenced_element.length > 0) {
        referenced_element_figure = referenced_element.find(
          figurebox_selector_img + "," + figurebox_selector_svg);
        referenced_element_table = referenced_element.find(tablebox_selector_table);
        referenced_element_formula = referenced_element.find(
          formulabox_selector_img + "," + formulabox_selector_span + "," + formulabox_selector_math + "," + formulabox_selector_svg);
        referenced_element_listing = referenced_element.find(listingbox_selector_pre);
        /* Special sections */
        if (
          $("section[role=doc-abstract]" + cur_id).length > 0 ||
          $("section[role=doc-bibliography]" + cur_id).length > 0 ||
          $("section[role=doc-endnotes]" + cur_id + ", section[role=doc-footnotes]" + cur_id).length > 0 ||
          $("section[role=doc-acknowledgements]" + cur_id).length > 0) {
          $(this).html("<span class=\"cgen\" contenteditable=\"false\"  data-rash-original-content=\"" + original_content +
            "\">Section <q>" + $(cur_id + " > h1").text() + "</q></span>");
          /* Bibliographic references */
        } else if ($(cur_id).parents("section[role=doc-bibliography]").length > 0) {
          var cur_count = $(cur_id).prevAll("li").length + 1;
          $(this).html("<span class=\"cgen\" contenteditable=\"false\" data-rash-original-content=\"" + original_content +
            "\" title=\"Bibliographic reference " + cur_count + ": " +
            $(cur_id).text().replace(/\s+/g, " ").trim() + "\">[" + cur_count + "]</span>");
          /* Footnote references (doc-footnotes and doc-footnote included for easing back compatibility) */
        } else if ($(cur_id).parents("section[role=doc-endnotes], section[role=doc-footnotes]").length > 0) {
          var cur_contents = $(this).parent().contents();
          var cur_index = cur_contents.index($(this));
          var prev_tmp = null;
          while (cur_index > 0 && !prev_tmp) {
            cur_prev = cur_contents[cur_index - 1];
            if (cur_prev.nodeType != 3 || $(cur_prev).text().replace(/ /g, '') != '') {
              prev_tmp = cur_prev;
            } else {
              cur_index--;
            }
          }
          var prev_el = $(prev_tmp);
          var current_id = $(this).attr("href");
          var footnote_element = $(current_id);
          if (footnote_element.length > 0 &&
            footnote_element.parent("section[role=doc-endnotes], section[role=doc-footnotes]").length > 0) {
            var count = $(current_id).prevAll("section").length + 1;
            if (prev_el.find("sup").hasClass("fn")) {
              $(this).before("<sup class=\"cgen\" contenteditable=\"false\" data-rash-original-content=\"\">,</sup>");
            }
            $(this).html("<sup class=\"fn cgen\" contenteditable=\"false\" data-rash-original-content=\"" + original_content + "\">" +
              "<a name=\"fn_pointer_" + current_id.replace("#", "") +
              "\" title=\"Footnote " + count + ": " +
              $(current_id).text().replace(/\s+/g, " ").trim() + "\">" + count + "</a></sup>");
          } else {
            $(this).html("<span class=\"error cgen\" contenteditable=\"false\" data-rash-original-content=\"" + original_content +
              "\">ERR: footnote '" + current_id.replace("#", "") + "' does not exist</span>");
          }
          /* Common sections */
        } else if ($("section" + cur_id).length > 0) {
          var cur_count = $(cur_id).findHierarchicalNumber(
            "section:not([role=doc-abstract]):not([role=doc-bibliography]):" +
            "not([role=doc-endnotes]):not([role=doc-footnotes]):not([role=doc-acknowledgements])");
          if (cur_count != null && cur_count != "") {
            $(this).html("<span class=\"cgen\" contenteditable=\"false\" data-rash-original-content=\"" + original_content +
              "\">Section " + cur_count + "</span>");
          }
          /* Reference to figure boxes */
        } else if (referenced_element_figure.length > 0) {
          var cur_count = referenced_element_figure.findNumber(figurebox_selector);
          if (cur_count != 0) {
            $(this).html("<span class=\"cgen\" contenteditable=\"false\" data-rash-original-content=\"" + original_content +
              "\">Figure " + cur_count + "</span>");
          }
          /* Reference to table boxes */
        } else if (referenced_element_table.length > 0) {
          var cur_count = referenced_element_table.findNumber(tablebox_selector);
          if (cur_count != 0) {
            $(this).html("<span class=\"cgen\" contenteditable=\"false\" data-rash-original-content=\"" + original_content +
              "\">Table " + cur_count + "</span>");
          }
          /* Reference to formula boxes */
        } else if (referenced_element_formula.length > 0) {
          var cur_count = referenced_element_formula.findNumber(formulabox_selector);
          if (cur_count != 0) {
            $(this).html("<span class=\"cgen\" contenteditable=\"false\" data-rash-original-content=\"" + original_content +
              "\">Formula " + cur_count + "</span>");
          }
          /* Reference to listing boxes */
        } else if (referenced_element_listing.length > 0) {
          var cur_count = referenced_element_listing.findNumber(listingbox_selector);
          if (cur_count != 0) {
            $(this).html("<span class=\"cgen\" contenteditable=\"false\" data-rash-original-content=\"" + original_content +
              "\">Listing " + cur_count + "</span>");
          }
        } else {
          $(this).html("<span class=\"error cgen\" contenteditable=\"false\" data-rash-original-content=\"" + original_content +
            "\">ERR: referenced element '" + cur_id.replace("#", "") +
            "' has not the correct type (it should be either a figure, a table, a formula, a listing, or a section)</span>");
        }
      } else {
        $(this).replaceWith("<span class=\"error cgen\" contenteditable=\"false\" data-rash-original-content=\"" + original_content +
          "\">ERR: referenced element '" + cur_id.replace("#", "") + "' does not exist</span>");
      }
    }
  });
  /* /END References */
}

function updateReferences() {

  if ($('span.cgen[data-rash-original-content]').length) {

    // Restore all saved content
    $('span.cgen[data-rash-original-content]').each(function () {

      // Save original content and reference
      let original_content = $(this).attr('data-rash-original-content')
      let original_reference = $(this).parent('a').attr('href')

      $(this).parent('a').replaceWith(`<a contenteditable="false" href="${original_reference}">${original_content}</a>`)
    })

    references()
  }
}
/**
 * This script contains all figure box available with RASH.
 * 
 * plugins:
 *  raje_table
 *  raje_figure
 *  raje_formula
 *  raje_listing
 */
const DISABLE_SELECTOR_FIGURES = 'figure *, h1, h2, h3, h4, h5, h6'

const FIGURE_SELECTOR = 'figure[id]'

const FIGURE_TABLE_SELECTOR = `${FIGURE_SELECTOR}:has(table)`
const TABLE_SUFFIX = 'table_'

const FIGURE_IMAGE_SELECTOR = `${FIGURE_SELECTOR}:has(img:not([role=math]))`
const IMAGE_SUFFIX = 'img_'

const FIGURE_FORMULA_SELECTOR = `${FIGURE_SELECTOR}:has(svg[role=math])`
const INLINE_FORMULA_SELECTOR = `span:has(svg[role=math])`
const FORMULA_SUFFIX = 'formula_'

const FIGURE_LISTING_SELECTOR = `${FIGURE_SELECTOR}:has(pre:has(code))`
const LISTING_SUFFIX = 'listing_'

let remove_listing = 0

/**
 * Raje_table
 */
tinymce.PluginManager.add('raje_table', function (editor, url) {

  // Add a button that handle the inline element
  editor.addButton('raje_table', {
    title: 'raje_table',
    icon: 'icon-table',
    tooltip: 'Table',
    disabledStateSelector: DISABLE_SELECTOR_FIGURES,

    // Button behaviour
    onclick: function () {

      // On click a dialog is opened
      editor.windowManager.open({
        title: 'Select Table size',
        body: [{
          type: 'textbox',
          name: 'width',
          label: 'Columns'
        }, {
          type: 'textbox',
          name: 'heigth',
          label: 'Rows'
        }],
        onSubmit: function (e) {

          // Get width and heigth
          table.add(e.data.width, e.data.heigth)
        }
      })
    }
  })

  // Because some behaviours aren't accepted, RAJE must check selection and accept backspace, canc and enter press
  editor.on('keyDown', function (e) {

    // keyCode 8 is backspace, 46 is canc
    if (e.keyCode == 8)
      return handleFigureDelete(tinymce.activeEditor.selection)

    if (e.keyCode == 46)
      return handleFigureCanc(tinymce.activeEditor.selection)

    // Handle enter key in figcaption
    if (e.keyCode == 13)
      return handleFigureEnter(tinymce.activeEditor.selection)

    e.stopPropagation()
  })

  // Handle strange structural modification empty figures or with caption as first child
  editor.on('nodeChange', function (e) {
    handleFigureChange(tinymce.activeEditor.selection)
  })

  table = {

    /**
     * Add the new table (with given size) at the caret position
     */
    add: function (width, heigth) {

      // Get the reference of the current selected element
      let selectedElement = $(tinymce.activeEditor.selection.getNode())

      // Get the reference of the new created table
      let newTable = this.create(width, heigth, getSuccessiveElementId(FIGURE_TABLE_SELECTOR, TABLE_SUFFIX))

      // Begin atomic UNDO level 
      tinymce.activeEditor.undoManager.transact(function () {

        // Check if the selected element is not empty, and add table after
        if (selectedElement.text().trim().length != 0) {

          // If selection is at start of the selected element
          if (tinymce.activeEditor.selection.getRng().startOffset == 0)
            selectedElement.before(newTable)

          else
            selectedElement.after(newTable)
        }

        // If selected element is empty, replace it with the new table
        else
          selectedElement.replaceWith(newTable)

        // Save updates 
        tinymce.triggerSave()

        // Update all captions with RASH function
        captions()

        // Update Rendered RASH
        updateIframeFromSavedContent()
      })
    },

    /**
     * Create the new table using passed width and height
     */
    create: function (width, height, id) {

      // If width and heigth are positive
      try {
        if (width > 0 && height > 0) {

          // Create figure and table
          let figure = $(`<figure id="${id}"></figure>`)
          let table = $(`<table></table>`)

          // Populate with width & heigth
          for (let i = 0; i <= height; i++) {

            let row = $(`<tr></tr>`)
            for (let x = 0; x < width; x++) {

              if (i == 0)
                row.append(`<th>Heading cell ${x+1}</th>`)

              else
                row.append(`<td><p>Data cell ${x+1}</p></td>`)
            }

            table.append(row)
          }

          figure.append(table)
          figure.append(`<figcaption>Caption.</figcaption>`)

          return figure
        }
      } catch (e) {}
    }
  }
})

/**
 * Raje_figure
 */
tinymce.PluginManager.add('raje_image', function (editor, url) {

  // Add a button that handle the inline element
  editor.addButton('raje_image', {
    title: 'raje_image',
    icon: 'icon-image',
    tooltip: 'Image block',
    disabledStateSelector: DISABLE_SELECTOR_FIGURES,

    // Button behaviour
    onclick: function () {

      let filename = selectImage()

      if (filename != null)
        image.add(filename, filename)
    }
  })

  // Because some behaviours aren't accepted, RAJE must check selection and accept backspace, canc and enter press
  editor.on('keyDown', function (e) {

    // keyCode 8 is backspace
    if (e.keyCode == 8)
      return handleFigureDelete(tinymce.activeEditor.selection)

    if (e.keyCode == 46)
      return handleFigureCanc(tinymce.activeEditor.selection)

    // Handle enter key in figcaption
    if (e.keyCode == 13)
      return handleFigureEnter(tinymce.activeEditor.selection)
  })

  image = {

    /**
     * 
     */
    add: function (url, alt) {

      // Get the referece of the selected element
      let selectedElement = $(tinymce.activeEditor.selection.getNode())
      let newFigure = this.create(url, alt, getSuccessiveElementId(FIGURE_IMAGE_SELECTOR, IMAGE_SUFFIX))

      // Begin atomic UNDO level 
      tinymce.activeEditor.undoManager.transact(function () {

        // Check if the selected element is not empty, and add table after
        if (selectedElement.text().trim().length != 0) {

          // If selection is at start of the selected element
          if (tinymce.activeEditor.selection.getRng().startOffset == 0)
            selectedElement.before(newFigure)

          else
            selectedElement.after(newFigure)
        }

        // If selected element is empty, replace it with the new table
        else
          selectedElement.replaceWith(newFigure)

        // Save updates 
        tinymce.triggerSave()

        // Update all captions with RASH function
        captions()

        // Update Rendered RASH
        updateIframeFromSavedContent()
      })
    },

    /**
     * 
     */
    create: function (url, alt, id) {
      return $(`<figure id="${id}"><p><img src="${url}" ${alt?'alt="'+alt+'"':''} /></p><figcaption>Caption.</figcaption></figure>`)
    }
  }
})

/**
 * Raje_formula
 */

function openFormulaEditor(formulaValue, callback) {
  tinymce.activeEditor.windowManager.open({
      title: 'Math formula editor',
      url: 'js/raje-core/plugin/raje_formula.html',
      width: 800,
      height: 500,
      onClose: function () {

        let output = tinymce.activeEditor.formula_output

        // If at least formula is written
        if (output != null) {

          // If has id, RAJE must update it
          if (output.formula_id)
            formula.update(output.formula_svg, output.formula_id)

          // Or add it normally
          else
            formula.add(output.formula_svg)

          // Set formula null
          tinymce.activeEditor.formula_output = null
        }

        tinymce.activeEditor.windowManager.close()
      }
    },
    formulaValue
  )
}

tinymce.PluginManager.add('raje_formula', function (editor, url) {

  // Add a button that handle the inline element
  editor.addButton('raje_formula', {
    text: 'raje_formula',
    icon: false,
    tooltip: 'Formula',
    disabledStateSelector: DISABLE_SELECTOR_FIGURES,

    // Button behaviour
    onclick: function () {
      openFormulaEditor()
    }
  })

  // Because some behaviours aren't accepted, RAJE must check selection and accept backspace, canc and enter press
  editor.on('keyDown', function (e) {

    // keyCode 8 is backspace
    if (e.keyCode == 8)
      return handleFigureDelete(tinymce.activeEditor.selection)

    if (e.keyCode == 46)
      return handleFigureCanc(tinymce.activeEditor.selection)

    // Handle enter key in figcaption
    if (e.keyCode == 13)
      return handleFigureEnter(tinymce.activeEditor.selection)
  })

  editor.on('click', function (e) {
    let selectedElement = $(tinymce.activeEditor.selection.getNode())

    // Open formula editor clicking on math formulas
    if (selectedElement.parents(FIGURE_SELECTOR).length && selectedElement.children('svg[role=math]').length) {

      openFormulaEditor({
        formula_val: selectedElement.children('svg[role=math]').attr('data-math-original-input'),
        formula_id: selectedElement.parents(FIGURE_SELECTOR).attr('id')
      })
    }
  })

  formula = {
    /**
     * 
     */
    add: function (formula_svg) {

      let selectedElement = $(tinymce.activeEditor.selection.getNode())
      let newFormula = this.create(formula_svg, getSuccessiveElementId(`${FIGURE_FORMULA_SELECTOR},${INLINE_FORMULA_SELECTOR}`, FORMULA_SUFFIX))

      tinymce.activeEditor.undoManager.transact(function () {

        // Check if the selected element is not empty, and add table after
        if (selectedElement.text().trim().length != 0)
          selectedElement.after(newFormula)

        // If selected element is empty, replace it with the new table
        else
          selectedElement.replaceWith(newFormula)

        // Save updates 
        tinymce.triggerSave()

        captions()

        // Update Rendered RASH
        updateIframeFromSavedContent()
      })

    },

    /**
     * 
     */
    update: function (formula_svg, formula_id) {

      let selectedFigure = $(`#${formula_id}`)

      tinymce.activeEditor.undoManager.transact(function () {

        selectedFigure.find('svg').replaceWith(formula_svg)
        updateIframeFromSavedContent()
      })
    },

    /**
     * 
     */
    create: function (formula_svg, id) {
      //return `<figure id="${id}"><p><span role="math" contenteditable="false">\`\`${formula_input}\`\`</span></p></figure>`
      return `<figure id="${id}"><p><span contenteditable="false">${formula_svg[0].outerHTML}</span></p></figure>`
    }
  }
})

function openInlineFormulaEditor(formulaValue, callback) {
  tinymce.activeEditor.windowManager.open({
      title: 'Math formula editor',
      url: 'js/rajemce/plugin/raje_formula.html',
      width: 800,
      height: 500,
      onClose: function () {

        let output = tinymce.activeEditor.formula_output

        // If at least formula is written
        if (output != null) {

          // If has id, RAJE must update it
          if (output.formula_id)
            inline_formula.update(output.formula_svg, output.formula_id)

          // Or add it normally
          else
            inline_formula.add(output.formula_svg)

          // Set formula null
          tinymce.activeEditor.formula_output = null
        }

        tinymce.activeEditor.windowManager.close()
      }
    },
    formulaValue
  )
}

tinymce.PluginManager.add('raje_inline_formula', function (editor, url) {

  editor.addButton('raje_inline_formula', {
    icon: 'icon-inline-formula',
    tooltip: 'Inline formula',
    disabledStateSelector: DISABLE_SELECTOR_FIGURES,

    // Button behaviour
    onclick: function () {
      openInlineFormulaEditor()
    }
  })

  editor.on('click', function (e) {
    let selectedElement = $(tinymce.activeEditor.selection.getNode())

    // Open formula editor clicking on math formulas
    if (selectedElement.children('svg[role=math]').length) {

      openInlineFormulaEditor({
        formula_val: selectedElement.children('svg[role=math]').attr('data-math-original-input'),
        formula_id: selectedElement.attr('id')
      })
    }
  })

  inline_formula = {
    /**
     * 
     */
    add: function (formula_svg) {

      let selectedElement = $(tinymce.activeEditor.selection.getNode())
      let newFormula = this.create(formula_svg, getSuccessiveElementId(`${FIGURE_FORMULA_SELECTOR},${INLINE_FORMULA_SELECTOR}`, FORMULA_SUFFIX))

      tinymce.activeEditor.undoManager.transact(function () {

        tinymce.activeEditor.selection.setContent(newFormula)

        // Save updates 
        tinymce.triggerSave()

        captions()

        // Update Rendered RASH
        updateIframeFromSavedContent()
      })

    },

    /**
     * 
     */
    update: function (formula_svg, formula_id) {

      let selectedFigure = $(`#${formula_id}`)

      tinymce.activeEditor.undoManager.transact(function () {

        selectedFigure.find('svg').replaceWith(formula_svg)
        updateIframeFromSavedContent()
      })
    },

    /**
     * 
     */
    create: function (formula_svg, id) {
      return `<span id="${id}" contenteditable="false">${formula_svg[0].outerHTML}</span>`
    }
  }
})

/**
 * Raje_listing
 */
tinymce.PluginManager.add('raje_listing', function (editor, url) {

  // Add a button that handle the inline element
  editor.addButton('raje_listing', {
    title: 'raje_listing',
    icon: 'icon-listing',
    tooltip: 'Listing',
    disabledStateSelector: DISABLE_SELECTOR_FIGURES,

    // Button behaviour
    onclick: function () {
      listing.add()
    }
  })



  // Because some behaviours aren't accepted, RAJE must check selection and accept backspace, canc and enter press
  editor.on('keyDown', function (e) {

    let selectedElement = $(tinymce.activeEditor.selection.getNode())
    if (selectedElement.parents('figure:has(pre:has(code))').length) {

      /**
       * Proper listing editor behaviour
       */
      if (selectedElement.is('code')) {

        /**
         * ENTER
         */
        if (e.keyCode == 13) {
          e.preventDefault()
          return listing.setContent(`\n${ZERO_SPACE}`)
        }

        /**
         * TAB
         */
        if (e.keyCode == 9) {
          e.preventDefault()
          return listing.setContent(`\t`)
        }
      }

      if (e.keyCode == 13)
        return handleFigureEnter(tinymce.activeEditor.selection)

      // keyCode 8 is backspace
      if (e.keyCode == 8)
        return handleFigureDelete(tinymce.activeEditor.selection)

      /*
      // keyCode 8 is backspace
      if (e.keyCode == 8)
        return handleFigureDelete(tinymce.activeEditor.selection)

      if (e.keyCode == 46)
        return handleFigureCanc(tinymce.activeEditor.selection)

      // Handle enter key in figcaption
      if (e.keyCode == 13)
        return handleFigureEnter(tinymce.activeEditor.selection)
        */
    }
    /*
    if (e.keyCode == 9) {
      if (tinymce.activeEditor.selection.isCollapsed() && $(tinymce.activeEditor.selection.getNode()).parents(`code,${FIGURE_SELECTOR}`).length) {
        tinymce.activeEditor.selection.setContent('\t')
        return false
      }
    }

    if (e.keyCode == 37) {
      let range = tinymce.activeEditor.selection.getRng()
      let startNode = $(range.startContainer)
      if (startNode.parent().is('code') && (startNode.parent().contents().index(startNode) == 0 && range.startOffset == 1)) {
        tinymce.activeEditor.selection.setCursorLocation(startNode.parents(FIGURE_SELECTOR).prev('p,:header')[0], 1)
        return false
      }
    }*/
  })

  listing = {
    /**
     * 
     */
    add: function () {

      let selectedElement = $(tinymce.activeEditor.selection.getNode())
      let newListing = this.create(getSuccessiveElementId(FIGURE_LISTING_SELECTOR, LISTING_SUFFIX))

      tinymce.activeEditor.undoManager.transact(function () {

        // Check if the selected paragraph is not empty, add the new listing right below
        if (selectedElement.text().trim().length != 0)
          selectedElement.after(newListing)

        // If selected paragraph is empty, replace it with the new table
        else
          selectedElement.replaceWith(newListing)

        // Save updates 
        tinymce.triggerSave()

        // Update all captions with RASH function
        captions()

        // Move the caret
        selectRange(newListing.find('code')[0], 0)

        // Update Rendered RASH
        updateIframeFromSavedContent()
      })

    },

    /**
     * 
     */
    create: function (id) {
      return $(`<figure id="${id}"><pre><code>${ZERO_SPACE}</code></pre><figcaption>Caption.</figcaption></figure>`)
    },

    /**
     * 
     */
    setContent: function (char) {
      tinymce.activeEditor.selection.setContent(char)
    }
  }
})

/**
 * Update table captions with a RASH funcion 
 */
function captions() {

  /* Captions */
  $(figurebox_selector).each(function () {
    var cur_caption = $(this).parents("figure").find("figcaption");
    var cur_number = $(this).findNumber(figurebox_selector);
    cur_caption.find('strong').remove();
    cur_caption.html("<strong class=\"cgen\" data-rash-original-content=\"\" contenteditable=\"false\">Figure " + cur_number +
      ". </strong>" + cur_caption.html());
  });
  $(tablebox_selector).each(function () {
    var cur_caption = $(this).parents("figure").find("figcaption");
    var cur_number = $(this).findNumber(tablebox_selector);
    cur_caption.find('strong').remove();
    cur_caption.html("<strong class=\"cgen\" data-rash-original-content=\"\" contenteditable=\"false\" >Table " + cur_number +
      ". </strong>" + cur_caption.html());
  });
  $(formulabox_selector).each(function () {
    var cur_caption = $(this).parents("figure").find("p");
    var cur_number = $(this).findNumber(formulabox_selector);
    cur_caption.find('span.cgen').remove();
    cur_caption.html(cur_caption.html() + "<span contenteditable=\"false\" class=\"cgen\" data-rash-original-content=\"\" > (" +
      cur_number + ")</span>");
  });
  $(listingbox_selector).each(function () {
    var cur_caption = $(this).parents("figure").find("figcaption");
    var cur_number = $(this).findNumber(listingbox_selector);
    cur_caption.find('strong').remove();
    cur_caption.html("<strong class=\"cgen\" data-rash-original-content=\"\" contenteditable=\"false\">Listing " + cur_number +
      ". </strong>" + cur_caption.html());
  });
  /* /END Captions */
}

/**
 * 
 * @param {*} sel => tinymce selection
 * 
 * Mainly it checks where selection starts and ends to block unallowed deletion
 * In same figure aren't blocked, unless selection start OR end inside figcaption (not both)
 */
function handleFigureDelete(sel) {

  try {

    // Get reference of start and end node
    let startNode = $(sel.getRng().startContainer)
    let startNodeParent = startNode.parents(FIGURE_SELECTOR)

    let endNode = $(sel.getRng().endContainer)
    let endNodeParent = endNode.parents(FIGURE_SELECTOR)

    // If at least selection start or end is inside the figure
    if (startNodeParent.length || endNodeParent.length) {

      // If selection wraps entirely a figure from the start of first element (th in table) and selection ends
      if (endNode.parents('figcaption').length) {

        let contents = endNode.parent().contents()
        if (startNode.is(FIGURE_SELECTOR) && contents.index(endNode) == contents.length - 1 && sel.getRng().endOffset == endNode.text().length) {
          tinymce.activeEditor.undoManager.transact(function () {

            // Move cursor at the previous element and remove figure
            tinymce.activeEditor.focus()
            tinymce.activeEditor.selection.setCursorLocation(startNode.prev()[0], 1)
            startNode.remove()

            return false
          })
        }
      }

      // If selection doesn't start and end in the same figure, but one beetwen start or end is inside the figcaption, must block
      if (startNode.parents('figcaption').length != endNode.parents('figcaption').length && (startNode.parents('figcaption').length || endNode.parents('figcaption').length))
        return false

      // If the figure is not the same, must block
      // Because a selection can start in figureX and end in figureY
      if ((startNodeParent.attr('id') != endNodeParent.attr('id')))
        return false

      // If cursor is at start of code prevent
      if (startNode.parents(FIGURE_SELECTOR).find('pre').length) {

        // If at the start of pre>code, pressing 2times backspace will remove everything 
        if (startNode.parent().is('code') && (startNode.parent().contents().index(startNode) == 0 && sel.getRng().startOffset == 1)) {
          tinymce.activeEditor.undoManager.transact(function () {
            startNode.parents(FIGURE_SELECTOR).remove()
          })
          return false
        }


        if (startNode.parent().is('pre') && sel.getRng().startOffset == 0)
          return false
      }
    }

    return true
  } catch (e) {
    return false
  }
}

/**
 * 
 * @param {*} sel 
 */
function handleFigureCanc(sel) {

  // Get reference of start and end node
  let startNode = $(sel.getRng().startContainer)
  let startNodeParent = startNode.parents(FIGURE_SELECTOR)

  let endNode = $(sel.getRng().endContainer)
  let endNodeParent = endNode.parents(FIGURE_SELECTOR)

  // If at least selection start or end is inside the figure
  if (startNodeParent.length || endNodeParent.length) {

    // If selection doesn't start and end in the same figure, but one beetwen start or end is inside the figcaption, must block
    if (startNode.parents('figcaption').length != endNode.parents('figcaption').length && (startNode.parents('figcaption').length || endNode.parents('figcaption').length))
      return false

    // If the figure is not the same, must block
    // Because a selection can start in figureX and end in figureY
    if ((startNodeParent.attr('id') != endNodeParent.attr('id')))
      return false

  }

  // This algorithm doesn't work if caret is in empty text element

  // Current element can be or text or p
  let paragraph = startNode.is('p') ? startNode : startNode.parents('p').first()
  // Save all chldren nodes (text included)
  let paragraphContent = paragraph.contents()

  // If next there is a figure
  if (paragraph.next().is(FIGURE_SELECTOR)) {

    if (endNode[0].nodeType == 3) {

      // If the end node is a text inside a strong, its index will be -1.
      // In this case the editor must iterate until it face a inline element
      if (paragraphContent.index(endNode) == -1) //&& paragraph.parents(SECTION_SELECTOR).length)
        endNode = endNode.parent()

      // If index of the inline element is equal of children node length
      // AND the cursor is at the last position
      // Remove the next figure in one undo level
      if (paragraphContent.index(endNode) + 1 == paragraphContent.length && paragraphContent.last().text().length == sel.getRng().endOffset) {
        tinymce.activeEditor.undoManager.transact(function () {
          paragraph.next().remove()
        })
        return false
      }
    }
  }

  return true
}

/**
 * 
 * @param {*} sel => tinymce selection
 * 
 * Add a paragraph after the figure
 */
function handleFigureEnter(sel) {

  let selectedElement = $(sel.getNode())
  if (selectedElement.is('figcaption') || (selectedElement.parents(FIGURE_SELECTOR).length && selectedElement.is('p'))) {

    tinymce.activeEditor.undoManager.transact(function () {

      //add a new paragraph after the figure
      selectedElement.parent(FIGURE_SELECTOR).after('<p><br/></p>')

      //move caret at the start of new p
      tinymce.activeEditor.selection.setCursorLocation(selectedElement.parent(FIGURE_SELECTOR)[0].nextSibling, 0)
    })
    return false
  } else if (selectedElement.is('th'))
    return false
  return true
}

/**
 * 
 * @param {*} sel => tinymce selection
 */
function handleFigureChange(sel) {

  tinymce.triggerSave()

  // If rash-generated section is delete, re-add it
  if ($('figcaption:not(:has(strong))').length) {
    captions()
    updateIframeFromSavedContent()
  }
}
/**
 * raje_inline_code plugin RAJE
 */

const DISABLE_SELECTOR_INLINE = 'figure, section[role=doc-bibliography]'

const INLINE_ERRORS = 'Error, Inline elements can be ONLY created inside the same paragraph'

/**
 * 
 */
let inline = {

  /**
   * 
   */
  handle: function (type) {
    let selectedElement = $(tinymce.activeEditor.selection.getNode())

    // If there isn't any inline code
    if (!selectedElement.is(type) && !selectedElement.parents(type).length) {

      let text = ZERO_SPACE

      // Check if the selection starts and ends in the same paragraph
      if (!tinymce.activeEditor.selection.isCollapsed()) {

        let startNode = tinymce.activeEditor.selection.getStart()
        let endNode = tinymce.activeEditor.selection.getEnd()

        // Notify the error and exit
        if (startNode != endNode) {
          notify(INLINE_ERRORS, 'error', 3000)
          return false
        }

        // Save the selected content as text
        text += tinymce.activeEditor.selection.getContent()
      }

      // Update the current selection with code element
      tinymce.activeEditor.undoManager.transact(function () {

        // Get the index of the current selected node
        let previousNodeIndex = selectedElement.contents().index($(tinymce.activeEditor.selection.getRng().startContainer))

        // Add code element
        tinymce.activeEditor.selection.setContent(`<${type}>${text}</${type}>${(type == 'q' ? ZERO_SPACE : '')}`)
        tinymce.triggerSave()

        // Move caret at the end of the successive node of previous selected node
        tinymce.activeEditor.selection.setCursorLocation(selectedElement.contents()[previousNodeIndex + 1], 1)
      })
    }
  },

  /**
   * 
   */
  exit: function () {
    // Get the current node index, relative to its parent
    let selectedElement = $(tinymce.activeEditor.selection.getNode())
    let parentContent = selectedElement.parent().contents()
    let index = parentContent.index(selectedElement)

    tinymce.activeEditor.undoManager.transact(function () {

      // Check if the current node has a text after
      if (typeof parentContent[index + 1] != 'undefined' && $(parentContent[index + 1]).is('text')) {
        tinymce.activeEditor.selection.setCursorLocation(parentContent[index + 1], 0)
        tinymce.activeEditor.selection.setContent(ZERO_SPACE)
      }

      // If the node hasn't text after, raje has to add it
      else {
        selectedElement.after(ZERO_SPACE)
        tinymce.activeEditor.selection.setCursorLocation(parentContent[index + 1], 0)
      }
    })
  },

  /**
   * 
   */
  replaceText: function (char) {

    let selectedElement = $(tinymce.activeEditor.selection.getNode())
    tinymce.activeEditor.undoManager.transact(function () {

      // Set the new char and overwrite current text
      selectedElement.html(char)

      // Move the caret at the end of current text
      let content = selectedElement.contents()
      moveCaret(content[content.length - 1])
    })
  }
}

/**
 * 
 */
tinymce.PluginManager.add('raje_inlineCode', function (editor, url) {

  const CODE = 'code'

  // Add a button that opens a window
  editor.addButton('raje_inlineCode', {
    title: 'inline_code',
    icon: 'icon-inline-code',
    tooltip: 'Inline code',
    disabledStateSelector: DISABLE_SELECTOR_INLINE,

    // Button behaviour
    onclick: function () {
      inline.handle(CODE)
    }
  })

  editor.on('keyDown', function (e) {

    // Check if the selected element is a CODE that isn't inside a FIGURE or PRE
    let selectedElement = $(tinymce.activeEditor.selection.getNode())
    if (selectedElement.is('code') && !selectedElement.parents(FIGURE_SELECTOR).length && !selectedElement.parents('pre').length) {

      /**
       * Check if ENTER is pressed
       */
      if (e.keyCode == 13) {

        e.preventDefault()
        e.stopImmediatePropagation()
        inline.exit()
      }

      /**
       * Check if a PRINTABLE CHAR is pressed
       */
      if (checkIfPrintableChar(e.keyCode)) {

        // If the first char is ZERO_SPACE and the code has no char
        if (selectedElement.text().length == 2 && `&#${selectedElement.text().charCodeAt(0)};` == ZERO_SPACE) {
          
          e.preventDefault()
          e.stopImmediatePropagation()
          inline.replaceText(e.key)
        }
      }
    }
  })
})

/**
 *  Inline quote plugin RAJE
 */
tinymce.PluginManager.add('raje_inlineQuote', function (editor, url) {

  const Q = 'q'

  // Add a button that handle the inline element
  editor.addButton('raje_inlineQuote', {
    title: 'inline_quote',
    icon: 'icon-inline-quote',
    tooltip: 'Inline quote',
    disabledStateSelector: DISABLE_SELECTOR_INLINE,

    // Button behaviour
    onclick: function () {
      inline.handle('q')
    }
  })

  editor.on('keyDown', function (e) {

    // Check if the selected element is a CODE that isn't inside a FIGURE or PRE
    let selectedElement = $(tinymce.activeEditor.selection.getNode())
    if (selectedElement.is('q')) {

      /**
       * Check if ENTER is pressed
       */
      if (e.keyCode == 13) {

        e.preventDefault()
        e.stopImmediatePropagation()
        inline.exit()
      }

      /**
       * Check if a PRINTABLE CHAR is pressed
       */
      if (checkIfPrintableChar(e.keyCode)) {

        // If the first char is ZERO_SPACE and the code has no char
        if (selectedElement.text().length == 1 && `&#${selectedElement.text().charCodeAt(0)};` == ZERO_SPACE) {

          e.preventDefault()
          e.stopImmediatePropagation()
          inline.replaceText(e.key)
        }
      }
    }
  })
})

/**
 * 
 */
tinymce.PluginManager.add('raje_externalLink', function (editor, url) {

  editor.addButton('raje_externalLink', {
    title: 'external_link',
    icon: 'icon-external-link',
    tooltip: 'External link',
    disabledStateSelector: DISABLE_SELECTOR_INLINE,

    // Button behaviour
    onclick: function () {}
  })


  let link = {
    add: function () {

    }
  }
})

/**
 * 
 */
tinymce.PluginManager.add('raje_inlineFigure', function (editor, url) {
  editor.addButton('raje_inlineFigure', {
    text: 'inline_figure',
    tooltip: 'Inline quote',
    disabledStateSelector: DISABLE_SELECTOR_INLINE,

    // Button behaviour
    onclick: function () {}
  })
})
tinymce.PluginManager.add('raje_lists', function (editor, url) {

  const OL = 'ol'
  const UL = 'ul'

  editor.addButton('raje_ol', {
    title: 'raje_ol',
    icon: 'icon-ol',
    tooltip: 'Ordered list',
    disabledStateSelector: DISABLE_SELECTOR_FIGURES,

    // Button behaviour
    onclick: function () {
      list.add(OL)
    }
  })

  editor.addButton('raje_ul', {
    title: 'raje_ul',
    icon: 'icon-ul',
    tooltip: 'Unordered list',
    disabledStateSelector: DISABLE_SELECTOR_FIGURES,

    // Button behaviour
    onclick: function () {
      list.add(UL)
    }
  })

  /**
   * 
   */
  editor.on('keyDown', function (e) {


    // Check if the selected element is a P inside a list (OL, UL)
    let selectedElement = $(tinymce.activeEditor.selection.getNode())
    if (selectedElement.is('p') && (selectedElement.parents('ul').length || selectedElement.parents('li').length)) {


      /**
       * Check if CMD+ENTER or CTRL+ENTER are pressed
       */
      if ((e.metaKey || e.ctrlKey) && e.keyCode == 13) {
        e.preventDefault()
        list.addParagraph()
      }

      /**
       * Check if SHIFT+TAB is pressed
       */
      else if (e.shiftKey && e.keyCode == 9) {
        e.preventDefault()
        list.deNest()
      }

      /**
       * Check if ENTER is pressed
       */
      else if (e.keyCode == 13) {

        e.preventDefault()

        // Check if the selection is collapsed
        if (tinymce.activeEditor.selection.isCollapsed()) {

          if (!selectedElement.text().trim().length) {

            // De nest
            if (selectedElement.parents('ul,ol').length > 1)
              list.deNest()

            // Remove the empty LI
            else
              list.removeListItem()

          } else
            list.addListItem()
        }
      }

      /**
       * Check if TAB is pressed
       */
      else if (e.keyCode == 9) {
        e.preventDefault()
        list.nest()
      }
    }
  })


  /**
   * 
   */
  let list = {

    /**
     * 
     */
    add: function (type) {

      // Get the current element 
      let selectedElement = $(tinymce.activeEditor.selection.getNode())
      let text = '<br>'

      // If the current element has text, save it
      if (selectedElement.text().trim().length > 0)
        text = selectedElement.text().trim()

      tinymce.activeEditor.undoManager.transact(function () {

        let newList = $(`<${type}><li><p>${text}</p></li></${type}>`)

        // Add the new element
        selectedElement.replaceWith(newList)

        // Save changes
        tinymce.triggerSave()

        // Move the cursor
        moveCaret(newList.find('p')[0], false)
      })
    },

    /**
     * 
     */
    addListItem: function () {

      const BR = '<br>'

      // Get the references of the existing element
      let p = $(tinymce.activeEditor.selection.getNode())
      let listItem = p.parent('li')

      // Placeholder text of the new li
      let newText = BR
      let nodes = p.contents()

      // If there is just one node wrapped inside the paragraph
      if (nodes.length == 1) {

        // Get the start offset and text of the current li
        let startOffset = tinymce.activeEditor.selection.getRng().startOffset
        let pText = p.text()

        // If the cursor isn't at the end
        if (startOffset != pText.length) {

          // Get the remaining text
          newText = pText.substring(startOffset, pText.length)
        }

        tinymce.activeEditor.undoManager.transact(function () {

          // Update the text of the current li
          p.text(pText.substring(0, startOffset))

          if (!p.text().length)
            p.html(BR)

          // Create and add the new li
          let newListItem = $(`<li><p>${newText}</p></li>`)
          listItem.after(newListItem)

          // Move the caret to the new li
          moveCaret(newListItem[0], true)

          // Update the content
          tinymce.triggerSave()
        })
      }

      // Instead if there are multiple nodes inside the paragraph
      else {

        // Istantiate the range to be selected
        let range = document.createRange()

        // Start the range from the selected node and offset and ends it at the end of the last node
        range.setStart(tinymce.activeEditor.selection.getRng().startContainer, tinymce.activeEditor.selection.getRng().startOffset)
        range.setEnd(this.getLastNotEmptyNode(nodes), 1)

        // Select the range
        tinymce.activeEditor.selection.setRng(range)

        // Save the html content
        newText = tinymce.activeEditor.selection.getContent()

        tinymce.activeEditor.undoManager.transact(function () {

          p.html(p.html().replace(newText, ''))

          if (!p.text().length)
            p.html(BR)

          // Create and add the new li
          let newListItem = $(`<li><p>${newText}</p></li>`)
          listItem.after(newListItem)

          // Move the caret to the new li
          moveCaret(newListItem[0], true)

          // Update the content
          tinymce.triggerSave()
        })
      }
    },

    /**
     * 
     */
    getLastNotEmptyNode: function (nodes) {

      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].nodeType == 3 && !nodes[i].length)
          nodes.splice(i, 1)
      }

      return nodes[nodes.length - 1]
    },

    /**
     * 
     */
    removeListItem: function () {

      // Get the selected listItem
      let listItem = $(tinymce.activeEditor.selection.getNode()).parent('li')

      tinymce.activeEditor.undoManager.transact(function () {

        // Add a empty paragraph after the list
        let newP = $('<p><br></p>')
        listItem.parent().after(newP)

        // Check if the list has exactly one child remove the list
        if (listItem.parent().children('li').length == 1) {
          let list = listItem.parent()
          list.remove()
        }

        // If the list has more children remove the selected child
        else
          listItem.remove()

        moveCaret(newP[0])

        // Update the content
        tinymce.triggerSave()
      })
    },

    /**
     * 
     */
    nest: function () {

      let p = $(tinymce.activeEditor.selection.getNode())
      let listItem = p.parent('li')

      // Check if the current li has at least one previous element
      if (listItem.prevAll().length > 0) {

        // Create the new list
        let text = '<br>'

        if (p.text().trim().length)
          text = p.text().trim()

        // Get type of the parent list
        let type = listItem.parent()[0].tagName.toLowerCase()

        // Create the new nested list
        let newListItem = $(listItem[0].outerHTML)

        tinymce.activeEditor.undoManager.transact(function () {

          // If the previous element has a list
          if (listItem.prev().find('ul,ol').length)
            listItem.prev().find('ul,ol').append(newListItem)

          // Add the new list inside the previous li
          else {
            newListItem = $(`<${type}>${newListItem[0].outerHTML}</${type}>`)
            listItem.prev().append(newListItem)
          }

          listItem.remove()

          // Move the caret at the end of the new p 
          moveCaret(newListItem.find('p')[0])

          tinymce.triggerSave()
        })
      }
    },

    /**
     * 
     */
    deNest: function () {

      let listItem = $(tinymce.activeEditor.selection.getNode()).parent('li')
      let list = listItem.parent()

      // Check if the current list has at least another list as parent
      if (listItem.parents('ul,ol').length > 1) {

        tinymce.activeEditor.undoManager.transact(function () {

          // Get all li: current and if there are successive
          let nextLi = [listItem]
          if (listItem.nextAll().length > 0) {
            listItem.nextAll().each(function () {
              nextLi.push($(this))
            })
          }

          // Move all li out from the nested list
          for (let i = nextLi.length - 1; i > -1; i--) {
            nextLi[i].remove()
            list.parent().after(nextLi[i])
          }

          // If empty remove the list
          if (!list.children('li').length)
            list.remove()

          // Move the caret at the end
          moveCaret(listItem.find('p')[0])
        })
      }
    },

    /**
     * 
     */
    addParagraph: function () {

      // Get references of current p
      let p = $(tinymce.activeEditor.selection.getNode())
      let startOffset = tinymce.activeEditor.selection.getRng().startOffset
      let pText = p.text().trim()

      let text = '<br>'

      tinymce.activeEditor.undoManager.transact(function () {

        // If the ENTER breaks p
        if (startOffset != pText.length) {

          // Update the text of the current li
          p.text(pText.substring(0, startOffset))

          // Get the remaining text
          text = pText.substring(startOffset, pText.length)
        }

        // Create and add the element
        let newP = $(`<p>${text}</p>`)
        p.after(newP)

        moveCaret(newP[0], true)
      })
    }
  }
})
/**
 * 
 */

function openMetadataDialog() {
  tinymce.activeEditor.windowManager.open({
    title: 'Edit metadata',
    url: 'js/raje-core/plugin/raje_metadata.html',
    width: 950,
    height: 800,
    onClose: function () {

      if (tinymce.activeEditor.updated_metadata != null) {

        metadata.update(tinymce.activeEditor.updated_metadata)

        tinymce.activeEditor.updated_metadata == null
      }

      tinymce.activeEditor.windowManager.close()
    }
  }, metadata.getAllMetadata())
}

tinymce.PluginManager.add('raje_metadata', function (editor, url) {

  // Add a button that handle the inline element
  editor.addButton('raje_metadata', {
    text: 'Metadata',
    icon: false,
    tooltip: 'Edit metadata',

    // Button behaviour
    onclick: function () {
      openMetadataDialog()
    }
  })

  editor.on('click', function (e) {
    if ($(tinymce.activeEditor.selection.getNode()).is(HEADER_SELECTOR))
      openMetadataDialog()
  })

  metadata = {

    /**
     * 
     */
    getAllMetadata: function () {
      let header = $(HEADER_SELECTOR)
      let subtitle = header.find('h1.title > small').text()
      let data = {
        subtitle: subtitle,
        title: header.find('h1.title').text().replace(subtitle, ''),
        authors: metadata.getAuthors(header),
        categories: metadata.getCategories(header),
        keywords: metadata.getKeywords(header)
      }

      return data
    },

    /**
     * 
     */
    getAuthors: function (header) {
      let authors = []

      header.find('address.lead.authors').each(function () {

        // Get all affiliations
        let affiliations = []
        $(this).find('span').each(function () {
          affiliations.push($(this).text())
        })

        // push single author
        authors.push({
          name: $(this).children('strong.author_name').text(),
          email: $(this).find('code.email > a').text(),
          affiliations: affiliations
        })
      })

      return authors
    },

    /**
     * 
     */
    getCategories: function (header) {
      let categories = []

      header.find('p.acm_subject_categories > code').each(function () {
        categories.push($(this).text())
      })

      return categories
    },

    /**
     * 
     */
    getKeywords: function (header) {
      let keywords = []

      header.find('ul.list-inline > li > code').each(function () {
        keywords.push($(this).text())
      })

      return keywords
    },

    /**
     * 
     */
    update: function (updatedMetadata) {

      $('head meta[property], head link[property], head meta[name]').remove()

      let currentMetadata = metadata.getAllMetadata()

      // Update title and subtitle
      if (updatedMetadata.title != currentMetadata.title || updatedMetadata.subtitle != currentMetadata.subtitle) {
        let text = updatedMetadata.title

        if (updatedMetadata.subtitle.trim().length)
          text += ` -- ${updatedMetadata.subtitle}`

        $('title').text(text)
      }

      let affiliationsCache = []

      updatedMetadata.authors.forEach(function (author) {

        $('head').append(`<meta about="mailto:${author.email}" typeof="schema:Person" property="schema:name" name="dc.creator" content="${author.name}">`)
        $('head').append(`<meta about="mailto:${author.email}" property="schema:email" content="${author.email}">`)

        author.affiliations.forEach(function (affiliation) {

          // Look up for already existing affiliation
          let toAdd = true
          let id

          affiliationsCache.forEach(function (affiliationCache) {
            if (affiliationCache.content == affiliation) {
              toAdd = false
              id = affiliationCache.id
            }
          })

          // If there is no existing affiliation, add it
          if (toAdd) {
            let generatedId = `#affiliation_${affiliationsCache.length+1}`
            affiliationsCache.push({
              id: generatedId,
              content: affiliation
            })
            id = generatedId
          }

          $('head').append(`<link about="mailto:${author.email}" property="schema:affiliation" href="${id}">`)
        })
      })

      affiliationsCache.forEach(function (affiliationCache) {
        $('head').append(`<meta about="${affiliationCache.id}" typeof="schema:Organization" property="schema:name" content="${affiliationCache.content}">`)
      })

      updatedMetadata.categories.forEach(function(category){
        $('head').append(`<meta name="dcterms.subject" content="${category}"/>`)
      })

      updatedMetadata.keywords.forEach(function(keyword){
        $('head').append(`<meta property="prism:keyword" content="${keyword}"/>`)
      })

      $('#raje_root').addHeaderHTML()
      setNonEditableHeader()
      updateIframeFromSavedContent()
    }
  }

})
tinymce.PluginManager.add('raje_save', function (editor, url) {

  saveManager = {

    /**
     * 
     */
    initSave: function () {
      // Return the message for the backend
      return {
        title: saveManager.getTitle(),
        document: saveManager.getDerashedArticle()
      }
    },

    /**
     * 
     */
    saveAs: function () {

      // Send message to the backend
      saveAsArticle(saveManager.initSave())
    },

    /**
     * 
     */
    save: function () {

      // Send message to the backend
      saveArticle(saveManager.initSave())
    },

    /**
     * Return the RASH article rendered (without tinymce)
     */
    getDerashedArticle: function () {

      // Save html references
      let article = $('html').clone()
      let tinymceSavedContent = article.find('#raje_root')

      article.removeAttr('class')

      //replace body with the right one (this action remove tinymce)
      article.find('body').html(tinymceSavedContent.html())
      article.find('body').removeAttr('style')
      article.find('body').removeAttr('class')

      //remove all style and link un-needed from the head
      article.find('head').children('style[type="text/css"]').remove()
      article.find('head').children('link[id]').remove()

      // Execute derash (replace all cgen elements with its original content)
      article.find('*[data-rash-original-content]').each(function () {
        let originalContent = $(this).attr('data-rash-original-content')
        $(this).replaceWith(originalContent)
      })

      // Execute derash changing the wrapper
      article.find('*[data-rash-original-wrapper]').each(function () {
        let content = $(this).html()
        let wrapper = $(this).attr('data-rash-original-wrapper')
        $(this).replaceWith(`<${wrapper}>${content}</${wrapper}>`)
      })

      // Remove target from TinyMCE link
      article.find('a[target]').each(function () {
        $(this).removeAttr('target')
      })

      // Remove contenteditable from TinyMCE link
      article.find('a[contenteditable]').each(function () {
        $(this).removeAttr('contenteditable')
      })

      // Remove not allowed span elments inside the formula
      article.find(FIGURE_FORMULA_SELECTOR).each(function () {
        $(this).children('p').html($(this).find('span[contenteditable]').html())
      })

      article.find(`${FIGURE_FORMULA_SELECTOR},${INLINE_FORMULA_SELECTOR}`).each(function () {
        if ($(this).find('svg[data-mathml]').length) {
          $(this).children('p').html($(this).find('svg[data-mathml]').attr('data-mathml'))
        }
      })

      return new XMLSerializer().serializeToString(article[0])
    },

    /**
     * Return the title 
     */
    getTitle: function () {
      return $('title').text()
    },

  }
})
/**
 * RASH section plugin RAJE
 */

const NON_EDITABLE_HEADER_SELECTOR = 'header.page-header.container.cgen'
const BIBLIOENTRY_SUFFIX = 'biblioentry_'
const ENDNOTE_SUFFIX = 'endnote_'

const BIBLIOGRAPHY_SELECTOR = 'section[role=doc-bibliography]'
const BIBLIOENTRY_SELECTOR = 'li[role=doc-biblioentry]'

const ENDNOTES_SELECTOR = 'section[role=doc-endnotes]'
const ENDNOTE_SELECTOR = 'section[role=doc-endnote]'

const ABSTRACT_SELECTOR = 'section[role=doc-abstract]'
const ACKNOWLEDGEMENTS_SELECTOR = 'section[role=doc-acknowledgements]'

const MAIN_SECTION_SELECTOR = 'div#raje_root > section:not([role])'
const SECTION_SELECTOR = 'section:not([role])'
const SPECIAL_SECTION_SELECTOR = 'section[role]'

const MENU_SELECTOR = 'div[id^=mceu_][id$=-body][role=menu]'

const HEADING = 'Heading'

const HEADING_TRASFORMATION_FORBIDDEN = 'Error, you cannot transform the current header in this way!'

tinymce.PluginManager.add('raje_section', function (editor, url) {

  let raje_section_flag = false
  let raje_stored_selection

  editor.addButton('raje_section', {
    type: 'menubutton',
    text: 'Headings',
    title: 'heading',
    icons: false,

    // Sections sub menu
    menu: [{
      text: `${HEADING} 1.`,
      onclick: function () {
        section.add(1)
      }
    }, {
      text: `${HEADING} 1.1.`,
      onclick: function () {
        section.add(2)
      }
    }, {
      text: `${HEADING} 1.1.1.`,
      onclick: function () {
        section.add(3)
      }
    }, {
      text: `${HEADING} 1.1.1.1.`,
      onclick: function () {
        section.add(4)
      }
    }, {
      text: `${HEADING} 1.1.1.1.1.`,
      onclick: function () {
        section.add(5)
      }
    }, {
      text: `${HEADING} 1.1.1.1.1.1.`,
      onclick: function () {
        section.add(6)
      }
    }, {
      text: 'Special',
      menu: [{
          text: 'Abstract',
          onclick: function () {

            section.addAbstract()
          }
        },
        {
          text: 'Acknowledgements',
          onclick: function () {
            section.addAcknowledgements()
          }
        },
        {
          text: 'References',
          onclick: function () {

            tinymce.triggerSave()

            // Only if bibliography section doesn't exists
            if (!$(BIBLIOGRAPHY_SELECTOR).length) {

              // TODO change here
              tinymce.activeEditor.undoManager.transact(function () {
                // Add new biblioentry
                section.addBiblioentry()

                // Update iframe
                updateIframeFromSavedContent()

                //move caret and set focus to active aditor #105
                tinymce.activeEditor.selection.select(tinymce.activeEditor.dom.select(`${BIBLIOENTRY_SELECTOR}:last-child`)[0], true)
              })
            } else
              tinymce.activeEditor.selection.select(tinymce.activeEditor.dom.select(`${BIBLIOGRAPHY_SELECTOR}>h1`)[0])

            scrollTo(`${BIBLIOENTRY_SELECTOR}:last-child`)

            tinymce.activeEditor.focus()
          }
        }
      ]
    }]
  })

  editor.on('keyDown', function (e) {

    // instance of the selected element
    let selectedElement = $(tinymce.activeEditor.selection.getNode())

    try {

      let keycode = e.keyCode

      // Save bounds of current selection (start and end)
      let startNode = $(tinymce.activeEditor.selection.getRng().startContainer)
      let endNode = $(tinymce.activeEditor.selection.getRng().endContainer)

      const SPECIAL_CHARS =
        (keycode > 47 && keycode < 58) || // number keys
        (keycode > 95 && keycode < 112) || // numpad keys
        (keycode > 185 && keycode < 193) || // ;=,-./` (in order)
        (keycode > 218 && keycode < 223); // [\]' (in order)

      // Block special chars in special elements
      if (SPECIAL_CHARS &&
        (startNode.parents(SPECIAL_SECTION_SELECTOR).length || endNode.parents(SPECIAL_SECTION_SELECTOR).length) &&
        (startNode.parents('h1').length > 0 || endNode.parents('h1').length > 0))
        return false

      // #################################
      // ### BACKSPACE && CANC PRESSED ###
      // #################################
      if (e.keyCode == 8 || e.keyCode == 46) {

        let toRemoveSections = section.getSectionsinSelection(tinymce.activeEditor.selection)
        raje_section_flag = true

        // Prevent remove from header
        if (selectedElement.is(NON_EDITABLE_HEADER_SELECTOR) ||
          (selectedElement.attr('data-mce-caret') == 'after' && selectedElement.parent().is(RAJE_SELECTOR)) ||
          (selectedElement.attr('data-mce-caret') && selectedElement.parent().is(RAJE_SELECTOR)) == 'before')
          return false

        // If selection isn't collapsed manage delete
        if (!tinymce.activeEditor.selection.isCollapsed()) {
          return section.manageDelete()
        }

        // If SELECTION STARTS or ENDS in special section
        else if (startNode.parents(SPECIAL_SECTION_SELECTOR).length || endNode.parents(SPECIAL_SECTION_SELECTOR).length) {

          let startOffset = tinymce.activeEditor.selection.getRng().startOffset
          let startOffsetNode = 0
          let endOffset = tinymce.activeEditor.selection.getRng().endOffset
          let endOffsetNode = tinymce.activeEditor.selection.getRng().endContainer.length

          // Completely remove the current special section if is entirely selected
          if (
            // Check if the selection contains the entire section
            startOffset == startOffsetNode && endOffset == endOffsetNode &&

            // Check if the selection starts from h1
            (startNode.parents('h1').length != endNode.parents('h1').length) && (startNode.parents('h1').length || endNode.parents('h1').length) &&

            // Check if the selection ends in the last child
            (startNode.parents(SPECIAL_SECTION_SELECTOR).children().length == $(tinymce.activeEditor.selection.getRng().endContainer).parentsUntil(SPECIAL_SECTION_SELECTOR).index() + 1)) {

          }

          // Remove the current special section if selection is at the start of h1 AND selection is collapsed 
          if (tinymce.activeEditor.selection.isCollapsed() && (startNode.parents('h1').length || startNode.is('h1')) && startOffset == 0) {

            tinymce.activeEditor.undoManager.transact(function () {

              // Remove the section and update 
              selectedElement.parent(SPECIAL_SECTION_SELECTOR).remove()
              tinymce.triggerSave()

              // Update references
              updateReferences()
              updateIframeFromSavedContent()
            })

            return false
          }

          // Chek if inside the selection to remove, there is bibliography
          let hasBibliography = false
          $(tinymce.activeEditor.selection.getContent()).each(function () {
            if ($(this).is(BIBLIOGRAPHY_SELECTOR))
              hasBibliography = true
          })

          if (hasBibliography) {

            tinymce.activeEditor.undoManager.transact(function () {

              // Execute normal delete
              tinymce.activeEditor.execCommand('delete')

              // Update saved content
              tinymce.triggerSave()

              // Remove selector without hader
              $(BIBLIOGRAPHY_SELECTOR).remove()

              // Update iframe and restore selection
              updateIframeFromSavedContent()
            })

            return false
          }

          // if selection starts or ends in a biblioentry
          if (startNode.parents(BIBLIOENTRY_SELECTOR).length || endNode.parents(BIBLIOENTRY_SELECTOR).length) {

            // Both delete event and update are stored in a single undo level
            tinymce.activeEditor.undoManager.transact(function () {

              tinymce.activeEditor.execCommand('delete')
              section.updateBibliographySection()
              updateReferences()

              // update iframe
              updateIframeFromSavedContent()
            })

            return false
          }
        }


      }
    } catch (exception) {}

    // #################################
    // ######### ENTER PRESSED #########
    // #################################
    if (e.keyCode == 13) {

      // When enter is pressed inside an header, not at the end of it
      if (selectedElement.is('h1,h2,h3,h4,h5,h6') && selectedElement.text().trim().length != tinymce.activeEditor.selection.getRng().startOffset) {

        section.addWithEnter()
        return false
      }

      // If selection is before/after header
      if (selectedElement.is('p')) {

        // Block enter before header
        if (selectedElement.attr('data-mce-caret') == 'before')
          return false


        // Add new section after header
        if (selectedElement.attr('data-mce-caret') == 'after') {
          section.add(1)
          return false
        }
      }

      // If enter is pressed inside bibliography selector
      if (selectedElement.parents(BIBLIOGRAPHY_SELECTOR).length) {

        tinymce.triggerSave()

        let id = getSuccessiveElementId(BIBLIOENTRY_SELECTOR, BIBLIOENTRY_SUFFIX)

        // Pressing enter in h1 will add a new biblioentry and caret reposition
        if (selectedElement.is('h1')) {

          section.addBiblioentry(id)
          updateIframeFromSavedContent()
        }

        // If selected element is inside text
        else if (selectedElement.is('p'))
          section.addBiblioentry(id, null, selectedElement.parent('li'))


        // If selected element is without text
        else if (selectedElement.is('li'))
          section.addBiblioentry(id, null, selectedElement)

        // Move caret #105
        tinymce.activeEditor.selection.setCursorLocation(tinymce.activeEditor.dom.select(`${BIBLIOENTRY_SELECTOR}#${id} > p`)[0], false)
        return false
      }

      // Adding sections with shortcuts #
      if (selectedElement.is('p') && selectedElement.text().trim().substring(0, 1) == '#') {

        let level = section.getLevelFromHash(selectedElement.text().trim())
        let deepness = $(selectedElement).parentsUntil(RAJE_SELECTOR).length - level + 1

        // Insert section only if caret is inside abstract section, and user is going to insert a sub section
        // OR the cursor isn't inside other special sections
        // AND selectedElement isn't inside a figure
        if (((selectedElement.parents(ABSTRACT_SELECTOR).length && deepness > 0) || !selectedElement.parents(SPECIAL_SECTION_SELECTOR).length) && !selectedElement.parents(FIGURE_SELECTOR).length) {

          section.add(level, selectedElement.text().substring(level).trim())
          return false
        }
      }
    }
  })

  editor.on('NodeChange', function (e) {
    section.updateSectionToolbar()
  })
})

section = {

  /**
   * Function called when a new section needs to be attached, with buttons
   */
  add: function (level, text) {

    // Select current node
    let selectedElement = $(tinymce.activeEditor.selection.getNode())

    // Create the section
    let newSection = this.create(text != null ? text : selectedElement.html().trim(), level)

    tinymce.activeEditor.undoManager.transact(function () {

      // Check what kind of section needs to be inserted
      if (section.manageSection(selectedElement, newSection, level ? level : selectedElement.parentsUntil(RAJE_SELECTOR).length)) {

        // Remove the selected section
        selectedElement.remove()

        // If the new heading has text nodes, the offset won't be 0 (as normal) but instead it'll be length of node text
        moveCaret(newSection.find(':header').first()[0])

        // Update editor content
        tinymce.triggerSave()
      }
    })
  },

  /**
   * Function called when a new section needs to be attached, with buttons
   */
  addWithEnter: function () {

    // Select current node
    let selectedElement = $(tinymce.activeEditor.selection.getNode())

    // If the section isn't special
    if (!selectedElement.parent().attr('role')) {

      level = selectedElement.parentsUntil(RAJE_SELECTOR).length

      // Create the section
      let newSection = this.create(selectedElement.text().trim().substring(tinymce.activeEditor.selection.getRng().startOffset), level)

      tinymce.activeEditor.undoManager.transact(function () {

        // Check what kind of section needs to be inserted
        section.manageSection(selectedElement, newSection, level)

        // Remove the selected section
        selectedElement.html(selectedElement.text().trim().substring(0, tinymce.activeEditor.selection.getRng().startOffset))

        moveCaret(newSection.find(':header').first()[0], true)

        // Update editor
        tinymce.triggerSave()
      })
    } else
      notify('Error, headers of special sections (abstract, acknowledments) cannot be splitted', 'error', 4000)
  },

  /**
   * Get the last inserted id
   */
  getNextId: function () {
    let id = 0
    $('section[id]').each(function () {
      if ($(this).attr('id').indexOf('section') > -1) {
        let currId = parseInt($(this).attr('id').replace('section', ''))
        id = id > currId ? id : currId
      }
    })
    return `section${id+1}`
  },

  /**
   * Retrieve and then remove every successive elements 
   */
  getSuccessiveElements: function (element, deepness) {

    let successiveElements = $('<div></div>')

    while (deepness >= 0) {

      if (element.nextAll(':not(.footer)')) {

        // If the deepness is 0, only paragraph are saved (not sections)
        if (deepness == 0) {
          // Successive elements can be p or figures
          successiveElements.append(element.nextAll(`p,${FIGURE_SELECTOR}`))
          element.nextAll().remove(`p,${FIGURE_SELECTOR}`)
        } else {
          successiveElements.append(element.nextAll())
          element.nextAll().remove()
        }
      }

      element = element.parent('section')
      deepness--
    }

    return $(successiveElements.html())
  },

  /**
   * 
   */
  getLevelFromHash: function (text) {

    let level = 0
    text = text.substring(0, text.length >= 6 ? 6 : text.length)

    while (text.length > 0) {

      if (text.substring(text.length - 1) == '#')
        level++

        text = text.substring(0, text.length - 1)
    }

    return level
  },

  /**
   * Return JQeury object that represent the section
   */
  create: function (text, level) {
    // Create the section

    // Trim white spaces and add zero_space char if nothing is inside

    if (typeof text != "undefined") {
      text = text.trim()
      if (text.length == 0)
        text = "<br>"
    } else
      text = "<br>"

    return $(`<section id="${this.getNextId()}"><h${level} data-rash-original-wrapper="h1">${text}</h${level}></section>`)
  },

  /**
   * Check what kind of section needs to be added, and preceed
   */
  manageSection: function (selectedElement, newSection, level) {

    let deepness = $(selectedElement).parentsUntil(RAJE_SELECTOR).length - level + 1

    if (deepness >= 0) {

      // Block insert selection if caret is inside special section, and user is going to insert a sub section
      if ((selectedElement.parents(SPECIAL_SECTION_SELECTOR).length && deepness != 1) || (selectedElement.parents(ACKNOWLEDGEMENTS_SELECTOR).length &&
          selectedElement.parents(BIBLIOGRAPHY_SELECTOR) &&
          selectedElement.parents(ENDNOTES_SELECTOR)))
        return false

      // Get direct parent and ancestor reference
      let successiveElements = this.getSuccessiveElements(selectedElement, deepness)

      if (successiveElements.length)
        newSection.append(successiveElements)

      // CASE: sub section
      if (deepness == 0)
        selectedElement.after(newSection)

      // CASE: sibling section
      else if (deepness == 1)
        selectedElement.parent('section').after(newSection)

      // CASE: ancestor section at any uplevel
      else
        $(selectedElement.parents('section')[deepness - 1]).after(newSection)

      headingDimension()

      return true
    }
  },

  /**
   * 
   */
  upgrade: function () {

    let selectedElement = $(tinymce.activeEditor.selection.getNode())

    if (selectedElement.is('h1,h2,h3,h4,h5,h6')) {

      // Get the references of selected and parent section
      let selectedSection = selectedElement.parent(SECTION_SELECTOR)
      let parentSection = selectedSection.parent(SECTION_SELECTOR)

      // If there is a parent section upgrade is allowed
      if (parentSection.length) {

        // Everything in here, is an atomic undo level
        tinymce.activeEditor.undoManager.transact(function () {

          // Save the section and detach
          let bodySection = $(selectedSection[0].outerHTML)
          selectedSection.detach()

          // Update dimension and move the section out
          parentSection.after(bodySection)

          tinymce.triggerSave()
          headingDimension()
          updateIframeFromSavedContent()
        })
      }

      // Notify error
      else
        notify(HEADING_TRASFORMATION_FORBIDDEN, 'error', 2000)
    }
  },

  /**
   * 
   */
  downgrade: function () {

    let selectedElement = $(tinymce.activeEditor.selection.getNode())

    if (selectedElement.is('h1,h2,h3,h4,h5,h6')) {
      // Get the references of selected and sibling section
      let selectedSection = selectedElement.parent(SECTION_SELECTOR)
      let siblingSection = selectedSection.prev(SECTION_SELECTOR)

      // If there is a previous sibling section downgrade is allowed
      if (siblingSection.length) {

        // Everything in here, is an atomic undo level
        tinymce.activeEditor.undoManager.transact(function () {

          // Save the section and detach
          let bodySection = $(selectedSection[0].outerHTML)
          selectedSection.detach()

          // Update dimension and move the section out
          siblingSection.append(bodySection)

          tinymce.triggerSave()
          // Refresh tinymce content and set the heading dimension
          headingDimension()
          updateIframeFromSavedContent()
        })
      }
    }

    // Notify error
    else
      notify(HEADING_TRASFORMATION_FORBIDDEN, 'error', 2000)
  },

  /**
   * 
   */
  addAbstract: function () {

    if (!$(ABSTRACT_SELECTOR).length) {

      tinymce.activeEditor.undoManager.transact(function () {

        // This section can only be placed after non editable header
        $(NON_EDITABLE_HEADER_SELECTOR).after(`<section id="doc-abstract" role="doc-abstract"><h1>Abstract</h1></section>`)

        updateIframeFromSavedContent()
      })
    }

    //move caret and set focus to active aditor #105
    moveCaret(tinymce.activeEditor.dom.select(`${ABSTRACT_SELECTOR} > h1`)[0])
    scrollTo(ABSTRACT_SELECTOR)
  },

  /**
   * 
   */
  addAcknowledgements: function () {

    if (!$(ACKNOWLEDGEMENTS_SELECTOR).length) {

      let ack = $(`<section id="doc-acknowledgements" role="doc-acknowledgements"><h1>Acknowledgements</h1></section>`)

      tinymce.activeEditor.undoManager.transact(function () {

        // Insert this section after last non special section 
        // OR after abstract section 
        // OR after non editable header
        if ($(MAIN_SECTION_SELECTOR).length)
          $(MAIN_SECTION_SELECTOR).last().after(ack)

        else if ($(ABSTRACT_SELECTOR).length)
          $(ABSTRACT_SELECTOR).after(ack)

        else
          $(NON_EDITABLE_HEADER_SELECTOR).after(ack)

        updateIframeFromSavedContent()
      })
    }

    //move caret and set focus to active aditor #105
    moveCaret(tinymce.activeEditor.dom.select(`${ACKNOWLEDGEMENTS_SELECTOR} > h1`)[0])
    scrollTo(ACKNOWLEDGEMENTS_SELECTOR)
  },

  /**
   * This method is the main one. It's called because all times the intent is to add a new biblioentry (single reference)
   * Then it checks if is necessary to add the entire <section> or only the missing <ul>
   */
  addBiblioentry: function (id, text, listItem) {

    // Add bibliography section if not exists
    if (!$(BIBLIOGRAPHY_SELECTOR).length) {

      let bibliography = $(`<section id="doc-bibliography" role="doc-bibliography"><h1>References</h1><ul></ul></section>`)

      // This section is added after acknowledgements section
      // OR after last non special section
      // OR after abstract section
      // OR after non editable header 
      if ($(ACKNOWLEDGEMENTS_SELECTOR).length)
        $(ACKNOWLEDGEMENTS_SELECTOR).after(bibliography)

      else if ($(MAIN_SECTION_SELECTOR).length)
        $(MAIN_SECTION_SELECTOR).last().after(bibliography)

      else if ($(ABSTRACT_SELECTOR).length)
        $(ABSTRACT_SELECTOR).after(bibliography)

      else
        $(NON_EDITABLE_HEADER_SELECTOR).after(bibliography)

    }

    // Add ul in bibliography section if not exists
    if (!$(BIBLIOGRAPHY_SELECTOR).find('ul').length)
      $(BIBLIOGRAPHY_SELECTOR).append('<ul></ul>')

    // IF id and text aren't passed as parameters, these can be retrieved or init from here
    id = (id) ? id : getSuccessiveElementId(BIBLIOENTRY_SELECTOR, BIBLIOENTRY_SUFFIX)
    text = text ? text : '<br/>'

    let newItem = $(`<li role="doc-biblioentry" id="${id}"><p>${text}</p></li>`)

    // Append new li to ul at last position
    // OR insert the new li right after the current one
    if (!listItem)
      $(`${BIBLIOGRAPHY_SELECTOR} ul`).append(newItem)

    else
      listItem.after(newItem)
  },

  /**
   * 
   */
  updateBibliographySection: function () {

    // Synchronize iframe and stored content
    tinymce.triggerSave()

    // Remove all sections without p child
    $(`${BIBLIOENTRY_SELECTOR}:not(:has(p))`).each(function () {
      $(this).remove()
    })
  },

  /**
   * 
   */
  addEndnote: function (id) {

    // Add the section if it not exists
    if (!$(ENDNOTE_SELECTOR).length) {

      let endnotes = $(`<section id="doc-endnotes" role="doc-endnotes"><h1 data-rash-original-content="">Footnotes</h1></section>`)

      // Insert this section after bibliography section
      // OR after acknowledgements section
      // OR after non special section selector
      // OR after abstract section
      // OR after non editable header 
      if ($(BIBLIOGRAPHY_SELECTOR).length)
        $(BIBLIOGRAPHY_SELECTOR).after(endnotes)

      else if ($(ACKNOWLEDGEMENTS_SELECTOR).length)
        $(ACKNOWLEDGEMENTS_SELECTOR).after(endnotes)

      else if ($(MAIN_SECTION_SELECTOR).length)
        $(MAIN_SECTION_SELECTOR).last().after(endnotes)

      else if ($(ABSTRACT_SELECTOR).length)
        $(ABSTRACT_SELECTOR).after(endnotes)

      else
        $(NON_EDITABLE_HEADER_SELECTOR).after(endnotes)
    }

    // Create and append the new endnote
    let endnote = $(`<section role="doc-endnote" id="${id}"><p><br/></p></section>`)
    $(ENDNOTES_SELECTOR).append(endnote)
  },

  /**
   * 
   */
  updateSectionToolbar: function () {

    // Dropdown menu reference
    let menu = $(MENU_SELECTOR)

    if (menu.length) {
      section.restoreSectionToolbar(menu)

      // Save current selected element
      let selectedElement = $(tinymce.activeEditor.selection.getRng().startContainer)

      if (selectedElement[0].nodeType == 3)
        selectedElement = selectedElement.parent()

      // If current element is p
      if (selectedElement.is('p') || selectedElement.parent().is('p')) {

        // Disable upgrade/downgrade
        menu.children(':gt(10)').addClass('mce-disabled')

        // Check if caret is inside special section
        // In this case enable only first menuitem if caret is in abstract
        if (selectedElement.parents(SPECIAL_SECTION_SELECTOR).length) {

          if (selectedElement.parents(ABSTRACT_SELECTOR).length)
            menu.children(`:lt(1)`).removeClass('mce-disabled')

          return false
        }

        // Get deepness of the section
        let deepness = selectedElement.parents(SECTION_SELECTOR).length + 1

        // Remove disabling class on first {deepness} menu items
        menu.children(`:lt(${deepness})`).removeClass('mce-disabled')

        let preHeaders = []
        let parentSections = selectedElement.parents('section')

        // Save index of all parent sections
        for (let i = parentSections.length; i > 0; i--) {
          let elem = $(parentSections[i - 1])
          let index = elem.parent().children(SECTION_SELECTOR).index(elem) + 1
          preHeaders.push(index)
        }

        // Update text of all menu item
        for (let i = 0; i <= preHeaders.length; i++) {

          let text = `${HEADING} `

          // Update text based on section structure
          if (i != preHeaders.length) {
            for (let x = 0; x <= i; x++)
              text += `${preHeaders[x] + (x == i ? 1 : 0)}.`
          }

          // In this case raje changes text of next sub heading
          else {
            for (let x = 0; x < i; x++)
              text += `${preHeaders[x]}.`

            text += '1.'
          }

          menu.children(`:eq(${i})`).find('span.mce-text').text(text)
        }
      }

      // Disable 
      else if (selectedElement.is('h1') && selectedElement.parents(SPECIAL_SECTION_SELECTOR)) {
        menu.children(':gt(10)').addClass('mce-disabled')
      }
    }
  },

  /**
   * Restore normal text in section toolbar and disable all
   */
  restoreSectionToolbar: function (menu) {

    let cnt = 1

    menu.children(':lt(6)').each(function () {
      let text = `${HEADING} `

      for (let i = 0; i < cnt; i++)
        text += `1.`

      $(this).find('span.mce-text').text(text)
      $(this).addClass('mce-disabled')

      cnt++
    })

    // Enable upgrade/downgrade last three menu items
    menu.children(':gt(10)').removeClass('mce-disabled')
  },

  manageDelete: function () {

    let range = tinymce.activeEditor.selection.getRng()
    let startNode = $(range.startContainer).parent()
    let endNode = $(range.endContainer).parent()
    let commonAncestorContainer = $(range.commonAncestorContainer)

    // Deepness is relative to the common ancestor container of the range startContainer and end
    let deepness = endNode.parent('section').parentsUntil(commonAncestorContainer).length + 1
    let currentElement = endNode
    let toMoveElements = []

    tinymce.activeEditor.undoManager.transact(function () {

      // Get and detach all next_end
      for (let i = 0; i <= deepness; i++) {
        currentElement.nextAll('section,p,figure').each(function () {
          toMoveElements.push($(this))

          $(this).detach()
        })
        currentElement = currentElement.parent()
      }

      // Execute delete
      tinymce.activeEditor.execCommand('delete')

      // Detach all next_begin
      startNode.nextAll().each(function () {
        $(this).detach()
      })

      // Append all next_end to startnode parent
      toMoveElements.forEach(function (element) {
        startNode.parent('section').append(element)
      })

      tinymce.triggerSave()

      // Refresh headings
      headingDimension()

      // Update references if needed
      updateReferences()

      updateIframeFromSavedContent()
    })
    return false
  }
}
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluaXQuanMiLCJyYWplX2Jsb2Nrcy5qcyIsInJhamVfY3Jvc3NyZWYuanMiLCJyYWplX2ZpZ3VyZXMuanMiLCJyYWplX2lubGluZXMuanMiLCJyYWplX2xpc3RzLmpzIiwicmFqZV9tZXRhZGF0YS5qcyIsInJhamVfc2F2ZS5qcyIsInJhamVfc2VjdGlvbi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM5ZUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN6WEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMvekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDaFBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2hYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDeExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2xHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJjb3JlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBcbiAqIEluaXRpbGl6ZSBUaW55TUNFIGVkaXRvciB3aXRoIGFsbCByZXF1aXJlZCBvcHRpb25zXG4gKi9cblxuLy8gSW52aXNpYmxlIHNwYWNlIGNvbnN0YW50c1xuY29uc3QgWkVST19TUEFDRSA9ICcmIzgyMDM7J1xuY29uc3QgUkFKRV9TRUxFQ1RPUiA9ICdib2R5I3RpbnltY2UnXG5cbi8vIFNlbGVjdG9yIGNvbnN0YW50cyAodG8gbW92ZSBpbnNpZGUgYSBuZXcgY29uc3QgZmlsZSlcbmNvbnN0IEhFQURFUl9TRUxFQ1RPUiA9ICdoZWFkZXIucGFnZS1oZWFkZXIuY29udGFpbmVyLmNnZW4nXG5jb25zdCBGSVJTVF9IRUFESU5HID0gYCR7UkFKRV9TRUxFQ1RPUn0+c2VjdGlvbjpmaXJzdD5oMTpmaXJzdGBcblxuY29uc3QgVElOWU1DRV9UT09MQkFSX0hFSUdUSCA9IDc2XG5cbmxldCBpcGNSZW5kZXJlciwgd2ViRnJhbWVcblxuaWYgKGhhc0JhY2tlbmQpIHtcblxuICBpcGNSZW5kZXJlciA9IHJlcXVpcmUoJ2VsZWN0cm9uJykuaXBjUmVuZGVyZXJcbiAgd2ViRnJhbWUgPSByZXF1aXJlKCdlbGVjdHJvbicpLndlYkZyYW1lXG5cbiAgLyoqXG4gICAqIEluaXRpbGlzZSBUaW55TUNFIFxuICAgKi9cbiAgJChkb2N1bWVudCkucmVhZHkoZnVuY3Rpb24gKCkge1xuXG4gICAgLy8gT3ZlcnJpZGUgdGhlIG1hcmdpbiBib3R0b24gZ2l2ZW4gYnkgUkFTSCBmb3IgdGhlIGZvb3RlclxuICAgICQoJ2JvZHknKS5jc3Moe1xuICAgICAgJ21hcmdpbi1ib3R0b20nOiAwXG4gICAgfSlcblxuICAgIC8vaGlkZSBmb290ZXJcbiAgICAkKCdmb290ZXIuZm9vdGVyJykucmVtb3ZlKClcblxuICAgIC8vYXR0YWNoIHdob2xlIGJvZHkgaW5zaWRlIGEgcGxhY2Vob2xkZXIgZGl2XG4gICAgJCgnYm9keScpLmh0bWwoYDxkaXYgaWQ9XCJyYWplX3Jvb3RcIj4keyQoJ2JvZHknKS5odG1sKCl9PC9kaXY+YClcblxuICAgIC8vIFxuICAgIHNldE5vbkVkaXRhYmxlSGVhZGVyKClcblxuICAgIHRpbnltY2UuaW5pdCh7XG5cbiAgICAgIC8vIFNlbGVjdCB0aGUgZWxlbWVudCB0byB3cmFwXG4gICAgICBzZWxlY3RvcjogJyNyYWplX3Jvb3QnLFxuXG4gICAgICAvLyBTZXQgd2luZG93IHNpemVcbiAgICAgIGhlaWdodDogd2luZG93LmlubmVySGVpZ2h0IC0gVElOWU1DRV9UT09MQkFSX0hFSUdUSCxcblxuICAgICAgLy8gU2V0IHRoZSBzdHlsZXMgb2YgdGhlIGNvbnRlbnQgd3JhcHBlZCBpbnNpZGUgdGhlIGVsZW1lbnRcbiAgICAgIGNvbnRlbnRfY3NzOiBbJ2Nzcy9ib290c3RyYXAubWluLmNzcycsICdjc3MvcmFzaC5jc3MnLCAnY3NzL3JhamUtY29yZS5jc3MnXSxcblxuICAgICAgLy8gU2V0IHBsdWdpbnNcbiAgICAgIHBsdWdpbnM6IFwicmFqZV9pbmxpbmVGaWd1cmUgZnVsbHNjcmVlbiBsaW5rIGNvZGVzYW1wbGUgcmFqZV9leHRlcm5hbExpbmsgcmFqZV9pbmxpbmVDb2RlIHJhamVfaW5saW5lUXVvdGUgcmFqZV9zZWN0aW9uIHRhYmxlIGltYWdlIG5vbmVkaXRhYmxlIHJhamVfaW1hZ2UgcmFqZV9jb2RlYmxvY2sgcmFqZV90YWJsZSByYWplX2xpc3RpbmcgcmFqZV9pbmxpbmVfZm9ybXVsYSByYWplX2Zvcm11bGEgcmFqZV9jcm9zc3JlZiByYWplX2Zvb3Rub3RlcyByYWplX21ldGFkYXRhIHJhamVfbGlzdHMgcmFqZV9zYXZlXCIsXG5cbiAgICAgIC8vIFJlbW92ZSBtZW51YmFyXG4gICAgICBtZW51YmFyOiBmYWxzZSxcblxuICAgICAgLy8gQ3VzdG9tIHRvb2xiYXJcbiAgICAgIHRvb2xiYXI6ICd1bmRvIHJlZG8gYm9sZCBpdGFsaWMgbGluayBzdXBlcnNjcmlwdCBzdWJzY3JpcHQgcmFqZV9pbmxpbmVDb2RlIHJhamVfaW5saW5lUXVvdGUgcmFqZV9pbmxpbmVfZm9ybXVsYSByYWplX2Nyb3NzcmVmIHJhamVfZm9vdG5vdGVzIHwgcmFqZV9vbCByYWplX3VsIHJhamVfY29kZWJsb2NrIGJsb2NrcXVvdGUgcmFqZV90YWJsZSByYWplX2ltYWdlIHJhamVfbGlzdGluZyByYWplX2Zvcm11bGEgfCByYWplX3NlY3Rpb24gcmFqZV9tZXRhZGF0YSByYWplX3NhdmUnLFxuXG4gICAgICAvLyBTZXR1cCBmdWxsIHNjcmVlbiBvbiBpbml0XG4gICAgICBzZXR1cDogZnVuY3Rpb24gKGVkaXRvcikge1xuXG4gICAgICAgIGxldCBwYXN0ZUJvb2ttYXJrXG5cbiAgICAgICAgLy8gU2V0IGZ1bGxzY3JlZW4gXG4gICAgICAgIGVkaXRvci5vbignaW5pdCcsIGZ1bmN0aW9uIChlKSB7XG5cbiAgICAgICAgICBlZGl0b3IuZXhlY0NvbW1hbmQoJ21jZUZ1bGxTY3JlZW4nKVxuXG4gICAgICAgICAgLy8gTW92ZSBjYXJldCBhdCB0aGUgZmlyc3QgaDEgZWxlbWVudCBvZiBtYWluIHNlY3Rpb25cbiAgICAgICAgICAvLyBPciByaWdodCBhZnRlciBoZWFkaW5nXG4gICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLnNldEN1cnNvckxvY2F0aW9uKHRpbnltY2UuYWN0aXZlRWRpdG9yLmRvbS5zZWxlY3QoRklSU1RfSEVBRElORylbMF0sIDApXG4gICAgICAgIH0pXG5cbiAgICAgICAgZWRpdG9yLm9uKCdrZXlEb3duJywgZnVuY3Rpb24gKGUpIHtcblxuICAgICAgICAgIC8vIFByZXZlbnQgc2hpZnQrZW50ZXJcbiAgICAgICAgICBpZiAoZS5rZXlDb2RlID09IDEzICYmIGUuc2hpZnRLZXkpXG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcblxuICAgICAgICAgIGlmIChlLmtleUNvZGUgPT0gODYgJiYgZS5tZXRhS2V5KSB7XG5cbiAgICAgICAgICAgIGlmICgkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpLmlzKCdwcmUnKSkge1xuXG4gICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpXG5cbiAgICAgICAgICAgICAgcGFzdGVCb29rbWFyayA9IHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRCb29rbWFyaygpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBcbiAgICAgICAgICovXG4gICAgICAgIGVkaXRvci5vbignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuXG4gICAgICAgICAgLy8gQ2FwdHVyZSB0aGUgdHJpcGxlIGNsaWNrIGV2ZW50XG4gICAgICAgICAgaWYgKGUuZGV0YWlsID09IDMpIHtcblxuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpXG5cbiAgICAgICAgICAgIGxldCB3cmFwcGVyID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Um5nKCkuc3RhcnRDb250YWluZXIpLnBhcmVudHMoJ3AsZmlnY2FwdGlvbiw6aGVhZGVyJykuZmlyc3QoKVxuICAgICAgICAgICAgbGV0IHN0YXJ0Q29udGFpbmVyID0gd3JhcHBlclswXVxuICAgICAgICAgICAgbGV0IGVuZENvbnRhaW5lciA9IHdyYXBwZXJbMF1cbiAgICAgICAgICAgIGxldCByYW5nZSA9IGRvY3VtZW50LmNyZWF0ZVJhbmdlKClcblxuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIHdyYXBwZXIgaGFzIG1vcmUgdGV4dCBub2RlIGluc2lkZVxuICAgICAgICAgICAgaWYgKHdyYXBwZXIuY29udGVudHMoKS5sZW5ndGggPiAxKSB7XG5cbiAgICAgICAgICAgICAgLy8gSWYgdGhlIGZpcnN0IHRleHQgbm9kZSBpcyBhIG5vdCBlZGl0YWJsZSBzdHJvbmcsIHRoZSBzZWxlY3Rpb24gbXVzdCBzdGFydCB3aXRoIHRoZSBzZWNvbmQgZWxlbWVudFxuICAgICAgICAgICAgICBpZiAod3JhcHBlci5jb250ZW50cygpLmZpcnN0KCkuaXMoJ3N0cm9uZ1tjb250ZW50ZWRpdGFibGU9ZmFsc2VdJykpXG4gICAgICAgICAgICAgICAgc3RhcnRDb250YWluZXIgPSB3cmFwcGVyLmNvbnRlbnRzKClbMV1cblxuICAgICAgICAgICAgICAvLyBJbiB0aGlzIGNhc2UgdGhlIGVuZENvbnRhaW5lciB3aWxsIGJlIHRoZSBsYXN0IHRleHQgbm9kZVxuICAgICAgICAgICAgICBlbmRDb250YWluZXIgPSB3cmFwcGVyLmNvbnRlbnRzKCkubGFzdCgpWzBdXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJhbmdlLnNldFN0YXJ0KHN0YXJ0Q29udGFpbmVyLCAwKVxuXG4gICAgICAgICAgICBpZiAod3JhcHBlci5pcygnZmlnY2FwdGlvbicpKVxuICAgICAgICAgICAgICByYW5nZS5zZXRFbmQoZW5kQ29udGFpbmVyLCBlbmRDb250YWluZXIubGVuZ3RoKVxuXG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgIHJhbmdlLnNldEVuZChlbmRDb250YWluZXIsIDEpXG5cbiAgICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZXRSbmcocmFuZ2UpXG4gICAgICAgICAgfVxuXG4gICAgICAgIH0pXG5cbiAgICAgICAgLy8gUHJldmVudCBzcGFuIFxuICAgICAgICBlZGl0b3Iub24oJ25vZGVDaGFuZ2UnLCBmdW5jdGlvbiAoZSkge1xuXG4gICAgICAgICAgbGV0IHNlbGVjdGVkRWxlbWVudCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcblxuICAgICAgICAgIC8vIE1vdmUgY2FyZXQgdG8gZmlyc3QgaGVhZGluZyBpZiBpcyBhZnRlciBvciBiZWZvcmUgbm90IGVkaXRhYmxlIGhlYWRlclxuICAgICAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQuaXMoJ3AnKSAmJiAoc2VsZWN0ZWRFbGVtZW50Lm5leHQoKS5pcyhIRUFERVJfU0VMRUNUT1IpIHx8IChzZWxlY3RlZEVsZW1lbnQucHJldigpLmlzKEhFQURFUl9TRUxFQ1RPUikgJiYgdGlueW1jZS5hY3RpdmVFZGl0b3IuZG9tLnNlbGVjdChGSVJTVF9IRUFESU5HKS5sZW5ndGgpKSlcbiAgICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZXRDdXJzb3JMb2NhdGlvbih0aW55bWNlLmFjdGl2ZUVkaXRvci5kb20uc2VsZWN0KEZJUlNUX0hFQURJTkcpWzBdLCAwKVxuXG4gICAgICAgICAgLy8gSWYgdGhlIGN1cnJlbnQgZWxlbWVudCBpc24ndCBpbnNpZGUgaGVhZGVyLCBvbmx5IGluIHNlY3Rpb24gdGhpcyBpcyBwZXJtaXR0ZWRcbiAgICAgICAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LnBhcmVudHMoJ3NlY3Rpb24nKS5sZW5ndGgpIHtcblxuICAgICAgICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC5pcygnc3BhbiNfbWNlX2NhcmV0W2RhdGEtbWNlLWJvZ3VzXScpIHx8IHNlbGVjdGVkRWxlbWVudC5wYXJlbnQoKS5pcygnc3BhbiNfbWNlX2NhcmV0W2RhdGEtbWNlLWJvZ3VzXScpKSB7XG5cbiAgICAgICAgICAgICAgLy8gUmVtb3ZlIHNwYW4gbm9ybWFsbHkgY3JlYXRlZCB3aXRoIGJvbGRcbiAgICAgICAgICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC5wYXJlbnQoKS5pcygnc3BhbiNfbWNlX2NhcmV0W2RhdGEtbWNlLWJvZ3VzXScpKVxuICAgICAgICAgICAgICAgIHNlbGVjdGVkRWxlbWVudCA9IHNlbGVjdGVkRWxlbWVudC5wYXJlbnQoKVxuXG4gICAgICAgICAgICAgIGxldCBibSA9IHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRCb29rbWFyaygpXG4gICAgICAgICAgICAgIHNlbGVjdGVkRWxlbWVudC5yZXBsYWNlV2l0aChzZWxlY3RlZEVsZW1lbnQuaHRtbCgpKVxuICAgICAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24ubW92ZVRvQm9va21hcmsoYm0pXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdXBkYXRlRG9jdW1lbnRTdGF0ZSgpXG4gICAgICAgIH0pXG5cbiAgICAgICAgLy8gVXBkYXRlIHNhdmVkIGNvbnRlbnQgb24gdW5kbyBhbmQgcmVkbyBldmVudHNcbiAgICAgICAgZWRpdG9yLm9uKCdVbmRvJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcbiAgICAgICAgfSlcblxuICAgICAgICBlZGl0b3Iub24oJ1JlZG8nLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuICAgICAgICB9KVxuXG4gICAgICAgIGVkaXRvci5vbignUGFzdGUnLCBmdW5jdGlvbiAoZSkge1xuXG4gICAgICAgICAgbGV0IHRhcmdldCA9ICQoZS50YXJnZXQpXG5cbiAgICAgICAgICAvLyBJZiB0aGUgcGFzdGUgZXZlbnQgaXMgY2FsbGVkIGluc2lkZSBhIGxpc3RpbmdcbiAgICAgICAgICBpZiAocGFzdGVCb29rbWFyayAmJiB0YXJnZXQucGFyZW50cygnZmlndXJlOmhhcyhwcmU6aGFzKGNvZGUpKScpLmxlbmd0aCkge1xuXG4gICAgICAgICAgICBsZXQgZGF0YSA9IGUuY2xpcGJvYXJkRGF0YS5nZXREYXRhKCdUZXh0JylcblxuICAgICAgICAgICAgLy8gUmVzdG9yZSB0aGUgc2VsZWN0aW9uIHNhdmVkIG9uIGNtZCt2XG4gICAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24ubW92ZVRvQm9va21hcmsocGFzdGVCb29rbWFyaylcblxuICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSBjb250ZW50XG4gICAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2V0Q29udGVudChlLmNsaXBib2FyZERhdGEuZ2V0RGF0YSgnVGV4dCcpKVxuXG4gICAgICAgICAgICBwYXN0ZUJvb2ttYXJrID0gbnVsbFxuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgIH0sXG5cbiAgICAgIC8vIFNldCBkZWZhdWx0IHRhcmdldFxuICAgICAgZGVmYXVsdF9saW5rX3RhcmdldDogXCJfYmxhbmtcIixcblxuICAgICAgLy8gUHJlcGVuZCBwcm90b2NvbCBpZiB0aGUgbGluayBzdGFydHMgd2l0aCB3d3dcbiAgICAgIGxpbmtfYXNzdW1lX2V4dGVybmFsX3RhcmdldHM6IHRydWUsXG5cbiAgICAgIC8vIEhpZGUgdGFyZ2V0IGxpc3RcbiAgICAgIHRhcmdldF9saXN0OiBmYWxzZSxcblxuICAgICAgLy8gSGlkZSB0aXRsZVxuICAgICAgbGlua190aXRsZTogZmFsc2UsXG5cbiAgICAgIC8vIFNldCBmb3JtYXRzXG4gICAgICBmb3JtYXRzOiB7XG4gICAgICAgIHVuZGVybGluZToge31cbiAgICAgIH0sXG5cbiAgICAgIC8vIFJlbW92ZSBcInBvd2VyZWQgYnkgdGlueW1jZVwiXG4gICAgICBicmFuZGluZzogZmFsc2UsXG5cbiAgICAgIC8vIFByZXZlbnQgYXV0byBiciBvbiBlbGVtZW50IGluc2VydFxuICAgICAgYXBwbHlfc291cmNlX2Zvcm1hdHRpbmc6IGZhbHNlLFxuXG4gICAgICAvLyBQcmV2ZW50IG5vbiBlZGl0YWJsZSBvYmplY3QgcmVzaXplXG4gICAgICBvYmplY3RfcmVzaXppbmc6IGZhbHNlLFxuXG4gICAgICAvLyBVcGRhdGUgdGhlIHRhYmxlIHBvcG92ZXIgbGF5b3V0XG4gICAgICB0YWJsZV90b29sYmFyOiBcInRhYmxlaW5zZXJ0cm93YmVmb3JlIHRhYmxlaW5zZXJ0cm93YWZ0ZXIgdGFibGVkZWxldGVyb3cgfCB0YWJsZWluc2VydGNvbGJlZm9yZSB0YWJsZWluc2VydGNvbGFmdGVyIHRhYmxlZGVsZXRlY29sXCIsXG5cbiAgICAgIGltYWdlX2FkdnRhYjogdHJ1ZSxcblxuICAgICAgcGFzdGVfYmxvY2tfZHJvcDogdHJ1ZSxcblxuICAgICAgZXh0ZW5kZWRfdmFsaWRfZWxlbWVudHM6IFwic3ZnWypdLGRlZnNbKl0scGF0dGVyblsqXSxkZXNjWypdLG1ldGFkYXRhWypdLGdbKl0sbWFza1sqXSxwYXRoWypdLGxpbmVbKl0sbWFya2VyWypdLHJlY3RbKl0sY2lyY2xlWypdLGVsbGlwc2VbKl0scG9seWdvblsqXSxwb2x5bGluZVsqXSxsaW5lYXJHcmFkaWVudFsqXSxyYWRpYWxHcmFkaWVudFsqXSxzdG9wWypdLGltYWdlWypdLHZpZXdbKl0sdGV4dFsqXSx0ZXh0UGF0aFsqXSx0aXRsZVsqXSx0c3BhblsqXSxnbHlwaFsqXSxzeW1ib2xbKl0sc3dpdGNoWypdLHVzZVsqXVwiLFxuXG4gICAgICBmb3JtdWxhOiB7XG4gICAgICAgIHBhdGg6ICdub2RlX21vZHVsZXMvdGlueW1jZS1mb3JtdWxhLydcbiAgICAgIH0sXG5cbiAgICAgIGNsZWFudXBfb25fc3RhcnR1cDogZmFsc2UsXG4gICAgICB0cmltX3NwYW5fZWxlbWVudHM6IGZhbHNlLFxuICAgICAgdmVyaWZ5X2h0bWw6IGZhbHNlLFxuICAgICAgY2xlYW51cDogZmFsc2UsXG4gICAgICBjb252ZXJ0X3VybHM6IGZhbHNlXG4gICAgfSlcbiAgfSlcblxuICAvKipcbiAgICogT3BlbiBhbmQgY2xvc2UgdGhlIGhlYWRpbmdzIGRyb3Bkb3duXG4gICAqL1xuICAkKHdpbmRvdykubG9hZChmdW5jdGlvbiAoKSB7XG5cbiAgICAvLyBPcGVuIGFuZCBjbG9zZSBtZW51IGhlYWRpbmdzIE7DpGl2ZSB3YXlcbiAgICAkKGBkaXZbYXJpYS1sYWJlbD0naGVhZGluZyddYCkuZmluZCgnYnV0dG9uJykudHJpZ2dlcignY2xpY2snKVxuICAgICQoYGRpdlthcmlhLWxhYmVsPSdoZWFkaW5nJ11gKS5maW5kKCdidXR0b24nKS50cmlnZ2VyKCdjbGljaycpXG4gIH0pXG5cblxuICAvKipcbiAgICogVXBkYXRlIGNvbnRlbnQgaW4gdGhlIGlmcmFtZSwgd2l0aCB0aGUgb25lIHN0b3JlZCBieSB0aW55bWNlXG4gICAqIEFuZCBzYXZlL3Jlc3RvcmUgdGhlIHNlbGVjdGlvblxuICAgKi9cbiAgZnVuY3Rpb24gdXBkYXRlSWZyYW1lRnJvbVNhdmVkQ29udGVudCgpIHtcblxuICAgIC8vIFNhdmUgdGhlIGJvb2ttYXJrIFxuICAgIGxldCBib29rbWFyayA9IHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRCb29rbWFyaygyLCB0cnVlKVxuXG4gICAgLy8gVXBkYXRlIGlmcmFtZSBjb250ZW50XG4gICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2V0Q29udGVudCgkKCcjcmFqZV9yb290JykuaHRtbCgpKVxuXG4gICAgLy8gUmVzdG9yZSB0aGUgYm9va21hcmsgXG4gICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLm1vdmVUb0Jvb2ttYXJrKGJvb2ttYXJrKVxuICB9XG5cbiAgLyoqXG4gICAqIEFjY2VwdCBhIGpzIG9iamVjdCB0aGF0IGV4aXN0cyBpbiBmcmFtZVxuICAgKiBAcGFyYW0geyp9IGVsZW1lbnQgXG4gICAqL1xuICBmdW5jdGlvbiBtb3ZlQ2FyZXQoZWxlbWVudCwgdG9TdGFydCkge1xuICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZWxlY3QoZWxlbWVudCwgdHJ1ZSlcbiAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uY29sbGFwc2UodG9TdGFydClcblxuICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLmZvY3VzKClcbiAgfVxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGZ1bmN0aW9uIHNlbGVjdFJhbmdlKHN0YXJ0Q29udGFpbmVyLCBzdGFydE9mZnNldCwgZW5kQ29udGFpbmVyLCBlbmRPZmZzZXQpIHtcblxuICAgIGxldCByYW5nZSA9IGRvY3VtZW50LmNyZWF0ZVJhbmdlKClcbiAgICByYW5nZS5zZXRTdGFydChzdGFydENvbnRhaW5lciwgc3RhcnRPZmZzZXQpXG5cbiAgICAvLyBJZiB0aGVzZSBwcm9wZXJ0aWVzIGFyZSBub3QgaW4gdGhlIHNpZ25hdHVyZSB1c2UgdGhlIHN0YXJ0XG4gICAgaWYgKCFlbmRDb250YWluZXIgJiYgIWVuZE9mZnNldCkge1xuICAgICAgZW5kQ29udGFpbmVyID0gc3RhcnRDb250YWluZXJcbiAgICAgIGVuZE9mZnNldCA9IHN0YXJ0T2Zmc2V0XG4gICAgfVxuXG4gICAgcmFuZ2Uuc2V0RW5kKGVuZENvbnRhaW5lciwgZW5kT2Zmc2V0KVxuICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZXRSbmcocmFuZ2UpXG4gIH1cblxuICAvKipcbiAgICogXG4gICAqIEBwYXJhbSB7Kn0gZWxlbWVudCBcbiAgICovXG4gIGZ1bmN0aW9uIG1vdmVDdXJzb3JUb0VuZChlbGVtZW50KSB7XG5cbiAgICBsZXQgaGVhZGluZyA9IGVsZW1lbnRcbiAgICBsZXQgb2Zmc2V0ID0gMFxuXG4gICAgaWYgKGhlYWRpbmcuY29udGVudHMoKS5sZW5ndGgpIHtcblxuICAgICAgaGVhZGluZyA9IGhlYWRpbmcuY29udGVudHMoKS5sYXN0KClcblxuICAgICAgLy8gSWYgdGhlIGxhc3Qgbm9kZSBpcyBhIHN0cm9uZyxlbSxxIGV0Yy4gd2UgaGF2ZSB0byB0YWtlIGl0cyB0ZXh0IFxuICAgICAgaWYgKGhlYWRpbmdbMF0ubm9kZVR5cGUgIT0gMylcbiAgICAgICAgaGVhZGluZyA9IGhlYWRpbmcuY29udGVudHMoKS5sYXN0KClcblxuICAgICAgb2Zmc2V0ID0gaGVhZGluZ1swXS53aG9sZVRleHQubGVuZ3RoXG4gICAgfVxuXG4gICAgdGlueW1jZS5hY3RpdmVFZGl0b3IuZm9jdXMoKVxuICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZXRDdXJzb3JMb2NhdGlvbihoZWFkaW5nWzBdLCBvZmZzZXQpXG4gIH1cblxuICAvKipcbiAgICogXG4gICAqIEBwYXJhbSB7Kn0gZWxlbWVudCBcbiAgICovXG4gIGZ1bmN0aW9uIG1vdmVDdXJzb3JUb1N0YXJ0KGVsZW1lbnQpIHtcblxuICAgIGxldCBoZWFkaW5nID0gZWxlbWVudFxuICAgIGxldCBvZmZzZXQgPSAwXG5cbiAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5mb2N1cygpXG4gICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLnNldEN1cnNvckxvY2F0aW9uKGhlYWRpbmdbMF0sIG9mZnNldClcbiAgfVxuXG5cbiAgLyoqXG4gICAqIENyZWF0ZSBjdXN0b20gaW50byBub3RpZmljYXRpb25cbiAgICogQHBhcmFtIHsqfSB0ZXh0IFxuICAgKiBAcGFyYW0geyp9IHRpbWVvdXQgXG4gICAqL1xuICBmdW5jdGlvbiBub3RpZnkodGV4dCwgdHlwZSwgdGltZW91dCkge1xuXG4gICAgLy8gRGlzcGxheSBvbmx5IG9uZSBub3RpZmljYXRpb24sIGJsb2NraW5nIGFsbCBvdGhlcnNcbiAgICBpZiAodGlueW1jZS5hY3RpdmVFZGl0b3Iubm90aWZpY2F0aW9uTWFuYWdlci5nZXROb3RpZmljYXRpb25zKCkubGVuZ3RoID09IDApIHtcblxuICAgICAgbGV0IG5vdGlmeSA9IHtcbiAgICAgICAgdGV4dDogdGV4dCxcbiAgICAgICAgdHlwZTogdHlwZSA/IHR5cGUgOiAnaW5mbycsXG4gICAgICAgIHRpbWVvdXQ6IHRpbWVvdXQgPyB0aW1lb3V0IDogMTAwMFxuICAgICAgfVxuXG4gICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5ub3RpZmljYXRpb25NYW5hZ2VyLm9wZW4obm90aWZ5KVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBcbiAgICogQHBhcmFtIHsqfSBlbGVtZW50U2VsZWN0b3IgXG4gICAqL1xuICBmdW5jdGlvbiBzY3JvbGxUbyhlbGVtZW50U2VsZWN0b3IpIHtcbiAgICAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLmdldEJvZHkoKSkuZmluZChlbGVtZW50U2VsZWN0b3IpLmdldCgwKS5zY3JvbGxJbnRvVmlldygpO1xuICB9XG5cbiAgLyoqXG4gICAqIFxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0U3VjY2Vzc2l2ZUVsZW1lbnRJZChlbGVtZW50U2VsZWN0b3IsIFNVRkZJWCkge1xuXG4gICAgbGV0IGxhc3RJZCA9IDBcblxuICAgICQoZWxlbWVudFNlbGVjdG9yKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgIGxldCBjdXJyZW50SWQgPSBwYXJzZUludCgkKHRoaXMpLmF0dHIoJ2lkJykucmVwbGFjZShTVUZGSVgsICcnKSlcbiAgICAgIGxhc3RJZCA9IGN1cnJlbnRJZCA+IGxhc3RJZCA/IGN1cnJlbnRJZCA6IGxhc3RJZFxuICAgIH0pXG5cbiAgICByZXR1cm4gYCR7U1VGRklYfSR7bGFzdElkKzF9YFxuICB9XG5cbiAgLyoqXG4gICAqIFxuICAgKi9cbiAgZnVuY3Rpb24gaGVhZGluZ0RpbWVuc2lvbigpIHtcbiAgICAkKCdoMSxoMixoMyxoNCxoNSxoNicpLmVhY2goZnVuY3Rpb24gKCkge1xuXG4gICAgICBpZiAoISQodGhpcykucGFyZW50cyhIRUFERVJfU0VMRUNUT1IpLmxlbmd0aCkge1xuICAgICAgICB2YXIgY291bnRlciA9IDA7XG4gICAgICAgICQodGhpcykucGFyZW50cyhcInNlY3Rpb25cIikuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgaWYgKCQodGhpcykuY2hpbGRyZW4oXCJoMSxoMixoMyxoNCxoNSxoNlwiKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb3VudGVyKys7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgJCh0aGlzKS5yZXBsYWNlV2l0aChcIjxoXCIgKyBjb3VudGVyICsgXCI+XCIgKyAkKHRoaXMpLmh0bWwoKSArIFwiPC9oXCIgKyBjb3VudGVyICsgXCI+XCIpXG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogXG4gICAqL1xuICBmdW5jdGlvbiBjaGVja0lmUHJpbnRhYmxlQ2hhcihrZXljb2RlKSB7XG5cbiAgICByZXR1cm4gKGtleWNvZGUgPiA0NyAmJiBrZXljb2RlIDwgNTgpIHx8IC8vIG51bWJlciBrZXlzXG4gICAgICAoa2V5Y29kZSA9PSAzMiB8fCBrZXljb2RlID09IDEzKSB8fCAvLyBzcGFjZWJhciAmIHJldHVybiBrZXkocykgKGlmIHlvdSB3YW50IHRvIGFsbG93IGNhcnJpYWdlIHJldHVybnMpXG4gICAgICAoa2V5Y29kZSA+IDY0ICYmIGtleWNvZGUgPCA5MSkgfHwgLy8gbGV0dGVyIGtleXNcbiAgICAgIChrZXljb2RlID4gOTUgJiYga2V5Y29kZSA8IDExMikgfHwgLy8gbnVtcGFkIGtleXNcbiAgICAgIChrZXljb2RlID4gMTg1ICYmIGtleWNvZGUgPCAxOTMpIHx8IC8vIDs9LC0uL2AgKGluIG9yZGVyKVxuICAgICAgKGtleWNvZGUgPiAyMTggJiYga2V5Y29kZSA8IDIyMyk7IC8vIFtcXF0nIChpbiBvcmRlcilcbiAgfVxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGZ1bmN0aW9uIG1hcmtUaW55TUNFKCkge1xuICAgICQoJ2RpdltpZF49bWNldV9dJykuYXR0cignZGF0YS1yYXNoLW9yaWdpbmFsLWNvbnRlbnQnLCAnJylcbiAgfVxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGZ1bmN0aW9uIHNldE5vbkVkaXRhYmxlSGVhZGVyKCkge1xuICAgICQoSEVBREVSX1NFTEVDVE9SKS5hZGRDbGFzcygnbWNlTm9uRWRpdGFibGUnKVxuICB9XG5cbiAgLyoqXG4gICAqIFxuICAgKi9cbiAgZnVuY3Rpb24gY2hlY2tJZkFwcCgpIHtcbiAgICByZXR1cm4gaXBjUmVuZGVyZXIuc2VuZFN5bmMoJ2lzQXBwU3luYycpXG4gIH1cblxuICAvKipcbiAgICogXG4gICAqL1xuICBmdW5jdGlvbiBzZWxlY3RJbWFnZSgpIHtcbiAgICByZXR1cm4gaXBjUmVuZGVyZXIuc2VuZFN5bmMoJ3NlbGVjdEltYWdlU3luYycpXG4gIH1cblxuXG5cbiAgLyoqXG4gICAqIFNlbmQgYSBtZXNzYWdlIHRvIHRoZSBiYWNrZW5kLCBub3RpZnkgdGhlIHN0cnVjdHVyYWwgY2hhbmdlXG4gICAqIFxuICAgKiBJZiB0aGUgZG9jdW1lbnQgaXMgZHJhZnQgc3RhdGUgPSB0cnVlXG4gICAqIElmIHRoZSBkb2N1bWVudCBpcyBzYXZlZCBzdGF0ZSA9IGZhbHNlXG4gICAqL1xuICBmdW5jdGlvbiB1cGRhdGVEb2N1bWVudFN0YXRlKCkge1xuXG4gICAgLy8gR2V0IHRoZSBJZnJhbWUgY29udGVudCBub3QgaW4geG1sIFxuICAgIGxldCBKcXVlcnlJZnJhbWUgPSAkKGA8ZGl2PiR7dGlueW1jZS5hY3RpdmVFZGl0b3IuZ2V0Q29udGVudCgpfTwvZGl2PmApXG4gICAgbGV0IEpxdWVyeVNhdmVkQ29udGVudCA9ICQoYCNyYWplX3Jvb3RgKVxuXG4gICAgLy8gVHJ1ZSBpZiB0aGV5J3JlIGRpZmZlcmVudCwgRmFsc2UgaXMgdGhleSdyZSBlcXVhbFxuICAgIGlwY1JlbmRlcmVyLnNlbmQoJ3VwZGF0ZURvY3VtZW50U3RhdGUnLCBKcXVlcnlJZnJhbWUuaHRtbCgpICE9IEpxdWVyeVNhdmVkQ29udGVudC5odG1sKCkpXG4gIH1cblxuICAvKipcbiAgICogXG4gICAqL1xuICBmdW5jdGlvbiBzYXZlQXNBcnRpY2xlKG9wdGlvbnMpIHtcbiAgICByZXR1cm4gaXBjUmVuZGVyZXIuc2VuZCgnc2F2ZUFzQXJ0aWNsZScsIG9wdGlvbnMpXG4gIH1cblxuICAvKipcbiAgICogXG4gICAqL1xuICBmdW5jdGlvbiBzYXZlQXJ0aWNsZShvcHRpb25zKSB7XG4gICAgcmV0dXJuIGlwY1JlbmRlcmVyLnNlbmQoJ3NhdmVBcnRpY2xlJywgb3B0aW9ucylcbiAgfVxuXG4gIC8qKlxuICAgKiBTdGFydCB0aGUgc2F2ZSBhcyBwcm9jZXNzIGdldHRpbmcgdGhlIGRhdGEgYW5kIHNlbmRpbmcgaXRcbiAgICogdG8gdGhlIG1haW4gcHJvY2Vzc1xuICAgKi9cbiAgaXBjUmVuZGVyZXIub24oJ2V4ZWN1dGVTYXZlQXMnLCAoZXZlbnQsIGRhdGEpID0+IHtcbiAgICBzYXZlTWFuYWdlci5zYXZlQXMoKVxuICB9KVxuXG4gIC8qKlxuICAgKiBTdGFydCB0aGUgc2F2ZSBwcm9jZXNzIGdldHRpbmcgdGhlIGRhdGEgYW5kIHNlbmRpbmcgaXRcbiAgICogdG8gdGhlIG1haW4gcHJvY2Vzc1xuICAgKi9cbiAgaXBjUmVuZGVyZXIub24oJ2V4ZWN1dGVTYXZlJywgKGV2ZW50LCBkYXRhKSA9PiB7XG4gICAgc2F2ZU1hbmFnZXIuc2F2ZSgpXG4gIH0pXG5cbiAgLyoqXG4gICAqIFxuICAgKi9cbiAgaXBjUmVuZGVyZXIub24oJ25vdGlmeScsIChldmVudCwgZGF0YSkgPT4ge1xuICAgIG5vdGlmeShkYXRhLnRleHQsIGRhdGEudHlwZSwgZGF0YS50aW1lb3V0KVxuICB9KVxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGlwY1JlbmRlcmVyLm9uKCd1cGRhdGVDb250ZW50JywgKGV2ZW50LCBkYXRhKSA9PiB7XG4gICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG4gIH0pXG59IiwidGlueW1jZS5QbHVnaW5NYW5hZ2VyLmFkZCgncmFqZV9jb2RlYmxvY2snLCBmdW5jdGlvbiAoZWRpdG9yLCB1cmwpIHt9KSIsInRpbnltY2UuUGx1Z2luTWFuYWdlci5hZGQoJ3JhamVfY3Jvc3NyZWYnLCBmdW5jdGlvbiAoZWRpdG9yLCB1cmwpIHtcblxuICAvLyBBZGQgYSBidXR0b24gdGhhdCBoYW5kbGUgdGhlIGlubGluZSBlbGVtZW50XG4gIGVkaXRvci5hZGRCdXR0b24oJ3JhamVfY3Jvc3NyZWYnLCB7XG4gICAgdGl0bGU6ICdyYWplX2Nyb3NzcmVmJyxcbiAgICBpY29uOiAnaWNvbi1hbmNob3InLFxuICAgIHRvb2x0aXA6ICdDcm9zcy1yZWZlcmVuY2UnLFxuICAgIGRpc2FibGVkU3RhdGVTZWxlY3RvcjogRElTQUJMRV9TRUxFQ1RPUl9GSUdVUkVTLFxuXG4gICAgLy8gQnV0dG9uIGJlaGF2aW91clxuICAgIG9uY2xpY2s6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG5cbiAgICAgIGxldCByZWZlcmVuY2VhYmxlTGlzdCA9IHtcbiAgICAgICAgc2VjdGlvbnM6IGNyb3NzcmVmLmdldEFsbFJlZmVyZW5jZWFibGVTZWN0aW9ucygpLFxuICAgICAgICB0YWJsZXM6IGNyb3NzcmVmLmdldEFsbFJlZmVyZW5jZWFibGVUYWJsZXMoKSxcbiAgICAgICAgZmlndXJlczogY3Jvc3NyZWYuZ2V0QWxsUmVmZXJlbmNlYWJsZUZpZ3VyZXMoKSxcbiAgICAgICAgbGlzdGluZ3M6IGNyb3NzcmVmLmdldEFsbFJlZmVyZW5jZWFibGVMaXN0aW5ncygpLFxuICAgICAgICBmb3JtdWxhczogY3Jvc3NyZWYuZ2V0QWxsUmVmZXJlbmNlYWJsZUZvcm11bGFzKCksXG4gICAgICAgIHJlZmVyZW5jZXM6IGNyb3NzcmVmLmdldEFsbFJlZmVyZW5jZWFibGVSZWZlcmVuY2VzKClcbiAgICAgIH1cblxuICAgICAgZWRpdG9yLndpbmRvd01hbmFnZXIub3Blbih7XG4gICAgICAgICAgdGl0bGU6ICdDcm9zcy1yZWZlcmVuY2UgZWRpdG9yJyxcbiAgICAgICAgICB1cmw6ICdqcy9yYWplLWNvcmUvcGx1Z2luL3JhamVfY3Jvc3NyZWYuaHRtbCcsXG4gICAgICAgICAgd2lkdGg6IDUwMCxcbiAgICAgICAgICBoZWlnaHQ6IDgwMCxcbiAgICAgICAgICBvbkNsb3NlOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogXG4gICAgICAgICAgICAgKiBUaGlzIGJlaGF2aW91ciBpcyBjYWxsZWQgd2hlbiB1c2VyIHByZXNzIFwiQUREIE5FVyBSRUZFUkVOQ0VcIiBcbiAgICAgICAgICAgICAqIGJ1dHRvbiBmcm9tIHRoZSBtb2RhbFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBpZiAodGlueW1jZS5hY3RpdmVFZGl0b3IuY3JlYXRlTmV3UmVmZXJlbmNlKSB7XG5cbiAgICAgICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgICAgICAgLy8gR2V0IHN1Y2Nlc3NpdmUgYmlibGlvZW50cnkgaWRcbiAgICAgICAgICAgICAgICBsZXQgaWQgPSBnZXRTdWNjZXNzaXZlRWxlbWVudElkKEJJQkxJT0VOVFJZX1NFTEVDVE9SLCBCSUJMSU9FTlRSWV9TVUZGSVgpXG5cbiAgICAgICAgICAgICAgICAvLyBDcmVhdGUgdGhlIHJlZmVyZW5jZSB0aGF0IHBvaW50cyB0byB0aGUgbmV4dCBpZFxuICAgICAgICAgICAgICAgIGNyb3NzcmVmLmFkZChpZClcblxuICAgICAgICAgICAgICAgIC8vIEFkZCB0aGUgbmV4dCBiaWJsaW9lbnRyeVxuICAgICAgICAgICAgICAgIHNlY3Rpb24uYWRkQmlibGlvZW50cnkoaWQpXG5cbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgdGhlIHJlZmVyZW5jZVxuICAgICAgICAgICAgICAgIGNyb3NzcmVmLnVwZGF0ZSgpXG5cbiAgICAgICAgICAgICAgICAvLyBNb3ZlIGNhcmV0IHRvIHN0YXJ0IG9mIHRoZSBuZXcgYmlibGlvZW50cnkgZWxlbWVudFxuICAgICAgICAgICAgICAgIC8vIElzc3VlICMxMDUgRmlyZWZveCArIENocm9taXVtXG4gICAgICAgICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLnNldEN1cnNvckxvY2F0aW9uKCQodGlueW1jZS5hY3RpdmVFZGl0b3IuZG9tLmdldChpZCkpLmZpbmQoJ3AnKVswXSwgZmFsc2UpXG4gICAgICAgICAgICAgICAgc2Nyb2xsVG8oYCR7QklCTElPRU5UUllfU0VMRUNUT1J9IyR7aWR9YClcbiAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgICAvLyBTZXQgdmFyaWFibGUgbnVsbCBmb3Igc3VjY2Vzc2l2ZSB1c2FnZXNcbiAgICAgICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IuY3JlYXRlTmV3UmVmZXJlbmNlID0gbnVsbFxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFRoaXMgaXMgY2FsbGVkIGlmIGEgbm9ybWFsIHJlZmVyZW5jZSBpcyBzZWxlY3RlZCBmcm9tIG1vZGFsXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGVsc2UgaWYgKHRpbnltY2UuYWN0aXZlRWRpdG9yLnJlZmVyZW5jZSkge1xuXG4gICAgICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgICAgICAgIC8vIENyZWF0ZSB0aGUgZW1wdHkgYW5jaG9yIGFuZCB1cGRhdGUgaXRzIGNvbnRlbnRcbiAgICAgICAgICAgICAgICBjcm9zc3JlZi5hZGQodGlueW1jZS5hY3RpdmVFZGl0b3IucmVmZXJlbmNlKVxuICAgICAgICAgICAgICAgIGNyb3NzcmVmLnVwZGF0ZSgpXG5cbiAgICAgICAgICAgICAgICBsZXQgc2VsZWN0ZWROb2RlID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuXG4gICAgICAgICAgICAgICAgLy8gVGhpcyBzZWxlY3QgdGhlIGxhc3QgZWxlbWVudCAobGFzdCBieSBvcmRlcikgYW5kIGNvbGxhcHNlIHRoZSBzZWxlY3Rpb24gYWZ0ZXIgdGhlIG5vZGVcbiAgICAgICAgICAgICAgICAvLyAjMTA1IEZpcmVmb3ggKyBDaHJvbWl1bVxuICAgICAgICAgICAgICAgIC8vdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLnNldEN1cnNvckxvY2F0aW9uKCQodGlueW1jZS5hY3RpdmVFZGl0b3IuZG9tLnNlbGVjdChgYVtocmVmPVwiIyR7dGlueW1jZS5hY3RpdmVFZGl0b3IucmVmZXJlbmNlfVwiXTpsYXN0LWNoaWxkYCkpWzBdLCBmYWxzZSlcbiAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgICAvLyBTZXQgdmFyaWFibGUgbnVsbCBmb3Igc3VjY2Vzc2l2ZSB1c2FnZXNcbiAgICAgICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IucmVmZXJlbmNlID0gbnVsbFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICAvLyBMaXN0IG9mIGFsbCByZWZlcmVuY2VhYmxlIGVsZW1lbnRzXG4gICAgICAgIHJlZmVyZW5jZWFibGVMaXN0KVxuICAgIH1cbiAgfSlcblxuICBjcm9zc3JlZiA9IHtcbiAgICBnZXRBbGxSZWZlcmVuY2VhYmxlU2VjdGlvbnM6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgbGV0IHNlY3Rpb25zID0gW11cblxuICAgICAgJCgnc2VjdGlvbicpLmVhY2goZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIGxldCBsZXZlbCA9ICcnXG5cbiAgICAgICAgLy8gU2VjdGlvbnMgd2l0aG91dCByb2xlIGhhdmUgOmFmdGVyXG4gICAgICAgIGlmICghJCh0aGlzKS5hdHRyKCdyb2xlJykpIHtcblxuICAgICAgICAgIC8vIFNhdmUgaXRzIGRlZXBuZXNzXG4gICAgICAgICAgbGV0IHBhcmVudFNlY3Rpb25zID0gJCh0aGlzKS5wYXJlbnRzVW50aWwoJ2RpdiNyYWplX3Jvb3QnKVxuXG4gICAgICAgICAgaWYgKHBhcmVudFNlY3Rpb25zLmxlbmd0aCkge1xuXG4gICAgICAgICAgICAvLyBJdGVyYXRlIGl0cyBwYXJlbnRzIGJhY2t3YXJkcyAoaGlnZXIgZmlyc3QpXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gcGFyZW50U2VjdGlvbnMubGVuZ3RoOyBpLS07IGkgPiAwKSB7XG4gICAgICAgICAgICAgIGxldCBzZWN0aW9uID0gJChwYXJlbnRTZWN0aW9uc1tpXSlcbiAgICAgICAgICAgICAgbGV2ZWwgKz0gYCR7c2VjdGlvbi5wYXJlbnQoKS5jaGlsZHJlbihTRUNUSU9OX1NFTEVDVE9SKS5pbmRleChzZWN0aW9uKSsxfS5gXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gQ3VycmVudCBpbmRleFxuICAgICAgICAgIGxldmVsICs9IGAkeyQodGhpcykucGFyZW50KCkuY2hpbGRyZW4oU0VDVElPTl9TRUxFQ1RPUikuaW5kZXgoJCh0aGlzKSkrMX0uYFxuICAgICAgICB9XG5cbiAgICAgICAgc2VjdGlvbnMucHVzaCh7XG4gICAgICAgICAgcmVmZXJlbmNlOiAkKHRoaXMpLmF0dHIoJ2lkJyksXG4gICAgICAgICAgdGV4dDogJCh0aGlzKS5maW5kKCc6aGVhZGVyJykuZmlyc3QoKS50ZXh0KCksXG4gICAgICAgICAgbGV2ZWw6IGxldmVsXG4gICAgICAgIH0pXG4gICAgICB9KVxuXG4gICAgICByZXR1cm4gc2VjdGlvbnNcbiAgICB9LFxuXG4gICAgZ2V0QWxsUmVmZXJlbmNlYWJsZVRhYmxlczogZnVuY3Rpb24gKCkge1xuICAgICAgbGV0IHRhYmxlcyA9IFtdXG5cbiAgICAgICQoJ2ZpZ3VyZTpoYXModGFibGUpJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRhYmxlcy5wdXNoKHtcbiAgICAgICAgICByZWZlcmVuY2U6ICQodGhpcykuYXR0cignaWQnKSxcbiAgICAgICAgICB0ZXh0OiAkKHRoaXMpLmZpbmQoJ2ZpZ2NhcHRpb24nKS50ZXh0KClcbiAgICAgICAgfSlcbiAgICAgIH0pXG5cbiAgICAgIHJldHVybiB0YWJsZXNcbiAgICB9LFxuXG4gICAgZ2V0QWxsUmVmZXJlbmNlYWJsZUxpc3RpbmdzOiBmdW5jdGlvbiAoKSB7XG4gICAgICBsZXQgbGlzdGluZ3MgPSBbXVxuXG4gICAgICAkKCdmaWd1cmU6aGFzKHByZTpoYXMoY29kZSkpJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIGxpc3RpbmdzLnB1c2goe1xuICAgICAgICAgIHJlZmVyZW5jZTogJCh0aGlzKS5hdHRyKCdpZCcpLFxuICAgICAgICAgIHRleHQ6ICQodGhpcykuZmluZCgnZmlnY2FwdGlvbicpLnRleHQoKVxuICAgICAgICB9KVxuICAgICAgfSlcblxuICAgICAgcmV0dXJuIGxpc3RpbmdzXG4gICAgfSxcblxuICAgIGdldEFsbFJlZmVyZW5jZWFibGVGaWd1cmVzOiBmdW5jdGlvbiAoKSB7XG4gICAgICBsZXQgZmlndXJlcyA9IFtdXG5cbiAgICAgICQoJ2ZpZ3VyZTpoYXMocDpoYXMoaW1nKSksZmlndXJlOmhhcyhwOmhhcyhzdmcpKScpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICBmaWd1cmVzLnB1c2goe1xuICAgICAgICAgIHJlZmVyZW5jZTogJCh0aGlzKS5hdHRyKCdpZCcpLFxuICAgICAgICAgIHRleHQ6ICQodGhpcykuZmluZCgnZmlnY2FwdGlvbicpLnRleHQoKVxuICAgICAgICB9KVxuICAgICAgfSlcblxuICAgICAgcmV0dXJuIGZpZ3VyZXNcbiAgICB9LFxuXG4gICAgZ2V0QWxsUmVmZXJlbmNlYWJsZUZvcm11bGFzOiBmdW5jdGlvbiAoKSB7XG4gICAgICBsZXQgZm9ybXVsYXMgPSBbXVxuXG4gICAgICAkKGZvcm11bGFib3hfc2VsZWN0b3IpLmVhY2goZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIGZvcm11bGFzLnB1c2goe1xuICAgICAgICAgIHJlZmVyZW5jZTogJCh0aGlzKS5wYXJlbnRzKEZJR1VSRV9TRUxFQ1RPUikuYXR0cignaWQnKSxcbiAgICAgICAgICB0ZXh0OiBgRm9ybXVsYSAkeyQodGhpcykucGFyZW50cyhGSUdVUkVfU0VMRUNUT1IpLmZpbmQoJ3NwYW4uY2dlbicpLnRleHQoKX1gXG4gICAgICAgIH0pXG4gICAgICB9KVxuXG4gICAgICByZXR1cm4gZm9ybXVsYXNcbiAgICB9LFxuXG4gICAgZ2V0QWxsUmVmZXJlbmNlYWJsZVJlZmVyZW5jZXM6IGZ1bmN0aW9uICgpIHtcbiAgICAgIGxldCByZWZlcmVuY2VzID0gW11cblxuICAgICAgJCgnc2VjdGlvbltyb2xlPWRvYy1iaWJsaW9ncmFwaHldIGxpJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJlZmVyZW5jZXMucHVzaCh7XG4gICAgICAgICAgcmVmZXJlbmNlOiAkKHRoaXMpLmF0dHIoJ2lkJyksXG4gICAgICAgICAgdGV4dDogJCh0aGlzKS50ZXh0KCksXG4gICAgICAgICAgbGV2ZWw6ICQodGhpcykuaW5kZXgoKSArIDFcbiAgICAgICAgfSlcbiAgICAgIH0pXG5cbiAgICAgIHJldHVybiByZWZlcmVuY2VzXG4gICAgfSxcblxuICAgIGFkZDogZnVuY3Rpb24gKHJlZmVyZW5jZSwgbmV4dCkge1xuXG4gICAgICAvLyBDcmVhdGUgdGhlIGVtcHR5IHJlZmVyZW5jZSB3aXRoIGEgd2hpdGVzcGFjZSBhdCB0aGUgZW5kXG4gICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2V0Q29udGVudChgPGEgY29udGVudGVkaXRhYmxlPVwiZmFsc2VcIiBocmVmPVwiIyR7cmVmZXJlbmNlfVwiPiZuYnNwOzwvYT4mbmJzcDtgKVxuICAgICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG4gICAgfSxcblxuICAgIHVwZGF0ZTogZnVuY3Rpb24gKCkge1xuXG4gICAgICAvLyBVcGRhdGUgdGhlIHJlZmVyZW5jZSAoaW4gc2F2ZWQgY29udGVudClcbiAgICAgIHJlZmVyZW5jZXMoKVxuXG4gICAgICAvLyBQcmV2ZW50IGFkZGluZyBvZiBuZXN0ZWQgYSBhcyBmb290bm90ZXNcbiAgICAgICQoJ2E+c3VwPmEnKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgJCh0aGlzKS5wYXJlbnQoKS5odG1sKCQodGhpcykudGV4dCgpKVxuICAgICAgfSlcblxuICAgICAgLy8gVXBkYXRlIGVkaXRvciB3aXRoIHRoZSByaWdodCByZWZlcmVuY2VzXG4gICAgICB1cGRhdGVJZnJhbWVGcm9tU2F2ZWRDb250ZW50KClcbiAgICB9XG4gIH1cbn0pXG5cbnRpbnltY2UuUGx1Z2luTWFuYWdlci5hZGQoJ3JhamVfZm9vdG5vdGVzJywgZnVuY3Rpb24gKGVkaXRvciwgdXJsKSB7XG5cbiAgZWRpdG9yLmFkZEJ1dHRvbigncmFqZV9mb290bm90ZXMnLCB7XG4gICAgdGl0bGU6ICdyYWplX2Zvb3Rub3RlcycsXG4gICAgaWNvbjogJ2ljb24tZm9vdG5vdGVzJyxcbiAgICB0b29sdGlwOiAnRm9vdG5vdGUnLFxuICAgIGRpc2FibGVkU3RhdGVTZWxlY3RvcjogRElTQUJMRV9TRUxFQ1RPUl9GSUdVUkVTLFxuXG4gICAgLy8gQnV0dG9uIGJlaGF2aW91clxuICAgIG9uY2xpY2s6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIC8vIEdldCBzdWNjZXNzaXZlIGJpYmxpb2VudHJ5IGlkXG4gICAgICAgIGxldCByZWZlcmVuY2UgPSBnZXRTdWNjZXNzaXZlRWxlbWVudElkKEVORE5PVEVfU0VMRUNUT1IsIEVORE5PVEVfU1VGRklYKVxuXG4gICAgICAgIC8vIENyZWF0ZSB0aGUgcmVmZXJlbmNlIHRoYXQgcG9pbnRzIHRvIHRoZSBuZXh0IGlkXG4gICAgICAgIGNyb3NzcmVmLmFkZChyZWZlcmVuY2UpXG5cbiAgICAgICAgLy8gQWRkIHRoZSBuZXh0IGJpYmxpb2VudHJ5XG4gICAgICAgIHNlY3Rpb24uYWRkRW5kbm90ZShyZWZlcmVuY2UpXG5cbiAgICAgICAgLy8gVXBkYXRlIHRoZSByZWZlcmVuY2VcbiAgICAgICAgY3Jvc3NyZWYudXBkYXRlKClcblxuICAgICAgICAvLyBNb3ZlIGNhcmV0IGF0IHRoZSBlbmQgb2YgcCBpbiBsYXN0IGluc2VydGVkIGVuZG5vdGVcbiAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLnNldEN1cnNvckxvY2F0aW9uKHRpbnltY2UuYWN0aXZlRWRpdG9yLmRvbS5zZWxlY3QoYCR7RU5ETk9URV9TRUxFQ1RPUn0jJHtyZWZlcmVuY2V9PnBgKVswXSwgMSlcbiAgICAgIH0pXG4gICAgfVxuICB9KVxufSlcblxuZnVuY3Rpb24gcmVmZXJlbmNlcygpIHtcbiAgLyogUmVmZXJlbmNlcyAqL1xuICAkKFwiYVtocmVmXVwiKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoJC50cmltKCQodGhpcykudGV4dCgpKSA9PSAnJykge1xuICAgICAgdmFyIGN1cl9pZCA9ICQodGhpcykuYXR0cihcImhyZWZcIik7XG4gICAgICBvcmlnaW5hbF9jb250ZW50ID0gJCh0aGlzKS5odG1sKClcbiAgICAgIG9yaWdpbmFsX3JlZmVyZW5jZSA9IGN1cl9pZFxuICAgICAgcmVmZXJlbmNlZF9lbGVtZW50ID0gJChjdXJfaWQpO1xuXG4gICAgICBpZiAocmVmZXJlbmNlZF9lbGVtZW50Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgcmVmZXJlbmNlZF9lbGVtZW50X2ZpZ3VyZSA9IHJlZmVyZW5jZWRfZWxlbWVudC5maW5kKFxuICAgICAgICAgIGZpZ3VyZWJveF9zZWxlY3Rvcl9pbWcgKyBcIixcIiArIGZpZ3VyZWJveF9zZWxlY3Rvcl9zdmcpO1xuICAgICAgICByZWZlcmVuY2VkX2VsZW1lbnRfdGFibGUgPSByZWZlcmVuY2VkX2VsZW1lbnQuZmluZCh0YWJsZWJveF9zZWxlY3Rvcl90YWJsZSk7XG4gICAgICAgIHJlZmVyZW5jZWRfZWxlbWVudF9mb3JtdWxhID0gcmVmZXJlbmNlZF9lbGVtZW50LmZpbmQoXG4gICAgICAgICAgZm9ybXVsYWJveF9zZWxlY3Rvcl9pbWcgKyBcIixcIiArIGZvcm11bGFib3hfc2VsZWN0b3Jfc3BhbiArIFwiLFwiICsgZm9ybXVsYWJveF9zZWxlY3Rvcl9tYXRoICsgXCIsXCIgKyBmb3JtdWxhYm94X3NlbGVjdG9yX3N2Zyk7XG4gICAgICAgIHJlZmVyZW5jZWRfZWxlbWVudF9saXN0aW5nID0gcmVmZXJlbmNlZF9lbGVtZW50LmZpbmQobGlzdGluZ2JveF9zZWxlY3Rvcl9wcmUpO1xuICAgICAgICAvKiBTcGVjaWFsIHNlY3Rpb25zICovXG4gICAgICAgIGlmIChcbiAgICAgICAgICAkKFwic2VjdGlvbltyb2xlPWRvYy1hYnN0cmFjdF1cIiArIGN1cl9pZCkubGVuZ3RoID4gMCB8fFxuICAgICAgICAgICQoXCJzZWN0aW9uW3JvbGU9ZG9jLWJpYmxpb2dyYXBoeV1cIiArIGN1cl9pZCkubGVuZ3RoID4gMCB8fFxuICAgICAgICAgICQoXCJzZWN0aW9uW3JvbGU9ZG9jLWVuZG5vdGVzXVwiICsgY3VyX2lkICsgXCIsIHNlY3Rpb25bcm9sZT1kb2MtZm9vdG5vdGVzXVwiICsgY3VyX2lkKS5sZW5ndGggPiAwIHx8XG4gICAgICAgICAgJChcInNlY3Rpb25bcm9sZT1kb2MtYWNrbm93bGVkZ2VtZW50c11cIiArIGN1cl9pZCkubGVuZ3RoID4gMCkge1xuICAgICAgICAgICQodGhpcykuaHRtbChcIjxzcGFuIGNsYXNzPVxcXCJjZ2VuXFxcIiBjb250ZW50ZWRpdGFibGU9XFxcImZhbHNlXFxcIiAgZGF0YS1yYXNoLW9yaWdpbmFsLWNvbnRlbnQ9XFxcIlwiICsgb3JpZ2luYWxfY29udGVudCArXG4gICAgICAgICAgICBcIlxcXCI+U2VjdGlvbiA8cT5cIiArICQoY3VyX2lkICsgXCIgPiBoMVwiKS50ZXh0KCkgKyBcIjwvcT48L3NwYW4+XCIpO1xuICAgICAgICAgIC8qIEJpYmxpb2dyYXBoaWMgcmVmZXJlbmNlcyAqL1xuICAgICAgICB9IGVsc2UgaWYgKCQoY3VyX2lkKS5wYXJlbnRzKFwic2VjdGlvbltyb2xlPWRvYy1iaWJsaW9ncmFwaHldXCIpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICB2YXIgY3VyX2NvdW50ID0gJChjdXJfaWQpLnByZXZBbGwoXCJsaVwiKS5sZW5ndGggKyAxO1xuICAgICAgICAgICQodGhpcykuaHRtbChcIjxzcGFuIGNsYXNzPVxcXCJjZ2VuXFxcIiBjb250ZW50ZWRpdGFibGU9XFxcImZhbHNlXFxcIiBkYXRhLXJhc2gtb3JpZ2luYWwtY29udGVudD1cXFwiXCIgKyBvcmlnaW5hbF9jb250ZW50ICtcbiAgICAgICAgICAgIFwiXFxcIiB0aXRsZT1cXFwiQmlibGlvZ3JhcGhpYyByZWZlcmVuY2UgXCIgKyBjdXJfY291bnQgKyBcIjogXCIgK1xuICAgICAgICAgICAgJChjdXJfaWQpLnRleHQoKS5yZXBsYWNlKC9cXHMrL2csIFwiIFwiKS50cmltKCkgKyBcIlxcXCI+W1wiICsgY3VyX2NvdW50ICsgXCJdPC9zcGFuPlwiKTtcbiAgICAgICAgICAvKiBGb290bm90ZSByZWZlcmVuY2VzIChkb2MtZm9vdG5vdGVzIGFuZCBkb2MtZm9vdG5vdGUgaW5jbHVkZWQgZm9yIGVhc2luZyBiYWNrIGNvbXBhdGliaWxpdHkpICovXG4gICAgICAgIH0gZWxzZSBpZiAoJChjdXJfaWQpLnBhcmVudHMoXCJzZWN0aW9uW3JvbGU9ZG9jLWVuZG5vdGVzXSwgc2VjdGlvbltyb2xlPWRvYy1mb290bm90ZXNdXCIpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICB2YXIgY3VyX2NvbnRlbnRzID0gJCh0aGlzKS5wYXJlbnQoKS5jb250ZW50cygpO1xuICAgICAgICAgIHZhciBjdXJfaW5kZXggPSBjdXJfY29udGVudHMuaW5kZXgoJCh0aGlzKSk7XG4gICAgICAgICAgdmFyIHByZXZfdG1wID0gbnVsbDtcbiAgICAgICAgICB3aGlsZSAoY3VyX2luZGV4ID4gMCAmJiAhcHJldl90bXApIHtcbiAgICAgICAgICAgIGN1cl9wcmV2ID0gY3VyX2NvbnRlbnRzW2N1cl9pbmRleCAtIDFdO1xuICAgICAgICAgICAgaWYgKGN1cl9wcmV2Lm5vZGVUeXBlICE9IDMgfHwgJChjdXJfcHJldikudGV4dCgpLnJlcGxhY2UoLyAvZywgJycpICE9ICcnKSB7XG4gICAgICAgICAgICAgIHByZXZfdG1wID0gY3VyX3ByZXY7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBjdXJfaW5kZXgtLTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIHByZXZfZWwgPSAkKHByZXZfdG1wKTtcbiAgICAgICAgICB2YXIgY3VycmVudF9pZCA9ICQodGhpcykuYXR0cihcImhyZWZcIik7XG4gICAgICAgICAgdmFyIGZvb3Rub3RlX2VsZW1lbnQgPSAkKGN1cnJlbnRfaWQpO1xuICAgICAgICAgIGlmIChmb290bm90ZV9lbGVtZW50Lmxlbmd0aCA+IDAgJiZcbiAgICAgICAgICAgIGZvb3Rub3RlX2VsZW1lbnQucGFyZW50KFwic2VjdGlvbltyb2xlPWRvYy1lbmRub3Rlc10sIHNlY3Rpb25bcm9sZT1kb2MtZm9vdG5vdGVzXVwiKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICB2YXIgY291bnQgPSAkKGN1cnJlbnRfaWQpLnByZXZBbGwoXCJzZWN0aW9uXCIpLmxlbmd0aCArIDE7XG4gICAgICAgICAgICBpZiAocHJldl9lbC5maW5kKFwic3VwXCIpLmhhc0NsYXNzKFwiZm5cIikpIHtcbiAgICAgICAgICAgICAgJCh0aGlzKS5iZWZvcmUoXCI8c3VwIGNsYXNzPVxcXCJjZ2VuXFxcIiBjb250ZW50ZWRpdGFibGU9XFxcImZhbHNlXFxcIiBkYXRhLXJhc2gtb3JpZ2luYWwtY29udGVudD1cXFwiXFxcIj4sPC9zdXA+XCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJCh0aGlzKS5odG1sKFwiPHN1cCBjbGFzcz1cXFwiZm4gY2dlblxcXCIgY29udGVudGVkaXRhYmxlPVxcXCJmYWxzZVxcXCIgZGF0YS1yYXNoLW9yaWdpbmFsLWNvbnRlbnQ9XFxcIlwiICsgb3JpZ2luYWxfY29udGVudCArIFwiXFxcIj5cIiArXG4gICAgICAgICAgICAgIFwiPGEgbmFtZT1cXFwiZm5fcG9pbnRlcl9cIiArIGN1cnJlbnRfaWQucmVwbGFjZShcIiNcIiwgXCJcIikgK1xuICAgICAgICAgICAgICBcIlxcXCIgdGl0bGU9XFxcIkZvb3Rub3RlIFwiICsgY291bnQgKyBcIjogXCIgK1xuICAgICAgICAgICAgICAkKGN1cnJlbnRfaWQpLnRleHQoKS5yZXBsYWNlKC9cXHMrL2csIFwiIFwiKS50cmltKCkgKyBcIlxcXCI+XCIgKyBjb3VudCArIFwiPC9hPjwvc3VwPlwiKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJCh0aGlzKS5odG1sKFwiPHNwYW4gY2xhc3M9XFxcImVycm9yIGNnZW5cXFwiIGNvbnRlbnRlZGl0YWJsZT1cXFwiZmFsc2VcXFwiIGRhdGEtcmFzaC1vcmlnaW5hbC1jb250ZW50PVxcXCJcIiArIG9yaWdpbmFsX2NvbnRlbnQgK1xuICAgICAgICAgICAgICBcIlxcXCI+RVJSOiBmb290bm90ZSAnXCIgKyBjdXJyZW50X2lkLnJlcGxhY2UoXCIjXCIsIFwiXCIpICsgXCInIGRvZXMgbm90IGV4aXN0PC9zcGFuPlwiKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLyogQ29tbW9uIHNlY3Rpb25zICovXG4gICAgICAgIH0gZWxzZSBpZiAoJChcInNlY3Rpb25cIiArIGN1cl9pZCkubGVuZ3RoID4gMCkge1xuICAgICAgICAgIHZhciBjdXJfY291bnQgPSAkKGN1cl9pZCkuZmluZEhpZXJhcmNoaWNhbE51bWJlcihcbiAgICAgICAgICAgIFwic2VjdGlvbjpub3QoW3JvbGU9ZG9jLWFic3RyYWN0XSk6bm90KFtyb2xlPWRvYy1iaWJsaW9ncmFwaHldKTpcIiArXG4gICAgICAgICAgICBcIm5vdChbcm9sZT1kb2MtZW5kbm90ZXNdKTpub3QoW3JvbGU9ZG9jLWZvb3Rub3Rlc10pOm5vdChbcm9sZT1kb2MtYWNrbm93bGVkZ2VtZW50c10pXCIpO1xuICAgICAgICAgIGlmIChjdXJfY291bnQgIT0gbnVsbCAmJiBjdXJfY291bnQgIT0gXCJcIikge1xuICAgICAgICAgICAgJCh0aGlzKS5odG1sKFwiPHNwYW4gY2xhc3M9XFxcImNnZW5cXFwiIGNvbnRlbnRlZGl0YWJsZT1cXFwiZmFsc2VcXFwiIGRhdGEtcmFzaC1vcmlnaW5hbC1jb250ZW50PVxcXCJcIiArIG9yaWdpbmFsX2NvbnRlbnQgK1xuICAgICAgICAgICAgICBcIlxcXCI+U2VjdGlvbiBcIiArIGN1cl9jb3VudCArIFwiPC9zcGFuPlwiKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLyogUmVmZXJlbmNlIHRvIGZpZ3VyZSBib3hlcyAqL1xuICAgICAgICB9IGVsc2UgaWYgKHJlZmVyZW5jZWRfZWxlbWVudF9maWd1cmUubGVuZ3RoID4gMCkge1xuICAgICAgICAgIHZhciBjdXJfY291bnQgPSByZWZlcmVuY2VkX2VsZW1lbnRfZmlndXJlLmZpbmROdW1iZXIoZmlndXJlYm94X3NlbGVjdG9yKTtcbiAgICAgICAgICBpZiAoY3VyX2NvdW50ICE9IDApIHtcbiAgICAgICAgICAgICQodGhpcykuaHRtbChcIjxzcGFuIGNsYXNzPVxcXCJjZ2VuXFxcIiBjb250ZW50ZWRpdGFibGU9XFxcImZhbHNlXFxcIiBkYXRhLXJhc2gtb3JpZ2luYWwtY29udGVudD1cXFwiXCIgKyBvcmlnaW5hbF9jb250ZW50ICtcbiAgICAgICAgICAgICAgXCJcXFwiPkZpZ3VyZSBcIiArIGN1cl9jb3VudCArIFwiPC9zcGFuPlwiKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLyogUmVmZXJlbmNlIHRvIHRhYmxlIGJveGVzICovXG4gICAgICAgIH0gZWxzZSBpZiAocmVmZXJlbmNlZF9lbGVtZW50X3RhYmxlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICB2YXIgY3VyX2NvdW50ID0gcmVmZXJlbmNlZF9lbGVtZW50X3RhYmxlLmZpbmROdW1iZXIodGFibGVib3hfc2VsZWN0b3IpO1xuICAgICAgICAgIGlmIChjdXJfY291bnQgIT0gMCkge1xuICAgICAgICAgICAgJCh0aGlzKS5odG1sKFwiPHNwYW4gY2xhc3M9XFxcImNnZW5cXFwiIGNvbnRlbnRlZGl0YWJsZT1cXFwiZmFsc2VcXFwiIGRhdGEtcmFzaC1vcmlnaW5hbC1jb250ZW50PVxcXCJcIiArIG9yaWdpbmFsX2NvbnRlbnQgK1xuICAgICAgICAgICAgICBcIlxcXCI+VGFibGUgXCIgKyBjdXJfY291bnQgKyBcIjwvc3Bhbj5cIik7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8qIFJlZmVyZW5jZSB0byBmb3JtdWxhIGJveGVzICovXG4gICAgICAgIH0gZWxzZSBpZiAocmVmZXJlbmNlZF9lbGVtZW50X2Zvcm11bGEubGVuZ3RoID4gMCkge1xuICAgICAgICAgIHZhciBjdXJfY291bnQgPSByZWZlcmVuY2VkX2VsZW1lbnRfZm9ybXVsYS5maW5kTnVtYmVyKGZvcm11bGFib3hfc2VsZWN0b3IpO1xuICAgICAgICAgIGlmIChjdXJfY291bnQgIT0gMCkge1xuICAgICAgICAgICAgJCh0aGlzKS5odG1sKFwiPHNwYW4gY2xhc3M9XFxcImNnZW5cXFwiIGNvbnRlbnRlZGl0YWJsZT1cXFwiZmFsc2VcXFwiIGRhdGEtcmFzaC1vcmlnaW5hbC1jb250ZW50PVxcXCJcIiArIG9yaWdpbmFsX2NvbnRlbnQgK1xuICAgICAgICAgICAgICBcIlxcXCI+Rm9ybXVsYSBcIiArIGN1cl9jb3VudCArIFwiPC9zcGFuPlwiKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLyogUmVmZXJlbmNlIHRvIGxpc3RpbmcgYm94ZXMgKi9cbiAgICAgICAgfSBlbHNlIGlmIChyZWZlcmVuY2VkX2VsZW1lbnRfbGlzdGluZy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgdmFyIGN1cl9jb3VudCA9IHJlZmVyZW5jZWRfZWxlbWVudF9saXN0aW5nLmZpbmROdW1iZXIobGlzdGluZ2JveF9zZWxlY3Rvcik7XG4gICAgICAgICAgaWYgKGN1cl9jb3VudCAhPSAwKSB7XG4gICAgICAgICAgICAkKHRoaXMpLmh0bWwoXCI8c3BhbiBjbGFzcz1cXFwiY2dlblxcXCIgY29udGVudGVkaXRhYmxlPVxcXCJmYWxzZVxcXCIgZGF0YS1yYXNoLW9yaWdpbmFsLWNvbnRlbnQ9XFxcIlwiICsgb3JpZ2luYWxfY29udGVudCArXG4gICAgICAgICAgICAgIFwiXFxcIj5MaXN0aW5nIFwiICsgY3VyX2NvdW50ICsgXCI8L3NwYW4+XCIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAkKHRoaXMpLmh0bWwoXCI8c3BhbiBjbGFzcz1cXFwiZXJyb3IgY2dlblxcXCIgY29udGVudGVkaXRhYmxlPVxcXCJmYWxzZVxcXCIgZGF0YS1yYXNoLW9yaWdpbmFsLWNvbnRlbnQ9XFxcIlwiICsgb3JpZ2luYWxfY29udGVudCArXG4gICAgICAgICAgICBcIlxcXCI+RVJSOiByZWZlcmVuY2VkIGVsZW1lbnQgJ1wiICsgY3VyX2lkLnJlcGxhY2UoXCIjXCIsIFwiXCIpICtcbiAgICAgICAgICAgIFwiJyBoYXMgbm90IHRoZSBjb3JyZWN0IHR5cGUgKGl0IHNob3VsZCBiZSBlaXRoZXIgYSBmaWd1cmUsIGEgdGFibGUsIGEgZm9ybXVsYSwgYSBsaXN0aW5nLCBvciBhIHNlY3Rpb24pPC9zcGFuPlwiKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJCh0aGlzKS5yZXBsYWNlV2l0aChcIjxzcGFuIGNsYXNzPVxcXCJlcnJvciBjZ2VuXFxcIiBjb250ZW50ZWRpdGFibGU9XFxcImZhbHNlXFxcIiBkYXRhLXJhc2gtb3JpZ2luYWwtY29udGVudD1cXFwiXCIgKyBvcmlnaW5hbF9jb250ZW50ICtcbiAgICAgICAgICBcIlxcXCI+RVJSOiByZWZlcmVuY2VkIGVsZW1lbnQgJ1wiICsgY3VyX2lkLnJlcGxhY2UoXCIjXCIsIFwiXCIpICsgXCInIGRvZXMgbm90IGV4aXN0PC9zcGFuPlwiKTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuICAvKiAvRU5EIFJlZmVyZW5jZXMgKi9cbn1cblxuZnVuY3Rpb24gdXBkYXRlUmVmZXJlbmNlcygpIHtcblxuICBpZiAoJCgnc3Bhbi5jZ2VuW2RhdGEtcmFzaC1vcmlnaW5hbC1jb250ZW50XScpLmxlbmd0aCkge1xuXG4gICAgLy8gUmVzdG9yZSBhbGwgc2F2ZWQgY29udGVudFxuICAgICQoJ3NwYW4uY2dlbltkYXRhLXJhc2gtb3JpZ2luYWwtY29udGVudF0nKS5lYWNoKGZ1bmN0aW9uICgpIHtcblxuICAgICAgLy8gU2F2ZSBvcmlnaW5hbCBjb250ZW50IGFuZCByZWZlcmVuY2VcbiAgICAgIGxldCBvcmlnaW5hbF9jb250ZW50ID0gJCh0aGlzKS5hdHRyKCdkYXRhLXJhc2gtb3JpZ2luYWwtY29udGVudCcpXG4gICAgICBsZXQgb3JpZ2luYWxfcmVmZXJlbmNlID0gJCh0aGlzKS5wYXJlbnQoJ2EnKS5hdHRyKCdocmVmJylcblxuICAgICAgJCh0aGlzKS5wYXJlbnQoJ2EnKS5yZXBsYWNlV2l0aChgPGEgY29udGVudGVkaXRhYmxlPVwiZmFsc2VcIiBocmVmPVwiJHtvcmlnaW5hbF9yZWZlcmVuY2V9XCI+JHtvcmlnaW5hbF9jb250ZW50fTwvYT5gKVxuICAgIH0pXG5cbiAgICByZWZlcmVuY2VzKClcbiAgfVxufSIsIi8qKlxuICogVGhpcyBzY3JpcHQgY29udGFpbnMgYWxsIGZpZ3VyZSBib3ggYXZhaWxhYmxlIHdpdGggUkFTSC5cbiAqIFxuICogcGx1Z2luczpcbiAqICByYWplX3RhYmxlXG4gKiAgcmFqZV9maWd1cmVcbiAqICByYWplX2Zvcm11bGFcbiAqICByYWplX2xpc3RpbmdcbiAqL1xuY29uc3QgRElTQUJMRV9TRUxFQ1RPUl9GSUdVUkVTID0gJ2ZpZ3VyZSAqLCBoMSwgaDIsIGgzLCBoNCwgaDUsIGg2J1xuXG5jb25zdCBGSUdVUkVfU0VMRUNUT1IgPSAnZmlndXJlW2lkXSdcblxuY29uc3QgRklHVVJFX1RBQkxFX1NFTEVDVE9SID0gYCR7RklHVVJFX1NFTEVDVE9SfTpoYXModGFibGUpYFxuY29uc3QgVEFCTEVfU1VGRklYID0gJ3RhYmxlXydcblxuY29uc3QgRklHVVJFX0lNQUdFX1NFTEVDVE9SID0gYCR7RklHVVJFX1NFTEVDVE9SfTpoYXMoaW1nOm5vdChbcm9sZT1tYXRoXSkpYFxuY29uc3QgSU1BR0VfU1VGRklYID0gJ2ltZ18nXG5cbmNvbnN0IEZJR1VSRV9GT1JNVUxBX1NFTEVDVE9SID0gYCR7RklHVVJFX1NFTEVDVE9SfTpoYXMoc3ZnW3JvbGU9bWF0aF0pYFxuY29uc3QgSU5MSU5FX0ZPUk1VTEFfU0VMRUNUT1IgPSBgc3BhbjpoYXMoc3ZnW3JvbGU9bWF0aF0pYFxuY29uc3QgRk9STVVMQV9TVUZGSVggPSAnZm9ybXVsYV8nXG5cbmNvbnN0IEZJR1VSRV9MSVNUSU5HX1NFTEVDVE9SID0gYCR7RklHVVJFX1NFTEVDVE9SfTpoYXMocHJlOmhhcyhjb2RlKSlgXG5jb25zdCBMSVNUSU5HX1NVRkZJWCA9ICdsaXN0aW5nXydcblxubGV0IHJlbW92ZV9saXN0aW5nID0gMFxuXG4vKipcbiAqIFJhamVfdGFibGVcbiAqL1xudGlueW1jZS5QbHVnaW5NYW5hZ2VyLmFkZCgncmFqZV90YWJsZScsIGZ1bmN0aW9uIChlZGl0b3IsIHVybCkge1xuXG4gIC8vIEFkZCBhIGJ1dHRvbiB0aGF0IGhhbmRsZSB0aGUgaW5saW5lIGVsZW1lbnRcbiAgZWRpdG9yLmFkZEJ1dHRvbigncmFqZV90YWJsZScsIHtcbiAgICB0aXRsZTogJ3JhamVfdGFibGUnLFxuICAgIGljb246ICdpY29uLXRhYmxlJyxcbiAgICB0b29sdGlwOiAnVGFibGUnLFxuICAgIGRpc2FibGVkU3RhdGVTZWxlY3RvcjogRElTQUJMRV9TRUxFQ1RPUl9GSUdVUkVTLFxuXG4gICAgLy8gQnV0dG9uIGJlaGF2aW91clxuICAgIG9uY2xpY2s6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgLy8gT24gY2xpY2sgYSBkaWFsb2cgaXMgb3BlbmVkXG4gICAgICBlZGl0b3Iud2luZG93TWFuYWdlci5vcGVuKHtcbiAgICAgICAgdGl0bGU6ICdTZWxlY3QgVGFibGUgc2l6ZScsXG4gICAgICAgIGJvZHk6IFt7XG4gICAgICAgICAgdHlwZTogJ3RleHRib3gnLFxuICAgICAgICAgIG5hbWU6ICd3aWR0aCcsXG4gICAgICAgICAgbGFiZWw6ICdDb2x1bW5zJ1xuICAgICAgICB9LCB7XG4gICAgICAgICAgdHlwZTogJ3RleHRib3gnLFxuICAgICAgICAgIG5hbWU6ICdoZWlndGgnLFxuICAgICAgICAgIGxhYmVsOiAnUm93cydcbiAgICAgICAgfV0sXG4gICAgICAgIG9uU3VibWl0OiBmdW5jdGlvbiAoZSkge1xuXG4gICAgICAgICAgLy8gR2V0IHdpZHRoIGFuZCBoZWlndGhcbiAgICAgICAgICB0YWJsZS5hZGQoZS5kYXRhLndpZHRoLCBlLmRhdGEuaGVpZ3RoKVxuICAgICAgICB9XG4gICAgICB9KVxuICAgIH1cbiAgfSlcblxuICAvLyBCZWNhdXNlIHNvbWUgYmVoYXZpb3VycyBhcmVuJ3QgYWNjZXB0ZWQsIFJBSkUgbXVzdCBjaGVjayBzZWxlY3Rpb24gYW5kIGFjY2VwdCBiYWNrc3BhY2UsIGNhbmMgYW5kIGVudGVyIHByZXNzXG4gIGVkaXRvci5vbigna2V5RG93bicsIGZ1bmN0aW9uIChlKSB7XG5cbiAgICAvLyBrZXlDb2RlIDggaXMgYmFja3NwYWNlLCA0NiBpcyBjYW5jXG4gICAgaWYgKGUua2V5Q29kZSA9PSA4KVxuICAgICAgcmV0dXJuIGhhbmRsZUZpZ3VyZURlbGV0ZSh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24pXG5cbiAgICBpZiAoZS5rZXlDb2RlID09IDQ2KVxuICAgICAgcmV0dXJuIGhhbmRsZUZpZ3VyZUNhbmModGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uKVxuXG4gICAgLy8gSGFuZGxlIGVudGVyIGtleSBpbiBmaWdjYXB0aW9uXG4gICAgaWYgKGUua2V5Q29kZSA9PSAxMylcbiAgICAgIHJldHVybiBoYW5kbGVGaWd1cmVFbnRlcih0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24pXG5cbiAgICBlLnN0b3BQcm9wYWdhdGlvbigpXG4gIH0pXG5cbiAgLy8gSGFuZGxlIHN0cmFuZ2Ugc3RydWN0dXJhbCBtb2RpZmljYXRpb24gZW1wdHkgZmlndXJlcyBvciB3aXRoIGNhcHRpb24gYXMgZmlyc3QgY2hpbGRcbiAgZWRpdG9yLm9uKCdub2RlQ2hhbmdlJywgZnVuY3Rpb24gKGUpIHtcbiAgICBoYW5kbGVGaWd1cmVDaGFuZ2UodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uKVxuICB9KVxuXG4gIHRhYmxlID0ge1xuXG4gICAgLyoqXG4gICAgICogQWRkIHRoZSBuZXcgdGFibGUgKHdpdGggZ2l2ZW4gc2l6ZSkgYXQgdGhlIGNhcmV0IHBvc2l0aW9uXG4gICAgICovXG4gICAgYWRkOiBmdW5jdGlvbiAod2lkdGgsIGhlaWd0aCkge1xuXG4gICAgICAvLyBHZXQgdGhlIHJlZmVyZW5jZSBvZiB0aGUgY3VycmVudCBzZWxlY3RlZCBlbGVtZW50XG4gICAgICBsZXQgc2VsZWN0ZWRFbGVtZW50ID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuXG4gICAgICAvLyBHZXQgdGhlIHJlZmVyZW5jZSBvZiB0aGUgbmV3IGNyZWF0ZWQgdGFibGVcbiAgICAgIGxldCBuZXdUYWJsZSA9IHRoaXMuY3JlYXRlKHdpZHRoLCBoZWlndGgsIGdldFN1Y2Nlc3NpdmVFbGVtZW50SWQoRklHVVJFX1RBQkxFX1NFTEVDVE9SLCBUQUJMRV9TVUZGSVgpKVxuXG4gICAgICAvLyBCZWdpbiBhdG9taWMgVU5ETyBsZXZlbCBcbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAvLyBDaGVjayBpZiB0aGUgc2VsZWN0ZWQgZWxlbWVudCBpcyBub3QgZW1wdHksIGFuZCBhZGQgdGFibGUgYWZ0ZXJcbiAgICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC50ZXh0KCkudHJpbSgpLmxlbmd0aCAhPSAwKSB7XG5cbiAgICAgICAgICAvLyBJZiBzZWxlY3Rpb24gaXMgYXQgc3RhcnQgb2YgdGhlIHNlbGVjdGVkIGVsZW1lbnRcbiAgICAgICAgICBpZiAodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldFJuZygpLnN0YXJ0T2Zmc2V0ID09IDApXG4gICAgICAgICAgICBzZWxlY3RlZEVsZW1lbnQuYmVmb3JlKG5ld1RhYmxlKVxuXG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgc2VsZWN0ZWRFbGVtZW50LmFmdGVyKG5ld1RhYmxlKVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gSWYgc2VsZWN0ZWQgZWxlbWVudCBpcyBlbXB0eSwgcmVwbGFjZSBpdCB3aXRoIHRoZSBuZXcgdGFibGVcbiAgICAgICAgZWxzZVxuICAgICAgICAgIHNlbGVjdGVkRWxlbWVudC5yZXBsYWNlV2l0aChuZXdUYWJsZSlcblxuICAgICAgICAvLyBTYXZlIHVwZGF0ZXMgXG4gICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuXG4gICAgICAgIC8vIFVwZGF0ZSBhbGwgY2FwdGlvbnMgd2l0aCBSQVNIIGZ1bmN0aW9uXG4gICAgICAgIGNhcHRpb25zKClcblxuICAgICAgICAvLyBVcGRhdGUgUmVuZGVyZWQgUkFTSFxuICAgICAgICB1cGRhdGVJZnJhbWVGcm9tU2F2ZWRDb250ZW50KClcbiAgICAgIH0pXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSB0aGUgbmV3IHRhYmxlIHVzaW5nIHBhc3NlZCB3aWR0aCBhbmQgaGVpZ2h0XG4gICAgICovXG4gICAgY3JlYXRlOiBmdW5jdGlvbiAod2lkdGgsIGhlaWdodCwgaWQpIHtcblxuICAgICAgLy8gSWYgd2lkdGggYW5kIGhlaWd0aCBhcmUgcG9zaXRpdmVcbiAgICAgIHRyeSB7XG4gICAgICAgIGlmICh3aWR0aCA+IDAgJiYgaGVpZ2h0ID4gMCkge1xuXG4gICAgICAgICAgLy8gQ3JlYXRlIGZpZ3VyZSBhbmQgdGFibGVcbiAgICAgICAgICBsZXQgZmlndXJlID0gJChgPGZpZ3VyZSBpZD1cIiR7aWR9XCI+PC9maWd1cmU+YClcbiAgICAgICAgICBsZXQgdGFibGUgPSAkKGA8dGFibGU+PC90YWJsZT5gKVxuXG4gICAgICAgICAgLy8gUG9wdWxhdGUgd2l0aCB3aWR0aCAmIGhlaWd0aFxuICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDw9IGhlaWdodDsgaSsrKSB7XG5cbiAgICAgICAgICAgIGxldCByb3cgPSAkKGA8dHI+PC90cj5gKVxuICAgICAgICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB3aWR0aDsgeCsrKSB7XG5cbiAgICAgICAgICAgICAgaWYgKGkgPT0gMClcbiAgICAgICAgICAgICAgICByb3cuYXBwZW5kKGA8dGg+SGVhZGluZyBjZWxsICR7eCsxfTwvdGg+YClcblxuICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgcm93LmFwcGVuZChgPHRkPjxwPkRhdGEgY2VsbCAke3grMX08L3A+PC90ZD5gKVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0YWJsZS5hcHBlbmQocm93KVxuICAgICAgICAgIH1cblxuICAgICAgICAgIGZpZ3VyZS5hcHBlbmQodGFibGUpXG4gICAgICAgICAgZmlndXJlLmFwcGVuZChgPGZpZ2NhcHRpb24+Q2FwdGlvbi48L2ZpZ2NhcHRpb24+YClcblxuICAgICAgICAgIHJldHVybiBmaWd1cmVcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZSkge31cbiAgICB9XG4gIH1cbn0pXG5cbi8qKlxuICogUmFqZV9maWd1cmVcbiAqL1xudGlueW1jZS5QbHVnaW5NYW5hZ2VyLmFkZCgncmFqZV9pbWFnZScsIGZ1bmN0aW9uIChlZGl0b3IsIHVybCkge1xuXG4gIC8vIEFkZCBhIGJ1dHRvbiB0aGF0IGhhbmRsZSB0aGUgaW5saW5lIGVsZW1lbnRcbiAgZWRpdG9yLmFkZEJ1dHRvbigncmFqZV9pbWFnZScsIHtcbiAgICB0aXRsZTogJ3JhamVfaW1hZ2UnLFxuICAgIGljb246ICdpY29uLWltYWdlJyxcbiAgICB0b29sdGlwOiAnSW1hZ2UgYmxvY2snLFxuICAgIGRpc2FibGVkU3RhdGVTZWxlY3RvcjogRElTQUJMRV9TRUxFQ1RPUl9GSUdVUkVTLFxuXG4gICAgLy8gQnV0dG9uIGJlaGF2aW91clxuICAgIG9uY2xpY2s6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgbGV0IGZpbGVuYW1lID0gc2VsZWN0SW1hZ2UoKVxuXG4gICAgICBpZiAoZmlsZW5hbWUgIT0gbnVsbClcbiAgICAgICAgaW1hZ2UuYWRkKGZpbGVuYW1lLCBmaWxlbmFtZSlcbiAgICB9XG4gIH0pXG5cbiAgLy8gQmVjYXVzZSBzb21lIGJlaGF2aW91cnMgYXJlbid0IGFjY2VwdGVkLCBSQUpFIG11c3QgY2hlY2sgc2VsZWN0aW9uIGFuZCBhY2NlcHQgYmFja3NwYWNlLCBjYW5jIGFuZCBlbnRlciBwcmVzc1xuICBlZGl0b3Iub24oJ2tleURvd24nLCBmdW5jdGlvbiAoZSkge1xuXG4gICAgLy8ga2V5Q29kZSA4IGlzIGJhY2tzcGFjZVxuICAgIGlmIChlLmtleUNvZGUgPT0gOClcbiAgICAgIHJldHVybiBoYW5kbGVGaWd1cmVEZWxldGUodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uKVxuXG4gICAgaWYgKGUua2V5Q29kZSA9PSA0NilcbiAgICAgIHJldHVybiBoYW5kbGVGaWd1cmVDYW5jKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbilcblxuICAgIC8vIEhhbmRsZSBlbnRlciBrZXkgaW4gZmlnY2FwdGlvblxuICAgIGlmIChlLmtleUNvZGUgPT0gMTMpXG4gICAgICByZXR1cm4gaGFuZGxlRmlndXJlRW50ZXIodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uKVxuICB9KVxuXG4gIGltYWdlID0ge1xuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgYWRkOiBmdW5jdGlvbiAodXJsLCBhbHQpIHtcblxuICAgICAgLy8gR2V0IHRoZSByZWZlcmVjZSBvZiB0aGUgc2VsZWN0ZWQgZWxlbWVudFxuICAgICAgbGV0IHNlbGVjdGVkRWxlbWVudCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcbiAgICAgIGxldCBuZXdGaWd1cmUgPSB0aGlzLmNyZWF0ZSh1cmwsIGFsdCwgZ2V0U3VjY2Vzc2l2ZUVsZW1lbnRJZChGSUdVUkVfSU1BR0VfU0VMRUNUT1IsIElNQUdFX1NVRkZJWCkpXG5cbiAgICAgIC8vIEJlZ2luIGF0b21pYyBVTkRPIGxldmVsIFxuICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIC8vIENoZWNrIGlmIHRoZSBzZWxlY3RlZCBlbGVtZW50IGlzIG5vdCBlbXB0eSwgYW5kIGFkZCB0YWJsZSBhZnRlclxuICAgICAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LnRleHQoKS50cmltKCkubGVuZ3RoICE9IDApIHtcblxuICAgICAgICAgIC8vIElmIHNlbGVjdGlvbiBpcyBhdCBzdGFydCBvZiB0aGUgc2VsZWN0ZWQgZWxlbWVudFxuICAgICAgICAgIGlmICh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Um5nKCkuc3RhcnRPZmZzZXQgPT0gMClcbiAgICAgICAgICAgIHNlbGVjdGVkRWxlbWVudC5iZWZvcmUobmV3RmlndXJlKVxuXG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgc2VsZWN0ZWRFbGVtZW50LmFmdGVyKG5ld0ZpZ3VyZSlcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIElmIHNlbGVjdGVkIGVsZW1lbnQgaXMgZW1wdHksIHJlcGxhY2UgaXQgd2l0aCB0aGUgbmV3IHRhYmxlXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBzZWxlY3RlZEVsZW1lbnQucmVwbGFjZVdpdGgobmV3RmlndXJlKVxuXG4gICAgICAgIC8vIFNhdmUgdXBkYXRlcyBcbiAgICAgICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG5cbiAgICAgICAgLy8gVXBkYXRlIGFsbCBjYXB0aW9ucyB3aXRoIFJBU0ggZnVuY3Rpb25cbiAgICAgICAgY2FwdGlvbnMoKVxuXG4gICAgICAgIC8vIFVwZGF0ZSBSZW5kZXJlZCBSQVNIXG4gICAgICAgIHVwZGF0ZUlmcmFtZUZyb21TYXZlZENvbnRlbnQoKVxuICAgICAgfSlcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgY3JlYXRlOiBmdW5jdGlvbiAodXJsLCBhbHQsIGlkKSB7XG4gICAgICByZXR1cm4gJChgPGZpZ3VyZSBpZD1cIiR7aWR9XCI+PHA+PGltZyBzcmM9XCIke3VybH1cIiAke2FsdD8nYWx0PVwiJythbHQrJ1wiJzonJ30gLz48L3A+PGZpZ2NhcHRpb24+Q2FwdGlvbi48L2ZpZ2NhcHRpb24+PC9maWd1cmU+YClcbiAgICB9XG4gIH1cbn0pXG5cbi8qKlxuICogUmFqZV9mb3JtdWxhXG4gKi9cblxuZnVuY3Rpb24gb3BlbkZvcm11bGFFZGl0b3IoZm9ybXVsYVZhbHVlLCBjYWxsYmFjaykge1xuICB0aW55bWNlLmFjdGl2ZUVkaXRvci53aW5kb3dNYW5hZ2VyLm9wZW4oe1xuICAgICAgdGl0bGU6ICdNYXRoIGZvcm11bGEgZWRpdG9yJyxcbiAgICAgIHVybDogJ2pzL3JhamUtY29yZS9wbHVnaW4vcmFqZV9mb3JtdWxhLmh0bWwnLFxuICAgICAgd2lkdGg6IDgwMCxcbiAgICAgIGhlaWdodDogNTAwLFxuICAgICAgb25DbG9zZTogZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIGxldCBvdXRwdXQgPSB0aW55bWNlLmFjdGl2ZUVkaXRvci5mb3JtdWxhX291dHB1dFxuXG4gICAgICAgIC8vIElmIGF0IGxlYXN0IGZvcm11bGEgaXMgd3JpdHRlblxuICAgICAgICBpZiAob3V0cHV0ICE9IG51bGwpIHtcblxuICAgICAgICAgIC8vIElmIGhhcyBpZCwgUkFKRSBtdXN0IHVwZGF0ZSBpdFxuICAgICAgICAgIGlmIChvdXRwdXQuZm9ybXVsYV9pZClcbiAgICAgICAgICAgIGZvcm11bGEudXBkYXRlKG91dHB1dC5mb3JtdWxhX3N2Zywgb3V0cHV0LmZvcm11bGFfaWQpXG5cbiAgICAgICAgICAvLyBPciBhZGQgaXQgbm9ybWFsbHlcbiAgICAgICAgICBlbHNlXG4gICAgICAgICAgICBmb3JtdWxhLmFkZChvdXRwdXQuZm9ybXVsYV9zdmcpXG5cbiAgICAgICAgICAvLyBTZXQgZm9ybXVsYSBudWxsXG4gICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IuZm9ybXVsYV9vdXRwdXQgPSBudWxsXG4gICAgICAgIH1cblxuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci53aW5kb3dNYW5hZ2VyLmNsb3NlKClcbiAgICAgIH1cbiAgICB9LFxuICAgIGZvcm11bGFWYWx1ZVxuICApXG59XG5cbnRpbnltY2UuUGx1Z2luTWFuYWdlci5hZGQoJ3JhamVfZm9ybXVsYScsIGZ1bmN0aW9uIChlZGl0b3IsIHVybCkge1xuXG4gIC8vIEFkZCBhIGJ1dHRvbiB0aGF0IGhhbmRsZSB0aGUgaW5saW5lIGVsZW1lbnRcbiAgZWRpdG9yLmFkZEJ1dHRvbigncmFqZV9mb3JtdWxhJywge1xuICAgIHRleHQ6ICdyYWplX2Zvcm11bGEnLFxuICAgIGljb246IGZhbHNlLFxuICAgIHRvb2x0aXA6ICdGb3JtdWxhJyxcbiAgICBkaXNhYmxlZFN0YXRlU2VsZWN0b3I6IERJU0FCTEVfU0VMRUNUT1JfRklHVVJFUyxcblxuICAgIC8vIEJ1dHRvbiBiZWhhdmlvdXJcbiAgICBvbmNsaWNrOiBmdW5jdGlvbiAoKSB7XG4gICAgICBvcGVuRm9ybXVsYUVkaXRvcigpXG4gICAgfVxuICB9KVxuXG4gIC8vIEJlY2F1c2Ugc29tZSBiZWhhdmlvdXJzIGFyZW4ndCBhY2NlcHRlZCwgUkFKRSBtdXN0IGNoZWNrIHNlbGVjdGlvbiBhbmQgYWNjZXB0IGJhY2tzcGFjZSwgY2FuYyBhbmQgZW50ZXIgcHJlc3NcbiAgZWRpdG9yLm9uKCdrZXlEb3duJywgZnVuY3Rpb24gKGUpIHtcblxuICAgIC8vIGtleUNvZGUgOCBpcyBiYWNrc3BhY2VcbiAgICBpZiAoZS5rZXlDb2RlID09IDgpXG4gICAgICByZXR1cm4gaGFuZGxlRmlndXJlRGVsZXRlKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbilcblxuICAgIGlmIChlLmtleUNvZGUgPT0gNDYpXG4gICAgICByZXR1cm4gaGFuZGxlRmlndXJlQ2FuYyh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24pXG5cbiAgICAvLyBIYW5kbGUgZW50ZXIga2V5IGluIGZpZ2NhcHRpb25cbiAgICBpZiAoZS5rZXlDb2RlID09IDEzKVxuICAgICAgcmV0dXJuIGhhbmRsZUZpZ3VyZUVudGVyKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbilcbiAgfSlcblxuICBlZGl0b3Iub24oJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcbiAgICBsZXQgc2VsZWN0ZWRFbGVtZW50ID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuXG4gICAgLy8gT3BlbiBmb3JtdWxhIGVkaXRvciBjbGlja2luZyBvbiBtYXRoIGZvcm11bGFzXG4gICAgaWYgKHNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKEZJR1VSRV9TRUxFQ1RPUikubGVuZ3RoICYmIHNlbGVjdGVkRWxlbWVudC5jaGlsZHJlbignc3ZnW3JvbGU9bWF0aF0nKS5sZW5ndGgpIHtcblxuICAgICAgb3BlbkZvcm11bGFFZGl0b3Ioe1xuICAgICAgICBmb3JtdWxhX3ZhbDogc2VsZWN0ZWRFbGVtZW50LmNoaWxkcmVuKCdzdmdbcm9sZT1tYXRoXScpLmF0dHIoJ2RhdGEtbWF0aC1vcmlnaW5hbC1pbnB1dCcpLFxuICAgICAgICBmb3JtdWxhX2lkOiBzZWxlY3RlZEVsZW1lbnQucGFyZW50cyhGSUdVUkVfU0VMRUNUT1IpLmF0dHIoJ2lkJylcbiAgICAgIH0pXG4gICAgfVxuICB9KVxuXG4gIGZvcm11bGEgPSB7XG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgYWRkOiBmdW5jdGlvbiAoZm9ybXVsYV9zdmcpIHtcblxuICAgICAgbGV0IHNlbGVjdGVkRWxlbWVudCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcbiAgICAgIGxldCBuZXdGb3JtdWxhID0gdGhpcy5jcmVhdGUoZm9ybXVsYV9zdmcsIGdldFN1Y2Nlc3NpdmVFbGVtZW50SWQoYCR7RklHVVJFX0ZPUk1VTEFfU0VMRUNUT1J9LCR7SU5MSU5FX0ZPUk1VTEFfU0VMRUNUT1J9YCwgRk9STVVMQV9TVUZGSVgpKVxuXG4gICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIHNlbGVjdGVkIGVsZW1lbnQgaXMgbm90IGVtcHR5LCBhbmQgYWRkIHRhYmxlIGFmdGVyXG4gICAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQudGV4dCgpLnRyaW0oKS5sZW5ndGggIT0gMClcbiAgICAgICAgICBzZWxlY3RlZEVsZW1lbnQuYWZ0ZXIobmV3Rm9ybXVsYSlcblxuICAgICAgICAvLyBJZiBzZWxlY3RlZCBlbGVtZW50IGlzIGVtcHR5LCByZXBsYWNlIGl0IHdpdGggdGhlIG5ldyB0YWJsZVxuICAgICAgICBlbHNlXG4gICAgICAgICAgc2VsZWN0ZWRFbGVtZW50LnJlcGxhY2VXaXRoKG5ld0Zvcm11bGEpXG5cbiAgICAgICAgLy8gU2F2ZSB1cGRhdGVzIFxuICAgICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcblxuICAgICAgICBjYXB0aW9ucygpXG5cbiAgICAgICAgLy8gVXBkYXRlIFJlbmRlcmVkIFJBU0hcbiAgICAgICAgdXBkYXRlSWZyYW1lRnJvbVNhdmVkQ29udGVudCgpXG4gICAgICB9KVxuXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIHVwZGF0ZTogZnVuY3Rpb24gKGZvcm11bGFfc3ZnLCBmb3JtdWxhX2lkKSB7XG5cbiAgICAgIGxldCBzZWxlY3RlZEZpZ3VyZSA9ICQoYCMke2Zvcm11bGFfaWR9YClcblxuICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIHNlbGVjdGVkRmlndXJlLmZpbmQoJ3N2ZycpLnJlcGxhY2VXaXRoKGZvcm11bGFfc3ZnKVxuICAgICAgICB1cGRhdGVJZnJhbWVGcm9tU2F2ZWRDb250ZW50KClcbiAgICAgIH0pXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIGNyZWF0ZTogZnVuY3Rpb24gKGZvcm11bGFfc3ZnLCBpZCkge1xuICAgICAgLy9yZXR1cm4gYDxmaWd1cmUgaWQ9XCIke2lkfVwiPjxwPjxzcGFuIHJvbGU9XCJtYXRoXCIgY29udGVudGVkaXRhYmxlPVwiZmFsc2VcIj5cXGBcXGAke2Zvcm11bGFfaW5wdXR9XFxgXFxgPC9zcGFuPjwvcD48L2ZpZ3VyZT5gXG4gICAgICByZXR1cm4gYDxmaWd1cmUgaWQ9XCIke2lkfVwiPjxwPjxzcGFuIGNvbnRlbnRlZGl0YWJsZT1cImZhbHNlXCI+JHtmb3JtdWxhX3N2Z1swXS5vdXRlckhUTUx9PC9zcGFuPjwvcD48L2ZpZ3VyZT5gXG4gICAgfVxuICB9XG59KVxuXG5mdW5jdGlvbiBvcGVuSW5saW5lRm9ybXVsYUVkaXRvcihmb3JtdWxhVmFsdWUsIGNhbGxiYWNrKSB7XG4gIHRpbnltY2UuYWN0aXZlRWRpdG9yLndpbmRvd01hbmFnZXIub3Blbih7XG4gICAgICB0aXRsZTogJ01hdGggZm9ybXVsYSBlZGl0b3InLFxuICAgICAgdXJsOiAnanMvcmFqZW1jZS9wbHVnaW4vcmFqZV9mb3JtdWxhLmh0bWwnLFxuICAgICAgd2lkdGg6IDgwMCxcbiAgICAgIGhlaWdodDogNTAwLFxuICAgICAgb25DbG9zZTogZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIGxldCBvdXRwdXQgPSB0aW55bWNlLmFjdGl2ZUVkaXRvci5mb3JtdWxhX291dHB1dFxuXG4gICAgICAgIC8vIElmIGF0IGxlYXN0IGZvcm11bGEgaXMgd3JpdHRlblxuICAgICAgICBpZiAob3V0cHV0ICE9IG51bGwpIHtcblxuICAgICAgICAgIC8vIElmIGhhcyBpZCwgUkFKRSBtdXN0IHVwZGF0ZSBpdFxuICAgICAgICAgIGlmIChvdXRwdXQuZm9ybXVsYV9pZClcbiAgICAgICAgICAgIGlubGluZV9mb3JtdWxhLnVwZGF0ZShvdXRwdXQuZm9ybXVsYV9zdmcsIG91dHB1dC5mb3JtdWxhX2lkKVxuXG4gICAgICAgICAgLy8gT3IgYWRkIGl0IG5vcm1hbGx5XG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgaW5saW5lX2Zvcm11bGEuYWRkKG91dHB1dC5mb3JtdWxhX3N2ZylcblxuICAgICAgICAgIC8vIFNldCBmb3JtdWxhIG51bGxcbiAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5mb3JtdWxhX291dHB1dCA9IG51bGxcbiAgICAgICAgfVxuXG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLndpbmRvd01hbmFnZXIuY2xvc2UoKVxuICAgICAgfVxuICAgIH0sXG4gICAgZm9ybXVsYVZhbHVlXG4gIClcbn1cblxudGlueW1jZS5QbHVnaW5NYW5hZ2VyLmFkZCgncmFqZV9pbmxpbmVfZm9ybXVsYScsIGZ1bmN0aW9uIChlZGl0b3IsIHVybCkge1xuXG4gIGVkaXRvci5hZGRCdXR0b24oJ3JhamVfaW5saW5lX2Zvcm11bGEnLCB7XG4gICAgaWNvbjogJ2ljb24taW5saW5lLWZvcm11bGEnLFxuICAgIHRvb2x0aXA6ICdJbmxpbmUgZm9ybXVsYScsXG4gICAgZGlzYWJsZWRTdGF0ZVNlbGVjdG9yOiBESVNBQkxFX1NFTEVDVE9SX0ZJR1VSRVMsXG5cbiAgICAvLyBCdXR0b24gYmVoYXZpb3VyXG4gICAgb25jbGljazogZnVuY3Rpb24gKCkge1xuICAgICAgb3BlbklubGluZUZvcm11bGFFZGl0b3IoKVxuICAgIH1cbiAgfSlcblxuICBlZGl0b3Iub24oJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcbiAgICBsZXQgc2VsZWN0ZWRFbGVtZW50ID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuXG4gICAgLy8gT3BlbiBmb3JtdWxhIGVkaXRvciBjbGlja2luZyBvbiBtYXRoIGZvcm11bGFzXG4gICAgaWYgKHNlbGVjdGVkRWxlbWVudC5jaGlsZHJlbignc3ZnW3JvbGU9bWF0aF0nKS5sZW5ndGgpIHtcblxuICAgICAgb3BlbklubGluZUZvcm11bGFFZGl0b3Ioe1xuICAgICAgICBmb3JtdWxhX3ZhbDogc2VsZWN0ZWRFbGVtZW50LmNoaWxkcmVuKCdzdmdbcm9sZT1tYXRoXScpLmF0dHIoJ2RhdGEtbWF0aC1vcmlnaW5hbC1pbnB1dCcpLFxuICAgICAgICBmb3JtdWxhX2lkOiBzZWxlY3RlZEVsZW1lbnQuYXR0cignaWQnKVxuICAgICAgfSlcbiAgICB9XG4gIH0pXG5cbiAgaW5saW5lX2Zvcm11bGEgPSB7XG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgYWRkOiBmdW5jdGlvbiAoZm9ybXVsYV9zdmcpIHtcblxuICAgICAgbGV0IHNlbGVjdGVkRWxlbWVudCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcbiAgICAgIGxldCBuZXdGb3JtdWxhID0gdGhpcy5jcmVhdGUoZm9ybXVsYV9zdmcsIGdldFN1Y2Nlc3NpdmVFbGVtZW50SWQoYCR7RklHVVJFX0ZPUk1VTEFfU0VMRUNUT1J9LCR7SU5MSU5FX0ZPUk1VTEFfU0VMRUNUT1J9YCwgRk9STVVMQV9TVUZGSVgpKVxuXG4gICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLnNldENvbnRlbnQobmV3Rm9ybXVsYSlcblxuICAgICAgICAvLyBTYXZlIHVwZGF0ZXMgXG4gICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuXG4gICAgICAgIGNhcHRpb25zKClcblxuICAgICAgICAvLyBVcGRhdGUgUmVuZGVyZWQgUkFTSFxuICAgICAgICB1cGRhdGVJZnJhbWVGcm9tU2F2ZWRDb250ZW50KClcbiAgICAgIH0pXG5cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgdXBkYXRlOiBmdW5jdGlvbiAoZm9ybXVsYV9zdmcsIGZvcm11bGFfaWQpIHtcblxuICAgICAgbGV0IHNlbGVjdGVkRmlndXJlID0gJChgIyR7Zm9ybXVsYV9pZH1gKVxuXG4gICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgc2VsZWN0ZWRGaWd1cmUuZmluZCgnc3ZnJykucmVwbGFjZVdpdGgoZm9ybXVsYV9zdmcpXG4gICAgICAgIHVwZGF0ZUlmcmFtZUZyb21TYXZlZENvbnRlbnQoKVxuICAgICAgfSlcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgY3JlYXRlOiBmdW5jdGlvbiAoZm9ybXVsYV9zdmcsIGlkKSB7XG4gICAgICByZXR1cm4gYDxzcGFuIGlkPVwiJHtpZH1cIiBjb250ZW50ZWRpdGFibGU9XCJmYWxzZVwiPiR7Zm9ybXVsYV9zdmdbMF0ub3V0ZXJIVE1MfTwvc3Bhbj5gXG4gICAgfVxuICB9XG59KVxuXG4vKipcbiAqIFJhamVfbGlzdGluZ1xuICovXG50aW55bWNlLlBsdWdpbk1hbmFnZXIuYWRkKCdyYWplX2xpc3RpbmcnLCBmdW5jdGlvbiAoZWRpdG9yLCB1cmwpIHtcblxuICAvLyBBZGQgYSBidXR0b24gdGhhdCBoYW5kbGUgdGhlIGlubGluZSBlbGVtZW50XG4gIGVkaXRvci5hZGRCdXR0b24oJ3JhamVfbGlzdGluZycsIHtcbiAgICB0aXRsZTogJ3JhamVfbGlzdGluZycsXG4gICAgaWNvbjogJ2ljb24tbGlzdGluZycsXG4gICAgdG9vbHRpcDogJ0xpc3RpbmcnLFxuICAgIGRpc2FibGVkU3RhdGVTZWxlY3RvcjogRElTQUJMRV9TRUxFQ1RPUl9GSUdVUkVTLFxuXG4gICAgLy8gQnV0dG9uIGJlaGF2aW91clxuICAgIG9uY2xpY2s6IGZ1bmN0aW9uICgpIHtcbiAgICAgIGxpc3RpbmcuYWRkKClcbiAgICB9XG4gIH0pXG5cblxuXG4gIC8vIEJlY2F1c2Ugc29tZSBiZWhhdmlvdXJzIGFyZW4ndCBhY2NlcHRlZCwgUkFKRSBtdXN0IGNoZWNrIHNlbGVjdGlvbiBhbmQgYWNjZXB0IGJhY2tzcGFjZSwgY2FuYyBhbmQgZW50ZXIgcHJlc3NcbiAgZWRpdG9yLm9uKCdrZXlEb3duJywgZnVuY3Rpb24gKGUpIHtcblxuICAgIGxldCBzZWxlY3RlZEVsZW1lbnQgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG4gICAgaWYgKHNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKCdmaWd1cmU6aGFzKHByZTpoYXMoY29kZSkpJykubGVuZ3RoKSB7XG5cbiAgICAgIC8qKlxuICAgICAgICogUHJvcGVyIGxpc3RpbmcgZWRpdG9yIGJlaGF2aW91clxuICAgICAgICovXG4gICAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LmlzKCdjb2RlJykpIHtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRU5URVJcbiAgICAgICAgICovXG4gICAgICAgIGlmIChlLmtleUNvZGUgPT0gMTMpIHtcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgICByZXR1cm4gbGlzdGluZy5zZXRDb250ZW50KGBcXG4ke1pFUk9fU1BBQ0V9YClcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBUQUJcbiAgICAgICAgICovXG4gICAgICAgIGlmIChlLmtleUNvZGUgPT0gOSkge1xuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgICAgIHJldHVybiBsaXN0aW5nLnNldENvbnRlbnQoYFxcdGApXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKGUua2V5Q29kZSA9PSAxMylcbiAgICAgICAgcmV0dXJuIGhhbmRsZUZpZ3VyZUVudGVyKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbilcblxuICAgICAgLy8ga2V5Q29kZSA4IGlzIGJhY2tzcGFjZVxuICAgICAgaWYgKGUua2V5Q29kZSA9PSA4KVxuICAgICAgICByZXR1cm4gaGFuZGxlRmlndXJlRGVsZXRlKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbilcblxuICAgICAgLypcbiAgICAgIC8vIGtleUNvZGUgOCBpcyBiYWNrc3BhY2VcbiAgICAgIGlmIChlLmtleUNvZGUgPT0gOClcbiAgICAgICAgcmV0dXJuIGhhbmRsZUZpZ3VyZURlbGV0ZSh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24pXG5cbiAgICAgIGlmIChlLmtleUNvZGUgPT0gNDYpXG4gICAgICAgIHJldHVybiBoYW5kbGVGaWd1cmVDYW5jKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbilcblxuICAgICAgLy8gSGFuZGxlIGVudGVyIGtleSBpbiBmaWdjYXB0aW9uXG4gICAgICBpZiAoZS5rZXlDb2RlID09IDEzKVxuICAgICAgICByZXR1cm4gaGFuZGxlRmlndXJlRW50ZXIodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uKVxuICAgICAgICAqL1xuICAgIH1cbiAgICAvKlxuICAgIGlmIChlLmtleUNvZGUgPT0gOSkge1xuICAgICAgaWYgKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5pc0NvbGxhcHNlZCgpICYmICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSkucGFyZW50cyhgY29kZSwke0ZJR1VSRV9TRUxFQ1RPUn1gKS5sZW5ndGgpIHtcbiAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLnNldENvbnRlbnQoJ1xcdCcpXG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChlLmtleUNvZGUgPT0gMzcpIHtcbiAgICAgIGxldCByYW5nZSA9IHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRSbmcoKVxuICAgICAgbGV0IHN0YXJ0Tm9kZSA9ICQocmFuZ2Uuc3RhcnRDb250YWluZXIpXG4gICAgICBpZiAoc3RhcnROb2RlLnBhcmVudCgpLmlzKCdjb2RlJykgJiYgKHN0YXJ0Tm9kZS5wYXJlbnQoKS5jb250ZW50cygpLmluZGV4KHN0YXJ0Tm9kZSkgPT0gMCAmJiByYW5nZS5zdGFydE9mZnNldCA9PSAxKSkge1xuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2V0Q3Vyc29yTG9jYXRpb24oc3RhcnROb2RlLnBhcmVudHMoRklHVVJFX1NFTEVDVE9SKS5wcmV2KCdwLDpoZWFkZXInKVswXSwgMSlcbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICB9XG4gICAgfSovXG4gIH0pXG5cbiAgbGlzdGluZyA9IHtcbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBhZGQ6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgbGV0IHNlbGVjdGVkRWxlbWVudCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcbiAgICAgIGxldCBuZXdMaXN0aW5nID0gdGhpcy5jcmVhdGUoZ2V0U3VjY2Vzc2l2ZUVsZW1lbnRJZChGSUdVUkVfTElTVElOR19TRUxFQ1RPUiwgTElTVElOR19TVUZGSVgpKVxuXG4gICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIHNlbGVjdGVkIHBhcmFncmFwaCBpcyBub3QgZW1wdHksIGFkZCB0aGUgbmV3IGxpc3RpbmcgcmlnaHQgYmVsb3dcbiAgICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC50ZXh0KCkudHJpbSgpLmxlbmd0aCAhPSAwKVxuICAgICAgICAgIHNlbGVjdGVkRWxlbWVudC5hZnRlcihuZXdMaXN0aW5nKVxuXG4gICAgICAgIC8vIElmIHNlbGVjdGVkIHBhcmFncmFwaCBpcyBlbXB0eSwgcmVwbGFjZSBpdCB3aXRoIHRoZSBuZXcgdGFibGVcbiAgICAgICAgZWxzZVxuICAgICAgICAgIHNlbGVjdGVkRWxlbWVudC5yZXBsYWNlV2l0aChuZXdMaXN0aW5nKVxuXG4gICAgICAgIC8vIFNhdmUgdXBkYXRlcyBcbiAgICAgICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG5cbiAgICAgICAgLy8gVXBkYXRlIGFsbCBjYXB0aW9ucyB3aXRoIFJBU0ggZnVuY3Rpb25cbiAgICAgICAgY2FwdGlvbnMoKVxuXG4gICAgICAgIC8vIE1vdmUgdGhlIGNhcmV0XG4gICAgICAgIHNlbGVjdFJhbmdlKG5ld0xpc3RpbmcuZmluZCgnY29kZScpWzBdLCAwKVxuXG4gICAgICAgIC8vIFVwZGF0ZSBSZW5kZXJlZCBSQVNIXG4gICAgICAgIHVwZGF0ZUlmcmFtZUZyb21TYXZlZENvbnRlbnQoKVxuICAgICAgfSlcblxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBjcmVhdGU6IGZ1bmN0aW9uIChpZCkge1xuICAgICAgcmV0dXJuICQoYDxmaWd1cmUgaWQ9XCIke2lkfVwiPjxwcmU+PGNvZGU+JHtaRVJPX1NQQUNFfTwvY29kZT48L3ByZT48ZmlnY2FwdGlvbj5DYXB0aW9uLjwvZmlnY2FwdGlvbj48L2ZpZ3VyZT5gKVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBzZXRDb250ZW50OiBmdW5jdGlvbiAoY2hhcikge1xuICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLnNldENvbnRlbnQoY2hhcilcbiAgICB9XG4gIH1cbn0pXG5cbi8qKlxuICogVXBkYXRlIHRhYmxlIGNhcHRpb25zIHdpdGggYSBSQVNIIGZ1bmNpb24gXG4gKi9cbmZ1bmN0aW9uIGNhcHRpb25zKCkge1xuXG4gIC8qIENhcHRpb25zICovXG4gICQoZmlndXJlYm94X3NlbGVjdG9yKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY3VyX2NhcHRpb24gPSAkKHRoaXMpLnBhcmVudHMoXCJmaWd1cmVcIikuZmluZChcImZpZ2NhcHRpb25cIik7XG4gICAgdmFyIGN1cl9udW1iZXIgPSAkKHRoaXMpLmZpbmROdW1iZXIoZmlndXJlYm94X3NlbGVjdG9yKTtcbiAgICBjdXJfY2FwdGlvbi5maW5kKCdzdHJvbmcnKS5yZW1vdmUoKTtcbiAgICBjdXJfY2FwdGlvbi5odG1sKFwiPHN0cm9uZyBjbGFzcz1cXFwiY2dlblxcXCIgZGF0YS1yYXNoLW9yaWdpbmFsLWNvbnRlbnQ9XFxcIlxcXCIgY29udGVudGVkaXRhYmxlPVxcXCJmYWxzZVxcXCI+RmlndXJlIFwiICsgY3VyX251bWJlciArXG4gICAgICBcIi4gPC9zdHJvbmc+XCIgKyBjdXJfY2FwdGlvbi5odG1sKCkpO1xuICB9KTtcbiAgJCh0YWJsZWJveF9zZWxlY3RvcikuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGN1cl9jYXB0aW9uID0gJCh0aGlzKS5wYXJlbnRzKFwiZmlndXJlXCIpLmZpbmQoXCJmaWdjYXB0aW9uXCIpO1xuICAgIHZhciBjdXJfbnVtYmVyID0gJCh0aGlzKS5maW5kTnVtYmVyKHRhYmxlYm94X3NlbGVjdG9yKTtcbiAgICBjdXJfY2FwdGlvbi5maW5kKCdzdHJvbmcnKS5yZW1vdmUoKTtcbiAgICBjdXJfY2FwdGlvbi5odG1sKFwiPHN0cm9uZyBjbGFzcz1cXFwiY2dlblxcXCIgZGF0YS1yYXNoLW9yaWdpbmFsLWNvbnRlbnQ9XFxcIlxcXCIgY29udGVudGVkaXRhYmxlPVxcXCJmYWxzZVxcXCIgPlRhYmxlIFwiICsgY3VyX251bWJlciArXG4gICAgICBcIi4gPC9zdHJvbmc+XCIgKyBjdXJfY2FwdGlvbi5odG1sKCkpO1xuICB9KTtcbiAgJChmb3JtdWxhYm94X3NlbGVjdG9yKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY3VyX2NhcHRpb24gPSAkKHRoaXMpLnBhcmVudHMoXCJmaWd1cmVcIikuZmluZChcInBcIik7XG4gICAgdmFyIGN1cl9udW1iZXIgPSAkKHRoaXMpLmZpbmROdW1iZXIoZm9ybXVsYWJveF9zZWxlY3Rvcik7XG4gICAgY3VyX2NhcHRpb24uZmluZCgnc3Bhbi5jZ2VuJykucmVtb3ZlKCk7XG4gICAgY3VyX2NhcHRpb24uaHRtbChjdXJfY2FwdGlvbi5odG1sKCkgKyBcIjxzcGFuIGNvbnRlbnRlZGl0YWJsZT1cXFwiZmFsc2VcXFwiIGNsYXNzPVxcXCJjZ2VuXFxcIiBkYXRhLXJhc2gtb3JpZ2luYWwtY29udGVudD1cXFwiXFxcIiA+IChcIiArXG4gICAgICBjdXJfbnVtYmVyICsgXCIpPC9zcGFuPlwiKTtcbiAgfSk7XG4gICQobGlzdGluZ2JveF9zZWxlY3RvcikuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGN1cl9jYXB0aW9uID0gJCh0aGlzKS5wYXJlbnRzKFwiZmlndXJlXCIpLmZpbmQoXCJmaWdjYXB0aW9uXCIpO1xuICAgIHZhciBjdXJfbnVtYmVyID0gJCh0aGlzKS5maW5kTnVtYmVyKGxpc3Rpbmdib3hfc2VsZWN0b3IpO1xuICAgIGN1cl9jYXB0aW9uLmZpbmQoJ3N0cm9uZycpLnJlbW92ZSgpO1xuICAgIGN1cl9jYXB0aW9uLmh0bWwoXCI8c3Ryb25nIGNsYXNzPVxcXCJjZ2VuXFxcIiBkYXRhLXJhc2gtb3JpZ2luYWwtY29udGVudD1cXFwiXFxcIiBjb250ZW50ZWRpdGFibGU9XFxcImZhbHNlXFxcIj5MaXN0aW5nIFwiICsgY3VyX251bWJlciArXG4gICAgICBcIi4gPC9zdHJvbmc+XCIgKyBjdXJfY2FwdGlvbi5odG1sKCkpO1xuICB9KTtcbiAgLyogL0VORCBDYXB0aW9ucyAqL1xufVxuXG4vKipcbiAqIFxuICogQHBhcmFtIHsqfSBzZWwgPT4gdGlueW1jZSBzZWxlY3Rpb25cbiAqIFxuICogTWFpbmx5IGl0IGNoZWNrcyB3aGVyZSBzZWxlY3Rpb24gc3RhcnRzIGFuZCBlbmRzIHRvIGJsb2NrIHVuYWxsb3dlZCBkZWxldGlvblxuICogSW4gc2FtZSBmaWd1cmUgYXJlbid0IGJsb2NrZWQsIHVubGVzcyBzZWxlY3Rpb24gc3RhcnQgT1IgZW5kIGluc2lkZSBmaWdjYXB0aW9uIChub3QgYm90aClcbiAqL1xuZnVuY3Rpb24gaGFuZGxlRmlndXJlRGVsZXRlKHNlbCkge1xuXG4gIHRyeSB7XG5cbiAgICAvLyBHZXQgcmVmZXJlbmNlIG9mIHN0YXJ0IGFuZCBlbmQgbm9kZVxuICAgIGxldCBzdGFydE5vZGUgPSAkKHNlbC5nZXRSbmcoKS5zdGFydENvbnRhaW5lcilcbiAgICBsZXQgc3RhcnROb2RlUGFyZW50ID0gc3RhcnROb2RlLnBhcmVudHMoRklHVVJFX1NFTEVDVE9SKVxuXG4gICAgbGV0IGVuZE5vZGUgPSAkKHNlbC5nZXRSbmcoKS5lbmRDb250YWluZXIpXG4gICAgbGV0IGVuZE5vZGVQYXJlbnQgPSBlbmROb2RlLnBhcmVudHMoRklHVVJFX1NFTEVDVE9SKVxuXG4gICAgLy8gSWYgYXQgbGVhc3Qgc2VsZWN0aW9uIHN0YXJ0IG9yIGVuZCBpcyBpbnNpZGUgdGhlIGZpZ3VyZVxuICAgIGlmIChzdGFydE5vZGVQYXJlbnQubGVuZ3RoIHx8IGVuZE5vZGVQYXJlbnQubGVuZ3RoKSB7XG5cbiAgICAgIC8vIElmIHNlbGVjdGlvbiB3cmFwcyBlbnRpcmVseSBhIGZpZ3VyZSBmcm9tIHRoZSBzdGFydCBvZiBmaXJzdCBlbGVtZW50ICh0aCBpbiB0YWJsZSkgYW5kIHNlbGVjdGlvbiBlbmRzXG4gICAgICBpZiAoZW5kTm9kZS5wYXJlbnRzKCdmaWdjYXB0aW9uJykubGVuZ3RoKSB7XG5cbiAgICAgICAgbGV0IGNvbnRlbnRzID0gZW5kTm9kZS5wYXJlbnQoKS5jb250ZW50cygpXG4gICAgICAgIGlmIChzdGFydE5vZGUuaXMoRklHVVJFX1NFTEVDVE9SKSAmJiBjb250ZW50cy5pbmRleChlbmROb2RlKSA9PSBjb250ZW50cy5sZW5ndGggLSAxICYmIHNlbC5nZXRSbmcoKS5lbmRPZmZzZXQgPT0gZW5kTm9kZS50ZXh0KCkubGVuZ3RoKSB7XG4gICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgICAvLyBNb3ZlIGN1cnNvciBhdCB0aGUgcHJldmlvdXMgZWxlbWVudCBhbmQgcmVtb3ZlIGZpZ3VyZVxuICAgICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IuZm9jdXMoKVxuICAgICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLnNldEN1cnNvckxvY2F0aW9uKHN0YXJ0Tm9kZS5wcmV2KClbMF0sIDEpXG4gICAgICAgICAgICBzdGFydE5vZGUucmVtb3ZlKClcblxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBJZiBzZWxlY3Rpb24gZG9lc24ndCBzdGFydCBhbmQgZW5kIGluIHRoZSBzYW1lIGZpZ3VyZSwgYnV0IG9uZSBiZWV0d2VuIHN0YXJ0IG9yIGVuZCBpcyBpbnNpZGUgdGhlIGZpZ2NhcHRpb24sIG11c3QgYmxvY2tcbiAgICAgIGlmIChzdGFydE5vZGUucGFyZW50cygnZmlnY2FwdGlvbicpLmxlbmd0aCAhPSBlbmROb2RlLnBhcmVudHMoJ2ZpZ2NhcHRpb24nKS5sZW5ndGggJiYgKHN0YXJ0Tm9kZS5wYXJlbnRzKCdmaWdjYXB0aW9uJykubGVuZ3RoIHx8IGVuZE5vZGUucGFyZW50cygnZmlnY2FwdGlvbicpLmxlbmd0aCkpXG4gICAgICAgIHJldHVybiBmYWxzZVxuXG4gICAgICAvLyBJZiB0aGUgZmlndXJlIGlzIG5vdCB0aGUgc2FtZSwgbXVzdCBibG9ja1xuICAgICAgLy8gQmVjYXVzZSBhIHNlbGVjdGlvbiBjYW4gc3RhcnQgaW4gZmlndXJlWCBhbmQgZW5kIGluIGZpZ3VyZVlcbiAgICAgIGlmICgoc3RhcnROb2RlUGFyZW50LmF0dHIoJ2lkJykgIT0gZW5kTm9kZVBhcmVudC5hdHRyKCdpZCcpKSlcbiAgICAgICAgcmV0dXJuIGZhbHNlXG5cbiAgICAgIC8vIElmIGN1cnNvciBpcyBhdCBzdGFydCBvZiBjb2RlIHByZXZlbnRcbiAgICAgIGlmIChzdGFydE5vZGUucGFyZW50cyhGSUdVUkVfU0VMRUNUT1IpLmZpbmQoJ3ByZScpLmxlbmd0aCkge1xuXG4gICAgICAgIC8vIElmIGF0IHRoZSBzdGFydCBvZiBwcmU+Y29kZSwgcHJlc3NpbmcgMnRpbWVzIGJhY2tzcGFjZSB3aWxsIHJlbW92ZSBldmVyeXRoaW5nIFxuICAgICAgICBpZiAoc3RhcnROb2RlLnBhcmVudCgpLmlzKCdjb2RlJykgJiYgKHN0YXJ0Tm9kZS5wYXJlbnQoKS5jb250ZW50cygpLmluZGV4KHN0YXJ0Tm9kZSkgPT0gMCAmJiBzZWwuZ2V0Um5nKCkuc3RhcnRPZmZzZXQgPT0gMSkpIHtcbiAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzdGFydE5vZGUucGFyZW50cyhGSUdVUkVfU0VMRUNUT1IpLnJlbW92ZSgpXG4gICAgICAgICAgfSlcbiAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgICAgfVxuXG5cbiAgICAgICAgaWYgKHN0YXJ0Tm9kZS5wYXJlbnQoKS5pcygncHJlJykgJiYgc2VsLmdldFJuZygpLnN0YXJ0T2Zmc2V0ID09IDApXG4gICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWVcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiBmYWxzZVxuICB9XG59XG5cbi8qKlxuICogXG4gKiBAcGFyYW0geyp9IHNlbCBcbiAqL1xuZnVuY3Rpb24gaGFuZGxlRmlndXJlQ2FuYyhzZWwpIHtcblxuICAvLyBHZXQgcmVmZXJlbmNlIG9mIHN0YXJ0IGFuZCBlbmQgbm9kZVxuICBsZXQgc3RhcnROb2RlID0gJChzZWwuZ2V0Um5nKCkuc3RhcnRDb250YWluZXIpXG4gIGxldCBzdGFydE5vZGVQYXJlbnQgPSBzdGFydE5vZGUucGFyZW50cyhGSUdVUkVfU0VMRUNUT1IpXG5cbiAgbGV0IGVuZE5vZGUgPSAkKHNlbC5nZXRSbmcoKS5lbmRDb250YWluZXIpXG4gIGxldCBlbmROb2RlUGFyZW50ID0gZW5kTm9kZS5wYXJlbnRzKEZJR1VSRV9TRUxFQ1RPUilcblxuICAvLyBJZiBhdCBsZWFzdCBzZWxlY3Rpb24gc3RhcnQgb3IgZW5kIGlzIGluc2lkZSB0aGUgZmlndXJlXG4gIGlmIChzdGFydE5vZGVQYXJlbnQubGVuZ3RoIHx8IGVuZE5vZGVQYXJlbnQubGVuZ3RoKSB7XG5cbiAgICAvLyBJZiBzZWxlY3Rpb24gZG9lc24ndCBzdGFydCBhbmQgZW5kIGluIHRoZSBzYW1lIGZpZ3VyZSwgYnV0IG9uZSBiZWV0d2VuIHN0YXJ0IG9yIGVuZCBpcyBpbnNpZGUgdGhlIGZpZ2NhcHRpb24sIG11c3QgYmxvY2tcbiAgICBpZiAoc3RhcnROb2RlLnBhcmVudHMoJ2ZpZ2NhcHRpb24nKS5sZW5ndGggIT0gZW5kTm9kZS5wYXJlbnRzKCdmaWdjYXB0aW9uJykubGVuZ3RoICYmIChzdGFydE5vZGUucGFyZW50cygnZmlnY2FwdGlvbicpLmxlbmd0aCB8fCBlbmROb2RlLnBhcmVudHMoJ2ZpZ2NhcHRpb24nKS5sZW5ndGgpKVxuICAgICAgcmV0dXJuIGZhbHNlXG5cbiAgICAvLyBJZiB0aGUgZmlndXJlIGlzIG5vdCB0aGUgc2FtZSwgbXVzdCBibG9ja1xuICAgIC8vIEJlY2F1c2UgYSBzZWxlY3Rpb24gY2FuIHN0YXJ0IGluIGZpZ3VyZVggYW5kIGVuZCBpbiBmaWd1cmVZXG4gICAgaWYgKChzdGFydE5vZGVQYXJlbnQuYXR0cignaWQnKSAhPSBlbmROb2RlUGFyZW50LmF0dHIoJ2lkJykpKVxuICAgICAgcmV0dXJuIGZhbHNlXG5cbiAgfVxuXG4gIC8vIFRoaXMgYWxnb3JpdGhtIGRvZXNuJ3Qgd29yayBpZiBjYXJldCBpcyBpbiBlbXB0eSB0ZXh0IGVsZW1lbnRcblxuICAvLyBDdXJyZW50IGVsZW1lbnQgY2FuIGJlIG9yIHRleHQgb3IgcFxuICBsZXQgcGFyYWdyYXBoID0gc3RhcnROb2RlLmlzKCdwJykgPyBzdGFydE5vZGUgOiBzdGFydE5vZGUucGFyZW50cygncCcpLmZpcnN0KClcbiAgLy8gU2F2ZSBhbGwgY2hsZHJlbiBub2RlcyAodGV4dCBpbmNsdWRlZClcbiAgbGV0IHBhcmFncmFwaENvbnRlbnQgPSBwYXJhZ3JhcGguY29udGVudHMoKVxuXG4gIC8vIElmIG5leHQgdGhlcmUgaXMgYSBmaWd1cmVcbiAgaWYgKHBhcmFncmFwaC5uZXh0KCkuaXMoRklHVVJFX1NFTEVDVE9SKSkge1xuXG4gICAgaWYgKGVuZE5vZGVbMF0ubm9kZVR5cGUgPT0gMykge1xuXG4gICAgICAvLyBJZiB0aGUgZW5kIG5vZGUgaXMgYSB0ZXh0IGluc2lkZSBhIHN0cm9uZywgaXRzIGluZGV4IHdpbGwgYmUgLTEuXG4gICAgICAvLyBJbiB0aGlzIGNhc2UgdGhlIGVkaXRvciBtdXN0IGl0ZXJhdGUgdW50aWwgaXQgZmFjZSBhIGlubGluZSBlbGVtZW50XG4gICAgICBpZiAocGFyYWdyYXBoQ29udGVudC5pbmRleChlbmROb2RlKSA9PSAtMSkgLy8mJiBwYXJhZ3JhcGgucGFyZW50cyhTRUNUSU9OX1NFTEVDVE9SKS5sZW5ndGgpXG4gICAgICAgIGVuZE5vZGUgPSBlbmROb2RlLnBhcmVudCgpXG5cbiAgICAgIC8vIElmIGluZGV4IG9mIHRoZSBpbmxpbmUgZWxlbWVudCBpcyBlcXVhbCBvZiBjaGlsZHJlbiBub2RlIGxlbmd0aFxuICAgICAgLy8gQU5EIHRoZSBjdXJzb3IgaXMgYXQgdGhlIGxhc3QgcG9zaXRpb25cbiAgICAgIC8vIFJlbW92ZSB0aGUgbmV4dCBmaWd1cmUgaW4gb25lIHVuZG8gbGV2ZWxcbiAgICAgIGlmIChwYXJhZ3JhcGhDb250ZW50LmluZGV4KGVuZE5vZGUpICsgMSA9PSBwYXJhZ3JhcGhDb250ZW50Lmxlbmd0aCAmJiBwYXJhZ3JhcGhDb250ZW50Lmxhc3QoKS50ZXh0KCkubGVuZ3RoID09IHNlbC5nZXRSbmcoKS5lbmRPZmZzZXQpIHtcbiAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHBhcmFncmFwaC5uZXh0KCkucmVtb3ZlKClcbiAgICAgICAgfSlcbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRydWVcbn1cblxuLyoqXG4gKiBcbiAqIEBwYXJhbSB7Kn0gc2VsID0+IHRpbnltY2Ugc2VsZWN0aW9uXG4gKiBcbiAqIEFkZCBhIHBhcmFncmFwaCBhZnRlciB0aGUgZmlndXJlXG4gKi9cbmZ1bmN0aW9uIGhhbmRsZUZpZ3VyZUVudGVyKHNlbCkge1xuXG4gIGxldCBzZWxlY3RlZEVsZW1lbnQgPSAkKHNlbC5nZXROb2RlKCkpXG4gIGlmIChzZWxlY3RlZEVsZW1lbnQuaXMoJ2ZpZ2NhcHRpb24nKSB8fCAoc2VsZWN0ZWRFbGVtZW50LnBhcmVudHMoRklHVVJFX1NFTEVDVE9SKS5sZW5ndGggJiYgc2VsZWN0ZWRFbGVtZW50LmlzKCdwJykpKSB7XG5cbiAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgIC8vYWRkIGEgbmV3IHBhcmFncmFwaCBhZnRlciB0aGUgZmlndXJlXG4gICAgICBzZWxlY3RlZEVsZW1lbnQucGFyZW50KEZJR1VSRV9TRUxFQ1RPUikuYWZ0ZXIoJzxwPjxici8+PC9wPicpXG5cbiAgICAgIC8vbW92ZSBjYXJldCBhdCB0aGUgc3RhcnQgb2YgbmV3IHBcbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZXRDdXJzb3JMb2NhdGlvbihzZWxlY3RlZEVsZW1lbnQucGFyZW50KEZJR1VSRV9TRUxFQ1RPUilbMF0ubmV4dFNpYmxpbmcsIDApXG4gICAgfSlcbiAgICByZXR1cm4gZmFsc2VcbiAgfSBlbHNlIGlmIChzZWxlY3RlZEVsZW1lbnQuaXMoJ3RoJykpXG4gICAgcmV0dXJuIGZhbHNlXG4gIHJldHVybiB0cnVlXG59XG5cbi8qKlxuICogXG4gKiBAcGFyYW0geyp9IHNlbCA9PiB0aW55bWNlIHNlbGVjdGlvblxuICovXG5mdW5jdGlvbiBoYW5kbGVGaWd1cmVDaGFuZ2Uoc2VsKSB7XG5cbiAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG5cbiAgLy8gSWYgcmFzaC1nZW5lcmF0ZWQgc2VjdGlvbiBpcyBkZWxldGUsIHJlLWFkZCBpdFxuICBpZiAoJCgnZmlnY2FwdGlvbjpub3QoOmhhcyhzdHJvbmcpKScpLmxlbmd0aCkge1xuICAgIGNhcHRpb25zKClcbiAgICB1cGRhdGVJZnJhbWVGcm9tU2F2ZWRDb250ZW50KClcbiAgfVxufSIsIi8qKlxuICogcmFqZV9pbmxpbmVfY29kZSBwbHVnaW4gUkFKRVxuICovXG5cbmNvbnN0IERJU0FCTEVfU0VMRUNUT1JfSU5MSU5FID0gJ2ZpZ3VyZSwgc2VjdGlvbltyb2xlPWRvYy1iaWJsaW9ncmFwaHldJ1xuXG5jb25zdCBJTkxJTkVfRVJST1JTID0gJ0Vycm9yLCBJbmxpbmUgZWxlbWVudHMgY2FuIGJlIE9OTFkgY3JlYXRlZCBpbnNpZGUgdGhlIHNhbWUgcGFyYWdyYXBoJ1xuXG4vKipcbiAqIFxuICovXG5sZXQgaW5saW5lID0ge1xuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGhhbmRsZTogZnVuY3Rpb24gKHR5cGUpIHtcbiAgICBsZXQgc2VsZWN0ZWRFbGVtZW50ID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuXG4gICAgLy8gSWYgdGhlcmUgaXNuJ3QgYW55IGlubGluZSBjb2RlXG4gICAgaWYgKCFzZWxlY3RlZEVsZW1lbnQuaXModHlwZSkgJiYgIXNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKHR5cGUpLmxlbmd0aCkge1xuXG4gICAgICBsZXQgdGV4dCA9IFpFUk9fU1BBQ0VcblxuICAgICAgLy8gQ2hlY2sgaWYgdGhlIHNlbGVjdGlvbiBzdGFydHMgYW5kIGVuZHMgaW4gdGhlIHNhbWUgcGFyYWdyYXBoXG4gICAgICBpZiAoIXRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5pc0NvbGxhcHNlZCgpKSB7XG5cbiAgICAgICAgbGV0IHN0YXJ0Tm9kZSA9IHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRTdGFydCgpXG4gICAgICAgIGxldCBlbmROb2RlID0gdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldEVuZCgpXG5cbiAgICAgICAgLy8gTm90aWZ5IHRoZSBlcnJvciBhbmQgZXhpdFxuICAgICAgICBpZiAoc3RhcnROb2RlICE9IGVuZE5vZGUpIHtcbiAgICAgICAgICBub3RpZnkoSU5MSU5FX0VSUk9SUywgJ2Vycm9yJywgMzAwMClcbiAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNhdmUgdGhlIHNlbGVjdGVkIGNvbnRlbnQgYXMgdGV4dFxuICAgICAgICB0ZXh0ICs9IHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRDb250ZW50KClcbiAgICAgIH1cblxuICAgICAgLy8gVXBkYXRlIHRoZSBjdXJyZW50IHNlbGVjdGlvbiB3aXRoIGNvZGUgZWxlbWVudFxuICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIC8vIEdldCB0aGUgaW5kZXggb2YgdGhlIGN1cnJlbnQgc2VsZWN0ZWQgbm9kZVxuICAgICAgICBsZXQgcHJldmlvdXNOb2RlSW5kZXggPSBzZWxlY3RlZEVsZW1lbnQuY29udGVudHMoKS5pbmRleCgkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRSbmcoKS5zdGFydENvbnRhaW5lcikpXG5cbiAgICAgICAgLy8gQWRkIGNvZGUgZWxlbWVudFxuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2V0Q29udGVudChgPCR7dHlwZX0+JHt0ZXh0fTwvJHt0eXBlfT4keyh0eXBlID09ICdxJyA/IFpFUk9fU1BBQ0UgOiAnJyl9YClcbiAgICAgICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG5cbiAgICAgICAgLy8gTW92ZSBjYXJldCBhdCB0aGUgZW5kIG9mIHRoZSBzdWNjZXNzaXZlIG5vZGUgb2YgcHJldmlvdXMgc2VsZWN0ZWQgbm9kZVxuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2V0Q3Vyc29yTG9jYXRpb24oc2VsZWN0ZWRFbGVtZW50LmNvbnRlbnRzKClbcHJldmlvdXNOb2RlSW5kZXggKyAxXSwgMSlcbiAgICAgIH0pXG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGV4aXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAvLyBHZXQgdGhlIGN1cnJlbnQgbm9kZSBpbmRleCwgcmVsYXRpdmUgdG8gaXRzIHBhcmVudFxuICAgIGxldCBzZWxlY3RlZEVsZW1lbnQgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG4gICAgbGV0IHBhcmVudENvbnRlbnQgPSBzZWxlY3RlZEVsZW1lbnQucGFyZW50KCkuY29udGVudHMoKVxuICAgIGxldCBpbmRleCA9IHBhcmVudENvbnRlbnQuaW5kZXgoc2VsZWN0ZWRFbGVtZW50KVxuXG4gICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAvLyBDaGVjayBpZiB0aGUgY3VycmVudCBub2RlIGhhcyBhIHRleHQgYWZ0ZXJcbiAgICAgIGlmICh0eXBlb2YgcGFyZW50Q29udGVudFtpbmRleCArIDFdICE9ICd1bmRlZmluZWQnICYmICQocGFyZW50Q29udGVudFtpbmRleCArIDFdKS5pcygndGV4dCcpKSB7XG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZXRDdXJzb3JMb2NhdGlvbihwYXJlbnRDb250ZW50W2luZGV4ICsgMV0sIDApXG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZXRDb250ZW50KFpFUk9fU1BBQ0UpXG4gICAgICB9XG5cbiAgICAgIC8vIElmIHRoZSBub2RlIGhhc24ndCB0ZXh0IGFmdGVyLCByYWplIGhhcyB0byBhZGQgaXRcbiAgICAgIGVsc2Uge1xuICAgICAgICBzZWxlY3RlZEVsZW1lbnQuYWZ0ZXIoWkVST19TUEFDRSlcbiAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLnNldEN1cnNvckxvY2F0aW9uKHBhcmVudENvbnRlbnRbaW5kZXggKyAxXSwgMClcbiAgICAgIH1cbiAgICB9KVxuICB9LFxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIHJlcGxhY2VUZXh0OiBmdW5jdGlvbiAoY2hhcikge1xuXG4gICAgbGV0IHNlbGVjdGVkRWxlbWVudCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcbiAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgIC8vIFNldCB0aGUgbmV3IGNoYXIgYW5kIG92ZXJ3cml0ZSBjdXJyZW50IHRleHRcbiAgICAgIHNlbGVjdGVkRWxlbWVudC5odG1sKGNoYXIpXG5cbiAgICAgIC8vIE1vdmUgdGhlIGNhcmV0IGF0IHRoZSBlbmQgb2YgY3VycmVudCB0ZXh0XG4gICAgICBsZXQgY29udGVudCA9IHNlbGVjdGVkRWxlbWVudC5jb250ZW50cygpXG4gICAgICBtb3ZlQ2FyZXQoY29udGVudFtjb250ZW50Lmxlbmd0aCAtIDFdKVxuICAgIH0pXG4gIH1cbn1cblxuLyoqXG4gKiBcbiAqL1xudGlueW1jZS5QbHVnaW5NYW5hZ2VyLmFkZCgncmFqZV9pbmxpbmVDb2RlJywgZnVuY3Rpb24gKGVkaXRvciwgdXJsKSB7XG5cbiAgY29uc3QgQ09ERSA9ICdjb2RlJ1xuXG4gIC8vIEFkZCBhIGJ1dHRvbiB0aGF0IG9wZW5zIGEgd2luZG93XG4gIGVkaXRvci5hZGRCdXR0b24oJ3JhamVfaW5saW5lQ29kZScsIHtcbiAgICB0aXRsZTogJ2lubGluZV9jb2RlJyxcbiAgICBpY29uOiAnaWNvbi1pbmxpbmUtY29kZScsXG4gICAgdG9vbHRpcDogJ0lubGluZSBjb2RlJyxcbiAgICBkaXNhYmxlZFN0YXRlU2VsZWN0b3I6IERJU0FCTEVfU0VMRUNUT1JfSU5MSU5FLFxuXG4gICAgLy8gQnV0dG9uIGJlaGF2aW91clxuICAgIG9uY2xpY2s6IGZ1bmN0aW9uICgpIHtcbiAgICAgIGlubGluZS5oYW5kbGUoQ09ERSlcbiAgICB9XG4gIH0pXG5cbiAgZWRpdG9yLm9uKCdrZXlEb3duJywgZnVuY3Rpb24gKGUpIHtcblxuICAgIC8vIENoZWNrIGlmIHRoZSBzZWxlY3RlZCBlbGVtZW50IGlzIGEgQ09ERSB0aGF0IGlzbid0IGluc2lkZSBhIEZJR1VSRSBvciBQUkVcbiAgICBsZXQgc2VsZWN0ZWRFbGVtZW50ID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuICAgIGlmIChzZWxlY3RlZEVsZW1lbnQuaXMoJ2NvZGUnKSAmJiAhc2VsZWN0ZWRFbGVtZW50LnBhcmVudHMoRklHVVJFX1NFTEVDVE9SKS5sZW5ndGggJiYgIXNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKCdwcmUnKS5sZW5ndGgpIHtcblxuICAgICAgLyoqXG4gICAgICAgKiBDaGVjayBpZiBFTlRFUiBpcyBwcmVzc2VkXG4gICAgICAgKi9cbiAgICAgIGlmIChlLmtleUNvZGUgPT0gMTMpIHtcblxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKVxuICAgICAgICBpbmxpbmUuZXhpdCgpXG4gICAgICB9XG5cbiAgICAgIC8qKlxuICAgICAgICogQ2hlY2sgaWYgYSBQUklOVEFCTEUgQ0hBUiBpcyBwcmVzc2VkXG4gICAgICAgKi9cbiAgICAgIGlmIChjaGVja0lmUHJpbnRhYmxlQ2hhcihlLmtleUNvZGUpKSB7XG5cbiAgICAgICAgLy8gSWYgdGhlIGZpcnN0IGNoYXIgaXMgWkVST19TUEFDRSBhbmQgdGhlIGNvZGUgaGFzIG5vIGNoYXJcbiAgICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC50ZXh0KCkubGVuZ3RoID09IDIgJiYgYCYjJHtzZWxlY3RlZEVsZW1lbnQudGV4dCgpLmNoYXJDb2RlQXQoMCl9O2AgPT0gWkVST19TUEFDRSkge1xuICAgICAgICAgIFxuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKClcbiAgICAgICAgICBpbmxpbmUucmVwbGFjZVRleHQoZS5rZXkpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH0pXG59KVxuXG4vKipcbiAqICBJbmxpbmUgcXVvdGUgcGx1Z2luIFJBSkVcbiAqL1xudGlueW1jZS5QbHVnaW5NYW5hZ2VyLmFkZCgncmFqZV9pbmxpbmVRdW90ZScsIGZ1bmN0aW9uIChlZGl0b3IsIHVybCkge1xuXG4gIGNvbnN0IFEgPSAncSdcblxuICAvLyBBZGQgYSBidXR0b24gdGhhdCBoYW5kbGUgdGhlIGlubGluZSBlbGVtZW50XG4gIGVkaXRvci5hZGRCdXR0b24oJ3JhamVfaW5saW5lUXVvdGUnLCB7XG4gICAgdGl0bGU6ICdpbmxpbmVfcXVvdGUnLFxuICAgIGljb246ICdpY29uLWlubGluZS1xdW90ZScsXG4gICAgdG9vbHRpcDogJ0lubGluZSBxdW90ZScsXG4gICAgZGlzYWJsZWRTdGF0ZVNlbGVjdG9yOiBESVNBQkxFX1NFTEVDVE9SX0lOTElORSxcblxuICAgIC8vIEJ1dHRvbiBiZWhhdmlvdXJcbiAgICBvbmNsaWNrOiBmdW5jdGlvbiAoKSB7XG4gICAgICBpbmxpbmUuaGFuZGxlKCdxJylcbiAgICB9XG4gIH0pXG5cbiAgZWRpdG9yLm9uKCdrZXlEb3duJywgZnVuY3Rpb24gKGUpIHtcblxuICAgIC8vIENoZWNrIGlmIHRoZSBzZWxlY3RlZCBlbGVtZW50IGlzIGEgQ09ERSB0aGF0IGlzbid0IGluc2lkZSBhIEZJR1VSRSBvciBQUkVcbiAgICBsZXQgc2VsZWN0ZWRFbGVtZW50ID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuICAgIGlmIChzZWxlY3RlZEVsZW1lbnQuaXMoJ3EnKSkge1xuXG4gICAgICAvKipcbiAgICAgICAqIENoZWNrIGlmIEVOVEVSIGlzIHByZXNzZWRcbiAgICAgICAqL1xuICAgICAgaWYgKGUua2V5Q29kZSA9PSAxMykge1xuXG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpXG4gICAgICAgIGlubGluZS5leGl0KClcbiAgICAgIH1cblxuICAgICAgLyoqXG4gICAgICAgKiBDaGVjayBpZiBhIFBSSU5UQUJMRSBDSEFSIGlzIHByZXNzZWRcbiAgICAgICAqL1xuICAgICAgaWYgKGNoZWNrSWZQcmludGFibGVDaGFyKGUua2V5Q29kZSkpIHtcblxuICAgICAgICAvLyBJZiB0aGUgZmlyc3QgY2hhciBpcyBaRVJPX1NQQUNFIGFuZCB0aGUgY29kZSBoYXMgbm8gY2hhclxuICAgICAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LnRleHQoKS5sZW5ndGggPT0gMSAmJiBgJiMke3NlbGVjdGVkRWxlbWVudC50ZXh0KCkuY2hhckNvZGVBdCgwKX07YCA9PSBaRVJPX1NQQUNFKSB7XG5cbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpXG4gICAgICAgICAgaW5saW5lLnJlcGxhY2VUZXh0KGUua2V5KVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9KVxufSlcblxuLyoqXG4gKiBcbiAqL1xudGlueW1jZS5QbHVnaW5NYW5hZ2VyLmFkZCgncmFqZV9leHRlcm5hbExpbmsnLCBmdW5jdGlvbiAoZWRpdG9yLCB1cmwpIHtcblxuICBlZGl0b3IuYWRkQnV0dG9uKCdyYWplX2V4dGVybmFsTGluaycsIHtcbiAgICB0aXRsZTogJ2V4dGVybmFsX2xpbmsnLFxuICAgIGljb246ICdpY29uLWV4dGVybmFsLWxpbmsnLFxuICAgIHRvb2x0aXA6ICdFeHRlcm5hbCBsaW5rJyxcbiAgICBkaXNhYmxlZFN0YXRlU2VsZWN0b3I6IERJU0FCTEVfU0VMRUNUT1JfSU5MSU5FLFxuXG4gICAgLy8gQnV0dG9uIGJlaGF2aW91clxuICAgIG9uY2xpY2s6IGZ1bmN0aW9uICgpIHt9XG4gIH0pXG5cblxuICBsZXQgbGluayA9IHtcbiAgICBhZGQ6IGZ1bmN0aW9uICgpIHtcblxuICAgIH1cbiAgfVxufSlcblxuLyoqXG4gKiBcbiAqL1xudGlueW1jZS5QbHVnaW5NYW5hZ2VyLmFkZCgncmFqZV9pbmxpbmVGaWd1cmUnLCBmdW5jdGlvbiAoZWRpdG9yLCB1cmwpIHtcbiAgZWRpdG9yLmFkZEJ1dHRvbigncmFqZV9pbmxpbmVGaWd1cmUnLCB7XG4gICAgdGV4dDogJ2lubGluZV9maWd1cmUnLFxuICAgIHRvb2x0aXA6ICdJbmxpbmUgcXVvdGUnLFxuICAgIGRpc2FibGVkU3RhdGVTZWxlY3RvcjogRElTQUJMRV9TRUxFQ1RPUl9JTkxJTkUsXG5cbiAgICAvLyBCdXR0b24gYmVoYXZpb3VyXG4gICAgb25jbGljazogZnVuY3Rpb24gKCkge31cbiAgfSlcbn0pIiwidGlueW1jZS5QbHVnaW5NYW5hZ2VyLmFkZCgncmFqZV9saXN0cycsIGZ1bmN0aW9uIChlZGl0b3IsIHVybCkge1xuXG4gIGNvbnN0IE9MID0gJ29sJ1xuICBjb25zdCBVTCA9ICd1bCdcblxuICBlZGl0b3IuYWRkQnV0dG9uKCdyYWplX29sJywge1xuICAgIHRpdGxlOiAncmFqZV9vbCcsXG4gICAgaWNvbjogJ2ljb24tb2wnLFxuICAgIHRvb2x0aXA6ICdPcmRlcmVkIGxpc3QnLFxuICAgIGRpc2FibGVkU3RhdGVTZWxlY3RvcjogRElTQUJMRV9TRUxFQ1RPUl9GSUdVUkVTLFxuXG4gICAgLy8gQnV0dG9uIGJlaGF2aW91clxuICAgIG9uY2xpY2s6IGZ1bmN0aW9uICgpIHtcbiAgICAgIGxpc3QuYWRkKE9MKVxuICAgIH1cbiAgfSlcblxuICBlZGl0b3IuYWRkQnV0dG9uKCdyYWplX3VsJywge1xuICAgIHRpdGxlOiAncmFqZV91bCcsXG4gICAgaWNvbjogJ2ljb24tdWwnLFxuICAgIHRvb2x0aXA6ICdVbm9yZGVyZWQgbGlzdCcsXG4gICAgZGlzYWJsZWRTdGF0ZVNlbGVjdG9yOiBESVNBQkxFX1NFTEVDVE9SX0ZJR1VSRVMsXG5cbiAgICAvLyBCdXR0b24gYmVoYXZpb3VyXG4gICAgb25jbGljazogZnVuY3Rpb24gKCkge1xuICAgICAgbGlzdC5hZGQoVUwpXG4gICAgfVxuICB9KVxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGVkaXRvci5vbigna2V5RG93bicsIGZ1bmN0aW9uIChlKSB7XG5cblxuICAgIC8vIENoZWNrIGlmIHRoZSBzZWxlY3RlZCBlbGVtZW50IGlzIGEgUCBpbnNpZGUgYSBsaXN0IChPTCwgVUwpXG4gICAgbGV0IHNlbGVjdGVkRWxlbWVudCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcbiAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LmlzKCdwJykgJiYgKHNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKCd1bCcpLmxlbmd0aCB8fCBzZWxlY3RlZEVsZW1lbnQucGFyZW50cygnbGknKS5sZW5ndGgpKSB7XG5cblxuICAgICAgLyoqXG4gICAgICAgKiBDaGVjayBpZiBDTUQrRU5URVIgb3IgQ1RSTCtFTlRFUiBhcmUgcHJlc3NlZFxuICAgICAgICovXG4gICAgICBpZiAoKGUubWV0YUtleSB8fCBlLmN0cmxLZXkpICYmIGUua2V5Q29kZSA9PSAxMykge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgbGlzdC5hZGRQYXJhZ3JhcGgoKVxuICAgICAgfVxuXG4gICAgICAvKipcbiAgICAgICAqIENoZWNrIGlmIFNISUZUK1RBQiBpcyBwcmVzc2VkXG4gICAgICAgKi9cbiAgICAgIGVsc2UgaWYgKGUuc2hpZnRLZXkgJiYgZS5rZXlDb2RlID09IDkpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgIGxpc3QuZGVOZXN0KClcbiAgICAgIH1cblxuICAgICAgLyoqXG4gICAgICAgKiBDaGVjayBpZiBFTlRFUiBpcyBwcmVzc2VkXG4gICAgICAgKi9cbiAgICAgIGVsc2UgaWYgKGUua2V5Q29kZSA9PSAxMykge1xuXG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKVxuXG4gICAgICAgIC8vIENoZWNrIGlmIHRoZSBzZWxlY3Rpb24gaXMgY29sbGFwc2VkXG4gICAgICAgIGlmICh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uaXNDb2xsYXBzZWQoKSkge1xuXG4gICAgICAgICAgaWYgKCFzZWxlY3RlZEVsZW1lbnQudGV4dCgpLnRyaW0oKS5sZW5ndGgpIHtcblxuICAgICAgICAgICAgLy8gRGUgbmVzdFxuICAgICAgICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKCd1bCxvbCcpLmxlbmd0aCA+IDEpXG4gICAgICAgICAgICAgIGxpc3QuZGVOZXN0KClcblxuICAgICAgICAgICAgLy8gUmVtb3ZlIHRoZSBlbXB0eSBMSVxuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICBsaXN0LnJlbW92ZUxpc3RJdGVtKClcblxuICAgICAgICAgIH0gZWxzZVxuICAgICAgICAgICAgbGlzdC5hZGRMaXN0SXRlbSgpXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLyoqXG4gICAgICAgKiBDaGVjayBpZiBUQUIgaXMgcHJlc3NlZFxuICAgICAgICovXG4gICAgICBlbHNlIGlmIChlLmtleUNvZGUgPT0gOSkge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgbGlzdC5uZXN0KClcbiAgICAgIH1cbiAgICB9XG4gIH0pXG5cblxuICAvKipcbiAgICogXG4gICAqL1xuICBsZXQgbGlzdCA9IHtcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIGFkZDogZnVuY3Rpb24gKHR5cGUpIHtcblxuICAgICAgLy8gR2V0IHRoZSBjdXJyZW50IGVsZW1lbnQgXG4gICAgICBsZXQgc2VsZWN0ZWRFbGVtZW50ID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuICAgICAgbGV0IHRleHQgPSAnPGJyPidcblxuICAgICAgLy8gSWYgdGhlIGN1cnJlbnQgZWxlbWVudCBoYXMgdGV4dCwgc2F2ZSBpdFxuICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC50ZXh0KCkudHJpbSgpLmxlbmd0aCA+IDApXG4gICAgICAgIHRleHQgPSBzZWxlY3RlZEVsZW1lbnQudGV4dCgpLnRyaW0oKVxuXG4gICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgbGV0IG5ld0xpc3QgPSAkKGA8JHt0eXBlfT48bGk+PHA+JHt0ZXh0fTwvcD48L2xpPjwvJHt0eXBlfT5gKVxuXG4gICAgICAgIC8vIEFkZCB0aGUgbmV3IGVsZW1lbnRcbiAgICAgICAgc2VsZWN0ZWRFbGVtZW50LnJlcGxhY2VXaXRoKG5ld0xpc3QpXG5cbiAgICAgICAgLy8gU2F2ZSBjaGFuZ2VzXG4gICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuXG4gICAgICAgIC8vIE1vdmUgdGhlIGN1cnNvclxuICAgICAgICBtb3ZlQ2FyZXQobmV3TGlzdC5maW5kKCdwJylbMF0sIGZhbHNlKVxuICAgICAgfSlcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgYWRkTGlzdEl0ZW06IGZ1bmN0aW9uICgpIHtcblxuICAgICAgY29uc3QgQlIgPSAnPGJyPidcblxuICAgICAgLy8gR2V0IHRoZSByZWZlcmVuY2VzIG9mIHRoZSBleGlzdGluZyBlbGVtZW50XG4gICAgICBsZXQgcCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcbiAgICAgIGxldCBsaXN0SXRlbSA9IHAucGFyZW50KCdsaScpXG5cbiAgICAgIC8vIFBsYWNlaG9sZGVyIHRleHQgb2YgdGhlIG5ldyBsaVxuICAgICAgbGV0IG5ld1RleHQgPSBCUlxuICAgICAgbGV0IG5vZGVzID0gcC5jb250ZW50cygpXG5cbiAgICAgIC8vIElmIHRoZXJlIGlzIGp1c3Qgb25lIG5vZGUgd3JhcHBlZCBpbnNpZGUgdGhlIHBhcmFncmFwaFxuICAgICAgaWYgKG5vZGVzLmxlbmd0aCA9PSAxKSB7XG5cbiAgICAgICAgLy8gR2V0IHRoZSBzdGFydCBvZmZzZXQgYW5kIHRleHQgb2YgdGhlIGN1cnJlbnQgbGlcbiAgICAgICAgbGV0IHN0YXJ0T2Zmc2V0ID0gdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldFJuZygpLnN0YXJ0T2Zmc2V0XG4gICAgICAgIGxldCBwVGV4dCA9IHAudGV4dCgpXG5cbiAgICAgICAgLy8gSWYgdGhlIGN1cnNvciBpc24ndCBhdCB0aGUgZW5kXG4gICAgICAgIGlmIChzdGFydE9mZnNldCAhPSBwVGV4dC5sZW5ndGgpIHtcblxuICAgICAgICAgIC8vIEdldCB0aGUgcmVtYWluaW5nIHRleHRcbiAgICAgICAgICBuZXdUZXh0ID0gcFRleHQuc3Vic3RyaW5nKHN0YXJ0T2Zmc2V0LCBwVGV4dC5sZW5ndGgpXG4gICAgICAgIH1cblxuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICAvLyBVcGRhdGUgdGhlIHRleHQgb2YgdGhlIGN1cnJlbnQgbGlcbiAgICAgICAgICBwLnRleHQocFRleHQuc3Vic3RyaW5nKDAsIHN0YXJ0T2Zmc2V0KSlcblxuICAgICAgICAgIGlmICghcC50ZXh0KCkubGVuZ3RoKVxuICAgICAgICAgICAgcC5odG1sKEJSKVxuXG4gICAgICAgICAgLy8gQ3JlYXRlIGFuZCBhZGQgdGhlIG5ldyBsaVxuICAgICAgICAgIGxldCBuZXdMaXN0SXRlbSA9ICQoYDxsaT48cD4ke25ld1RleHR9PC9wPjwvbGk+YClcbiAgICAgICAgICBsaXN0SXRlbS5hZnRlcihuZXdMaXN0SXRlbSlcblxuICAgICAgICAgIC8vIE1vdmUgdGhlIGNhcmV0IHRvIHRoZSBuZXcgbGlcbiAgICAgICAgICBtb3ZlQ2FyZXQobmV3TGlzdEl0ZW1bMF0sIHRydWUpXG5cbiAgICAgICAgICAvLyBVcGRhdGUgdGhlIGNvbnRlbnRcbiAgICAgICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcbiAgICAgICAgfSlcbiAgICAgIH1cblxuICAgICAgLy8gSW5zdGVhZCBpZiB0aGVyZSBhcmUgbXVsdGlwbGUgbm9kZXMgaW5zaWRlIHRoZSBwYXJhZ3JhcGhcbiAgICAgIGVsc2Uge1xuXG4gICAgICAgIC8vIElzdGFudGlhdGUgdGhlIHJhbmdlIHRvIGJlIHNlbGVjdGVkXG4gICAgICAgIGxldCByYW5nZSA9IGRvY3VtZW50LmNyZWF0ZVJhbmdlKClcblxuICAgICAgICAvLyBTdGFydCB0aGUgcmFuZ2UgZnJvbSB0aGUgc2VsZWN0ZWQgbm9kZSBhbmQgb2Zmc2V0IGFuZCBlbmRzIGl0IGF0IHRoZSBlbmQgb2YgdGhlIGxhc3Qgbm9kZVxuICAgICAgICByYW5nZS5zZXRTdGFydCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Um5nKCkuc3RhcnRDb250YWluZXIsIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRSbmcoKS5zdGFydE9mZnNldClcbiAgICAgICAgcmFuZ2Uuc2V0RW5kKHRoaXMuZ2V0TGFzdE5vdEVtcHR5Tm9kZShub2RlcyksIDEpXG5cbiAgICAgICAgLy8gU2VsZWN0IHRoZSByYW5nZVxuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2V0Um5nKHJhbmdlKVxuXG4gICAgICAgIC8vIFNhdmUgdGhlIGh0bWwgY29udGVudFxuICAgICAgICBuZXdUZXh0ID0gdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldENvbnRlbnQoKVxuXG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgIHAuaHRtbChwLmh0bWwoKS5yZXBsYWNlKG5ld1RleHQsICcnKSlcblxuICAgICAgICAgIGlmICghcC50ZXh0KCkubGVuZ3RoKVxuICAgICAgICAgICAgcC5odG1sKEJSKVxuXG4gICAgICAgICAgLy8gQ3JlYXRlIGFuZCBhZGQgdGhlIG5ldyBsaVxuICAgICAgICAgIGxldCBuZXdMaXN0SXRlbSA9ICQoYDxsaT48cD4ke25ld1RleHR9PC9wPjwvbGk+YClcbiAgICAgICAgICBsaXN0SXRlbS5hZnRlcihuZXdMaXN0SXRlbSlcblxuICAgICAgICAgIC8vIE1vdmUgdGhlIGNhcmV0IHRvIHRoZSBuZXcgbGlcbiAgICAgICAgICBtb3ZlQ2FyZXQobmV3TGlzdEl0ZW1bMF0sIHRydWUpXG5cbiAgICAgICAgICAvLyBVcGRhdGUgdGhlIGNvbnRlbnRcbiAgICAgICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgZ2V0TGFzdE5vdEVtcHR5Tm9kZTogZnVuY3Rpb24gKG5vZGVzKSB7XG5cbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbm9kZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKG5vZGVzW2ldLm5vZGVUeXBlID09IDMgJiYgIW5vZGVzW2ldLmxlbmd0aClcbiAgICAgICAgICBub2Rlcy5zcGxpY2UoaSwgMSlcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG5vZGVzW25vZGVzLmxlbmd0aCAtIDFdXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIHJlbW92ZUxpc3RJdGVtOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgIC8vIEdldCB0aGUgc2VsZWN0ZWQgbGlzdEl0ZW1cbiAgICAgIGxldCBsaXN0SXRlbSA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSkucGFyZW50KCdsaScpXG5cbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAvLyBBZGQgYSBlbXB0eSBwYXJhZ3JhcGggYWZ0ZXIgdGhlIGxpc3RcbiAgICAgICAgbGV0IG5ld1AgPSAkKCc8cD48YnI+PC9wPicpXG4gICAgICAgIGxpc3RJdGVtLnBhcmVudCgpLmFmdGVyKG5ld1ApXG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIGxpc3QgaGFzIGV4YWN0bHkgb25lIGNoaWxkIHJlbW92ZSB0aGUgbGlzdFxuICAgICAgICBpZiAobGlzdEl0ZW0ucGFyZW50KCkuY2hpbGRyZW4oJ2xpJykubGVuZ3RoID09IDEpIHtcbiAgICAgICAgICBsZXQgbGlzdCA9IGxpc3RJdGVtLnBhcmVudCgpXG4gICAgICAgICAgbGlzdC5yZW1vdmUoKVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gSWYgdGhlIGxpc3QgaGFzIG1vcmUgY2hpbGRyZW4gcmVtb3ZlIHRoZSBzZWxlY3RlZCBjaGlsZFxuICAgICAgICBlbHNlXG4gICAgICAgICAgbGlzdEl0ZW0ucmVtb3ZlKClcblxuICAgICAgICBtb3ZlQ2FyZXQobmV3UFswXSlcblxuICAgICAgICAvLyBVcGRhdGUgdGhlIGNvbnRlbnRcbiAgICAgICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG4gICAgICB9KVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBuZXN0OiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgIGxldCBwID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuICAgICAgbGV0IGxpc3RJdGVtID0gcC5wYXJlbnQoJ2xpJylcblxuICAgICAgLy8gQ2hlY2sgaWYgdGhlIGN1cnJlbnQgbGkgaGFzIGF0IGxlYXN0IG9uZSBwcmV2aW91cyBlbGVtZW50XG4gICAgICBpZiAobGlzdEl0ZW0ucHJldkFsbCgpLmxlbmd0aCA+IDApIHtcblxuICAgICAgICAvLyBDcmVhdGUgdGhlIG5ldyBsaXN0XG4gICAgICAgIGxldCB0ZXh0ID0gJzxicj4nXG5cbiAgICAgICAgaWYgKHAudGV4dCgpLnRyaW0oKS5sZW5ndGgpXG4gICAgICAgICAgdGV4dCA9IHAudGV4dCgpLnRyaW0oKVxuXG4gICAgICAgIC8vIEdldCB0eXBlIG9mIHRoZSBwYXJlbnQgbGlzdFxuICAgICAgICBsZXQgdHlwZSA9IGxpc3RJdGVtLnBhcmVudCgpWzBdLnRhZ05hbWUudG9Mb3dlckNhc2UoKVxuXG4gICAgICAgIC8vIENyZWF0ZSB0aGUgbmV3IG5lc3RlZCBsaXN0XG4gICAgICAgIGxldCBuZXdMaXN0SXRlbSA9ICQobGlzdEl0ZW1bMF0ub3V0ZXJIVE1MKVxuXG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgIC8vIElmIHRoZSBwcmV2aW91cyBlbGVtZW50IGhhcyBhIGxpc3RcbiAgICAgICAgICBpZiAobGlzdEl0ZW0ucHJldigpLmZpbmQoJ3VsLG9sJykubGVuZ3RoKVxuICAgICAgICAgICAgbGlzdEl0ZW0ucHJldigpLmZpbmQoJ3VsLG9sJykuYXBwZW5kKG5ld0xpc3RJdGVtKVxuXG4gICAgICAgICAgLy8gQWRkIHRoZSBuZXcgbGlzdCBpbnNpZGUgdGhlIHByZXZpb3VzIGxpXG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBuZXdMaXN0SXRlbSA9ICQoYDwke3R5cGV9PiR7bmV3TGlzdEl0ZW1bMF0ub3V0ZXJIVE1MfTwvJHt0eXBlfT5gKVxuICAgICAgICAgICAgbGlzdEl0ZW0ucHJldigpLmFwcGVuZChuZXdMaXN0SXRlbSlcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBsaXN0SXRlbS5yZW1vdmUoKVxuXG4gICAgICAgICAgLy8gTW92ZSB0aGUgY2FyZXQgYXQgdGhlIGVuZCBvZiB0aGUgbmV3IHAgXG4gICAgICAgICAgbW92ZUNhcmV0KG5ld0xpc3RJdGVtLmZpbmQoJ3AnKVswXSlcblxuICAgICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuICAgICAgICB9KVxuICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBkZU5lc3Q6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgbGV0IGxpc3RJdGVtID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKS5wYXJlbnQoJ2xpJylcbiAgICAgIGxldCBsaXN0ID0gbGlzdEl0ZW0ucGFyZW50KClcblxuICAgICAgLy8gQ2hlY2sgaWYgdGhlIGN1cnJlbnQgbGlzdCBoYXMgYXQgbGVhc3QgYW5vdGhlciBsaXN0IGFzIHBhcmVudFxuICAgICAgaWYgKGxpc3RJdGVtLnBhcmVudHMoJ3VsLG9sJykubGVuZ3RoID4gMSkge1xuXG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgIC8vIEdldCBhbGwgbGk6IGN1cnJlbnQgYW5kIGlmIHRoZXJlIGFyZSBzdWNjZXNzaXZlXG4gICAgICAgICAgbGV0IG5leHRMaSA9IFtsaXN0SXRlbV1cbiAgICAgICAgICBpZiAobGlzdEl0ZW0ubmV4dEFsbCgpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGxpc3RJdGVtLm5leHRBbGwoKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgbmV4dExpLnB1c2goJCh0aGlzKSlcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gTW92ZSBhbGwgbGkgb3V0IGZyb20gdGhlIG5lc3RlZCBsaXN0XG4gICAgICAgICAgZm9yIChsZXQgaSA9IG5leHRMaS5sZW5ndGggLSAxOyBpID4gLTE7IGktLSkge1xuICAgICAgICAgICAgbmV4dExpW2ldLnJlbW92ZSgpXG4gICAgICAgICAgICBsaXN0LnBhcmVudCgpLmFmdGVyKG5leHRMaVtpXSlcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBJZiBlbXB0eSByZW1vdmUgdGhlIGxpc3RcbiAgICAgICAgICBpZiAoIWxpc3QuY2hpbGRyZW4oJ2xpJykubGVuZ3RoKVxuICAgICAgICAgICAgbGlzdC5yZW1vdmUoKVxuXG4gICAgICAgICAgLy8gTW92ZSB0aGUgY2FyZXQgYXQgdGhlIGVuZFxuICAgICAgICAgIG1vdmVDYXJldChsaXN0SXRlbS5maW5kKCdwJylbMF0pXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIGFkZFBhcmFncmFwaDogZnVuY3Rpb24gKCkge1xuXG4gICAgICAvLyBHZXQgcmVmZXJlbmNlcyBvZiBjdXJyZW50IHBcbiAgICAgIGxldCBwID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuICAgICAgbGV0IHN0YXJ0T2Zmc2V0ID0gdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldFJuZygpLnN0YXJ0T2Zmc2V0XG4gICAgICBsZXQgcFRleHQgPSBwLnRleHQoKS50cmltKClcblxuICAgICAgbGV0IHRleHQgPSAnPGJyPidcblxuICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIC8vIElmIHRoZSBFTlRFUiBicmVha3MgcFxuICAgICAgICBpZiAoc3RhcnRPZmZzZXQgIT0gcFRleHQubGVuZ3RoKSB7XG5cbiAgICAgICAgICAvLyBVcGRhdGUgdGhlIHRleHQgb2YgdGhlIGN1cnJlbnQgbGlcbiAgICAgICAgICBwLnRleHQocFRleHQuc3Vic3RyaW5nKDAsIHN0YXJ0T2Zmc2V0KSlcblxuICAgICAgICAgIC8vIEdldCB0aGUgcmVtYWluaW5nIHRleHRcbiAgICAgICAgICB0ZXh0ID0gcFRleHQuc3Vic3RyaW5nKHN0YXJ0T2Zmc2V0LCBwVGV4dC5sZW5ndGgpXG4gICAgICAgIH1cblxuICAgICAgICAvLyBDcmVhdGUgYW5kIGFkZCB0aGUgZWxlbWVudFxuICAgICAgICBsZXQgbmV3UCA9ICQoYDxwPiR7dGV4dH08L3A+YClcbiAgICAgICAgcC5hZnRlcihuZXdQKVxuXG4gICAgICAgIG1vdmVDYXJldChuZXdQWzBdLCB0cnVlKVxuICAgICAgfSlcbiAgICB9XG4gIH1cbn0pIiwiLyoqXG4gKiBcbiAqL1xuXG5mdW5jdGlvbiBvcGVuTWV0YWRhdGFEaWFsb2coKSB7XG4gIHRpbnltY2UuYWN0aXZlRWRpdG9yLndpbmRvd01hbmFnZXIub3Blbih7XG4gICAgdGl0bGU6ICdFZGl0IG1ldGFkYXRhJyxcbiAgICB1cmw6ICdqcy9yYWplLWNvcmUvcGx1Z2luL3JhamVfbWV0YWRhdGEuaHRtbCcsXG4gICAgd2lkdGg6IDk1MCxcbiAgICBoZWlnaHQ6IDgwMCxcbiAgICBvbkNsb3NlOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgIGlmICh0aW55bWNlLmFjdGl2ZUVkaXRvci51cGRhdGVkX21ldGFkYXRhICE9IG51bGwpIHtcblxuICAgICAgICBtZXRhZGF0YS51cGRhdGUodGlueW1jZS5hY3RpdmVFZGl0b3IudXBkYXRlZF9tZXRhZGF0YSlcblxuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51cGRhdGVkX21ldGFkYXRhID09IG51bGxcbiAgICAgIH1cblxuICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iud2luZG93TWFuYWdlci5jbG9zZSgpXG4gICAgfVxuICB9LCBtZXRhZGF0YS5nZXRBbGxNZXRhZGF0YSgpKVxufVxuXG50aW55bWNlLlBsdWdpbk1hbmFnZXIuYWRkKCdyYWplX21ldGFkYXRhJywgZnVuY3Rpb24gKGVkaXRvciwgdXJsKSB7XG5cbiAgLy8gQWRkIGEgYnV0dG9uIHRoYXQgaGFuZGxlIHRoZSBpbmxpbmUgZWxlbWVudFxuICBlZGl0b3IuYWRkQnV0dG9uKCdyYWplX21ldGFkYXRhJywge1xuICAgIHRleHQ6ICdNZXRhZGF0YScsXG4gICAgaWNvbjogZmFsc2UsXG4gICAgdG9vbHRpcDogJ0VkaXQgbWV0YWRhdGEnLFxuXG4gICAgLy8gQnV0dG9uIGJlaGF2aW91clxuICAgIG9uY2xpY2s6IGZ1bmN0aW9uICgpIHtcbiAgICAgIG9wZW5NZXRhZGF0YURpYWxvZygpXG4gICAgfVxuICB9KVxuXG4gIGVkaXRvci5vbignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuICAgIGlmICgkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpLmlzKEhFQURFUl9TRUxFQ1RPUikpXG4gICAgICBvcGVuTWV0YWRhdGFEaWFsb2coKVxuICB9KVxuXG4gIG1ldGFkYXRhID0ge1xuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgZ2V0QWxsTWV0YWRhdGE6IGZ1bmN0aW9uICgpIHtcbiAgICAgIGxldCBoZWFkZXIgPSAkKEhFQURFUl9TRUxFQ1RPUilcbiAgICAgIGxldCBzdWJ0aXRsZSA9IGhlYWRlci5maW5kKCdoMS50aXRsZSA+IHNtYWxsJykudGV4dCgpXG4gICAgICBsZXQgZGF0YSA9IHtcbiAgICAgICAgc3VidGl0bGU6IHN1YnRpdGxlLFxuICAgICAgICB0aXRsZTogaGVhZGVyLmZpbmQoJ2gxLnRpdGxlJykudGV4dCgpLnJlcGxhY2Uoc3VidGl0bGUsICcnKSxcbiAgICAgICAgYXV0aG9yczogbWV0YWRhdGEuZ2V0QXV0aG9ycyhoZWFkZXIpLFxuICAgICAgICBjYXRlZ29yaWVzOiBtZXRhZGF0YS5nZXRDYXRlZ29yaWVzKGhlYWRlciksXG4gICAgICAgIGtleXdvcmRzOiBtZXRhZGF0YS5nZXRLZXl3b3JkcyhoZWFkZXIpXG4gICAgICB9XG5cbiAgICAgIHJldHVybiBkYXRhXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIGdldEF1dGhvcnM6IGZ1bmN0aW9uIChoZWFkZXIpIHtcbiAgICAgIGxldCBhdXRob3JzID0gW11cblxuICAgICAgaGVhZGVyLmZpbmQoJ2FkZHJlc3MubGVhZC5hdXRob3JzJykuZWFjaChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgLy8gR2V0IGFsbCBhZmZpbGlhdGlvbnNcbiAgICAgICAgbGV0IGFmZmlsaWF0aW9ucyA9IFtdXG4gICAgICAgICQodGhpcykuZmluZCgnc3BhbicpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGFmZmlsaWF0aW9ucy5wdXNoKCQodGhpcykudGV4dCgpKVxuICAgICAgICB9KVxuXG4gICAgICAgIC8vIHB1c2ggc2luZ2xlIGF1dGhvclxuICAgICAgICBhdXRob3JzLnB1c2goe1xuICAgICAgICAgIG5hbWU6ICQodGhpcykuY2hpbGRyZW4oJ3N0cm9uZy5hdXRob3JfbmFtZScpLnRleHQoKSxcbiAgICAgICAgICBlbWFpbDogJCh0aGlzKS5maW5kKCdjb2RlLmVtYWlsID4gYScpLnRleHQoKSxcbiAgICAgICAgICBhZmZpbGlhdGlvbnM6IGFmZmlsaWF0aW9uc1xuICAgICAgICB9KVxuICAgICAgfSlcblxuICAgICAgcmV0dXJuIGF1dGhvcnNcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgZ2V0Q2F0ZWdvcmllczogZnVuY3Rpb24gKGhlYWRlcikge1xuICAgICAgbGV0IGNhdGVnb3JpZXMgPSBbXVxuXG4gICAgICBoZWFkZXIuZmluZCgncC5hY21fc3ViamVjdF9jYXRlZ29yaWVzID4gY29kZScpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICBjYXRlZ29yaWVzLnB1c2goJCh0aGlzKS50ZXh0KCkpXG4gICAgICB9KVxuXG4gICAgICByZXR1cm4gY2F0ZWdvcmllc1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBnZXRLZXl3b3JkczogZnVuY3Rpb24gKGhlYWRlcikge1xuICAgICAgbGV0IGtleXdvcmRzID0gW11cblxuICAgICAgaGVhZGVyLmZpbmQoJ3VsLmxpc3QtaW5saW5lID4gbGkgPiBjb2RlJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIGtleXdvcmRzLnB1c2goJCh0aGlzKS50ZXh0KCkpXG4gICAgICB9KVxuXG4gICAgICByZXR1cm4ga2V5d29yZHNcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgdXBkYXRlOiBmdW5jdGlvbiAodXBkYXRlZE1ldGFkYXRhKSB7XG5cbiAgICAgICQoJ2hlYWQgbWV0YVtwcm9wZXJ0eV0sIGhlYWQgbGlua1twcm9wZXJ0eV0sIGhlYWQgbWV0YVtuYW1lXScpLnJlbW92ZSgpXG5cbiAgICAgIGxldCBjdXJyZW50TWV0YWRhdGEgPSBtZXRhZGF0YS5nZXRBbGxNZXRhZGF0YSgpXG5cbiAgICAgIC8vIFVwZGF0ZSB0aXRsZSBhbmQgc3VidGl0bGVcbiAgICAgIGlmICh1cGRhdGVkTWV0YWRhdGEudGl0bGUgIT0gY3VycmVudE1ldGFkYXRhLnRpdGxlIHx8IHVwZGF0ZWRNZXRhZGF0YS5zdWJ0aXRsZSAhPSBjdXJyZW50TWV0YWRhdGEuc3VidGl0bGUpIHtcbiAgICAgICAgbGV0IHRleHQgPSB1cGRhdGVkTWV0YWRhdGEudGl0bGVcblxuICAgICAgICBpZiAodXBkYXRlZE1ldGFkYXRhLnN1YnRpdGxlLnRyaW0oKS5sZW5ndGgpXG4gICAgICAgICAgdGV4dCArPSBgIC0tICR7dXBkYXRlZE1ldGFkYXRhLnN1YnRpdGxlfWBcblxuICAgICAgICAkKCd0aXRsZScpLnRleHQodGV4dClcbiAgICAgIH1cblxuICAgICAgbGV0IGFmZmlsaWF0aW9uc0NhY2hlID0gW11cblxuICAgICAgdXBkYXRlZE1ldGFkYXRhLmF1dGhvcnMuZm9yRWFjaChmdW5jdGlvbiAoYXV0aG9yKSB7XG5cbiAgICAgICAgJCgnaGVhZCcpLmFwcGVuZChgPG1ldGEgYWJvdXQ9XCJtYWlsdG86JHthdXRob3IuZW1haWx9XCIgdHlwZW9mPVwic2NoZW1hOlBlcnNvblwiIHByb3BlcnR5PVwic2NoZW1hOm5hbWVcIiBuYW1lPVwiZGMuY3JlYXRvclwiIGNvbnRlbnQ9XCIke2F1dGhvci5uYW1lfVwiPmApXG4gICAgICAgICQoJ2hlYWQnKS5hcHBlbmQoYDxtZXRhIGFib3V0PVwibWFpbHRvOiR7YXV0aG9yLmVtYWlsfVwiIHByb3BlcnR5PVwic2NoZW1hOmVtYWlsXCIgY29udGVudD1cIiR7YXV0aG9yLmVtYWlsfVwiPmApXG5cbiAgICAgICAgYXV0aG9yLmFmZmlsaWF0aW9ucy5mb3JFYWNoKGZ1bmN0aW9uIChhZmZpbGlhdGlvbikge1xuXG4gICAgICAgICAgLy8gTG9vayB1cCBmb3IgYWxyZWFkeSBleGlzdGluZyBhZmZpbGlhdGlvblxuICAgICAgICAgIGxldCB0b0FkZCA9IHRydWVcbiAgICAgICAgICBsZXQgaWRcblxuICAgICAgICAgIGFmZmlsaWF0aW9uc0NhY2hlLmZvckVhY2goZnVuY3Rpb24gKGFmZmlsaWF0aW9uQ2FjaGUpIHtcbiAgICAgICAgICAgIGlmIChhZmZpbGlhdGlvbkNhY2hlLmNvbnRlbnQgPT0gYWZmaWxpYXRpb24pIHtcbiAgICAgICAgICAgICAgdG9BZGQgPSBmYWxzZVxuICAgICAgICAgICAgICBpZCA9IGFmZmlsaWF0aW9uQ2FjaGUuaWRcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KVxuXG4gICAgICAgICAgLy8gSWYgdGhlcmUgaXMgbm8gZXhpc3RpbmcgYWZmaWxpYXRpb24sIGFkZCBpdFxuICAgICAgICAgIGlmICh0b0FkZCkge1xuICAgICAgICAgICAgbGV0IGdlbmVyYXRlZElkID0gYCNhZmZpbGlhdGlvbl8ke2FmZmlsaWF0aW9uc0NhY2hlLmxlbmd0aCsxfWBcbiAgICAgICAgICAgIGFmZmlsaWF0aW9uc0NhY2hlLnB1c2goe1xuICAgICAgICAgICAgICBpZDogZ2VuZXJhdGVkSWQsXG4gICAgICAgICAgICAgIGNvbnRlbnQ6IGFmZmlsaWF0aW9uXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgaWQgPSBnZW5lcmF0ZWRJZFxuICAgICAgICAgIH1cblxuICAgICAgICAgICQoJ2hlYWQnKS5hcHBlbmQoYDxsaW5rIGFib3V0PVwibWFpbHRvOiR7YXV0aG9yLmVtYWlsfVwiIHByb3BlcnR5PVwic2NoZW1hOmFmZmlsaWF0aW9uXCIgaHJlZj1cIiR7aWR9XCI+YClcbiAgICAgICAgfSlcbiAgICAgIH0pXG5cbiAgICAgIGFmZmlsaWF0aW9uc0NhY2hlLmZvckVhY2goZnVuY3Rpb24gKGFmZmlsaWF0aW9uQ2FjaGUpIHtcbiAgICAgICAgJCgnaGVhZCcpLmFwcGVuZChgPG1ldGEgYWJvdXQ9XCIke2FmZmlsaWF0aW9uQ2FjaGUuaWR9XCIgdHlwZW9mPVwic2NoZW1hOk9yZ2FuaXphdGlvblwiIHByb3BlcnR5PVwic2NoZW1hOm5hbWVcIiBjb250ZW50PVwiJHthZmZpbGlhdGlvbkNhY2hlLmNvbnRlbnR9XCI+YClcbiAgICAgIH0pXG5cbiAgICAgIHVwZGF0ZWRNZXRhZGF0YS5jYXRlZ29yaWVzLmZvckVhY2goZnVuY3Rpb24oY2F0ZWdvcnkpe1xuICAgICAgICAkKCdoZWFkJykuYXBwZW5kKGA8bWV0YSBuYW1lPVwiZGN0ZXJtcy5zdWJqZWN0XCIgY29udGVudD1cIiR7Y2F0ZWdvcnl9XCIvPmApXG4gICAgICB9KVxuXG4gICAgICB1cGRhdGVkTWV0YWRhdGEua2V5d29yZHMuZm9yRWFjaChmdW5jdGlvbihrZXl3b3JkKXtcbiAgICAgICAgJCgnaGVhZCcpLmFwcGVuZChgPG1ldGEgcHJvcGVydHk9XCJwcmlzbTprZXl3b3JkXCIgY29udGVudD1cIiR7a2V5d29yZH1cIi8+YClcbiAgICAgIH0pXG5cbiAgICAgICQoJyNyYWplX3Jvb3QnKS5hZGRIZWFkZXJIVE1MKClcbiAgICAgIHNldE5vbkVkaXRhYmxlSGVhZGVyKClcbiAgICAgIHVwZGF0ZUlmcmFtZUZyb21TYXZlZENvbnRlbnQoKVxuICAgIH1cbiAgfVxuXG59KSIsInRpbnltY2UuUGx1Z2luTWFuYWdlci5hZGQoJ3JhamVfc2F2ZScsIGZ1bmN0aW9uIChlZGl0b3IsIHVybCkge1xuXG4gIHNhdmVNYW5hZ2VyID0ge1xuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgaW5pdFNhdmU6IGZ1bmN0aW9uICgpIHtcbiAgICAgIC8vIFJldHVybiB0aGUgbWVzc2FnZSBmb3IgdGhlIGJhY2tlbmRcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHRpdGxlOiBzYXZlTWFuYWdlci5nZXRUaXRsZSgpLFxuICAgICAgICBkb2N1bWVudDogc2F2ZU1hbmFnZXIuZ2V0RGVyYXNoZWRBcnRpY2xlKClcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgc2F2ZUFzOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgIC8vIFNlbmQgbWVzc2FnZSB0byB0aGUgYmFja2VuZFxuICAgICAgc2F2ZUFzQXJ0aWNsZShzYXZlTWFuYWdlci5pbml0U2F2ZSgpKVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBzYXZlOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgIC8vIFNlbmQgbWVzc2FnZSB0byB0aGUgYmFja2VuZFxuICAgICAgc2F2ZUFydGljbGUoc2F2ZU1hbmFnZXIuaW5pdFNhdmUoKSlcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0dXJuIHRoZSBSQVNIIGFydGljbGUgcmVuZGVyZWQgKHdpdGhvdXQgdGlueW1jZSlcbiAgICAgKi9cbiAgICBnZXREZXJhc2hlZEFydGljbGU6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgLy8gU2F2ZSBodG1sIHJlZmVyZW5jZXNcbiAgICAgIGxldCBhcnRpY2xlID0gJCgnaHRtbCcpLmNsb25lKClcbiAgICAgIGxldCB0aW55bWNlU2F2ZWRDb250ZW50ID0gYXJ0aWNsZS5maW5kKCcjcmFqZV9yb290JylcblxuICAgICAgYXJ0aWNsZS5yZW1vdmVBdHRyKCdjbGFzcycpXG5cbiAgICAgIC8vcmVwbGFjZSBib2R5IHdpdGggdGhlIHJpZ2h0IG9uZSAodGhpcyBhY3Rpb24gcmVtb3ZlIHRpbnltY2UpXG4gICAgICBhcnRpY2xlLmZpbmQoJ2JvZHknKS5odG1sKHRpbnltY2VTYXZlZENvbnRlbnQuaHRtbCgpKVxuICAgICAgYXJ0aWNsZS5maW5kKCdib2R5JykucmVtb3ZlQXR0cignc3R5bGUnKVxuICAgICAgYXJ0aWNsZS5maW5kKCdib2R5JykucmVtb3ZlQXR0cignY2xhc3MnKVxuXG4gICAgICAvL3JlbW92ZSBhbGwgc3R5bGUgYW5kIGxpbmsgdW4tbmVlZGVkIGZyb20gdGhlIGhlYWRcbiAgICAgIGFydGljbGUuZmluZCgnaGVhZCcpLmNoaWxkcmVuKCdzdHlsZVt0eXBlPVwidGV4dC9jc3NcIl0nKS5yZW1vdmUoKVxuICAgICAgYXJ0aWNsZS5maW5kKCdoZWFkJykuY2hpbGRyZW4oJ2xpbmtbaWRdJykucmVtb3ZlKClcblxuICAgICAgLy8gRXhlY3V0ZSBkZXJhc2ggKHJlcGxhY2UgYWxsIGNnZW4gZWxlbWVudHMgd2l0aCBpdHMgb3JpZ2luYWwgY29udGVudClcbiAgICAgIGFydGljbGUuZmluZCgnKltkYXRhLXJhc2gtb3JpZ2luYWwtY29udGVudF0nKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbGV0IG9yaWdpbmFsQ29udGVudCA9ICQodGhpcykuYXR0cignZGF0YS1yYXNoLW9yaWdpbmFsLWNvbnRlbnQnKVxuICAgICAgICAkKHRoaXMpLnJlcGxhY2VXaXRoKG9yaWdpbmFsQ29udGVudClcbiAgICAgIH0pXG5cbiAgICAgIC8vIEV4ZWN1dGUgZGVyYXNoIGNoYW5naW5nIHRoZSB3cmFwcGVyXG4gICAgICBhcnRpY2xlLmZpbmQoJypbZGF0YS1yYXNoLW9yaWdpbmFsLXdyYXBwZXJdJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIGxldCBjb250ZW50ID0gJCh0aGlzKS5odG1sKClcbiAgICAgICAgbGV0IHdyYXBwZXIgPSAkKHRoaXMpLmF0dHIoJ2RhdGEtcmFzaC1vcmlnaW5hbC13cmFwcGVyJylcbiAgICAgICAgJCh0aGlzKS5yZXBsYWNlV2l0aChgPCR7d3JhcHBlcn0+JHtjb250ZW50fTwvJHt3cmFwcGVyfT5gKVxuICAgICAgfSlcblxuICAgICAgLy8gUmVtb3ZlIHRhcmdldCBmcm9tIFRpbnlNQ0UgbGlua1xuICAgICAgYXJ0aWNsZS5maW5kKCdhW3RhcmdldF0nKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgJCh0aGlzKS5yZW1vdmVBdHRyKCd0YXJnZXQnKVxuICAgICAgfSlcblxuICAgICAgLy8gUmVtb3ZlIGNvbnRlbnRlZGl0YWJsZSBmcm9tIFRpbnlNQ0UgbGlua1xuICAgICAgYXJ0aWNsZS5maW5kKCdhW2NvbnRlbnRlZGl0YWJsZV0nKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgJCh0aGlzKS5yZW1vdmVBdHRyKCdjb250ZW50ZWRpdGFibGUnKVxuICAgICAgfSlcblxuICAgICAgLy8gUmVtb3ZlIG5vdCBhbGxvd2VkIHNwYW4gZWxtZW50cyBpbnNpZGUgdGhlIGZvcm11bGFcbiAgICAgIGFydGljbGUuZmluZChGSUdVUkVfRk9STVVMQV9TRUxFQ1RPUikuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICQodGhpcykuY2hpbGRyZW4oJ3AnKS5odG1sKCQodGhpcykuZmluZCgnc3Bhbltjb250ZW50ZWRpdGFibGVdJykuaHRtbCgpKVxuICAgICAgfSlcblxuICAgICAgYXJ0aWNsZS5maW5kKGAke0ZJR1VSRV9GT1JNVUxBX1NFTEVDVE9SfSwke0lOTElORV9GT1JNVUxBX1NFTEVDVE9SfWApLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoJCh0aGlzKS5maW5kKCdzdmdbZGF0YS1tYXRobWxdJykubGVuZ3RoKSB7XG4gICAgICAgICAgJCh0aGlzKS5jaGlsZHJlbigncCcpLmh0bWwoJCh0aGlzKS5maW5kKCdzdmdbZGF0YS1tYXRobWxdJykuYXR0cignZGF0YS1tYXRobWwnKSlcbiAgICAgICAgfVxuICAgICAgfSlcblxuICAgICAgcmV0dXJuIG5ldyBYTUxTZXJpYWxpemVyKCkuc2VyaWFsaXplVG9TdHJpbmcoYXJ0aWNsZVswXSlcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0dXJuIHRoZSB0aXRsZSBcbiAgICAgKi9cbiAgICBnZXRUaXRsZTogZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuICQoJ3RpdGxlJykudGV4dCgpXG4gICAgfSxcblxuICB9XG59KSIsIi8qKlxuICogUkFTSCBzZWN0aW9uIHBsdWdpbiBSQUpFXG4gKi9cblxuY29uc3QgTk9OX0VESVRBQkxFX0hFQURFUl9TRUxFQ1RPUiA9ICdoZWFkZXIucGFnZS1oZWFkZXIuY29udGFpbmVyLmNnZW4nXG5jb25zdCBCSUJMSU9FTlRSWV9TVUZGSVggPSAnYmlibGlvZW50cnlfJ1xuY29uc3QgRU5ETk9URV9TVUZGSVggPSAnZW5kbm90ZV8nXG5cbmNvbnN0IEJJQkxJT0dSQVBIWV9TRUxFQ1RPUiA9ICdzZWN0aW9uW3JvbGU9ZG9jLWJpYmxpb2dyYXBoeV0nXG5jb25zdCBCSUJMSU9FTlRSWV9TRUxFQ1RPUiA9ICdsaVtyb2xlPWRvYy1iaWJsaW9lbnRyeV0nXG5cbmNvbnN0IEVORE5PVEVTX1NFTEVDVE9SID0gJ3NlY3Rpb25bcm9sZT1kb2MtZW5kbm90ZXNdJ1xuY29uc3QgRU5ETk9URV9TRUxFQ1RPUiA9ICdzZWN0aW9uW3JvbGU9ZG9jLWVuZG5vdGVdJ1xuXG5jb25zdCBBQlNUUkFDVF9TRUxFQ1RPUiA9ICdzZWN0aW9uW3JvbGU9ZG9jLWFic3RyYWN0XSdcbmNvbnN0IEFDS05PV0xFREdFTUVOVFNfU0VMRUNUT1IgPSAnc2VjdGlvbltyb2xlPWRvYy1hY2tub3dsZWRnZW1lbnRzXSdcblxuY29uc3QgTUFJTl9TRUNUSU9OX1NFTEVDVE9SID0gJ2RpdiNyYWplX3Jvb3QgPiBzZWN0aW9uOm5vdChbcm9sZV0pJ1xuY29uc3QgU0VDVElPTl9TRUxFQ1RPUiA9ICdzZWN0aW9uOm5vdChbcm9sZV0pJ1xuY29uc3QgU1BFQ0lBTF9TRUNUSU9OX1NFTEVDVE9SID0gJ3NlY3Rpb25bcm9sZV0nXG5cbmNvbnN0IE1FTlVfU0VMRUNUT1IgPSAnZGl2W2lkXj1tY2V1X11baWQkPS1ib2R5XVtyb2xlPW1lbnVdJ1xuXG5jb25zdCBIRUFESU5HID0gJ0hlYWRpbmcnXG5cbmNvbnN0IEhFQURJTkdfVFJBU0ZPUk1BVElPTl9GT1JCSURERU4gPSAnRXJyb3IsIHlvdSBjYW5ub3QgdHJhbnNmb3JtIHRoZSBjdXJyZW50IGhlYWRlciBpbiB0aGlzIHdheSEnXG5cbnRpbnltY2UuUGx1Z2luTWFuYWdlci5hZGQoJ3JhamVfc2VjdGlvbicsIGZ1bmN0aW9uIChlZGl0b3IsIHVybCkge1xuXG4gIGxldCByYWplX3NlY3Rpb25fZmxhZyA9IGZhbHNlXG4gIGxldCByYWplX3N0b3JlZF9zZWxlY3Rpb25cblxuICBlZGl0b3IuYWRkQnV0dG9uKCdyYWplX3NlY3Rpb24nLCB7XG4gICAgdHlwZTogJ21lbnVidXR0b24nLFxuICAgIHRleHQ6ICdIZWFkaW5ncycsXG4gICAgdGl0bGU6ICdoZWFkaW5nJyxcbiAgICBpY29uczogZmFsc2UsXG5cbiAgICAvLyBTZWN0aW9ucyBzdWIgbWVudVxuICAgIG1lbnU6IFt7XG4gICAgICB0ZXh0OiBgJHtIRUFESU5HfSAxLmAsXG4gICAgICBvbmNsaWNrOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHNlY3Rpb24uYWRkKDEpXG4gICAgICB9XG4gICAgfSwge1xuICAgICAgdGV4dDogYCR7SEVBRElOR30gMS4xLmAsXG4gICAgICBvbmNsaWNrOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHNlY3Rpb24uYWRkKDIpXG4gICAgICB9XG4gICAgfSwge1xuICAgICAgdGV4dDogYCR7SEVBRElOR30gMS4xLjEuYCxcbiAgICAgIG9uY2xpY2s6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgc2VjdGlvbi5hZGQoMylcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICB0ZXh0OiBgJHtIRUFESU5HfSAxLjEuMS4xLmAsXG4gICAgICBvbmNsaWNrOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHNlY3Rpb24uYWRkKDQpXG4gICAgICB9XG4gICAgfSwge1xuICAgICAgdGV4dDogYCR7SEVBRElOR30gMS4xLjEuMS4xLmAsXG4gICAgICBvbmNsaWNrOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHNlY3Rpb24uYWRkKDUpXG4gICAgICB9XG4gICAgfSwge1xuICAgICAgdGV4dDogYCR7SEVBRElOR30gMS4xLjEuMS4xLjEuYCxcbiAgICAgIG9uY2xpY2s6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgc2VjdGlvbi5hZGQoNilcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICB0ZXh0OiAnU3BlY2lhbCcsXG4gICAgICBtZW51OiBbe1xuICAgICAgICAgIHRleHQ6ICdBYnN0cmFjdCcsXG4gICAgICAgICAgb25jbGljazogZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgICBzZWN0aW9uLmFkZEFic3RyYWN0KClcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICB0ZXh0OiAnQWNrbm93bGVkZ2VtZW50cycsXG4gICAgICAgICAgb25jbGljazogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VjdGlvbi5hZGRBY2tub3dsZWRnZW1lbnRzKClcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICB0ZXh0OiAnUmVmZXJlbmNlcycsXG4gICAgICAgICAgb25jbGljazogZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcblxuICAgICAgICAgICAgLy8gT25seSBpZiBiaWJsaW9ncmFwaHkgc2VjdGlvbiBkb2Vzbid0IGV4aXN0c1xuICAgICAgICAgICAgaWYgKCEkKEJJQkxJT0dSQVBIWV9TRUxFQ1RPUikubGVuZ3RoKSB7XG5cbiAgICAgICAgICAgICAgLy8gVE9ETyBjaGFuZ2UgaGVyZVxuICAgICAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgLy8gQWRkIG5ldyBiaWJsaW9lbnRyeVxuICAgICAgICAgICAgICAgIHNlY3Rpb24uYWRkQmlibGlvZW50cnkoKVxuXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIGlmcmFtZVxuICAgICAgICAgICAgICAgIHVwZGF0ZUlmcmFtZUZyb21TYXZlZENvbnRlbnQoKVxuXG4gICAgICAgICAgICAgICAgLy9tb3ZlIGNhcmV0IGFuZCBzZXQgZm9jdXMgdG8gYWN0aXZlIGFkaXRvciAjMTA1XG4gICAgICAgICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLnNlbGVjdCh0aW55bWNlLmFjdGl2ZUVkaXRvci5kb20uc2VsZWN0KGAke0JJQkxJT0VOVFJZX1NFTEVDVE9SfTpsYXN0LWNoaWxkYClbMF0sIHRydWUpXG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9IGVsc2VcbiAgICAgICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLnNlbGVjdCh0aW55bWNlLmFjdGl2ZUVkaXRvci5kb20uc2VsZWN0KGAke0JJQkxJT0dSQVBIWV9TRUxFQ1RPUn0+aDFgKVswXSlcblxuICAgICAgICAgICAgc2Nyb2xsVG8oYCR7QklCTElPRU5UUllfU0VMRUNUT1J9Omxhc3QtY2hpbGRgKVxuXG4gICAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5mb2N1cygpXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICBdXG4gICAgfV1cbiAgfSlcblxuICBlZGl0b3Iub24oJ2tleURvd24nLCBmdW5jdGlvbiAoZSkge1xuXG4gICAgLy8gaW5zdGFuY2Ugb2YgdGhlIHNlbGVjdGVkIGVsZW1lbnRcbiAgICBsZXQgc2VsZWN0ZWRFbGVtZW50ID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuXG4gICAgdHJ5IHtcblxuICAgICAgbGV0IGtleWNvZGUgPSBlLmtleUNvZGVcblxuICAgICAgLy8gU2F2ZSBib3VuZHMgb2YgY3VycmVudCBzZWxlY3Rpb24gKHN0YXJ0IGFuZCBlbmQpXG4gICAgICBsZXQgc3RhcnROb2RlID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Um5nKCkuc3RhcnRDb250YWluZXIpXG4gICAgICBsZXQgZW5kTm9kZSA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldFJuZygpLmVuZENvbnRhaW5lcilcblxuICAgICAgY29uc3QgU1BFQ0lBTF9DSEFSUyA9XG4gICAgICAgIChrZXljb2RlID4gNDcgJiYga2V5Y29kZSA8IDU4KSB8fCAvLyBudW1iZXIga2V5c1xuICAgICAgICAoa2V5Y29kZSA+IDk1ICYmIGtleWNvZGUgPCAxMTIpIHx8IC8vIG51bXBhZCBrZXlzXG4gICAgICAgIChrZXljb2RlID4gMTg1ICYmIGtleWNvZGUgPCAxOTMpIHx8IC8vIDs9LC0uL2AgKGluIG9yZGVyKVxuICAgICAgICAoa2V5Y29kZSA+IDIxOCAmJiBrZXljb2RlIDwgMjIzKTsgLy8gW1xcXScgKGluIG9yZGVyKVxuXG4gICAgICAvLyBCbG9jayBzcGVjaWFsIGNoYXJzIGluIHNwZWNpYWwgZWxlbWVudHNcbiAgICAgIGlmIChTUEVDSUFMX0NIQVJTICYmXG4gICAgICAgIChzdGFydE5vZGUucGFyZW50cyhTUEVDSUFMX1NFQ1RJT05fU0VMRUNUT1IpLmxlbmd0aCB8fCBlbmROb2RlLnBhcmVudHMoU1BFQ0lBTF9TRUNUSU9OX1NFTEVDVE9SKS5sZW5ndGgpICYmXG4gICAgICAgIChzdGFydE5vZGUucGFyZW50cygnaDEnKS5sZW5ndGggPiAwIHx8IGVuZE5vZGUucGFyZW50cygnaDEnKS5sZW5ndGggPiAwKSlcbiAgICAgICAgcmV0dXJuIGZhbHNlXG5cbiAgICAgIC8vICMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuICAgICAgLy8gIyMjIEJBQ0tTUEFDRSAmJiBDQU5DIFBSRVNTRUQgIyMjXG4gICAgICAvLyAjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiAgICAgIGlmIChlLmtleUNvZGUgPT0gOCB8fCBlLmtleUNvZGUgPT0gNDYpIHtcblxuICAgICAgICBsZXQgdG9SZW1vdmVTZWN0aW9ucyA9IHNlY3Rpb24uZ2V0U2VjdGlvbnNpblNlbGVjdGlvbih0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24pXG4gICAgICAgIHJhamVfc2VjdGlvbl9mbGFnID0gdHJ1ZVxuXG4gICAgICAgIC8vIFByZXZlbnQgcmVtb3ZlIGZyb20gaGVhZGVyXG4gICAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQuaXMoTk9OX0VESVRBQkxFX0hFQURFUl9TRUxFQ1RPUikgfHxcbiAgICAgICAgICAoc2VsZWN0ZWRFbGVtZW50LmF0dHIoJ2RhdGEtbWNlLWNhcmV0JykgPT0gJ2FmdGVyJyAmJiBzZWxlY3RlZEVsZW1lbnQucGFyZW50KCkuaXMoUkFKRV9TRUxFQ1RPUikpIHx8XG4gICAgICAgICAgKHNlbGVjdGVkRWxlbWVudC5hdHRyKCdkYXRhLW1jZS1jYXJldCcpICYmIHNlbGVjdGVkRWxlbWVudC5wYXJlbnQoKS5pcyhSQUpFX1NFTEVDVE9SKSkgPT0gJ2JlZm9yZScpXG4gICAgICAgICAgcmV0dXJuIGZhbHNlXG5cbiAgICAgICAgLy8gSWYgc2VsZWN0aW9uIGlzbid0IGNvbGxhcHNlZCBtYW5hZ2UgZGVsZXRlXG4gICAgICAgIGlmICghdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmlzQ29sbGFwc2VkKCkpIHtcbiAgICAgICAgICByZXR1cm4gc2VjdGlvbi5tYW5hZ2VEZWxldGUoKVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gSWYgU0VMRUNUSU9OIFNUQVJUUyBvciBFTkRTIGluIHNwZWNpYWwgc2VjdGlvblxuICAgICAgICBlbHNlIGlmIChzdGFydE5vZGUucGFyZW50cyhTUEVDSUFMX1NFQ1RJT05fU0VMRUNUT1IpLmxlbmd0aCB8fCBlbmROb2RlLnBhcmVudHMoU1BFQ0lBTF9TRUNUSU9OX1NFTEVDVE9SKS5sZW5ndGgpIHtcblxuICAgICAgICAgIGxldCBzdGFydE9mZnNldCA9IHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRSbmcoKS5zdGFydE9mZnNldFxuICAgICAgICAgIGxldCBzdGFydE9mZnNldE5vZGUgPSAwXG4gICAgICAgICAgbGV0IGVuZE9mZnNldCA9IHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRSbmcoKS5lbmRPZmZzZXRcbiAgICAgICAgICBsZXQgZW5kT2Zmc2V0Tm9kZSA9IHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRSbmcoKS5lbmRDb250YWluZXIubGVuZ3RoXG5cbiAgICAgICAgICAvLyBDb21wbGV0ZWx5IHJlbW92ZSB0aGUgY3VycmVudCBzcGVjaWFsIHNlY3Rpb24gaWYgaXMgZW50aXJlbHkgc2VsZWN0ZWRcbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAvLyBDaGVjayBpZiB0aGUgc2VsZWN0aW9uIGNvbnRhaW5zIHRoZSBlbnRpcmUgc2VjdGlvblxuICAgICAgICAgICAgc3RhcnRPZmZzZXQgPT0gc3RhcnRPZmZzZXROb2RlICYmIGVuZE9mZnNldCA9PSBlbmRPZmZzZXROb2RlICYmXG5cbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoZSBzZWxlY3Rpb24gc3RhcnRzIGZyb20gaDFcbiAgICAgICAgICAgIChzdGFydE5vZGUucGFyZW50cygnaDEnKS5sZW5ndGggIT0gZW5kTm9kZS5wYXJlbnRzKCdoMScpLmxlbmd0aCkgJiYgKHN0YXJ0Tm9kZS5wYXJlbnRzKCdoMScpLmxlbmd0aCB8fCBlbmROb2RlLnBhcmVudHMoJ2gxJykubGVuZ3RoKSAmJlxuXG4gICAgICAgICAgICAvLyBDaGVjayBpZiB0aGUgc2VsZWN0aW9uIGVuZHMgaW4gdGhlIGxhc3QgY2hpbGRcbiAgICAgICAgICAgIChzdGFydE5vZGUucGFyZW50cyhTUEVDSUFMX1NFQ1RJT05fU0VMRUNUT1IpLmNoaWxkcmVuKCkubGVuZ3RoID09ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldFJuZygpLmVuZENvbnRhaW5lcikucGFyZW50c1VudGlsKFNQRUNJQUxfU0VDVElPTl9TRUxFQ1RPUikuaW5kZXgoKSArIDEpKSB7XG5cbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBSZW1vdmUgdGhlIGN1cnJlbnQgc3BlY2lhbCBzZWN0aW9uIGlmIHNlbGVjdGlvbiBpcyBhdCB0aGUgc3RhcnQgb2YgaDEgQU5EIHNlbGVjdGlvbiBpcyBjb2xsYXBzZWQgXG4gICAgICAgICAgaWYgKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5pc0NvbGxhcHNlZCgpICYmIChzdGFydE5vZGUucGFyZW50cygnaDEnKS5sZW5ndGggfHwgc3RhcnROb2RlLmlzKCdoMScpKSAmJiBzdGFydE9mZnNldCA9PSAwKSB7XG5cbiAgICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgICAgICAvLyBSZW1vdmUgdGhlIHNlY3Rpb24gYW5kIHVwZGF0ZSBcbiAgICAgICAgICAgICAgc2VsZWN0ZWRFbGVtZW50LnBhcmVudChTUEVDSUFMX1NFQ1RJT05fU0VMRUNUT1IpLnJlbW92ZSgpXG4gICAgICAgICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuXG4gICAgICAgICAgICAgIC8vIFVwZGF0ZSByZWZlcmVuY2VzXG4gICAgICAgICAgICAgIHVwZGF0ZVJlZmVyZW5jZXMoKVxuICAgICAgICAgICAgICB1cGRhdGVJZnJhbWVGcm9tU2F2ZWRDb250ZW50KClcbiAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIENoZWsgaWYgaW5zaWRlIHRoZSBzZWxlY3Rpb24gdG8gcmVtb3ZlLCB0aGVyZSBpcyBiaWJsaW9ncmFwaHlcbiAgICAgICAgICBsZXQgaGFzQmlibGlvZ3JhcGh5ID0gZmFsc2VcbiAgICAgICAgICAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRDb250ZW50KCkpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKCQodGhpcykuaXMoQklCTElPR1JBUEhZX1NFTEVDVE9SKSlcbiAgICAgICAgICAgICAgaGFzQmlibGlvZ3JhcGh5ID0gdHJ1ZVxuICAgICAgICAgIH0pXG5cbiAgICAgICAgICBpZiAoaGFzQmlibGlvZ3JhcGh5KSB7XG5cbiAgICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgICAgICAvLyBFeGVjdXRlIG5vcm1hbCBkZWxldGVcbiAgICAgICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IuZXhlY0NvbW1hbmQoJ2RlbGV0ZScpXG5cbiAgICAgICAgICAgICAgLy8gVXBkYXRlIHNhdmVkIGNvbnRlbnRcbiAgICAgICAgICAgICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG5cbiAgICAgICAgICAgICAgLy8gUmVtb3ZlIHNlbGVjdG9yIHdpdGhvdXQgaGFkZXJcbiAgICAgICAgICAgICAgJChCSUJMSU9HUkFQSFlfU0VMRUNUT1IpLnJlbW92ZSgpXG5cbiAgICAgICAgICAgICAgLy8gVXBkYXRlIGlmcmFtZSBhbmQgcmVzdG9yZSBzZWxlY3Rpb25cbiAgICAgICAgICAgICAgdXBkYXRlSWZyYW1lRnJvbVNhdmVkQ29udGVudCgpXG4gICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBpZiBzZWxlY3Rpb24gc3RhcnRzIG9yIGVuZHMgaW4gYSBiaWJsaW9lbnRyeVxuICAgICAgICAgIGlmIChzdGFydE5vZGUucGFyZW50cyhCSUJMSU9FTlRSWV9TRUxFQ1RPUikubGVuZ3RoIHx8IGVuZE5vZGUucGFyZW50cyhCSUJMSU9FTlRSWV9TRUxFQ1RPUikubGVuZ3RoKSB7XG5cbiAgICAgICAgICAgIC8vIEJvdGggZGVsZXRlIGV2ZW50IGFuZCB1cGRhdGUgYXJlIHN0b3JlZCBpbiBhIHNpbmdsZSB1bmRvIGxldmVsXG4gICAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IuZXhlY0NvbW1hbmQoJ2RlbGV0ZScpXG4gICAgICAgICAgICAgIHNlY3Rpb24udXBkYXRlQmlibGlvZ3JhcGh5U2VjdGlvbigpXG4gICAgICAgICAgICAgIHVwZGF0ZVJlZmVyZW5jZXMoKVxuXG4gICAgICAgICAgICAgIC8vIHVwZGF0ZSBpZnJhbWVcbiAgICAgICAgICAgICAgdXBkYXRlSWZyYW1lRnJvbVNhdmVkQ29udGVudCgpXG4gICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuXG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7fVxuXG4gICAgLy8gIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4gICAgLy8gIyMjIyMjIyMjIEVOVEVSIFBSRVNTRUQgIyMjIyMjIyMjXG4gICAgLy8gIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4gICAgaWYgKGUua2V5Q29kZSA9PSAxMykge1xuXG4gICAgICAvLyBXaGVuIGVudGVyIGlzIHByZXNzZWQgaW5zaWRlIGFuIGhlYWRlciwgbm90IGF0IHRoZSBlbmQgb2YgaXRcbiAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQuaXMoJ2gxLGgyLGgzLGg0LGg1LGg2JykgJiYgc2VsZWN0ZWRFbGVtZW50LnRleHQoKS50cmltKCkubGVuZ3RoICE9IHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRSbmcoKS5zdGFydE9mZnNldCkge1xuXG4gICAgICAgIHNlY3Rpb24uYWRkV2l0aEVudGVyKClcbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICB9XG5cbiAgICAgIC8vIElmIHNlbGVjdGlvbiBpcyBiZWZvcmUvYWZ0ZXIgaGVhZGVyXG4gICAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LmlzKCdwJykpIHtcblxuICAgICAgICAvLyBCbG9jayBlbnRlciBiZWZvcmUgaGVhZGVyXG4gICAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQuYXR0cignZGF0YS1tY2UtY2FyZXQnKSA9PSAnYmVmb3JlJylcbiAgICAgICAgICByZXR1cm4gZmFsc2VcblxuXG4gICAgICAgIC8vIEFkZCBuZXcgc2VjdGlvbiBhZnRlciBoZWFkZXJcbiAgICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC5hdHRyKCdkYXRhLW1jZS1jYXJldCcpID09ICdhZnRlcicpIHtcbiAgICAgICAgICBzZWN0aW9uLmFkZCgxKVxuICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIElmIGVudGVyIGlzIHByZXNzZWQgaW5zaWRlIGJpYmxpb2dyYXBoeSBzZWxlY3RvclxuICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKEJJQkxJT0dSQVBIWV9TRUxFQ1RPUikubGVuZ3RoKSB7XG5cbiAgICAgICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG5cbiAgICAgICAgbGV0IGlkID0gZ2V0U3VjY2Vzc2l2ZUVsZW1lbnRJZChCSUJMSU9FTlRSWV9TRUxFQ1RPUiwgQklCTElPRU5UUllfU1VGRklYKVxuXG4gICAgICAgIC8vIFByZXNzaW5nIGVudGVyIGluIGgxIHdpbGwgYWRkIGEgbmV3IGJpYmxpb2VudHJ5IGFuZCBjYXJldCByZXBvc2l0aW9uXG4gICAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQuaXMoJ2gxJykpIHtcblxuICAgICAgICAgIHNlY3Rpb24uYWRkQmlibGlvZW50cnkoaWQpXG4gICAgICAgICAgdXBkYXRlSWZyYW1lRnJvbVNhdmVkQ29udGVudCgpXG4gICAgICAgIH1cblxuICAgICAgICAvLyBJZiBzZWxlY3RlZCBlbGVtZW50IGlzIGluc2lkZSB0ZXh0XG4gICAgICAgIGVsc2UgaWYgKHNlbGVjdGVkRWxlbWVudC5pcygncCcpKVxuICAgICAgICAgIHNlY3Rpb24uYWRkQmlibGlvZW50cnkoaWQsIG51bGwsIHNlbGVjdGVkRWxlbWVudC5wYXJlbnQoJ2xpJykpXG5cblxuICAgICAgICAvLyBJZiBzZWxlY3RlZCBlbGVtZW50IGlzIHdpdGhvdXQgdGV4dFxuICAgICAgICBlbHNlIGlmIChzZWxlY3RlZEVsZW1lbnQuaXMoJ2xpJykpXG4gICAgICAgICAgc2VjdGlvbi5hZGRCaWJsaW9lbnRyeShpZCwgbnVsbCwgc2VsZWN0ZWRFbGVtZW50KVxuXG4gICAgICAgIC8vIE1vdmUgY2FyZXQgIzEwNVxuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2V0Q3Vyc29yTG9jYXRpb24odGlueW1jZS5hY3RpdmVFZGl0b3IuZG9tLnNlbGVjdChgJHtCSUJMSU9FTlRSWV9TRUxFQ1RPUn0jJHtpZH0gPiBwYClbMF0sIGZhbHNlKVxuICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgIH1cblxuICAgICAgLy8gQWRkaW5nIHNlY3Rpb25zIHdpdGggc2hvcnRjdXRzICNcbiAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQuaXMoJ3AnKSAmJiBzZWxlY3RlZEVsZW1lbnQudGV4dCgpLnRyaW0oKS5zdWJzdHJpbmcoMCwgMSkgPT0gJyMnKSB7XG5cbiAgICAgICAgbGV0IGxldmVsID0gc2VjdGlvbi5nZXRMZXZlbEZyb21IYXNoKHNlbGVjdGVkRWxlbWVudC50ZXh0KCkudHJpbSgpKVxuICAgICAgICBsZXQgZGVlcG5lc3MgPSAkKHNlbGVjdGVkRWxlbWVudCkucGFyZW50c1VudGlsKFJBSkVfU0VMRUNUT1IpLmxlbmd0aCAtIGxldmVsICsgMVxuXG4gICAgICAgIC8vIEluc2VydCBzZWN0aW9uIG9ubHkgaWYgY2FyZXQgaXMgaW5zaWRlIGFic3RyYWN0IHNlY3Rpb24sIGFuZCB1c2VyIGlzIGdvaW5nIHRvIGluc2VydCBhIHN1YiBzZWN0aW9uXG4gICAgICAgIC8vIE9SIHRoZSBjdXJzb3IgaXNuJ3QgaW5zaWRlIG90aGVyIHNwZWNpYWwgc2VjdGlvbnNcbiAgICAgICAgLy8gQU5EIHNlbGVjdGVkRWxlbWVudCBpc24ndCBpbnNpZGUgYSBmaWd1cmVcbiAgICAgICAgaWYgKCgoc2VsZWN0ZWRFbGVtZW50LnBhcmVudHMoQUJTVFJBQ1RfU0VMRUNUT1IpLmxlbmd0aCAmJiBkZWVwbmVzcyA+IDApIHx8ICFzZWxlY3RlZEVsZW1lbnQucGFyZW50cyhTUEVDSUFMX1NFQ1RJT05fU0VMRUNUT1IpLmxlbmd0aCkgJiYgIXNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKEZJR1VSRV9TRUxFQ1RPUikubGVuZ3RoKSB7XG5cbiAgICAgICAgICBzZWN0aW9uLmFkZChsZXZlbCwgc2VsZWN0ZWRFbGVtZW50LnRleHQoKS5zdWJzdHJpbmcobGV2ZWwpLnRyaW0oKSlcbiAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfSlcblxuICBlZGl0b3Iub24oJ05vZGVDaGFuZ2UnLCBmdW5jdGlvbiAoZSkge1xuICAgIHNlY3Rpb24udXBkYXRlU2VjdGlvblRvb2xiYXIoKVxuICB9KVxufSlcblxuc2VjdGlvbiA9IHtcblxuICAvKipcbiAgICogRnVuY3Rpb24gY2FsbGVkIHdoZW4gYSBuZXcgc2VjdGlvbiBuZWVkcyB0byBiZSBhdHRhY2hlZCwgd2l0aCBidXR0b25zXG4gICAqL1xuICBhZGQ6IGZ1bmN0aW9uIChsZXZlbCwgdGV4dCkge1xuXG4gICAgLy8gU2VsZWN0IGN1cnJlbnQgbm9kZVxuICAgIGxldCBzZWxlY3RlZEVsZW1lbnQgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG5cbiAgICAvLyBDcmVhdGUgdGhlIHNlY3Rpb25cbiAgICBsZXQgbmV3U2VjdGlvbiA9IHRoaXMuY3JlYXRlKHRleHQgIT0gbnVsbCA/IHRleHQgOiBzZWxlY3RlZEVsZW1lbnQuaHRtbCgpLnRyaW0oKSwgbGV2ZWwpXG5cbiAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgIC8vIENoZWNrIHdoYXQga2luZCBvZiBzZWN0aW9uIG5lZWRzIHRvIGJlIGluc2VydGVkXG4gICAgICBpZiAoc2VjdGlvbi5tYW5hZ2VTZWN0aW9uKHNlbGVjdGVkRWxlbWVudCwgbmV3U2VjdGlvbiwgbGV2ZWwgPyBsZXZlbCA6IHNlbGVjdGVkRWxlbWVudC5wYXJlbnRzVW50aWwoUkFKRV9TRUxFQ1RPUikubGVuZ3RoKSkge1xuXG4gICAgICAgIC8vIFJlbW92ZSB0aGUgc2VsZWN0ZWQgc2VjdGlvblxuICAgICAgICBzZWxlY3RlZEVsZW1lbnQucmVtb3ZlKClcblxuICAgICAgICAvLyBJZiB0aGUgbmV3IGhlYWRpbmcgaGFzIHRleHQgbm9kZXMsIHRoZSBvZmZzZXQgd29uJ3QgYmUgMCAoYXMgbm9ybWFsKSBidXQgaW5zdGVhZCBpdCdsbCBiZSBsZW5ndGggb2Ygbm9kZSB0ZXh0XG4gICAgICAgIG1vdmVDYXJldChuZXdTZWN0aW9uLmZpbmQoJzpoZWFkZXInKS5maXJzdCgpWzBdKVxuXG4gICAgICAgIC8vIFVwZGF0ZSBlZGl0b3IgY29udGVudFxuICAgICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcbiAgICAgIH1cbiAgICB9KVxuICB9LFxuXG4gIC8qKlxuICAgKiBGdW5jdGlvbiBjYWxsZWQgd2hlbiBhIG5ldyBzZWN0aW9uIG5lZWRzIHRvIGJlIGF0dGFjaGVkLCB3aXRoIGJ1dHRvbnNcbiAgICovXG4gIGFkZFdpdGhFbnRlcjogZnVuY3Rpb24gKCkge1xuXG4gICAgLy8gU2VsZWN0IGN1cnJlbnQgbm9kZVxuICAgIGxldCBzZWxlY3RlZEVsZW1lbnQgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG5cbiAgICAvLyBJZiB0aGUgc2VjdGlvbiBpc24ndCBzcGVjaWFsXG4gICAgaWYgKCFzZWxlY3RlZEVsZW1lbnQucGFyZW50KCkuYXR0cigncm9sZScpKSB7XG5cbiAgICAgIGxldmVsID0gc2VsZWN0ZWRFbGVtZW50LnBhcmVudHNVbnRpbChSQUpFX1NFTEVDVE9SKS5sZW5ndGhcblxuICAgICAgLy8gQ3JlYXRlIHRoZSBzZWN0aW9uXG4gICAgICBsZXQgbmV3U2VjdGlvbiA9IHRoaXMuY3JlYXRlKHNlbGVjdGVkRWxlbWVudC50ZXh0KCkudHJpbSgpLnN1YnN0cmluZyh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Um5nKCkuc3RhcnRPZmZzZXQpLCBsZXZlbClcblxuICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIC8vIENoZWNrIHdoYXQga2luZCBvZiBzZWN0aW9uIG5lZWRzIHRvIGJlIGluc2VydGVkXG4gICAgICAgIHNlY3Rpb24ubWFuYWdlU2VjdGlvbihzZWxlY3RlZEVsZW1lbnQsIG5ld1NlY3Rpb24sIGxldmVsKVxuXG4gICAgICAgIC8vIFJlbW92ZSB0aGUgc2VsZWN0ZWQgc2VjdGlvblxuICAgICAgICBzZWxlY3RlZEVsZW1lbnQuaHRtbChzZWxlY3RlZEVsZW1lbnQudGV4dCgpLnRyaW0oKS5zdWJzdHJpbmcoMCwgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldFJuZygpLnN0YXJ0T2Zmc2V0KSlcblxuICAgICAgICBtb3ZlQ2FyZXQobmV3U2VjdGlvbi5maW5kKCc6aGVhZGVyJykuZmlyc3QoKVswXSwgdHJ1ZSlcblxuICAgICAgICAvLyBVcGRhdGUgZWRpdG9yXG4gICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuICAgICAgfSlcbiAgICB9IGVsc2VcbiAgICAgIG5vdGlmeSgnRXJyb3IsIGhlYWRlcnMgb2Ygc3BlY2lhbCBzZWN0aW9ucyAoYWJzdHJhY3QsIGFja25vd2xlZG1lbnRzKSBjYW5ub3QgYmUgc3BsaXR0ZWQnLCAnZXJyb3InLCA0MDAwKVxuICB9LFxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIGxhc3QgaW5zZXJ0ZWQgaWRcbiAgICovXG4gIGdldE5leHRJZDogZnVuY3Rpb24gKCkge1xuICAgIGxldCBpZCA9IDBcbiAgICAkKCdzZWN0aW9uW2lkXScpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKCQodGhpcykuYXR0cignaWQnKS5pbmRleE9mKCdzZWN0aW9uJykgPiAtMSkge1xuICAgICAgICBsZXQgY3VycklkID0gcGFyc2VJbnQoJCh0aGlzKS5hdHRyKCdpZCcpLnJlcGxhY2UoJ3NlY3Rpb24nLCAnJykpXG4gICAgICAgIGlkID0gaWQgPiBjdXJySWQgPyBpZCA6IGN1cnJJZFxuICAgICAgfVxuICAgIH0pXG4gICAgcmV0dXJuIGBzZWN0aW9uJHtpZCsxfWBcbiAgfSxcblxuICAvKipcbiAgICogUmV0cmlldmUgYW5kIHRoZW4gcmVtb3ZlIGV2ZXJ5IHN1Y2Nlc3NpdmUgZWxlbWVudHMgXG4gICAqL1xuICBnZXRTdWNjZXNzaXZlRWxlbWVudHM6IGZ1bmN0aW9uIChlbGVtZW50LCBkZWVwbmVzcykge1xuXG4gICAgbGV0IHN1Y2Nlc3NpdmVFbGVtZW50cyA9ICQoJzxkaXY+PC9kaXY+JylcblxuICAgIHdoaWxlIChkZWVwbmVzcyA+PSAwKSB7XG5cbiAgICAgIGlmIChlbGVtZW50Lm5leHRBbGwoJzpub3QoLmZvb3RlciknKSkge1xuXG4gICAgICAgIC8vIElmIHRoZSBkZWVwbmVzcyBpcyAwLCBvbmx5IHBhcmFncmFwaCBhcmUgc2F2ZWQgKG5vdCBzZWN0aW9ucylcbiAgICAgICAgaWYgKGRlZXBuZXNzID09IDApIHtcbiAgICAgICAgICAvLyBTdWNjZXNzaXZlIGVsZW1lbnRzIGNhbiBiZSBwIG9yIGZpZ3VyZXNcbiAgICAgICAgICBzdWNjZXNzaXZlRWxlbWVudHMuYXBwZW5kKGVsZW1lbnQubmV4dEFsbChgcCwke0ZJR1VSRV9TRUxFQ1RPUn1gKSlcbiAgICAgICAgICBlbGVtZW50Lm5leHRBbGwoKS5yZW1vdmUoYHAsJHtGSUdVUkVfU0VMRUNUT1J9YClcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdWNjZXNzaXZlRWxlbWVudHMuYXBwZW5kKGVsZW1lbnQubmV4dEFsbCgpKVxuICAgICAgICAgIGVsZW1lbnQubmV4dEFsbCgpLnJlbW92ZSgpXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgZWxlbWVudCA9IGVsZW1lbnQucGFyZW50KCdzZWN0aW9uJylcbiAgICAgIGRlZXBuZXNzLS1cbiAgICB9XG5cbiAgICByZXR1cm4gJChzdWNjZXNzaXZlRWxlbWVudHMuaHRtbCgpKVxuICB9LFxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGdldExldmVsRnJvbUhhc2g6IGZ1bmN0aW9uICh0ZXh0KSB7XG5cbiAgICBsZXQgbGV2ZWwgPSAwXG4gICAgdGV4dCA9IHRleHQuc3Vic3RyaW5nKDAsIHRleHQubGVuZ3RoID49IDYgPyA2IDogdGV4dC5sZW5ndGgpXG5cbiAgICB3aGlsZSAodGV4dC5sZW5ndGggPiAwKSB7XG5cbiAgICAgIGlmICh0ZXh0LnN1YnN0cmluZyh0ZXh0Lmxlbmd0aCAtIDEpID09ICcjJylcbiAgICAgICAgbGV2ZWwrK1xuXG4gICAgICAgIHRleHQgPSB0ZXh0LnN1YnN0cmluZygwLCB0ZXh0Lmxlbmd0aCAtIDEpXG4gICAgfVxuXG4gICAgcmV0dXJuIGxldmVsXG4gIH0sXG5cbiAgLyoqXG4gICAqIFJldHVybiBKUWV1cnkgb2JqZWN0IHRoYXQgcmVwcmVzZW50IHRoZSBzZWN0aW9uXG4gICAqL1xuICBjcmVhdGU6IGZ1bmN0aW9uICh0ZXh0LCBsZXZlbCkge1xuICAgIC8vIENyZWF0ZSB0aGUgc2VjdGlvblxuXG4gICAgLy8gVHJpbSB3aGl0ZSBzcGFjZXMgYW5kIGFkZCB6ZXJvX3NwYWNlIGNoYXIgaWYgbm90aGluZyBpcyBpbnNpZGVcblxuICAgIGlmICh0eXBlb2YgdGV4dCAhPSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICB0ZXh0ID0gdGV4dC50cmltKClcbiAgICAgIGlmICh0ZXh0Lmxlbmd0aCA9PSAwKVxuICAgICAgICB0ZXh0ID0gXCI8YnI+XCJcbiAgICB9IGVsc2VcbiAgICAgIHRleHQgPSBcIjxicj5cIlxuXG4gICAgcmV0dXJuICQoYDxzZWN0aW9uIGlkPVwiJHt0aGlzLmdldE5leHRJZCgpfVwiPjxoJHtsZXZlbH0gZGF0YS1yYXNoLW9yaWdpbmFsLXdyYXBwZXI9XCJoMVwiPiR7dGV4dH08L2gke2xldmVsfT48L3NlY3Rpb24+YClcbiAgfSxcblxuICAvKipcbiAgICogQ2hlY2sgd2hhdCBraW5kIG9mIHNlY3Rpb24gbmVlZHMgdG8gYmUgYWRkZWQsIGFuZCBwcmVjZWVkXG4gICAqL1xuICBtYW5hZ2VTZWN0aW9uOiBmdW5jdGlvbiAoc2VsZWN0ZWRFbGVtZW50LCBuZXdTZWN0aW9uLCBsZXZlbCkge1xuXG4gICAgbGV0IGRlZXBuZXNzID0gJChzZWxlY3RlZEVsZW1lbnQpLnBhcmVudHNVbnRpbChSQUpFX1NFTEVDVE9SKS5sZW5ndGggLSBsZXZlbCArIDFcblxuICAgIGlmIChkZWVwbmVzcyA+PSAwKSB7XG5cbiAgICAgIC8vIEJsb2NrIGluc2VydCBzZWxlY3Rpb24gaWYgY2FyZXQgaXMgaW5zaWRlIHNwZWNpYWwgc2VjdGlvbiwgYW5kIHVzZXIgaXMgZ29pbmcgdG8gaW5zZXJ0IGEgc3ViIHNlY3Rpb25cbiAgICAgIGlmICgoc2VsZWN0ZWRFbGVtZW50LnBhcmVudHMoU1BFQ0lBTF9TRUNUSU9OX1NFTEVDVE9SKS5sZW5ndGggJiYgZGVlcG5lc3MgIT0gMSkgfHwgKHNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKEFDS05PV0xFREdFTUVOVFNfU0VMRUNUT1IpLmxlbmd0aCAmJlxuICAgICAgICAgIHNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKEJJQkxJT0dSQVBIWV9TRUxFQ1RPUikgJiZcbiAgICAgICAgICBzZWxlY3RlZEVsZW1lbnQucGFyZW50cyhFTkROT1RFU19TRUxFQ1RPUikpKVxuICAgICAgICByZXR1cm4gZmFsc2VcblxuICAgICAgLy8gR2V0IGRpcmVjdCBwYXJlbnQgYW5kIGFuY2VzdG9yIHJlZmVyZW5jZVxuICAgICAgbGV0IHN1Y2Nlc3NpdmVFbGVtZW50cyA9IHRoaXMuZ2V0U3VjY2Vzc2l2ZUVsZW1lbnRzKHNlbGVjdGVkRWxlbWVudCwgZGVlcG5lc3MpXG5cbiAgICAgIGlmIChzdWNjZXNzaXZlRWxlbWVudHMubGVuZ3RoKVxuICAgICAgICBuZXdTZWN0aW9uLmFwcGVuZChzdWNjZXNzaXZlRWxlbWVudHMpXG5cbiAgICAgIC8vIENBU0U6IHN1YiBzZWN0aW9uXG4gICAgICBpZiAoZGVlcG5lc3MgPT0gMClcbiAgICAgICAgc2VsZWN0ZWRFbGVtZW50LmFmdGVyKG5ld1NlY3Rpb24pXG5cbiAgICAgIC8vIENBU0U6IHNpYmxpbmcgc2VjdGlvblxuICAgICAgZWxzZSBpZiAoZGVlcG5lc3MgPT0gMSlcbiAgICAgICAgc2VsZWN0ZWRFbGVtZW50LnBhcmVudCgnc2VjdGlvbicpLmFmdGVyKG5ld1NlY3Rpb24pXG5cbiAgICAgIC8vIENBU0U6IGFuY2VzdG9yIHNlY3Rpb24gYXQgYW55IHVwbGV2ZWxcbiAgICAgIGVsc2VcbiAgICAgICAgJChzZWxlY3RlZEVsZW1lbnQucGFyZW50cygnc2VjdGlvbicpW2RlZXBuZXNzIC0gMV0pLmFmdGVyKG5ld1NlY3Rpb24pXG5cbiAgICAgIGhlYWRpbmdEaW1lbnNpb24oKVxuXG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogXG4gICAqL1xuICB1cGdyYWRlOiBmdW5jdGlvbiAoKSB7XG5cbiAgICBsZXQgc2VsZWN0ZWRFbGVtZW50ID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuXG4gICAgaWYgKHNlbGVjdGVkRWxlbWVudC5pcygnaDEsaDIsaDMsaDQsaDUsaDYnKSkge1xuXG4gICAgICAvLyBHZXQgdGhlIHJlZmVyZW5jZXMgb2Ygc2VsZWN0ZWQgYW5kIHBhcmVudCBzZWN0aW9uXG4gICAgICBsZXQgc2VsZWN0ZWRTZWN0aW9uID0gc2VsZWN0ZWRFbGVtZW50LnBhcmVudChTRUNUSU9OX1NFTEVDVE9SKVxuICAgICAgbGV0IHBhcmVudFNlY3Rpb24gPSBzZWxlY3RlZFNlY3Rpb24ucGFyZW50KFNFQ1RJT05fU0VMRUNUT1IpXG5cbiAgICAgIC8vIElmIHRoZXJlIGlzIGEgcGFyZW50IHNlY3Rpb24gdXBncmFkZSBpcyBhbGxvd2VkXG4gICAgICBpZiAocGFyZW50U2VjdGlvbi5sZW5ndGgpIHtcblxuICAgICAgICAvLyBFdmVyeXRoaW5nIGluIGhlcmUsIGlzIGFuIGF0b21pYyB1bmRvIGxldmVsXG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgIC8vIFNhdmUgdGhlIHNlY3Rpb24gYW5kIGRldGFjaFxuICAgICAgICAgIGxldCBib2R5U2VjdGlvbiA9ICQoc2VsZWN0ZWRTZWN0aW9uWzBdLm91dGVySFRNTClcbiAgICAgICAgICBzZWxlY3RlZFNlY3Rpb24uZGV0YWNoKClcblxuICAgICAgICAgIC8vIFVwZGF0ZSBkaW1lbnNpb24gYW5kIG1vdmUgdGhlIHNlY3Rpb24gb3V0XG4gICAgICAgICAgcGFyZW50U2VjdGlvbi5hZnRlcihib2R5U2VjdGlvbilcblxuICAgICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuICAgICAgICAgIGhlYWRpbmdEaW1lbnNpb24oKVxuICAgICAgICAgIHVwZGF0ZUlmcmFtZUZyb21TYXZlZENvbnRlbnQoKVxuICAgICAgICB9KVxuICAgICAgfVxuXG4gICAgICAvLyBOb3RpZnkgZXJyb3JcbiAgICAgIGVsc2VcbiAgICAgICAgbm90aWZ5KEhFQURJTkdfVFJBU0ZPUk1BVElPTl9GT1JCSURERU4sICdlcnJvcicsIDIwMDApXG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGRvd25ncmFkZTogZnVuY3Rpb24gKCkge1xuXG4gICAgbGV0IHNlbGVjdGVkRWxlbWVudCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcblxuICAgIGlmIChzZWxlY3RlZEVsZW1lbnQuaXMoJ2gxLGgyLGgzLGg0LGg1LGg2JykpIHtcbiAgICAgIC8vIEdldCB0aGUgcmVmZXJlbmNlcyBvZiBzZWxlY3RlZCBhbmQgc2libGluZyBzZWN0aW9uXG4gICAgICBsZXQgc2VsZWN0ZWRTZWN0aW9uID0gc2VsZWN0ZWRFbGVtZW50LnBhcmVudChTRUNUSU9OX1NFTEVDVE9SKVxuICAgICAgbGV0IHNpYmxpbmdTZWN0aW9uID0gc2VsZWN0ZWRTZWN0aW9uLnByZXYoU0VDVElPTl9TRUxFQ1RPUilcblxuICAgICAgLy8gSWYgdGhlcmUgaXMgYSBwcmV2aW91cyBzaWJsaW5nIHNlY3Rpb24gZG93bmdyYWRlIGlzIGFsbG93ZWRcbiAgICAgIGlmIChzaWJsaW5nU2VjdGlvbi5sZW5ndGgpIHtcblxuICAgICAgICAvLyBFdmVyeXRoaW5nIGluIGhlcmUsIGlzIGFuIGF0b21pYyB1bmRvIGxldmVsXG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgIC8vIFNhdmUgdGhlIHNlY3Rpb24gYW5kIGRldGFjaFxuICAgICAgICAgIGxldCBib2R5U2VjdGlvbiA9ICQoc2VsZWN0ZWRTZWN0aW9uWzBdLm91dGVySFRNTClcbiAgICAgICAgICBzZWxlY3RlZFNlY3Rpb24uZGV0YWNoKClcblxuICAgICAgICAgIC8vIFVwZGF0ZSBkaW1lbnNpb24gYW5kIG1vdmUgdGhlIHNlY3Rpb24gb3V0XG4gICAgICAgICAgc2libGluZ1NlY3Rpb24uYXBwZW5kKGJvZHlTZWN0aW9uKVxuXG4gICAgICAgICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG4gICAgICAgICAgLy8gUmVmcmVzaCB0aW55bWNlIGNvbnRlbnQgYW5kIHNldCB0aGUgaGVhZGluZyBkaW1lbnNpb25cbiAgICAgICAgICBoZWFkaW5nRGltZW5zaW9uKClcbiAgICAgICAgICB1cGRhdGVJZnJhbWVGcm9tU2F2ZWRDb250ZW50KClcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBOb3RpZnkgZXJyb3JcbiAgICBlbHNlXG4gICAgICBub3RpZnkoSEVBRElOR19UUkFTRk9STUFUSU9OX0ZPUkJJRERFTiwgJ2Vycm9yJywgMjAwMClcbiAgfSxcblxuICAvKipcbiAgICogXG4gICAqL1xuICBhZGRBYnN0cmFjdDogZnVuY3Rpb24gKCkge1xuXG4gICAgaWYgKCEkKEFCU1RSQUNUX1NFTEVDVE9SKS5sZW5ndGgpIHtcblxuICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIC8vIFRoaXMgc2VjdGlvbiBjYW4gb25seSBiZSBwbGFjZWQgYWZ0ZXIgbm9uIGVkaXRhYmxlIGhlYWRlclxuICAgICAgICAkKE5PTl9FRElUQUJMRV9IRUFERVJfU0VMRUNUT1IpLmFmdGVyKGA8c2VjdGlvbiBpZD1cImRvYy1hYnN0cmFjdFwiIHJvbGU9XCJkb2MtYWJzdHJhY3RcIj48aDE+QWJzdHJhY3Q8L2gxPjwvc2VjdGlvbj5gKVxuXG4gICAgICAgIHVwZGF0ZUlmcmFtZUZyb21TYXZlZENvbnRlbnQoKVxuICAgICAgfSlcbiAgICB9XG5cbiAgICAvL21vdmUgY2FyZXQgYW5kIHNldCBmb2N1cyB0byBhY3RpdmUgYWRpdG9yICMxMDVcbiAgICBtb3ZlQ2FyZXQodGlueW1jZS5hY3RpdmVFZGl0b3IuZG9tLnNlbGVjdChgJHtBQlNUUkFDVF9TRUxFQ1RPUn0gPiBoMWApWzBdKVxuICAgIHNjcm9sbFRvKEFCU1RSQUNUX1NFTEVDVE9SKVxuICB9LFxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGFkZEFja25vd2xlZGdlbWVudHM6IGZ1bmN0aW9uICgpIHtcblxuICAgIGlmICghJChBQ0tOT1dMRURHRU1FTlRTX1NFTEVDVE9SKS5sZW5ndGgpIHtcblxuICAgICAgbGV0IGFjayA9ICQoYDxzZWN0aW9uIGlkPVwiZG9jLWFja25vd2xlZGdlbWVudHNcIiByb2xlPVwiZG9jLWFja25vd2xlZGdlbWVudHNcIj48aDE+QWNrbm93bGVkZ2VtZW50czwvaDE+PC9zZWN0aW9uPmApXG5cbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAvLyBJbnNlcnQgdGhpcyBzZWN0aW9uIGFmdGVyIGxhc3Qgbm9uIHNwZWNpYWwgc2VjdGlvbiBcbiAgICAgICAgLy8gT1IgYWZ0ZXIgYWJzdHJhY3Qgc2VjdGlvbiBcbiAgICAgICAgLy8gT1IgYWZ0ZXIgbm9uIGVkaXRhYmxlIGhlYWRlclxuICAgICAgICBpZiAoJChNQUlOX1NFQ1RJT05fU0VMRUNUT1IpLmxlbmd0aClcbiAgICAgICAgICAkKE1BSU5fU0VDVElPTl9TRUxFQ1RPUikubGFzdCgpLmFmdGVyKGFjaylcblxuICAgICAgICBlbHNlIGlmICgkKEFCU1RSQUNUX1NFTEVDVE9SKS5sZW5ndGgpXG4gICAgICAgICAgJChBQlNUUkFDVF9TRUxFQ1RPUikuYWZ0ZXIoYWNrKVxuXG4gICAgICAgIGVsc2VcbiAgICAgICAgICAkKE5PTl9FRElUQUJMRV9IRUFERVJfU0VMRUNUT1IpLmFmdGVyKGFjaylcblxuICAgICAgICB1cGRhdGVJZnJhbWVGcm9tU2F2ZWRDb250ZW50KClcbiAgICAgIH0pXG4gICAgfVxuXG4gICAgLy9tb3ZlIGNhcmV0IGFuZCBzZXQgZm9jdXMgdG8gYWN0aXZlIGFkaXRvciAjMTA1XG4gICAgbW92ZUNhcmV0KHRpbnltY2UuYWN0aXZlRWRpdG9yLmRvbS5zZWxlY3QoYCR7QUNLTk9XTEVER0VNRU5UU19TRUxFQ1RPUn0gPiBoMWApWzBdKVxuICAgIHNjcm9sbFRvKEFDS05PV0xFREdFTUVOVFNfU0VMRUNUT1IpXG4gIH0sXG5cbiAgLyoqXG4gICAqIFRoaXMgbWV0aG9kIGlzIHRoZSBtYWluIG9uZS4gSXQncyBjYWxsZWQgYmVjYXVzZSBhbGwgdGltZXMgdGhlIGludGVudCBpcyB0byBhZGQgYSBuZXcgYmlibGlvZW50cnkgKHNpbmdsZSByZWZlcmVuY2UpXG4gICAqIFRoZW4gaXQgY2hlY2tzIGlmIGlzIG5lY2Vzc2FyeSB0byBhZGQgdGhlIGVudGlyZSA8c2VjdGlvbj4gb3Igb25seSB0aGUgbWlzc2luZyA8dWw+XG4gICAqL1xuICBhZGRCaWJsaW9lbnRyeTogZnVuY3Rpb24gKGlkLCB0ZXh0LCBsaXN0SXRlbSkge1xuXG4gICAgLy8gQWRkIGJpYmxpb2dyYXBoeSBzZWN0aW9uIGlmIG5vdCBleGlzdHNcbiAgICBpZiAoISQoQklCTElPR1JBUEhZX1NFTEVDVE9SKS5sZW5ndGgpIHtcblxuICAgICAgbGV0IGJpYmxpb2dyYXBoeSA9ICQoYDxzZWN0aW9uIGlkPVwiZG9jLWJpYmxpb2dyYXBoeVwiIHJvbGU9XCJkb2MtYmlibGlvZ3JhcGh5XCI+PGgxPlJlZmVyZW5jZXM8L2gxPjx1bD48L3VsPjwvc2VjdGlvbj5gKVxuXG4gICAgICAvLyBUaGlzIHNlY3Rpb24gaXMgYWRkZWQgYWZ0ZXIgYWNrbm93bGVkZ2VtZW50cyBzZWN0aW9uXG4gICAgICAvLyBPUiBhZnRlciBsYXN0IG5vbiBzcGVjaWFsIHNlY3Rpb25cbiAgICAgIC8vIE9SIGFmdGVyIGFic3RyYWN0IHNlY3Rpb25cbiAgICAgIC8vIE9SIGFmdGVyIG5vbiBlZGl0YWJsZSBoZWFkZXIgXG4gICAgICBpZiAoJChBQ0tOT1dMRURHRU1FTlRTX1NFTEVDVE9SKS5sZW5ndGgpXG4gICAgICAgICQoQUNLTk9XTEVER0VNRU5UU19TRUxFQ1RPUikuYWZ0ZXIoYmlibGlvZ3JhcGh5KVxuXG4gICAgICBlbHNlIGlmICgkKE1BSU5fU0VDVElPTl9TRUxFQ1RPUikubGVuZ3RoKVxuICAgICAgICAkKE1BSU5fU0VDVElPTl9TRUxFQ1RPUikubGFzdCgpLmFmdGVyKGJpYmxpb2dyYXBoeSlcblxuICAgICAgZWxzZSBpZiAoJChBQlNUUkFDVF9TRUxFQ1RPUikubGVuZ3RoKVxuICAgICAgICAkKEFCU1RSQUNUX1NFTEVDVE9SKS5hZnRlcihiaWJsaW9ncmFwaHkpXG5cbiAgICAgIGVsc2VcbiAgICAgICAgJChOT05fRURJVEFCTEVfSEVBREVSX1NFTEVDVE9SKS5hZnRlcihiaWJsaW9ncmFwaHkpXG5cbiAgICB9XG5cbiAgICAvLyBBZGQgdWwgaW4gYmlibGlvZ3JhcGh5IHNlY3Rpb24gaWYgbm90IGV4aXN0c1xuICAgIGlmICghJChCSUJMSU9HUkFQSFlfU0VMRUNUT1IpLmZpbmQoJ3VsJykubGVuZ3RoKVxuICAgICAgJChCSUJMSU9HUkFQSFlfU0VMRUNUT1IpLmFwcGVuZCgnPHVsPjwvdWw+JylcblxuICAgIC8vIElGIGlkIGFuZCB0ZXh0IGFyZW4ndCBwYXNzZWQgYXMgcGFyYW1ldGVycywgdGhlc2UgY2FuIGJlIHJldHJpZXZlZCBvciBpbml0IGZyb20gaGVyZVxuICAgIGlkID0gKGlkKSA/IGlkIDogZ2V0U3VjY2Vzc2l2ZUVsZW1lbnRJZChCSUJMSU9FTlRSWV9TRUxFQ1RPUiwgQklCTElPRU5UUllfU1VGRklYKVxuICAgIHRleHQgPSB0ZXh0ID8gdGV4dCA6ICc8YnIvPidcblxuICAgIGxldCBuZXdJdGVtID0gJChgPGxpIHJvbGU9XCJkb2MtYmlibGlvZW50cnlcIiBpZD1cIiR7aWR9XCI+PHA+JHt0ZXh0fTwvcD48L2xpPmApXG5cbiAgICAvLyBBcHBlbmQgbmV3IGxpIHRvIHVsIGF0IGxhc3QgcG9zaXRpb25cbiAgICAvLyBPUiBpbnNlcnQgdGhlIG5ldyBsaSByaWdodCBhZnRlciB0aGUgY3VycmVudCBvbmVcbiAgICBpZiAoIWxpc3RJdGVtKVxuICAgICAgJChgJHtCSUJMSU9HUkFQSFlfU0VMRUNUT1J9IHVsYCkuYXBwZW5kKG5ld0l0ZW0pXG5cbiAgICBlbHNlXG4gICAgICBsaXN0SXRlbS5hZnRlcihuZXdJdGVtKVxuICB9LFxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIHVwZGF0ZUJpYmxpb2dyYXBoeVNlY3Rpb246IGZ1bmN0aW9uICgpIHtcblxuICAgIC8vIFN5bmNocm9uaXplIGlmcmFtZSBhbmQgc3RvcmVkIGNvbnRlbnRcbiAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcblxuICAgIC8vIFJlbW92ZSBhbGwgc2VjdGlvbnMgd2l0aG91dCBwIGNoaWxkXG4gICAgJChgJHtCSUJMSU9FTlRSWV9TRUxFQ1RPUn06bm90KDpoYXMocCkpYCkuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAkKHRoaXMpLnJlbW92ZSgpXG4gICAgfSlcbiAgfSxcblxuICAvKipcbiAgICogXG4gICAqL1xuICBhZGRFbmRub3RlOiBmdW5jdGlvbiAoaWQpIHtcblxuICAgIC8vIEFkZCB0aGUgc2VjdGlvbiBpZiBpdCBub3QgZXhpc3RzXG4gICAgaWYgKCEkKEVORE5PVEVfU0VMRUNUT1IpLmxlbmd0aCkge1xuXG4gICAgICBsZXQgZW5kbm90ZXMgPSAkKGA8c2VjdGlvbiBpZD1cImRvYy1lbmRub3Rlc1wiIHJvbGU9XCJkb2MtZW5kbm90ZXNcIj48aDEgZGF0YS1yYXNoLW9yaWdpbmFsLWNvbnRlbnQ9XCJcIj5Gb290bm90ZXM8L2gxPjwvc2VjdGlvbj5gKVxuXG4gICAgICAvLyBJbnNlcnQgdGhpcyBzZWN0aW9uIGFmdGVyIGJpYmxpb2dyYXBoeSBzZWN0aW9uXG4gICAgICAvLyBPUiBhZnRlciBhY2tub3dsZWRnZW1lbnRzIHNlY3Rpb25cbiAgICAgIC8vIE9SIGFmdGVyIG5vbiBzcGVjaWFsIHNlY3Rpb24gc2VsZWN0b3JcbiAgICAgIC8vIE9SIGFmdGVyIGFic3RyYWN0IHNlY3Rpb25cbiAgICAgIC8vIE9SIGFmdGVyIG5vbiBlZGl0YWJsZSBoZWFkZXIgXG4gICAgICBpZiAoJChCSUJMSU9HUkFQSFlfU0VMRUNUT1IpLmxlbmd0aClcbiAgICAgICAgJChCSUJMSU9HUkFQSFlfU0VMRUNUT1IpLmFmdGVyKGVuZG5vdGVzKVxuXG4gICAgICBlbHNlIGlmICgkKEFDS05PV0xFREdFTUVOVFNfU0VMRUNUT1IpLmxlbmd0aClcbiAgICAgICAgJChBQ0tOT1dMRURHRU1FTlRTX1NFTEVDVE9SKS5hZnRlcihlbmRub3RlcylcblxuICAgICAgZWxzZSBpZiAoJChNQUlOX1NFQ1RJT05fU0VMRUNUT1IpLmxlbmd0aClcbiAgICAgICAgJChNQUlOX1NFQ1RJT05fU0VMRUNUT1IpLmxhc3QoKS5hZnRlcihlbmRub3RlcylcblxuICAgICAgZWxzZSBpZiAoJChBQlNUUkFDVF9TRUxFQ1RPUikubGVuZ3RoKVxuICAgICAgICAkKEFCU1RSQUNUX1NFTEVDVE9SKS5hZnRlcihlbmRub3RlcylcblxuICAgICAgZWxzZVxuICAgICAgICAkKE5PTl9FRElUQUJMRV9IRUFERVJfU0VMRUNUT1IpLmFmdGVyKGVuZG5vdGVzKVxuICAgIH1cblxuICAgIC8vIENyZWF0ZSBhbmQgYXBwZW5kIHRoZSBuZXcgZW5kbm90ZVxuICAgIGxldCBlbmRub3RlID0gJChgPHNlY3Rpb24gcm9sZT1cImRvYy1lbmRub3RlXCIgaWQ9XCIke2lkfVwiPjxwPjxici8+PC9wPjwvc2VjdGlvbj5gKVxuICAgICQoRU5ETk9URVNfU0VMRUNUT1IpLmFwcGVuZChlbmRub3RlKVxuICB9LFxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIHVwZGF0ZVNlY3Rpb25Ub29sYmFyOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAvLyBEcm9wZG93biBtZW51IHJlZmVyZW5jZVxuICAgIGxldCBtZW51ID0gJChNRU5VX1NFTEVDVE9SKVxuXG4gICAgaWYgKG1lbnUubGVuZ3RoKSB7XG4gICAgICBzZWN0aW9uLnJlc3RvcmVTZWN0aW9uVG9vbGJhcihtZW51KVxuXG4gICAgICAvLyBTYXZlIGN1cnJlbnQgc2VsZWN0ZWQgZWxlbWVudFxuICAgICAgbGV0IHNlbGVjdGVkRWxlbWVudCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldFJuZygpLnN0YXJ0Q29udGFpbmVyKVxuXG4gICAgICBpZiAoc2VsZWN0ZWRFbGVtZW50WzBdLm5vZGVUeXBlID09IDMpXG4gICAgICAgIHNlbGVjdGVkRWxlbWVudCA9IHNlbGVjdGVkRWxlbWVudC5wYXJlbnQoKVxuXG4gICAgICAvLyBJZiBjdXJyZW50IGVsZW1lbnQgaXMgcFxuICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC5pcygncCcpIHx8IHNlbGVjdGVkRWxlbWVudC5wYXJlbnQoKS5pcygncCcpKSB7XG5cbiAgICAgICAgLy8gRGlzYWJsZSB1cGdyYWRlL2Rvd25ncmFkZVxuICAgICAgICBtZW51LmNoaWxkcmVuKCc6Z3QoMTApJykuYWRkQ2xhc3MoJ21jZS1kaXNhYmxlZCcpXG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgY2FyZXQgaXMgaW5zaWRlIHNwZWNpYWwgc2VjdGlvblxuICAgICAgICAvLyBJbiB0aGlzIGNhc2UgZW5hYmxlIG9ubHkgZmlyc3QgbWVudWl0ZW0gaWYgY2FyZXQgaXMgaW4gYWJzdHJhY3RcbiAgICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKFNQRUNJQUxfU0VDVElPTl9TRUxFQ1RPUikubGVuZ3RoKSB7XG5cbiAgICAgICAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LnBhcmVudHMoQUJTVFJBQ1RfU0VMRUNUT1IpLmxlbmd0aClcbiAgICAgICAgICAgIG1lbnUuY2hpbGRyZW4oYDpsdCgxKWApLnJlbW92ZUNsYXNzKCdtY2UtZGlzYWJsZWQnKVxuXG4gICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgIH1cblxuICAgICAgICAvLyBHZXQgZGVlcG5lc3Mgb2YgdGhlIHNlY3Rpb25cbiAgICAgICAgbGV0IGRlZXBuZXNzID0gc2VsZWN0ZWRFbGVtZW50LnBhcmVudHMoU0VDVElPTl9TRUxFQ1RPUikubGVuZ3RoICsgMVxuXG4gICAgICAgIC8vIFJlbW92ZSBkaXNhYmxpbmcgY2xhc3Mgb24gZmlyc3Qge2RlZXBuZXNzfSBtZW51IGl0ZW1zXG4gICAgICAgIG1lbnUuY2hpbGRyZW4oYDpsdCgke2RlZXBuZXNzfSlgKS5yZW1vdmVDbGFzcygnbWNlLWRpc2FibGVkJylcblxuICAgICAgICBsZXQgcHJlSGVhZGVycyA9IFtdXG4gICAgICAgIGxldCBwYXJlbnRTZWN0aW9ucyA9IHNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKCdzZWN0aW9uJylcblxuICAgICAgICAvLyBTYXZlIGluZGV4IG9mIGFsbCBwYXJlbnQgc2VjdGlvbnNcbiAgICAgICAgZm9yIChsZXQgaSA9IHBhcmVudFNlY3Rpb25zLmxlbmd0aDsgaSA+IDA7IGktLSkge1xuICAgICAgICAgIGxldCBlbGVtID0gJChwYXJlbnRTZWN0aW9uc1tpIC0gMV0pXG4gICAgICAgICAgbGV0IGluZGV4ID0gZWxlbS5wYXJlbnQoKS5jaGlsZHJlbihTRUNUSU9OX1NFTEVDVE9SKS5pbmRleChlbGVtKSArIDFcbiAgICAgICAgICBwcmVIZWFkZXJzLnB1c2goaW5kZXgpXG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgdGV4dCBvZiBhbGwgbWVudSBpdGVtXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDw9IHByZUhlYWRlcnMubGVuZ3RoOyBpKyspIHtcblxuICAgICAgICAgIGxldCB0ZXh0ID0gYCR7SEVBRElOR30gYFxuXG4gICAgICAgICAgLy8gVXBkYXRlIHRleHQgYmFzZWQgb24gc2VjdGlvbiBzdHJ1Y3R1cmVcbiAgICAgICAgICBpZiAoaSAhPSBwcmVIZWFkZXJzLmxlbmd0aCkge1xuICAgICAgICAgICAgZm9yIChsZXQgeCA9IDA7IHggPD0gaTsgeCsrKVxuICAgICAgICAgICAgICB0ZXh0ICs9IGAke3ByZUhlYWRlcnNbeF0gKyAoeCA9PSBpID8gMSA6IDApfS5gXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gSW4gdGhpcyBjYXNlIHJhamUgY2hhbmdlcyB0ZXh0IG9mIG5leHQgc3ViIGhlYWRpbmdcbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgaTsgeCsrKVxuICAgICAgICAgICAgICB0ZXh0ICs9IGAke3ByZUhlYWRlcnNbeF19LmBcblxuICAgICAgICAgICAgdGV4dCArPSAnMS4nXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgbWVudS5jaGlsZHJlbihgOmVxKCR7aX0pYCkuZmluZCgnc3Bhbi5tY2UtdGV4dCcpLnRleHQodGV4dClcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBEaXNhYmxlIFxuICAgICAgZWxzZSBpZiAoc2VsZWN0ZWRFbGVtZW50LmlzKCdoMScpICYmIHNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKFNQRUNJQUxfU0VDVElPTl9TRUxFQ1RPUikpIHtcbiAgICAgICAgbWVudS5jaGlsZHJlbignOmd0KDEwKScpLmFkZENsYXNzKCdtY2UtZGlzYWJsZWQnKVxuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogUmVzdG9yZSBub3JtYWwgdGV4dCBpbiBzZWN0aW9uIHRvb2xiYXIgYW5kIGRpc2FibGUgYWxsXG4gICAqL1xuICByZXN0b3JlU2VjdGlvblRvb2xiYXI6IGZ1bmN0aW9uIChtZW51KSB7XG5cbiAgICBsZXQgY250ID0gMVxuXG4gICAgbWVudS5jaGlsZHJlbignOmx0KDYpJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICBsZXQgdGV4dCA9IGAke0hFQURJTkd9IGBcblxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjbnQ7IGkrKylcbiAgICAgICAgdGV4dCArPSBgMS5gXG5cbiAgICAgICQodGhpcykuZmluZCgnc3Bhbi5tY2UtdGV4dCcpLnRleHQodGV4dClcbiAgICAgICQodGhpcykuYWRkQ2xhc3MoJ21jZS1kaXNhYmxlZCcpXG5cbiAgICAgIGNudCsrXG4gICAgfSlcblxuICAgIC8vIEVuYWJsZSB1cGdyYWRlL2Rvd25ncmFkZSBsYXN0IHRocmVlIG1lbnUgaXRlbXNcbiAgICBtZW51LmNoaWxkcmVuKCc6Z3QoMTApJykucmVtb3ZlQ2xhc3MoJ21jZS1kaXNhYmxlZCcpXG4gIH0sXG5cbiAgbWFuYWdlRGVsZXRlOiBmdW5jdGlvbiAoKSB7XG5cbiAgICBsZXQgcmFuZ2UgPSB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Um5nKClcbiAgICBsZXQgc3RhcnROb2RlID0gJChyYW5nZS5zdGFydENvbnRhaW5lcikucGFyZW50KClcbiAgICBsZXQgZW5kTm9kZSA9ICQocmFuZ2UuZW5kQ29udGFpbmVyKS5wYXJlbnQoKVxuICAgIGxldCBjb21tb25BbmNlc3RvckNvbnRhaW5lciA9ICQocmFuZ2UuY29tbW9uQW5jZXN0b3JDb250YWluZXIpXG5cbiAgICAvLyBEZWVwbmVzcyBpcyByZWxhdGl2ZSB0byB0aGUgY29tbW9uIGFuY2VzdG9yIGNvbnRhaW5lciBvZiB0aGUgcmFuZ2Ugc3RhcnRDb250YWluZXIgYW5kIGVuZFxuICAgIGxldCBkZWVwbmVzcyA9IGVuZE5vZGUucGFyZW50KCdzZWN0aW9uJykucGFyZW50c1VudGlsKGNvbW1vbkFuY2VzdG9yQ29udGFpbmVyKS5sZW5ndGggKyAxXG4gICAgbGV0IGN1cnJlbnRFbGVtZW50ID0gZW5kTm9kZVxuICAgIGxldCB0b01vdmVFbGVtZW50cyA9IFtdXG5cbiAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgIC8vIEdldCBhbmQgZGV0YWNoIGFsbCBuZXh0X2VuZFxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPD0gZGVlcG5lc3M7IGkrKykge1xuICAgICAgICBjdXJyZW50RWxlbWVudC5uZXh0QWxsKCdzZWN0aW9uLHAsZmlndXJlJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgdG9Nb3ZlRWxlbWVudHMucHVzaCgkKHRoaXMpKVxuXG4gICAgICAgICAgJCh0aGlzKS5kZXRhY2goKVxuICAgICAgICB9KVxuICAgICAgICBjdXJyZW50RWxlbWVudCA9IGN1cnJlbnRFbGVtZW50LnBhcmVudCgpXG4gICAgICB9XG5cbiAgICAgIC8vIEV4ZWN1dGUgZGVsZXRlXG4gICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5leGVjQ29tbWFuZCgnZGVsZXRlJylcblxuICAgICAgLy8gRGV0YWNoIGFsbCBuZXh0X2JlZ2luXG4gICAgICBzdGFydE5vZGUubmV4dEFsbCgpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICAkKHRoaXMpLmRldGFjaCgpXG4gICAgICB9KVxuXG4gICAgICAvLyBBcHBlbmQgYWxsIG5leHRfZW5kIHRvIHN0YXJ0bm9kZSBwYXJlbnRcbiAgICAgIHRvTW92ZUVsZW1lbnRzLmZvckVhY2goZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICAgICAgc3RhcnROb2RlLnBhcmVudCgnc2VjdGlvbicpLmFwcGVuZChlbGVtZW50KVxuICAgICAgfSlcblxuICAgICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG5cbiAgICAgIC8vIFJlZnJlc2ggaGVhZGluZ3NcbiAgICAgIGhlYWRpbmdEaW1lbnNpb24oKVxuXG4gICAgICAvLyBVcGRhdGUgcmVmZXJlbmNlcyBpZiBuZWVkZWRcbiAgICAgIHVwZGF0ZVJlZmVyZW5jZXMoKVxuXG4gICAgICB1cGRhdGVJZnJhbWVGcm9tU2F2ZWRDb250ZW50KClcbiAgICB9KVxuICAgIHJldHVybiBmYWxzZVxuICB9XG59Il19

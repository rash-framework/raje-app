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


var figurebox_selector_img = "p > img:not([role=math])";
var figurebox_selector_svg = "p > svg";
var figurebox_selector = "figure > " + figurebox_selector_img + ", figure > " + figurebox_selector_svg;
var tablebox_selector_table = "table";
var tablebox_selector = "figure > " + tablebox_selector_table;
var formulabox_selector_img = "p > img[role=math]";
var formulabox_selector_span = "p > span[role=math]";
var formulabox_selector_math = "p > math";
var formulabox_selector_svg = "p > span > svg[role=math]"

var formulabox_selector =
  "figure > " + formulabox_selector_img + ", figure > " + formulabox_selector_span + ", figure > " + formulabox_selector_math + ", figure > " + formulabox_selector_svg
var listingbox_selector_pre = "pre";
var listingbox_selector = "figure > " + listingbox_selector_pre;

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

    //
    mathml2svgAllFormulas()

    tinymce.init({

      // Select the element to wrap
      selector: '#raje_root',

      // Set window size
      height: window.innerHeight - TINYMCE_TOOLBAR_HEIGTH,

      // Set the styles of the content wrapped inside the element
      content_css: ['css/bootstrap.min.css', 'css/rash.css', 'css/raje-core.css'],

      // Set plugins
      plugins: "raje_inlineFigure fullscreen link codesample raje_externalLink raje_inlineCode raje_inlineQuote raje_section table image noneditable raje_image raje_quoteblock raje_codeblock raje_table raje_listing raje_inline_formula raje_formula raje_crossref raje_footnotes raje_metadata raje_lists raje_save",

      // Remove menubar
      menubar: false,

      // Custom toolbar
      toolbar: 'undo redo bold italic link superscript subscript raje_inlineCode raje_inlineQuote raje_inline_formula raje_crossref raje_footnotes | raje_ol raje_ul raje_codeblock raje_quoteblock raje_table raje_image raje_listing raje_formula | raje_section raje_metadata raje_save',

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
   * 
   */
  function updateIframeFromSavedContentWithoutUndo() {

    tinymce.activeEditor.undoManager.ignore(function () {
      // Save the bookmark 
      let bookmark = tinymce.activeEditor.selection.getBookmark(2, true)

      // Update iframe content
      tinymce.activeEditor.setContent($('#raje_root').html())

      // Restore the bookmark 
      tinymce.activeEditor.selection.moveToBookmark(bookmark)
    })
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

    if (tinymce.activeEditor.notificationManager.getNotifications().length)
      top.tinymce.activeEditor.notificationManager.close()

    tinymce.activeEditor.notificationManager.open({
      text: text,
      type: type ? type : 'info',
      timeout: 3000
    })
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
        $(this).replaceWith("<h" + counter + " data-rash-original-wrapper=\"h1\" >" + $(this).html() + "</h" + counter + ">")
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
   * 
   */
  function mathml2svgAllFormulas() {

    let id = 'svgFormula'

    // Append a temporary element
    $('body').append(`<div style="display:none" class="rash-math" id='${id}'></div>`)

    // For each mathml formula
    $(formulabox_selector).each(function () {

      let formula = $(this)
      let mathmlFormula = formula[0].outerHTML

      // Update its content with the mathml
      $(`#${id}`).html(mathmlFormula)

      MathJax.Hub.Queue(

        // Process the svg transformation
        ["Typeset", MathJax.Hub],

        // Replace the formula in mathml with the svg output
        function () {
          formula.replaceWith($(`#${id}`).find('svg').html())
        },

        // Update iframe without addind a new undo level
        function () {
          updateIframeFromSavedContentWithoutUndo()
        },

        // Clean the formula
        function () {
          $(`#${id}`).html('')

          // Clean the whole undo levels set
          if (typeof tinymce.activeEditor.undoManager != 'undefined')
            tinymce.activeEditor.undoManager.clear()
        })
    })

    // Remove the temporary
    $('body').find(id).remove()
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
tinymce.PluginManager.add('raje_crossref', function (editor, url) {

  // Add a button that handle the inline element
  editor.addButton('raje_crossref', {
    title: 'raje_crossref',
    icon: 'icon-anchor',
    tooltip: 'Cross-reference',
    disabledStateSelector: `${DISABLE_SELECTOR_INLINE},:header`,

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
    disabledStateSelector: `${DISABLE_SELECTOR_INLINE},:header`,

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
    title: 'raje_formula',
    icon: 'icon-formula',
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
    if (selectedElement.is(FIGURE_FORMULA_SELECTOR)) {
      openFormulaEditor({
        formula_val: selectedElement.find('svg[role=math]').attr('data-math-original-input'),
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

        //selectRange($(newFormula).next('p')[0], 0)

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
      return `<figure id="${id}" contenteditable="false"><p><span>${formula_svg[0].outerHTML}</span></p></figure><p><br/></p>`
    }
  }
})

function openInlineFormulaEditor(formulaValue, callback) {
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
    disabledStateSelector: `${DISABLE_SELECTOR_INLINE},:header`,

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

    /**
     * NOTE: this behvaiour is the same for codeblock
     */
    let selectedElement = $(tinymce.activeEditor.selection.getNode())
    if (selectedElement.parents('pre:has(code)').length) {

      /**
       * Proper listing editor behaviour
       */
      if (selectedElement.is('code')) {

        /**
         * ENTER
         */
        if (e.keyCode == 13) {
          e.preventDefault()
          return listing.setContent(`\n`)
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
 * Raje codeblock
 */
tinymce.PluginManager.add('raje_codeblock', function (editor, url) {

  // Add a button that handle the inline element
  editor.addButton('raje_codeblock', {
    title: 'raje_codeblock',
    icon: 'icon-block-code',
    tooltip: 'Block code',
    disabledStateSelector: `${DISABLE_SELECTOR_FIGURES},code,pre`,

    // Button behaviour
    onclick: function () {
      blockcode.add()
    }
  })

  blockcode = {
    /**
     * 
     */
    add: function () {

      let selectedElement = $(tinymce.activeEditor.selection.getNode())
      let blockCode = this.create(getSuccessiveElementId(FIGURE_LISTING_SELECTOR, LISTING_SUFFIX))

      if (!selectedElement.parents('pre,code').length) {

        tinymce.activeEditor.undoManager.transact(function () {

          // Check if the selected paragraph is not empty, add the new listing right below
          if (selectedElement.text().trim().length != 0)
            selectedElement.after(blockCode)

          // If selected paragraph is empty, replace it with the new table
          else
            selectedElement.replaceWith(blockCode)

          // Save updates 
          tinymce.triggerSave()

          // Update all captions with RASH function
          captions()

          // Move the caret
          selectRange(blockCode.find('code')[0], 0)

          // Update Rendered RASH
          updateIframeFromSavedContent()
        })
      }
    },

    /**
     * 
     */
    create: function (id) {
      return $(`<pre><code>${ZERO_SPACE}</code></pre>`)
    }
  }
})

/**
 * Raje quoteblock
 */
tinymce.PluginManager.add('raje_quoteblock', function (editor, url) {

  // Add a button that handle the inline element
  editor.addButton('raje_quoteblock', {
    title: 'raje_quoteblock',
    icon: 'icon-block-quote',
    tooltip: 'Block quote',
    disabledStateSelector: `${DISABLE_SELECTOR_FIGURES},blockquote`,

    // Button behaviour
    onclick: function () {
      blockquote.add()
    }
  })

  editor.on('keyDown', function (e) {

    let selectedElement = $(tinymce.activeEditor.selection.getNode())
    if (selectedElement.is('p') && selectedElement.parent().is('blockquote')) {

      /**
       * Enter
       */
      if (e.keyCode == 13) {
        e.preventDefault()

        // Exit from the blockquote if the current p is empty
        if (selectedElement.text().trim().length == 0)
          return blockquote.exit()

        blockquote.addParagraph()
      }
    }
  })

  blockquote = {
    /**
     * 
     */
    add: function () {

      let selectedElement = $(tinymce.activeEditor.selection.getNode())
      let blockQuote = this.create(getSuccessiveElementId(FIGURE_LISTING_SELECTOR, LISTING_SUFFIX))

      if (!selectedElement.parents('pre,code').length) {

        tinymce.activeEditor.undoManager.transact(function () {

          // Check if the selected paragraph is not empty, add the new listing right below
          if (selectedElement.text().trim().length != 0)
            selectedElement.after(blockQuote)

          // If selected paragraph is empty, replace it with the new table
          else
            selectedElement.replaceWith(blockQuote)

          // Save updates 
          tinymce.triggerSave()

          // Update all captions with RASH function
          captions()

          // Move the caret
          moveCaret(blockQuote[0])

          // Update Rendered RASH
          updateIframeFromSavedContent()
        })
      }
    },

    /**
     * 
     */
    create: function (id) {
      return $(`<blockquote><p>${ZERO_SPACE}</p></blockquote>`)
    },

    /**
     * 
     */
    getLastNotEmptyNode: function (nodes) {

      for (let i = 0; i < nodes.length; i++) {
        if ((nodes[i].nodeType == 3 || nodes[i].tagName == 'br') && !nodes[i].length)
          nodes.splice(i, 1)
      }

      return nodes[nodes.length - 1]
    },

    /**
     * 
     */
    addParagraph: function () {

      const BR = '<br>'

      // Get the references of the existing element
      let paragraph = $(tinymce.activeEditor.selection.getNode())

      // Placeholder text of the new li
      let text = BR
      let textNodes = paragraph.contents()

      // If there is just one node wrapped inside the paragraph
      if (textNodes.length == 1) {

        // Get the start offset and text of the current li
        let startOffset = tinymce.activeEditor.selection.getRng().startOffset
        let wholeText = paragraph.text()

        // If the cursor isn't at the end but it's in the middle
        // Get the remaining text from the cursor to the end
        if (startOffset != wholeText.length)
          text = wholeText.substring(startOffset, wholeText.length)

        tinymce.activeEditor.undoManager.transact(function () {

          // Update the text of the current li
          paragraph.text(wholeText.substring(0, startOffset))

          if (!paragraph.text().length)
            paragraph.html(BR)

          // Create and add the new li
          let newParagraph = $(`<p>${text}</p>`)
          paragraph.after(newParagraph)

          // Move the caret to the new li
          moveCaret(newParagraph[0], true)

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
        range.setEnd(this.getLastNotEmptyNode(textNodes), 1)

        // Select the range
        tinymce.activeEditor.selection.setRng(range)

        // Save the html content
        wholeText = tinymce.activeEditor.selection.getContent()

        tinymce.activeEditor.undoManager.transact(function () {

          paragraph.html(paragraph.html().replace(wholeText, ''))

          if (!paragraph.text().length)
            paragraph.html(BR)

          // Create and add the new li
          let newParagraph = $(`<p>${wholeText}</p>`)
          paragraph.after(newParagraph)

          // Move the caret to the new li
          moveCaret(newParagraph[0], true)

          // Update the content
          tinymce.triggerSave()
        })
      }
    },

    /**
     * 
     */
    exit: function () {
      let paragraph = $(tinymce.activeEditor.selection.getNode())
      let blockquote = paragraph.parent()

      tinymce.activeEditor.undoManager.transact(function () {

        paragraph.remove()

        if (!blockquote.next().length) {
          blockquote.after($(`<p><br/></p>`))
        }

        moveCaret(blockquote.next()[0])

      })
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

const DISABLE_SELECTOR_INLINE = 'table, img, pre, code, section[role=doc-bibliography]'

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

      // Replace tbody with its content #
      article.find('tbody').each(function(){
        $(this).replaceWith($(this).html())
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

const DATA_UPGRADE = 'data-upgrade'
const DATA_DOWNGRADE = 'data-downgrade'

const HEADING = 'Heading '

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
      text: `${HEADING}1.`,
      onclick: function (e) {
        section.addOrDownUpgrade(e, 1)
      }
    }, {
      text: `${HEADING}1.1.`,
      onclick: function (e) {
        section.addOrDownUpgrade(e, 2)
      }
    }, {
      text: `${HEADING}1.1.1.`,
      onclick: function (e) {
        section.addOrDownUpgrade(e, 3)
      }
    }, {
      text: `${HEADING}1.1.1.1.`,
      onclick: function (e) {
        section.addOrDownUpgrade(e, 4)
      }
    }, {
      text: `${HEADING}1.1.1.1.1.`,
      onclick: function (e) {
        section.addOrDownUpgrade(e, 5)
      }
    }, {
      text: `${HEADING}1.1.1.1.1.1.`,
      onclick: function (e) {
        section.addOrDownUpgrade(e, 6)
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

        //let toRemoveSections = section.getSectionsinSelection(tinymce.activeEditor.selection)
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
   * 
   */
  addOrDownUpgrade: function (e, level) {

    let selectedMenuItem = $(e.target).parent('.mce-menu-item')

    if (selectedMenuItem.attr(DATA_UPGRADE))
      return this.upgrade()

    if (selectedMenuItem.attr(DATA_DOWNGRADE))
      return this.downgrade()

    return this.add(level)
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

    if (selectedElement.is(':header')) {

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

        // Get the section list and update the dropdown with the right texts
        let list = section.getAncestorSectionsList(selectedElement)
        for (let i = 0; i <= list.length; i++) {
          menu.children(`:eq(${i})`).find('span.mce-text').text(list[i])
        }
      }

      // Enable only for upgrade/downgrade
      else if (!selectedElement.parents(SPECIAL_SECTION_SELECTOR).length && selectedElement.is('h1,h2,h3')) {

        // Get the selected section
        let selectedSection = selectedElement.parents(SECTION_SELECTOR).first()

        // Get the number of the heading (eg. H1 => 1, H2 => 2)
        let index = parseInt(selectedElement.prop('tagName').toLowerCase().replace('h', ''))

        // Get the deepness of the section (eg. 1 if is a main section, 2 if is a subsection)
        let deepness = selectedElement.parents(SECTION_SELECTOR).length

        // Get the list of texts that are bee
        let list = section.getAncestorSectionsList(selectedElement)

        // The text index in list
        let i = deepness - index

        // Check if the current section has a previous section 
        // In this case the upgrade is permitted
        if (selectedSection.prev().is(SECTION_SELECTOR)) {

          // menu item inside the dropdown
          let menuItem = menu.children(`:eq(${index})`)

          let tmp = list[index].replace(HEADING, '')
          tmp = tmp.split('.')
          tmp[index - 1] = parseInt(tmp[index - 1]) - 1

          let text = HEADING + tmp.join('.')

          menuItem.find('span.mce-text').text(text)
          menuItem.removeClass('mce-disabled')
          menuItem.attr(DATA_DOWNGRADE, true)
        }

        // Check if the current section has a parent
        // In this case the upgrade is permitted
        if (selectedSection.parent(SECTION_SELECTOR).length) {

          index = index - 2

          // menu item inside the dropdown
          let menuItem = menu.children(`:eq(${index})`)
          menuItem.find('span.mce-text').text(list[index])
          menuItem.removeClass('mce-disabled')
          menuItem.attr(DATA_UPGRADE, true)
        }
      }

      // Disable in any other cases
      else
        menu.children(':gt(10)').addClass('mce-disabled')
    }
  },

  /**
   * 
   */
  getAncestorSectionsList: function (selectedElement) {

    let preHeaders = []
    let list = []
    let parentSections = selectedElement.parents('section')

    // Save index of all parent sections
    for (let i = parentSections.length; i > 0; i--) {
      let elem = $(parentSections[i - 1])
      let index = elem.parent().children(SECTION_SELECTOR).index(elem) + 1
      preHeaders.push(index)
    }

    // Update text of all menu item
    for (let i = 0; i <= preHeaders.length; i++) {

      let text = HEADING

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

      list.push(text)
    }

    return list
  },

  /**
   * Restore normal text in section toolbar and disable all
   */
  restoreSectionToolbar: function (menu) {

    let cnt = 1

    menu.children(':lt(6)').each(function () {
      let text = HEADING

      for (let i = 0; i < cnt; i++)
        text += `1.`

      // Remove data elements
      $(this).removeAttr(DATA_UPGRADE)
      $(this).removeAttr(DATA_DOWNGRADE)

      $(this).find('span.mce-text').text(text)
      $(this).addClass('mce-disabled')

      cnt++
    })

    // Enable upgrade/downgrade last three menu items
    menu.children(':gt(10)').removeClass('mce-disabled')
  },

  /**
   * 
   */
  manageDelete: function () {

    let selectedContent = tinymce.activeEditor.selection.getContent()

    // If the selected content has HTML inside
    if (selectedContent.indexOf('<') > -1) {

      selectedContent = $(selectedContent)
      let hasSection = false
      // Check if one of the selected element is a section
      selectedContent.each(function () {
        if ($(this).is(SECTION_SELECTOR))
          return hasSection = true
      })

      // If the selected content has a section inside, then manage delete
      if (hasSection) {

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
            currentElement.nextAll('section,p,figure,pre,ul,ol,blockquote').each(function () {
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
      }
    }
  }
}
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluaXQuanMiLCJyYWplX2Nyb3NzcmVmLmpzIiwicmFqZV9maWd1cmVzLmpzIiwicmFqZV9pbmxpbmVzLmpzIiwicmFqZV9saXN0cy5qcyIsInJhamVfbWV0YWRhdGEuanMiLCJyYWplX3NhdmUuanMiLCJyYWplX3NlY3Rpb24uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM3akJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3pYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3ZrQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNoUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDaFhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN4TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3ZHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiY29yZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogXG4gKiBJbml0aWxpemUgVGlueU1DRSBlZGl0b3Igd2l0aCBhbGwgcmVxdWlyZWQgb3B0aW9uc1xuICovXG5cbi8vIEludmlzaWJsZSBzcGFjZSBjb25zdGFudHNcbmNvbnN0IFpFUk9fU1BBQ0UgPSAnJiM4MjAzOydcbmNvbnN0IFJBSkVfU0VMRUNUT1IgPSAnYm9keSN0aW55bWNlJ1xuXG4vLyBTZWxlY3RvciBjb25zdGFudHMgKHRvIG1vdmUgaW5zaWRlIGEgbmV3IGNvbnN0IGZpbGUpXG5jb25zdCBIRUFERVJfU0VMRUNUT1IgPSAnaGVhZGVyLnBhZ2UtaGVhZGVyLmNvbnRhaW5lci5jZ2VuJ1xuY29uc3QgRklSU1RfSEVBRElORyA9IGAke1JBSkVfU0VMRUNUT1J9PnNlY3Rpb246Zmlyc3Q+aDE6Zmlyc3RgXG5cblxudmFyIGZpZ3VyZWJveF9zZWxlY3Rvcl9pbWcgPSBcInAgPiBpbWc6bm90KFtyb2xlPW1hdGhdKVwiO1xudmFyIGZpZ3VyZWJveF9zZWxlY3Rvcl9zdmcgPSBcInAgPiBzdmdcIjtcbnZhciBmaWd1cmVib3hfc2VsZWN0b3IgPSBcImZpZ3VyZSA+IFwiICsgZmlndXJlYm94X3NlbGVjdG9yX2ltZyArIFwiLCBmaWd1cmUgPiBcIiArIGZpZ3VyZWJveF9zZWxlY3Rvcl9zdmc7XG52YXIgdGFibGVib3hfc2VsZWN0b3JfdGFibGUgPSBcInRhYmxlXCI7XG52YXIgdGFibGVib3hfc2VsZWN0b3IgPSBcImZpZ3VyZSA+IFwiICsgdGFibGVib3hfc2VsZWN0b3JfdGFibGU7XG52YXIgZm9ybXVsYWJveF9zZWxlY3Rvcl9pbWcgPSBcInAgPiBpbWdbcm9sZT1tYXRoXVwiO1xudmFyIGZvcm11bGFib3hfc2VsZWN0b3Jfc3BhbiA9IFwicCA+IHNwYW5bcm9sZT1tYXRoXVwiO1xudmFyIGZvcm11bGFib3hfc2VsZWN0b3JfbWF0aCA9IFwicCA+IG1hdGhcIjtcbnZhciBmb3JtdWxhYm94X3NlbGVjdG9yX3N2ZyA9IFwicCA+IHNwYW4gPiBzdmdbcm9sZT1tYXRoXVwiXG5cbnZhciBmb3JtdWxhYm94X3NlbGVjdG9yID1cbiAgXCJmaWd1cmUgPiBcIiArIGZvcm11bGFib3hfc2VsZWN0b3JfaW1nICsgXCIsIGZpZ3VyZSA+IFwiICsgZm9ybXVsYWJveF9zZWxlY3Rvcl9zcGFuICsgXCIsIGZpZ3VyZSA+IFwiICsgZm9ybXVsYWJveF9zZWxlY3Rvcl9tYXRoICsgXCIsIGZpZ3VyZSA+IFwiICsgZm9ybXVsYWJveF9zZWxlY3Rvcl9zdmdcbnZhciBsaXN0aW5nYm94X3NlbGVjdG9yX3ByZSA9IFwicHJlXCI7XG52YXIgbGlzdGluZ2JveF9zZWxlY3RvciA9IFwiZmlndXJlID4gXCIgKyBsaXN0aW5nYm94X3NlbGVjdG9yX3ByZTtcblxuY29uc3QgVElOWU1DRV9UT09MQkFSX0hFSUdUSCA9IDc2XG5cbmxldCBpcGNSZW5kZXJlciwgd2ViRnJhbWVcblxuaWYgKGhhc0JhY2tlbmQpIHtcblxuICBpcGNSZW5kZXJlciA9IHJlcXVpcmUoJ2VsZWN0cm9uJykuaXBjUmVuZGVyZXJcbiAgd2ViRnJhbWUgPSByZXF1aXJlKCdlbGVjdHJvbicpLndlYkZyYW1lXG5cbiAgLyoqXG4gICAqIEluaXRpbGlzZSBUaW55TUNFIFxuICAgKi9cbiAgJChkb2N1bWVudCkucmVhZHkoZnVuY3Rpb24gKCkge1xuXG4gICAgLy8gT3ZlcnJpZGUgdGhlIG1hcmdpbiBib3R0b24gZ2l2ZW4gYnkgUkFTSCBmb3IgdGhlIGZvb3RlclxuICAgICQoJ2JvZHknKS5jc3Moe1xuICAgICAgJ21hcmdpbi1ib3R0b20nOiAwXG4gICAgfSlcblxuICAgIC8vaGlkZSBmb290ZXJcbiAgICAkKCdmb290ZXIuZm9vdGVyJykucmVtb3ZlKClcblxuICAgIC8vYXR0YWNoIHdob2xlIGJvZHkgaW5zaWRlIGEgcGxhY2Vob2xkZXIgZGl2XG4gICAgJCgnYm9keScpLmh0bWwoYDxkaXYgaWQ9XCJyYWplX3Jvb3RcIj4keyQoJ2JvZHknKS5odG1sKCl9PC9kaXY+YClcblxuICAgIC8vIFxuICAgIHNldE5vbkVkaXRhYmxlSGVhZGVyKClcblxuICAgIC8vXG4gICAgbWF0aG1sMnN2Z0FsbEZvcm11bGFzKClcblxuICAgIHRpbnltY2UuaW5pdCh7XG5cbiAgICAgIC8vIFNlbGVjdCB0aGUgZWxlbWVudCB0byB3cmFwXG4gICAgICBzZWxlY3RvcjogJyNyYWplX3Jvb3QnLFxuXG4gICAgICAvLyBTZXQgd2luZG93IHNpemVcbiAgICAgIGhlaWdodDogd2luZG93LmlubmVySGVpZ2h0IC0gVElOWU1DRV9UT09MQkFSX0hFSUdUSCxcblxuICAgICAgLy8gU2V0IHRoZSBzdHlsZXMgb2YgdGhlIGNvbnRlbnQgd3JhcHBlZCBpbnNpZGUgdGhlIGVsZW1lbnRcbiAgICAgIGNvbnRlbnRfY3NzOiBbJ2Nzcy9ib290c3RyYXAubWluLmNzcycsICdjc3MvcmFzaC5jc3MnLCAnY3NzL3JhamUtY29yZS5jc3MnXSxcblxuICAgICAgLy8gU2V0IHBsdWdpbnNcbiAgICAgIHBsdWdpbnM6IFwicmFqZV9pbmxpbmVGaWd1cmUgZnVsbHNjcmVlbiBsaW5rIGNvZGVzYW1wbGUgcmFqZV9leHRlcm5hbExpbmsgcmFqZV9pbmxpbmVDb2RlIHJhamVfaW5saW5lUXVvdGUgcmFqZV9zZWN0aW9uIHRhYmxlIGltYWdlIG5vbmVkaXRhYmxlIHJhamVfaW1hZ2UgcmFqZV9xdW90ZWJsb2NrIHJhamVfY29kZWJsb2NrIHJhamVfdGFibGUgcmFqZV9saXN0aW5nIHJhamVfaW5saW5lX2Zvcm11bGEgcmFqZV9mb3JtdWxhIHJhamVfY3Jvc3NyZWYgcmFqZV9mb290bm90ZXMgcmFqZV9tZXRhZGF0YSByYWplX2xpc3RzIHJhamVfc2F2ZVwiLFxuXG4gICAgICAvLyBSZW1vdmUgbWVudWJhclxuICAgICAgbWVudWJhcjogZmFsc2UsXG5cbiAgICAgIC8vIEN1c3RvbSB0b29sYmFyXG4gICAgICB0b29sYmFyOiAndW5kbyByZWRvIGJvbGQgaXRhbGljIGxpbmsgc3VwZXJzY3JpcHQgc3Vic2NyaXB0IHJhamVfaW5saW5lQ29kZSByYWplX2lubGluZVF1b3RlIHJhamVfaW5saW5lX2Zvcm11bGEgcmFqZV9jcm9zc3JlZiByYWplX2Zvb3Rub3RlcyB8IHJhamVfb2wgcmFqZV91bCByYWplX2NvZGVibG9jayByYWplX3F1b3RlYmxvY2sgcmFqZV90YWJsZSByYWplX2ltYWdlIHJhamVfbGlzdGluZyByYWplX2Zvcm11bGEgfCByYWplX3NlY3Rpb24gcmFqZV9tZXRhZGF0YSByYWplX3NhdmUnLFxuXG4gICAgICAvLyBTZXR1cCBmdWxsIHNjcmVlbiBvbiBpbml0XG4gICAgICBzZXR1cDogZnVuY3Rpb24gKGVkaXRvcikge1xuXG4gICAgICAgIGxldCBwYXN0ZUJvb2ttYXJrXG5cbiAgICAgICAgLy8gU2V0IGZ1bGxzY3JlZW4gXG4gICAgICAgIGVkaXRvci5vbignaW5pdCcsIGZ1bmN0aW9uIChlKSB7XG5cbiAgICAgICAgICBlZGl0b3IuZXhlY0NvbW1hbmQoJ21jZUZ1bGxTY3JlZW4nKVxuXG4gICAgICAgICAgLy8gTW92ZSBjYXJldCBhdCB0aGUgZmlyc3QgaDEgZWxlbWVudCBvZiBtYWluIHNlY3Rpb25cbiAgICAgICAgICAvLyBPciByaWdodCBhZnRlciBoZWFkaW5nXG4gICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLnNldEN1cnNvckxvY2F0aW9uKHRpbnltY2UuYWN0aXZlRWRpdG9yLmRvbS5zZWxlY3QoRklSU1RfSEVBRElORylbMF0sIDApXG4gICAgICAgIH0pXG5cbiAgICAgICAgZWRpdG9yLm9uKCdrZXlEb3duJywgZnVuY3Rpb24gKGUpIHtcblxuICAgICAgICAgIC8vIFByZXZlbnQgc2hpZnQrZW50ZXJcbiAgICAgICAgICBpZiAoZS5rZXlDb2RlID09IDEzICYmIGUuc2hpZnRLZXkpXG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcblxuICAgICAgICAgIGlmIChlLmtleUNvZGUgPT0gODYgJiYgZS5tZXRhS2V5KSB7XG5cbiAgICAgICAgICAgIGlmICgkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpLmlzKCdwcmUnKSkge1xuXG4gICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpXG5cbiAgICAgICAgICAgICAgcGFzdGVCb29rbWFyayA9IHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRCb29rbWFyaygpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBcbiAgICAgICAgICovXG4gICAgICAgIGVkaXRvci5vbignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuXG4gICAgICAgICAgLy8gQ2FwdHVyZSB0aGUgdHJpcGxlIGNsaWNrIGV2ZW50XG4gICAgICAgICAgaWYgKGUuZGV0YWlsID09IDMpIHtcblxuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpXG5cbiAgICAgICAgICAgIGxldCB3cmFwcGVyID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Um5nKCkuc3RhcnRDb250YWluZXIpLnBhcmVudHMoJ3AsZmlnY2FwdGlvbiw6aGVhZGVyJykuZmlyc3QoKVxuICAgICAgICAgICAgbGV0IHN0YXJ0Q29udGFpbmVyID0gd3JhcHBlclswXVxuICAgICAgICAgICAgbGV0IGVuZENvbnRhaW5lciA9IHdyYXBwZXJbMF1cbiAgICAgICAgICAgIGxldCByYW5nZSA9IGRvY3VtZW50LmNyZWF0ZVJhbmdlKClcblxuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIHdyYXBwZXIgaGFzIG1vcmUgdGV4dCBub2RlIGluc2lkZVxuICAgICAgICAgICAgaWYgKHdyYXBwZXIuY29udGVudHMoKS5sZW5ndGggPiAxKSB7XG5cbiAgICAgICAgICAgICAgLy8gSWYgdGhlIGZpcnN0IHRleHQgbm9kZSBpcyBhIG5vdCBlZGl0YWJsZSBzdHJvbmcsIHRoZSBzZWxlY3Rpb24gbXVzdCBzdGFydCB3aXRoIHRoZSBzZWNvbmQgZWxlbWVudFxuICAgICAgICAgICAgICBpZiAod3JhcHBlci5jb250ZW50cygpLmZpcnN0KCkuaXMoJ3N0cm9uZ1tjb250ZW50ZWRpdGFibGU9ZmFsc2VdJykpXG4gICAgICAgICAgICAgICAgc3RhcnRDb250YWluZXIgPSB3cmFwcGVyLmNvbnRlbnRzKClbMV1cblxuICAgICAgICAgICAgICAvLyBJbiB0aGlzIGNhc2UgdGhlIGVuZENvbnRhaW5lciB3aWxsIGJlIHRoZSBsYXN0IHRleHQgbm9kZVxuICAgICAgICAgICAgICBlbmRDb250YWluZXIgPSB3cmFwcGVyLmNvbnRlbnRzKCkubGFzdCgpWzBdXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJhbmdlLnNldFN0YXJ0KHN0YXJ0Q29udGFpbmVyLCAwKVxuXG4gICAgICAgICAgICBpZiAod3JhcHBlci5pcygnZmlnY2FwdGlvbicpKVxuICAgICAgICAgICAgICByYW5nZS5zZXRFbmQoZW5kQ29udGFpbmVyLCBlbmRDb250YWluZXIubGVuZ3RoKVxuXG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgIHJhbmdlLnNldEVuZChlbmRDb250YWluZXIsIDEpXG5cbiAgICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZXRSbmcocmFuZ2UpXG4gICAgICAgICAgfVxuXG4gICAgICAgIH0pXG5cbiAgICAgICAgLy8gUHJldmVudCBzcGFuIFxuICAgICAgICBlZGl0b3Iub24oJ25vZGVDaGFuZ2UnLCBmdW5jdGlvbiAoZSkge1xuXG4gICAgICAgICAgbGV0IHNlbGVjdGVkRWxlbWVudCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcblxuICAgICAgICAgIC8vIE1vdmUgY2FyZXQgdG8gZmlyc3QgaGVhZGluZyBpZiBpcyBhZnRlciBvciBiZWZvcmUgbm90IGVkaXRhYmxlIGhlYWRlclxuICAgICAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQuaXMoJ3AnKSAmJiAoc2VsZWN0ZWRFbGVtZW50Lm5leHQoKS5pcyhIRUFERVJfU0VMRUNUT1IpIHx8IChzZWxlY3RlZEVsZW1lbnQucHJldigpLmlzKEhFQURFUl9TRUxFQ1RPUikgJiYgdGlueW1jZS5hY3RpdmVFZGl0b3IuZG9tLnNlbGVjdChGSVJTVF9IRUFESU5HKS5sZW5ndGgpKSlcbiAgICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZXRDdXJzb3JMb2NhdGlvbih0aW55bWNlLmFjdGl2ZUVkaXRvci5kb20uc2VsZWN0KEZJUlNUX0hFQURJTkcpWzBdLCAwKVxuXG4gICAgICAgICAgLy8gSWYgdGhlIGN1cnJlbnQgZWxlbWVudCBpc24ndCBpbnNpZGUgaGVhZGVyLCBvbmx5IGluIHNlY3Rpb24gdGhpcyBpcyBwZXJtaXR0ZWRcbiAgICAgICAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LnBhcmVudHMoJ3NlY3Rpb24nKS5sZW5ndGgpIHtcblxuICAgICAgICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC5pcygnc3BhbiNfbWNlX2NhcmV0W2RhdGEtbWNlLWJvZ3VzXScpIHx8IHNlbGVjdGVkRWxlbWVudC5wYXJlbnQoKS5pcygnc3BhbiNfbWNlX2NhcmV0W2RhdGEtbWNlLWJvZ3VzXScpKSB7XG5cbiAgICAgICAgICAgICAgLy8gUmVtb3ZlIHNwYW4gbm9ybWFsbHkgY3JlYXRlZCB3aXRoIGJvbGRcbiAgICAgICAgICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC5wYXJlbnQoKS5pcygnc3BhbiNfbWNlX2NhcmV0W2RhdGEtbWNlLWJvZ3VzXScpKVxuICAgICAgICAgICAgICAgIHNlbGVjdGVkRWxlbWVudCA9IHNlbGVjdGVkRWxlbWVudC5wYXJlbnQoKVxuXG4gICAgICAgICAgICAgIGxldCBibSA9IHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRCb29rbWFyaygpXG4gICAgICAgICAgICAgIHNlbGVjdGVkRWxlbWVudC5yZXBsYWNlV2l0aChzZWxlY3RlZEVsZW1lbnQuaHRtbCgpKVxuICAgICAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24ubW92ZVRvQm9va21hcmsoYm0pXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdXBkYXRlRG9jdW1lbnRTdGF0ZSgpXG4gICAgICAgIH0pXG5cbiAgICAgICAgLy8gVXBkYXRlIHNhdmVkIGNvbnRlbnQgb24gdW5kbyBhbmQgcmVkbyBldmVudHNcbiAgICAgICAgZWRpdG9yLm9uKCdVbmRvJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcbiAgICAgICAgfSlcblxuICAgICAgICBlZGl0b3Iub24oJ1JlZG8nLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuICAgICAgICB9KVxuXG4gICAgICAgIGVkaXRvci5vbignUGFzdGUnLCBmdW5jdGlvbiAoZSkge1xuXG4gICAgICAgICAgbGV0IHRhcmdldCA9ICQoZS50YXJnZXQpXG5cbiAgICAgICAgICAvLyBJZiB0aGUgcGFzdGUgZXZlbnQgaXMgY2FsbGVkIGluc2lkZSBhIGxpc3RpbmdcbiAgICAgICAgICBpZiAocGFzdGVCb29rbWFyayAmJiB0YXJnZXQucGFyZW50cygnZmlndXJlOmhhcyhwcmU6aGFzKGNvZGUpKScpLmxlbmd0aCkge1xuXG4gICAgICAgICAgICBsZXQgZGF0YSA9IGUuY2xpcGJvYXJkRGF0YS5nZXREYXRhKCdUZXh0JylcblxuICAgICAgICAgICAgLy8gUmVzdG9yZSB0aGUgc2VsZWN0aW9uIHNhdmVkIG9uIGNtZCt2XG4gICAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24ubW92ZVRvQm9va21hcmsocGFzdGVCb29rbWFyaylcblxuICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSBjb250ZW50XG4gICAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2V0Q29udGVudChlLmNsaXBib2FyZERhdGEuZ2V0RGF0YSgnVGV4dCcpKVxuXG4gICAgICAgICAgICBwYXN0ZUJvb2ttYXJrID0gbnVsbFxuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgIH0sXG5cbiAgICAgIC8vIFNldCBkZWZhdWx0IHRhcmdldFxuICAgICAgZGVmYXVsdF9saW5rX3RhcmdldDogXCJfYmxhbmtcIixcblxuICAgICAgLy8gUHJlcGVuZCBwcm90b2NvbCBpZiB0aGUgbGluayBzdGFydHMgd2l0aCB3d3dcbiAgICAgIGxpbmtfYXNzdW1lX2V4dGVybmFsX3RhcmdldHM6IHRydWUsXG5cbiAgICAgIC8vIEhpZGUgdGFyZ2V0IGxpc3RcbiAgICAgIHRhcmdldF9saXN0OiBmYWxzZSxcblxuICAgICAgLy8gSGlkZSB0aXRsZVxuICAgICAgbGlua190aXRsZTogZmFsc2UsXG5cbiAgICAgIC8vIFNldCBmb3JtYXRzXG4gICAgICBmb3JtYXRzOiB7XG4gICAgICAgIHVuZGVybGluZToge31cbiAgICAgIH0sXG5cbiAgICAgIC8vIFJlbW92ZSBcInBvd2VyZWQgYnkgdGlueW1jZVwiXG4gICAgICBicmFuZGluZzogZmFsc2UsXG5cbiAgICAgIC8vIFByZXZlbnQgYXV0byBiciBvbiBlbGVtZW50IGluc2VydFxuICAgICAgYXBwbHlfc291cmNlX2Zvcm1hdHRpbmc6IGZhbHNlLFxuXG4gICAgICAvLyBQcmV2ZW50IG5vbiBlZGl0YWJsZSBvYmplY3QgcmVzaXplXG4gICAgICBvYmplY3RfcmVzaXppbmc6IGZhbHNlLFxuXG4gICAgICAvLyBVcGRhdGUgdGhlIHRhYmxlIHBvcG92ZXIgbGF5b3V0XG4gICAgICB0YWJsZV90b29sYmFyOiBcInRhYmxlaW5zZXJ0cm93YmVmb3JlIHRhYmxlaW5zZXJ0cm93YWZ0ZXIgdGFibGVkZWxldGVyb3cgfCB0YWJsZWluc2VydGNvbGJlZm9yZSB0YWJsZWluc2VydGNvbGFmdGVyIHRhYmxlZGVsZXRlY29sXCIsXG5cbiAgICAgIGltYWdlX2FkdnRhYjogdHJ1ZSxcblxuICAgICAgcGFzdGVfYmxvY2tfZHJvcDogdHJ1ZSxcblxuICAgICAgZXh0ZW5kZWRfdmFsaWRfZWxlbWVudHM6IFwic3ZnWypdLGRlZnNbKl0scGF0dGVyblsqXSxkZXNjWypdLG1ldGFkYXRhWypdLGdbKl0sbWFza1sqXSxwYXRoWypdLGxpbmVbKl0sbWFya2VyWypdLHJlY3RbKl0sY2lyY2xlWypdLGVsbGlwc2VbKl0scG9seWdvblsqXSxwb2x5bGluZVsqXSxsaW5lYXJHcmFkaWVudFsqXSxyYWRpYWxHcmFkaWVudFsqXSxzdG9wWypdLGltYWdlWypdLHZpZXdbKl0sdGV4dFsqXSx0ZXh0UGF0aFsqXSx0aXRsZVsqXSx0c3BhblsqXSxnbHlwaFsqXSxzeW1ib2xbKl0sc3dpdGNoWypdLHVzZVsqXVwiLFxuXG4gICAgICBmb3JtdWxhOiB7XG4gICAgICAgIHBhdGg6ICdub2RlX21vZHVsZXMvdGlueW1jZS1mb3JtdWxhLydcbiAgICAgIH0sXG5cbiAgICAgIGNsZWFudXBfb25fc3RhcnR1cDogZmFsc2UsXG4gICAgICB0cmltX3NwYW5fZWxlbWVudHM6IGZhbHNlLFxuICAgICAgdmVyaWZ5X2h0bWw6IGZhbHNlLFxuICAgICAgY2xlYW51cDogZmFsc2UsXG4gICAgICBjb252ZXJ0X3VybHM6IGZhbHNlXG4gICAgfSlcbiAgfSlcblxuICAvKipcbiAgICogT3BlbiBhbmQgY2xvc2UgdGhlIGhlYWRpbmdzIGRyb3Bkb3duXG4gICAqL1xuICAkKHdpbmRvdykubG9hZChmdW5jdGlvbiAoKSB7XG5cbiAgICAvLyBPcGVuIGFuZCBjbG9zZSBtZW51IGhlYWRpbmdzIE7DpGl2ZSB3YXlcbiAgICAkKGBkaXZbYXJpYS1sYWJlbD0naGVhZGluZyddYCkuZmluZCgnYnV0dG9uJykudHJpZ2dlcignY2xpY2snKVxuICAgICQoYGRpdlthcmlhLWxhYmVsPSdoZWFkaW5nJ11gKS5maW5kKCdidXR0b24nKS50cmlnZ2VyKCdjbGljaycpXG4gIH0pXG5cblxuICAvKipcbiAgICogVXBkYXRlIGNvbnRlbnQgaW4gdGhlIGlmcmFtZSwgd2l0aCB0aGUgb25lIHN0b3JlZCBieSB0aW55bWNlXG4gICAqIEFuZCBzYXZlL3Jlc3RvcmUgdGhlIHNlbGVjdGlvblxuICAgKi9cbiAgZnVuY3Rpb24gdXBkYXRlSWZyYW1lRnJvbVNhdmVkQ29udGVudCgpIHtcblxuICAgIC8vIFNhdmUgdGhlIGJvb2ttYXJrIFxuICAgIGxldCBib29rbWFyayA9IHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRCb29rbWFyaygyLCB0cnVlKVxuXG4gICAgLy8gVXBkYXRlIGlmcmFtZSBjb250ZW50XG4gICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2V0Q29udGVudCgkKCcjcmFqZV9yb290JykuaHRtbCgpKVxuXG4gICAgLy8gUmVzdG9yZSB0aGUgYm9va21hcmsgXG4gICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLm1vdmVUb0Jvb2ttYXJrKGJvb2ttYXJrKVxuICB9XG5cbiAgLyoqXG4gICAqIFxuICAgKi9cbiAgZnVuY3Rpb24gdXBkYXRlSWZyYW1lRnJvbVNhdmVkQ29udGVudFdpdGhvdXRVbmRvKCkge1xuXG4gICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIuaWdub3JlKGZ1bmN0aW9uICgpIHtcbiAgICAgIC8vIFNhdmUgdGhlIGJvb2ttYXJrIFxuICAgICAgbGV0IGJvb2ttYXJrID0gdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldEJvb2ttYXJrKDIsIHRydWUpXG5cbiAgICAgIC8vIFVwZGF0ZSBpZnJhbWUgY29udGVudFxuICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2V0Q29udGVudCgkKCcjcmFqZV9yb290JykuaHRtbCgpKVxuXG4gICAgICAvLyBSZXN0b3JlIHRoZSBib29rbWFyayBcbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5tb3ZlVG9Cb29rbWFyayhib29rbWFyaylcbiAgICB9KVxuICB9XG5cbiAgLyoqXG4gICAqIEFjY2VwdCBhIGpzIG9iamVjdCB0aGF0IGV4aXN0cyBpbiBmcmFtZVxuICAgKiBAcGFyYW0geyp9IGVsZW1lbnQgXG4gICAqL1xuICBmdW5jdGlvbiBtb3ZlQ2FyZXQoZWxlbWVudCwgdG9TdGFydCkge1xuICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZWxlY3QoZWxlbWVudCwgdHJ1ZSlcbiAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uY29sbGFwc2UodG9TdGFydClcblxuICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLmZvY3VzKClcbiAgfVxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGZ1bmN0aW9uIHNlbGVjdFJhbmdlKHN0YXJ0Q29udGFpbmVyLCBzdGFydE9mZnNldCwgZW5kQ29udGFpbmVyLCBlbmRPZmZzZXQpIHtcblxuICAgIGxldCByYW5nZSA9IGRvY3VtZW50LmNyZWF0ZVJhbmdlKClcbiAgICByYW5nZS5zZXRTdGFydChzdGFydENvbnRhaW5lciwgc3RhcnRPZmZzZXQpXG5cbiAgICAvLyBJZiB0aGVzZSBwcm9wZXJ0aWVzIGFyZSBub3QgaW4gdGhlIHNpZ25hdHVyZSB1c2UgdGhlIHN0YXJ0XG4gICAgaWYgKCFlbmRDb250YWluZXIgJiYgIWVuZE9mZnNldCkge1xuICAgICAgZW5kQ29udGFpbmVyID0gc3RhcnRDb250YWluZXJcbiAgICAgIGVuZE9mZnNldCA9IHN0YXJ0T2Zmc2V0XG4gICAgfVxuXG4gICAgcmFuZ2Uuc2V0RW5kKGVuZENvbnRhaW5lciwgZW5kT2Zmc2V0KVxuICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZXRSbmcocmFuZ2UpXG4gIH1cblxuICAvKipcbiAgICogXG4gICAqIEBwYXJhbSB7Kn0gZWxlbWVudCBcbiAgICovXG4gIGZ1bmN0aW9uIG1vdmVDdXJzb3JUb0VuZChlbGVtZW50KSB7XG5cbiAgICBsZXQgaGVhZGluZyA9IGVsZW1lbnRcbiAgICBsZXQgb2Zmc2V0ID0gMFxuXG4gICAgaWYgKGhlYWRpbmcuY29udGVudHMoKS5sZW5ndGgpIHtcblxuICAgICAgaGVhZGluZyA9IGhlYWRpbmcuY29udGVudHMoKS5sYXN0KClcblxuICAgICAgLy8gSWYgdGhlIGxhc3Qgbm9kZSBpcyBhIHN0cm9uZyxlbSxxIGV0Yy4gd2UgaGF2ZSB0byB0YWtlIGl0cyB0ZXh0IFxuICAgICAgaWYgKGhlYWRpbmdbMF0ubm9kZVR5cGUgIT0gMylcbiAgICAgICAgaGVhZGluZyA9IGhlYWRpbmcuY29udGVudHMoKS5sYXN0KClcblxuICAgICAgb2Zmc2V0ID0gaGVhZGluZ1swXS53aG9sZVRleHQubGVuZ3RoXG4gICAgfVxuXG4gICAgdGlueW1jZS5hY3RpdmVFZGl0b3IuZm9jdXMoKVxuICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZXRDdXJzb3JMb2NhdGlvbihoZWFkaW5nWzBdLCBvZmZzZXQpXG4gIH1cblxuICAvKipcbiAgICogXG4gICAqIEBwYXJhbSB7Kn0gZWxlbWVudCBcbiAgICovXG4gIGZ1bmN0aW9uIG1vdmVDdXJzb3JUb1N0YXJ0KGVsZW1lbnQpIHtcblxuICAgIGxldCBoZWFkaW5nID0gZWxlbWVudFxuICAgIGxldCBvZmZzZXQgPSAwXG5cbiAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5mb2N1cygpXG4gICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLnNldEN1cnNvckxvY2F0aW9uKGhlYWRpbmdbMF0sIG9mZnNldClcbiAgfVxuXG5cbiAgLyoqXG4gICAqIENyZWF0ZSBjdXN0b20gaW50byBub3RpZmljYXRpb25cbiAgICogQHBhcmFtIHsqfSB0ZXh0IFxuICAgKiBAcGFyYW0geyp9IHRpbWVvdXQgXG4gICAqL1xuICBmdW5jdGlvbiBub3RpZnkodGV4dCwgdHlwZSwgdGltZW91dCkge1xuXG4gICAgaWYgKHRpbnltY2UuYWN0aXZlRWRpdG9yLm5vdGlmaWNhdGlvbk1hbmFnZXIuZ2V0Tm90aWZpY2F0aW9ucygpLmxlbmd0aClcbiAgICAgIHRvcC50aW55bWNlLmFjdGl2ZUVkaXRvci5ub3RpZmljYXRpb25NYW5hZ2VyLmNsb3NlKClcblxuICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLm5vdGlmaWNhdGlvbk1hbmFnZXIub3Blbih7XG4gICAgICB0ZXh0OiB0ZXh0LFxuICAgICAgdHlwZTogdHlwZSA/IHR5cGUgOiAnaW5mbycsXG4gICAgICB0aW1lb3V0OiAzMDAwXG4gICAgfSlcbiAgfVxuXG4gIC8qKlxuICAgKiBcbiAgICogQHBhcmFtIHsqfSBlbGVtZW50U2VsZWN0b3IgXG4gICAqL1xuICBmdW5jdGlvbiBzY3JvbGxUbyhlbGVtZW50U2VsZWN0b3IpIHtcbiAgICAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLmdldEJvZHkoKSkuZmluZChlbGVtZW50U2VsZWN0b3IpLmdldCgwKS5zY3JvbGxJbnRvVmlldygpO1xuICB9XG5cbiAgLyoqXG4gICAqIFxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0U3VjY2Vzc2l2ZUVsZW1lbnRJZChlbGVtZW50U2VsZWN0b3IsIFNVRkZJWCkge1xuXG4gICAgbGV0IGxhc3RJZCA9IDBcblxuICAgICQoZWxlbWVudFNlbGVjdG9yKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgIGxldCBjdXJyZW50SWQgPSBwYXJzZUludCgkKHRoaXMpLmF0dHIoJ2lkJykucmVwbGFjZShTVUZGSVgsICcnKSlcbiAgICAgIGxhc3RJZCA9IGN1cnJlbnRJZCA+IGxhc3RJZCA/IGN1cnJlbnRJZCA6IGxhc3RJZFxuICAgIH0pXG5cbiAgICByZXR1cm4gYCR7U1VGRklYfSR7bGFzdElkKzF9YFxuICB9XG5cbiAgLyoqXG4gICAqIFxuICAgKi9cbiAgZnVuY3Rpb24gaGVhZGluZ0RpbWVuc2lvbigpIHtcbiAgICAkKCdoMSxoMixoMyxoNCxoNSxoNicpLmVhY2goZnVuY3Rpb24gKCkge1xuXG4gICAgICBpZiAoISQodGhpcykucGFyZW50cyhIRUFERVJfU0VMRUNUT1IpLmxlbmd0aCkge1xuICAgICAgICB2YXIgY291bnRlciA9IDA7XG4gICAgICAgICQodGhpcykucGFyZW50cyhcInNlY3Rpb25cIikuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgaWYgKCQodGhpcykuY2hpbGRyZW4oXCJoMSxoMixoMyxoNCxoNSxoNlwiKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb3VudGVyKys7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgJCh0aGlzKS5yZXBsYWNlV2l0aChcIjxoXCIgKyBjb3VudGVyICsgXCIgZGF0YS1yYXNoLW9yaWdpbmFsLXdyYXBwZXI9XFxcImgxXFxcIiA+XCIgKyAkKHRoaXMpLmh0bWwoKSArIFwiPC9oXCIgKyBjb3VudGVyICsgXCI+XCIpXG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogXG4gICAqL1xuICBmdW5jdGlvbiBjaGVja0lmUHJpbnRhYmxlQ2hhcihrZXljb2RlKSB7XG5cbiAgICByZXR1cm4gKGtleWNvZGUgPiA0NyAmJiBrZXljb2RlIDwgNTgpIHx8IC8vIG51bWJlciBrZXlzXG4gICAgICAoa2V5Y29kZSA9PSAzMiB8fCBrZXljb2RlID09IDEzKSB8fCAvLyBzcGFjZWJhciAmIHJldHVybiBrZXkocykgKGlmIHlvdSB3YW50IHRvIGFsbG93IGNhcnJpYWdlIHJldHVybnMpXG4gICAgICAoa2V5Y29kZSA+IDY0ICYmIGtleWNvZGUgPCA5MSkgfHwgLy8gbGV0dGVyIGtleXNcbiAgICAgIChrZXljb2RlID4gOTUgJiYga2V5Y29kZSA8IDExMikgfHwgLy8gbnVtcGFkIGtleXNcbiAgICAgIChrZXljb2RlID4gMTg1ICYmIGtleWNvZGUgPCAxOTMpIHx8IC8vIDs9LC0uL2AgKGluIG9yZGVyKVxuICAgICAgKGtleWNvZGUgPiAyMTggJiYga2V5Y29kZSA8IDIyMyk7IC8vIFtcXF0nIChpbiBvcmRlcilcbiAgfVxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGZ1bmN0aW9uIG1hcmtUaW55TUNFKCkge1xuICAgICQoJ2RpdltpZF49bWNldV9dJykuYXR0cignZGF0YS1yYXNoLW9yaWdpbmFsLWNvbnRlbnQnLCAnJylcbiAgfVxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGZ1bmN0aW9uIHNldE5vbkVkaXRhYmxlSGVhZGVyKCkge1xuICAgICQoSEVBREVSX1NFTEVDVE9SKS5hZGRDbGFzcygnbWNlTm9uRWRpdGFibGUnKVxuICB9XG5cbiAgLyoqXG4gICAqIFxuICAgKi9cbiAgZnVuY3Rpb24gY2hlY2tJZkFwcCgpIHtcbiAgICByZXR1cm4gaXBjUmVuZGVyZXIuc2VuZFN5bmMoJ2lzQXBwU3luYycpXG4gIH1cblxuICAvKipcbiAgICogXG4gICAqL1xuICBmdW5jdGlvbiBzZWxlY3RJbWFnZSgpIHtcbiAgICByZXR1cm4gaXBjUmVuZGVyZXIuc2VuZFN5bmMoJ3NlbGVjdEltYWdlU3luYycpXG4gIH1cblxuICAvKipcbiAgICogU2VuZCBhIG1lc3NhZ2UgdG8gdGhlIGJhY2tlbmQsIG5vdGlmeSB0aGUgc3RydWN0dXJhbCBjaGFuZ2VcbiAgICogXG4gICAqIElmIHRoZSBkb2N1bWVudCBpcyBkcmFmdCBzdGF0ZSA9IHRydWVcbiAgICogSWYgdGhlIGRvY3VtZW50IGlzIHNhdmVkIHN0YXRlID0gZmFsc2VcbiAgICovXG4gIGZ1bmN0aW9uIHVwZGF0ZURvY3VtZW50U3RhdGUoKSB7XG5cbiAgICAvLyBHZXQgdGhlIElmcmFtZSBjb250ZW50IG5vdCBpbiB4bWwgXG4gICAgbGV0IEpxdWVyeUlmcmFtZSA9ICQoYDxkaXY+JHt0aW55bWNlLmFjdGl2ZUVkaXRvci5nZXRDb250ZW50KCl9PC9kaXY+YClcbiAgICBsZXQgSnF1ZXJ5U2F2ZWRDb250ZW50ID0gJChgI3JhamVfcm9vdGApXG5cbiAgICAvLyBUcnVlIGlmIHRoZXkncmUgZGlmZmVyZW50LCBGYWxzZSBpcyB0aGV5J3JlIGVxdWFsXG4gICAgaXBjUmVuZGVyZXIuc2VuZCgndXBkYXRlRG9jdW1lbnRTdGF0ZScsIEpxdWVyeUlmcmFtZS5odG1sKCkgIT0gSnF1ZXJ5U2F2ZWRDb250ZW50Lmh0bWwoKSlcbiAgfVxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGZ1bmN0aW9uIHNhdmVBc0FydGljbGUob3B0aW9ucykge1xuICAgIHJldHVybiBpcGNSZW5kZXJlci5zZW5kKCdzYXZlQXNBcnRpY2xlJywgb3B0aW9ucylcbiAgfVxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGZ1bmN0aW9uIHNhdmVBcnRpY2xlKG9wdGlvbnMpIHtcbiAgICByZXR1cm4gaXBjUmVuZGVyZXIuc2VuZCgnc2F2ZUFydGljbGUnLCBvcHRpb25zKVxuICB9XG5cbiAgLyoqXG4gICAqIFxuICAgKi9cbiAgZnVuY3Rpb24gbWF0aG1sMnN2Z0FsbEZvcm11bGFzKCkge1xuXG4gICAgbGV0IGlkID0gJ3N2Z0Zvcm11bGEnXG5cbiAgICAvLyBBcHBlbmQgYSB0ZW1wb3JhcnkgZWxlbWVudFxuICAgICQoJ2JvZHknKS5hcHBlbmQoYDxkaXYgc3R5bGU9XCJkaXNwbGF5Om5vbmVcIiBjbGFzcz1cInJhc2gtbWF0aFwiIGlkPScke2lkfSc+PC9kaXY+YClcblxuICAgIC8vIEZvciBlYWNoIG1hdGhtbCBmb3JtdWxhXG4gICAgJChmb3JtdWxhYm94X3NlbGVjdG9yKS5lYWNoKGZ1bmN0aW9uICgpIHtcblxuICAgICAgbGV0IGZvcm11bGEgPSAkKHRoaXMpXG4gICAgICBsZXQgbWF0aG1sRm9ybXVsYSA9IGZvcm11bGFbMF0ub3V0ZXJIVE1MXG5cbiAgICAgIC8vIFVwZGF0ZSBpdHMgY29udGVudCB3aXRoIHRoZSBtYXRobWxcbiAgICAgICQoYCMke2lkfWApLmh0bWwobWF0aG1sRm9ybXVsYSlcblxuICAgICAgTWF0aEpheC5IdWIuUXVldWUoXG5cbiAgICAgICAgLy8gUHJvY2VzcyB0aGUgc3ZnIHRyYW5zZm9ybWF0aW9uXG4gICAgICAgIFtcIlR5cGVzZXRcIiwgTWF0aEpheC5IdWJdLFxuXG4gICAgICAgIC8vIFJlcGxhY2UgdGhlIGZvcm11bGEgaW4gbWF0aG1sIHdpdGggdGhlIHN2ZyBvdXRwdXRcbiAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGZvcm11bGEucmVwbGFjZVdpdGgoJChgIyR7aWR9YCkuZmluZCgnc3ZnJykuaHRtbCgpKVxuICAgICAgICB9LFxuXG4gICAgICAgIC8vIFVwZGF0ZSBpZnJhbWUgd2l0aG91dCBhZGRpbmQgYSBuZXcgdW5kbyBsZXZlbFxuICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgdXBkYXRlSWZyYW1lRnJvbVNhdmVkQ29udGVudFdpdGhvdXRVbmRvKClcbiAgICAgICAgfSxcblxuICAgICAgICAvLyBDbGVhbiB0aGUgZm9ybXVsYVxuICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgJChgIyR7aWR9YCkuaHRtbCgnJylcblxuICAgICAgICAgIC8vIENsZWFuIHRoZSB3aG9sZSB1bmRvIGxldmVscyBzZXRcbiAgICAgICAgICBpZiAodHlwZW9mIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyICE9ICd1bmRlZmluZWQnKVxuICAgICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIuY2xlYXIoKVxuICAgICAgICB9KVxuICAgIH0pXG5cbiAgICAvLyBSZW1vdmUgdGhlIHRlbXBvcmFyeVxuICAgICQoJ2JvZHknKS5maW5kKGlkKS5yZW1vdmUoKVxuICB9XG5cbiAgLyoqXG4gICAqIFN0YXJ0IHRoZSBzYXZlIGFzIHByb2Nlc3MgZ2V0dGluZyB0aGUgZGF0YSBhbmQgc2VuZGluZyBpdFxuICAgKiB0byB0aGUgbWFpbiBwcm9jZXNzXG4gICAqL1xuICBpcGNSZW5kZXJlci5vbignZXhlY3V0ZVNhdmVBcycsIChldmVudCwgZGF0YSkgPT4ge1xuICAgIHNhdmVNYW5hZ2VyLnNhdmVBcygpXG4gIH0pXG5cbiAgLyoqXG4gICAqIFN0YXJ0IHRoZSBzYXZlIHByb2Nlc3MgZ2V0dGluZyB0aGUgZGF0YSBhbmQgc2VuZGluZyBpdFxuICAgKiB0byB0aGUgbWFpbiBwcm9jZXNzXG4gICAqL1xuICBpcGNSZW5kZXJlci5vbignZXhlY3V0ZVNhdmUnLCAoZXZlbnQsIGRhdGEpID0+IHtcbiAgICBzYXZlTWFuYWdlci5zYXZlKClcbiAgfSlcblxuICAvKipcbiAgICogXG4gICAqL1xuICBpcGNSZW5kZXJlci5vbignbm90aWZ5JywgKGV2ZW50LCBkYXRhKSA9PiB7XG4gICAgbm90aWZ5KGRhdGEudGV4dCwgZGF0YS50eXBlLCBkYXRhLnRpbWVvdXQpXG4gIH0pXG5cbiAgLyoqXG4gICAqIFxuICAgKi9cbiAgaXBjUmVuZGVyZXIub24oJ3VwZGF0ZUNvbnRlbnQnLCAoZXZlbnQsIGRhdGEpID0+IHtcbiAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcbiAgfSlcbn0iLCJ0aW55bWNlLlBsdWdpbk1hbmFnZXIuYWRkKCdyYWplX2Nyb3NzcmVmJywgZnVuY3Rpb24gKGVkaXRvciwgdXJsKSB7XG5cbiAgLy8gQWRkIGEgYnV0dG9uIHRoYXQgaGFuZGxlIHRoZSBpbmxpbmUgZWxlbWVudFxuICBlZGl0b3IuYWRkQnV0dG9uKCdyYWplX2Nyb3NzcmVmJywge1xuICAgIHRpdGxlOiAncmFqZV9jcm9zc3JlZicsXG4gICAgaWNvbjogJ2ljb24tYW5jaG9yJyxcbiAgICB0b29sdGlwOiAnQ3Jvc3MtcmVmZXJlbmNlJyxcbiAgICBkaXNhYmxlZFN0YXRlU2VsZWN0b3I6IGAke0RJU0FCTEVfU0VMRUNUT1JfSU5MSU5FfSw6aGVhZGVyYCxcblxuICAgIC8vIEJ1dHRvbiBiZWhhdmlvdXJcbiAgICBvbmNsaWNrOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuXG4gICAgICBsZXQgcmVmZXJlbmNlYWJsZUxpc3QgPSB7XG4gICAgICAgIHNlY3Rpb25zOiBjcm9zc3JlZi5nZXRBbGxSZWZlcmVuY2VhYmxlU2VjdGlvbnMoKSxcbiAgICAgICAgdGFibGVzOiBjcm9zc3JlZi5nZXRBbGxSZWZlcmVuY2VhYmxlVGFibGVzKCksXG4gICAgICAgIGZpZ3VyZXM6IGNyb3NzcmVmLmdldEFsbFJlZmVyZW5jZWFibGVGaWd1cmVzKCksXG4gICAgICAgIGxpc3RpbmdzOiBjcm9zc3JlZi5nZXRBbGxSZWZlcmVuY2VhYmxlTGlzdGluZ3MoKSxcbiAgICAgICAgZm9ybXVsYXM6IGNyb3NzcmVmLmdldEFsbFJlZmVyZW5jZWFibGVGb3JtdWxhcygpLFxuICAgICAgICByZWZlcmVuY2VzOiBjcm9zc3JlZi5nZXRBbGxSZWZlcmVuY2VhYmxlUmVmZXJlbmNlcygpXG4gICAgICB9XG5cbiAgICAgIGVkaXRvci53aW5kb3dNYW5hZ2VyLm9wZW4oe1xuICAgICAgICAgIHRpdGxlOiAnQ3Jvc3MtcmVmZXJlbmNlIGVkaXRvcicsXG4gICAgICAgICAgdXJsOiAnanMvcmFqZS1jb3JlL3BsdWdpbi9yYWplX2Nyb3NzcmVmLmh0bWwnLFxuICAgICAgICAgIHdpZHRoOiA1MDAsXG4gICAgICAgICAgaGVpZ2h0OiA4MDAsXG4gICAgICAgICAgb25DbG9zZTogZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFxuICAgICAgICAgICAgICogVGhpcyBiZWhhdmlvdXIgaXMgY2FsbGVkIHdoZW4gdXNlciBwcmVzcyBcIkFERCBORVcgUkVGRVJFTkNFXCIgXG4gICAgICAgICAgICAgKiBidXR0b24gZnJvbSB0aGUgbW9kYWxcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgaWYgKHRpbnltY2UuYWN0aXZlRWRpdG9yLmNyZWF0ZU5ld1JlZmVyZW5jZSkge1xuXG4gICAgICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgICAgICAgIC8vIEdldCBzdWNjZXNzaXZlIGJpYmxpb2VudHJ5IGlkXG4gICAgICAgICAgICAgICAgbGV0IGlkID0gZ2V0U3VjY2Vzc2l2ZUVsZW1lbnRJZChCSUJMSU9FTlRSWV9TRUxFQ1RPUiwgQklCTElPRU5UUllfU1VGRklYKVxuXG4gICAgICAgICAgICAgICAgLy8gQ3JlYXRlIHRoZSByZWZlcmVuY2UgdGhhdCBwb2ludHMgdG8gdGhlIG5leHQgaWRcbiAgICAgICAgICAgICAgICBjcm9zc3JlZi5hZGQoaWQpXG5cbiAgICAgICAgICAgICAgICAvLyBBZGQgdGhlIG5leHQgYmlibGlvZW50cnlcbiAgICAgICAgICAgICAgICBzZWN0aW9uLmFkZEJpYmxpb2VudHJ5KGlkKVxuXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSByZWZlcmVuY2VcbiAgICAgICAgICAgICAgICBjcm9zc3JlZi51cGRhdGUoKVxuXG4gICAgICAgICAgICAgICAgLy8gTW92ZSBjYXJldCB0byBzdGFydCBvZiB0aGUgbmV3IGJpYmxpb2VudHJ5IGVsZW1lbnRcbiAgICAgICAgICAgICAgICAvLyBJc3N1ZSAjMTA1IEZpcmVmb3ggKyBDaHJvbWl1bVxuICAgICAgICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZXRDdXJzb3JMb2NhdGlvbigkKHRpbnltY2UuYWN0aXZlRWRpdG9yLmRvbS5nZXQoaWQpKS5maW5kKCdwJylbMF0sIGZhbHNlKVxuICAgICAgICAgICAgICAgIHNjcm9sbFRvKGAke0JJQkxJT0VOVFJZX1NFTEVDVE9SfSMke2lkfWApXG4gICAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgICAgLy8gU2V0IHZhcmlhYmxlIG51bGwgZm9yIHN1Y2Nlc3NpdmUgdXNhZ2VzXG4gICAgICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLmNyZWF0ZU5ld1JlZmVyZW5jZSA9IG51bGxcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBUaGlzIGlzIGNhbGxlZCBpZiBhIG5vcm1hbCByZWZlcmVuY2UgaXMgc2VsZWN0ZWQgZnJvbSBtb2RhbFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBlbHNlIGlmICh0aW55bWNlLmFjdGl2ZUVkaXRvci5yZWZlcmVuY2UpIHtcblxuICAgICAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICAgICAgICAvLyBDcmVhdGUgdGhlIGVtcHR5IGFuY2hvciBhbmQgdXBkYXRlIGl0cyBjb250ZW50XG4gICAgICAgICAgICAgICAgY3Jvc3NyZWYuYWRkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnJlZmVyZW5jZSlcbiAgICAgICAgICAgICAgICBjcm9zc3JlZi51cGRhdGUoKVxuXG4gICAgICAgICAgICAgICAgbGV0IHNlbGVjdGVkTm9kZSA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcblxuICAgICAgICAgICAgICAgIC8vIFRoaXMgc2VsZWN0IHRoZSBsYXN0IGVsZW1lbnQgKGxhc3QgYnkgb3JkZXIpIGFuZCBjb2xsYXBzZSB0aGUgc2VsZWN0aW9uIGFmdGVyIHRoZSBub2RlXG4gICAgICAgICAgICAgICAgLy8gIzEwNSBGaXJlZm94ICsgQ2hyb21pdW1cbiAgICAgICAgICAgICAgICAvL3RpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZXRDdXJzb3JMb2NhdGlvbigkKHRpbnltY2UuYWN0aXZlRWRpdG9yLmRvbS5zZWxlY3QoYGFbaHJlZj1cIiMke3RpbnltY2UuYWN0aXZlRWRpdG9yLnJlZmVyZW5jZX1cIl06bGFzdC1jaGlsZGApKVswXSwgZmFsc2UpXG4gICAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgICAgLy8gU2V0IHZhcmlhYmxlIG51bGwgZm9yIHN1Y2Nlc3NpdmUgdXNhZ2VzXG4gICAgICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnJlZmVyZW5jZSA9IG51bGxcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgLy8gTGlzdCBvZiBhbGwgcmVmZXJlbmNlYWJsZSBlbGVtZW50c1xuICAgICAgICByZWZlcmVuY2VhYmxlTGlzdClcbiAgICB9XG4gIH0pXG5cbiAgY3Jvc3NyZWYgPSB7XG4gICAgZ2V0QWxsUmVmZXJlbmNlYWJsZVNlY3Rpb25zOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgIGxldCBzZWN0aW9ucyA9IFtdXG5cbiAgICAgICQoJ3NlY3Rpb24nKS5lYWNoKGZ1bmN0aW9uICgpIHtcblxuICAgICAgICBsZXQgbGV2ZWwgPSAnJ1xuXG4gICAgICAgIC8vIFNlY3Rpb25zIHdpdGhvdXQgcm9sZSBoYXZlIDphZnRlclxuICAgICAgICBpZiAoISQodGhpcykuYXR0cigncm9sZScpKSB7XG5cbiAgICAgICAgICAvLyBTYXZlIGl0cyBkZWVwbmVzc1xuICAgICAgICAgIGxldCBwYXJlbnRTZWN0aW9ucyA9ICQodGhpcykucGFyZW50c1VudGlsKCdkaXYjcmFqZV9yb290JylcblxuICAgICAgICAgIGlmIChwYXJlbnRTZWN0aW9ucy5sZW5ndGgpIHtcblxuICAgICAgICAgICAgLy8gSXRlcmF0ZSBpdHMgcGFyZW50cyBiYWNrd2FyZHMgKGhpZ2VyIGZpcnN0KVxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IHBhcmVudFNlY3Rpb25zLmxlbmd0aDsgaS0tOyBpID4gMCkge1xuICAgICAgICAgICAgICBsZXQgc2VjdGlvbiA9ICQocGFyZW50U2VjdGlvbnNbaV0pXG4gICAgICAgICAgICAgIGxldmVsICs9IGAke3NlY3Rpb24ucGFyZW50KCkuY2hpbGRyZW4oU0VDVElPTl9TRUxFQ1RPUikuaW5kZXgoc2VjdGlvbikrMX0uYFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIEN1cnJlbnQgaW5kZXhcbiAgICAgICAgICBsZXZlbCArPSBgJHskKHRoaXMpLnBhcmVudCgpLmNoaWxkcmVuKFNFQ1RJT05fU0VMRUNUT1IpLmluZGV4KCQodGhpcykpKzF9LmBcbiAgICAgICAgfVxuXG4gICAgICAgIHNlY3Rpb25zLnB1c2goe1xuICAgICAgICAgIHJlZmVyZW5jZTogJCh0aGlzKS5hdHRyKCdpZCcpLFxuICAgICAgICAgIHRleHQ6ICQodGhpcykuZmluZCgnOmhlYWRlcicpLmZpcnN0KCkudGV4dCgpLFxuICAgICAgICAgIGxldmVsOiBsZXZlbFxuICAgICAgICB9KVxuICAgICAgfSlcblxuICAgICAgcmV0dXJuIHNlY3Rpb25zXG4gICAgfSxcblxuICAgIGdldEFsbFJlZmVyZW5jZWFibGVUYWJsZXM6IGZ1bmN0aW9uICgpIHtcbiAgICAgIGxldCB0YWJsZXMgPSBbXVxuXG4gICAgICAkKCdmaWd1cmU6aGFzKHRhYmxlKScpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICB0YWJsZXMucHVzaCh7XG4gICAgICAgICAgcmVmZXJlbmNlOiAkKHRoaXMpLmF0dHIoJ2lkJyksXG4gICAgICAgICAgdGV4dDogJCh0aGlzKS5maW5kKCdmaWdjYXB0aW9uJykudGV4dCgpXG4gICAgICAgIH0pXG4gICAgICB9KVxuXG4gICAgICByZXR1cm4gdGFibGVzXG4gICAgfSxcblxuICAgIGdldEFsbFJlZmVyZW5jZWFibGVMaXN0aW5nczogZnVuY3Rpb24gKCkge1xuICAgICAgbGV0IGxpc3RpbmdzID0gW11cblxuICAgICAgJCgnZmlndXJlOmhhcyhwcmU6aGFzKGNvZGUpKScpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICBsaXN0aW5ncy5wdXNoKHtcbiAgICAgICAgICByZWZlcmVuY2U6ICQodGhpcykuYXR0cignaWQnKSxcbiAgICAgICAgICB0ZXh0OiAkKHRoaXMpLmZpbmQoJ2ZpZ2NhcHRpb24nKS50ZXh0KClcbiAgICAgICAgfSlcbiAgICAgIH0pXG5cbiAgICAgIHJldHVybiBsaXN0aW5nc1xuICAgIH0sXG5cbiAgICBnZXRBbGxSZWZlcmVuY2VhYmxlRmlndXJlczogZnVuY3Rpb24gKCkge1xuICAgICAgbGV0IGZpZ3VyZXMgPSBbXVxuXG4gICAgICAkKCdmaWd1cmU6aGFzKHA6aGFzKGltZykpLGZpZ3VyZTpoYXMocDpoYXMoc3ZnKSknKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZmlndXJlcy5wdXNoKHtcbiAgICAgICAgICByZWZlcmVuY2U6ICQodGhpcykuYXR0cignaWQnKSxcbiAgICAgICAgICB0ZXh0OiAkKHRoaXMpLmZpbmQoJ2ZpZ2NhcHRpb24nKS50ZXh0KClcbiAgICAgICAgfSlcbiAgICAgIH0pXG5cbiAgICAgIHJldHVybiBmaWd1cmVzXG4gICAgfSxcblxuICAgIGdldEFsbFJlZmVyZW5jZWFibGVGb3JtdWxhczogZnVuY3Rpb24gKCkge1xuICAgICAgbGV0IGZvcm11bGFzID0gW11cblxuICAgICAgJChmb3JtdWxhYm94X3NlbGVjdG9yKS5lYWNoKGZ1bmN0aW9uICgpIHtcblxuICAgICAgICBmb3JtdWxhcy5wdXNoKHtcbiAgICAgICAgICByZWZlcmVuY2U6ICQodGhpcykucGFyZW50cyhGSUdVUkVfU0VMRUNUT1IpLmF0dHIoJ2lkJyksXG4gICAgICAgICAgdGV4dDogYEZvcm11bGEgJHskKHRoaXMpLnBhcmVudHMoRklHVVJFX1NFTEVDVE9SKS5maW5kKCdzcGFuLmNnZW4nKS50ZXh0KCl9YFxuICAgICAgICB9KVxuICAgICAgfSlcblxuICAgICAgcmV0dXJuIGZvcm11bGFzXG4gICAgfSxcblxuICAgIGdldEFsbFJlZmVyZW5jZWFibGVSZWZlcmVuY2VzOiBmdW5jdGlvbiAoKSB7XG4gICAgICBsZXQgcmVmZXJlbmNlcyA9IFtdXG5cbiAgICAgICQoJ3NlY3Rpb25bcm9sZT1kb2MtYmlibGlvZ3JhcGh5XSBsaScpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICByZWZlcmVuY2VzLnB1c2goe1xuICAgICAgICAgIHJlZmVyZW5jZTogJCh0aGlzKS5hdHRyKCdpZCcpLFxuICAgICAgICAgIHRleHQ6ICQodGhpcykudGV4dCgpLFxuICAgICAgICAgIGxldmVsOiAkKHRoaXMpLmluZGV4KCkgKyAxXG4gICAgICAgIH0pXG4gICAgICB9KVxuXG4gICAgICByZXR1cm4gcmVmZXJlbmNlc1xuICAgIH0sXG5cbiAgICBhZGQ6IGZ1bmN0aW9uIChyZWZlcmVuY2UsIG5leHQpIHtcblxuICAgICAgLy8gQ3JlYXRlIHRoZSBlbXB0eSByZWZlcmVuY2Ugd2l0aCBhIHdoaXRlc3BhY2UgYXQgdGhlIGVuZFxuICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLnNldENvbnRlbnQoYDxhIGNvbnRlbnRlZGl0YWJsZT1cImZhbHNlXCIgaHJlZj1cIiMke3JlZmVyZW5jZX1cIj4mbmJzcDs8L2E+Jm5ic3A7YClcbiAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuICAgIH0sXG5cbiAgICB1cGRhdGU6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgLy8gVXBkYXRlIHRoZSByZWZlcmVuY2UgKGluIHNhdmVkIGNvbnRlbnQpXG4gICAgICByZWZlcmVuY2VzKClcblxuICAgICAgLy8gUHJldmVudCBhZGRpbmcgb2YgbmVzdGVkIGEgYXMgZm9vdG5vdGVzXG4gICAgICAkKCdhPnN1cD5hJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICQodGhpcykucGFyZW50KCkuaHRtbCgkKHRoaXMpLnRleHQoKSlcbiAgICAgIH0pXG5cbiAgICAgIC8vIFVwZGF0ZSBlZGl0b3Igd2l0aCB0aGUgcmlnaHQgcmVmZXJlbmNlc1xuICAgICAgdXBkYXRlSWZyYW1lRnJvbVNhdmVkQ29udGVudCgpXG4gICAgfVxuICB9XG59KVxuXG50aW55bWNlLlBsdWdpbk1hbmFnZXIuYWRkKCdyYWplX2Zvb3Rub3RlcycsIGZ1bmN0aW9uIChlZGl0b3IsIHVybCkge1xuXG4gIGVkaXRvci5hZGRCdXR0b24oJ3JhamVfZm9vdG5vdGVzJywge1xuICAgIHRpdGxlOiAncmFqZV9mb290bm90ZXMnLFxuICAgIGljb246ICdpY29uLWZvb3Rub3RlcycsXG4gICAgdG9vbHRpcDogJ0Zvb3Rub3RlJyxcbiAgICBkaXNhYmxlZFN0YXRlU2VsZWN0b3I6IGAke0RJU0FCTEVfU0VMRUNUT1JfSU5MSU5FfSw6aGVhZGVyYCxcblxuICAgIC8vIEJ1dHRvbiBiZWhhdmlvdXJcbiAgICBvbmNsaWNrOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAvLyBHZXQgc3VjY2Vzc2l2ZSBiaWJsaW9lbnRyeSBpZFxuICAgICAgICBsZXQgcmVmZXJlbmNlID0gZ2V0U3VjY2Vzc2l2ZUVsZW1lbnRJZChFTkROT1RFX1NFTEVDVE9SLCBFTkROT1RFX1NVRkZJWClcblxuICAgICAgICAvLyBDcmVhdGUgdGhlIHJlZmVyZW5jZSB0aGF0IHBvaW50cyB0byB0aGUgbmV4dCBpZFxuICAgICAgICBjcm9zc3JlZi5hZGQocmVmZXJlbmNlKVxuXG4gICAgICAgIC8vIEFkZCB0aGUgbmV4dCBiaWJsaW9lbnRyeVxuICAgICAgICBzZWN0aW9uLmFkZEVuZG5vdGUocmVmZXJlbmNlKVxuXG4gICAgICAgIC8vIFVwZGF0ZSB0aGUgcmVmZXJlbmNlXG4gICAgICAgIGNyb3NzcmVmLnVwZGF0ZSgpXG5cbiAgICAgICAgLy8gTW92ZSBjYXJldCBhdCB0aGUgZW5kIG9mIHAgaW4gbGFzdCBpbnNlcnRlZCBlbmRub3RlXG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZXRDdXJzb3JMb2NhdGlvbih0aW55bWNlLmFjdGl2ZUVkaXRvci5kb20uc2VsZWN0KGAke0VORE5PVEVfU0VMRUNUT1J9IyR7cmVmZXJlbmNlfT5wYClbMF0sIDEpXG4gICAgICB9KVxuICAgIH1cbiAgfSlcbn0pXG5cbmZ1bmN0aW9uIHJlZmVyZW5jZXMoKSB7XG4gIC8qIFJlZmVyZW5jZXMgKi9cbiAgJChcImFbaHJlZl1cIikuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCQudHJpbSgkKHRoaXMpLnRleHQoKSkgPT0gJycpIHtcbiAgICAgIHZhciBjdXJfaWQgPSAkKHRoaXMpLmF0dHIoXCJocmVmXCIpO1xuICAgICAgb3JpZ2luYWxfY29udGVudCA9ICQodGhpcykuaHRtbCgpXG4gICAgICBvcmlnaW5hbF9yZWZlcmVuY2UgPSBjdXJfaWRcbiAgICAgIHJlZmVyZW5jZWRfZWxlbWVudCA9ICQoY3VyX2lkKTtcblxuICAgICAgaWYgKHJlZmVyZW5jZWRfZWxlbWVudC5sZW5ndGggPiAwKSB7XG4gICAgICAgIHJlZmVyZW5jZWRfZWxlbWVudF9maWd1cmUgPSByZWZlcmVuY2VkX2VsZW1lbnQuZmluZChcbiAgICAgICAgICBmaWd1cmVib3hfc2VsZWN0b3JfaW1nICsgXCIsXCIgKyBmaWd1cmVib3hfc2VsZWN0b3Jfc3ZnKTtcbiAgICAgICAgcmVmZXJlbmNlZF9lbGVtZW50X3RhYmxlID0gcmVmZXJlbmNlZF9lbGVtZW50LmZpbmQodGFibGVib3hfc2VsZWN0b3JfdGFibGUpO1xuICAgICAgICByZWZlcmVuY2VkX2VsZW1lbnRfZm9ybXVsYSA9IHJlZmVyZW5jZWRfZWxlbWVudC5maW5kKFxuICAgICAgICAgIGZvcm11bGFib3hfc2VsZWN0b3JfaW1nICsgXCIsXCIgKyBmb3JtdWxhYm94X3NlbGVjdG9yX3NwYW4gKyBcIixcIiArIGZvcm11bGFib3hfc2VsZWN0b3JfbWF0aCArIFwiLFwiICsgZm9ybXVsYWJveF9zZWxlY3Rvcl9zdmcpO1xuICAgICAgICByZWZlcmVuY2VkX2VsZW1lbnRfbGlzdGluZyA9IHJlZmVyZW5jZWRfZWxlbWVudC5maW5kKGxpc3Rpbmdib3hfc2VsZWN0b3JfcHJlKTtcbiAgICAgICAgLyogU3BlY2lhbCBzZWN0aW9ucyAqL1xuICAgICAgICBpZiAoXG4gICAgICAgICAgJChcInNlY3Rpb25bcm9sZT1kb2MtYWJzdHJhY3RdXCIgKyBjdXJfaWQpLmxlbmd0aCA+IDAgfHxcbiAgICAgICAgICAkKFwic2VjdGlvbltyb2xlPWRvYy1iaWJsaW9ncmFwaHldXCIgKyBjdXJfaWQpLmxlbmd0aCA+IDAgfHxcbiAgICAgICAgICAkKFwic2VjdGlvbltyb2xlPWRvYy1lbmRub3Rlc11cIiArIGN1cl9pZCArIFwiLCBzZWN0aW9uW3JvbGU9ZG9jLWZvb3Rub3Rlc11cIiArIGN1cl9pZCkubGVuZ3RoID4gMCB8fFxuICAgICAgICAgICQoXCJzZWN0aW9uW3JvbGU9ZG9jLWFja25vd2xlZGdlbWVudHNdXCIgKyBjdXJfaWQpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAkKHRoaXMpLmh0bWwoXCI8c3BhbiBjbGFzcz1cXFwiY2dlblxcXCIgY29udGVudGVkaXRhYmxlPVxcXCJmYWxzZVxcXCIgIGRhdGEtcmFzaC1vcmlnaW5hbC1jb250ZW50PVxcXCJcIiArIG9yaWdpbmFsX2NvbnRlbnQgK1xuICAgICAgICAgICAgXCJcXFwiPlNlY3Rpb24gPHE+XCIgKyAkKGN1cl9pZCArIFwiID4gaDFcIikudGV4dCgpICsgXCI8L3E+PC9zcGFuPlwiKTtcbiAgICAgICAgICAvKiBCaWJsaW9ncmFwaGljIHJlZmVyZW5jZXMgKi9cbiAgICAgICAgfSBlbHNlIGlmICgkKGN1cl9pZCkucGFyZW50cyhcInNlY3Rpb25bcm9sZT1kb2MtYmlibGlvZ3JhcGh5XVwiKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgdmFyIGN1cl9jb3VudCA9ICQoY3VyX2lkKS5wcmV2QWxsKFwibGlcIikubGVuZ3RoICsgMTtcbiAgICAgICAgICAkKHRoaXMpLmh0bWwoXCI8c3BhbiBjbGFzcz1cXFwiY2dlblxcXCIgY29udGVudGVkaXRhYmxlPVxcXCJmYWxzZVxcXCIgZGF0YS1yYXNoLW9yaWdpbmFsLWNvbnRlbnQ9XFxcIlwiICsgb3JpZ2luYWxfY29udGVudCArXG4gICAgICAgICAgICBcIlxcXCIgdGl0bGU9XFxcIkJpYmxpb2dyYXBoaWMgcmVmZXJlbmNlIFwiICsgY3VyX2NvdW50ICsgXCI6IFwiICtcbiAgICAgICAgICAgICQoY3VyX2lkKS50ZXh0KCkucmVwbGFjZSgvXFxzKy9nLCBcIiBcIikudHJpbSgpICsgXCJcXFwiPltcIiArIGN1cl9jb3VudCArIFwiXTwvc3Bhbj5cIik7XG4gICAgICAgICAgLyogRm9vdG5vdGUgcmVmZXJlbmNlcyAoZG9jLWZvb3Rub3RlcyBhbmQgZG9jLWZvb3Rub3RlIGluY2x1ZGVkIGZvciBlYXNpbmcgYmFjayBjb21wYXRpYmlsaXR5KSAqL1xuICAgICAgICB9IGVsc2UgaWYgKCQoY3VyX2lkKS5wYXJlbnRzKFwic2VjdGlvbltyb2xlPWRvYy1lbmRub3Rlc10sIHNlY3Rpb25bcm9sZT1kb2MtZm9vdG5vdGVzXVwiKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgdmFyIGN1cl9jb250ZW50cyA9ICQodGhpcykucGFyZW50KCkuY29udGVudHMoKTtcbiAgICAgICAgICB2YXIgY3VyX2luZGV4ID0gY3VyX2NvbnRlbnRzLmluZGV4KCQodGhpcykpO1xuICAgICAgICAgIHZhciBwcmV2X3RtcCA9IG51bGw7XG4gICAgICAgICAgd2hpbGUgKGN1cl9pbmRleCA+IDAgJiYgIXByZXZfdG1wKSB7XG4gICAgICAgICAgICBjdXJfcHJldiA9IGN1cl9jb250ZW50c1tjdXJfaW5kZXggLSAxXTtcbiAgICAgICAgICAgIGlmIChjdXJfcHJldi5ub2RlVHlwZSAhPSAzIHx8ICQoY3VyX3ByZXYpLnRleHQoKS5yZXBsYWNlKC8gL2csICcnKSAhPSAnJykge1xuICAgICAgICAgICAgICBwcmV2X3RtcCA9IGN1cl9wcmV2O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgY3VyX2luZGV4LS07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciBwcmV2X2VsID0gJChwcmV2X3RtcCk7XG4gICAgICAgICAgdmFyIGN1cnJlbnRfaWQgPSAkKHRoaXMpLmF0dHIoXCJocmVmXCIpO1xuICAgICAgICAgIHZhciBmb290bm90ZV9lbGVtZW50ID0gJChjdXJyZW50X2lkKTtcbiAgICAgICAgICBpZiAoZm9vdG5vdGVfZWxlbWVudC5sZW5ndGggPiAwICYmXG4gICAgICAgICAgICBmb290bm90ZV9lbGVtZW50LnBhcmVudChcInNlY3Rpb25bcm9sZT1kb2MtZW5kbm90ZXNdLCBzZWN0aW9uW3JvbGU9ZG9jLWZvb3Rub3Rlc11cIikubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgdmFyIGNvdW50ID0gJChjdXJyZW50X2lkKS5wcmV2QWxsKFwic2VjdGlvblwiKS5sZW5ndGggKyAxO1xuICAgICAgICAgICAgaWYgKHByZXZfZWwuZmluZChcInN1cFwiKS5oYXNDbGFzcyhcImZuXCIpKSB7XG4gICAgICAgICAgICAgICQodGhpcykuYmVmb3JlKFwiPHN1cCBjbGFzcz1cXFwiY2dlblxcXCIgY29udGVudGVkaXRhYmxlPVxcXCJmYWxzZVxcXCIgZGF0YS1yYXNoLW9yaWdpbmFsLWNvbnRlbnQ9XFxcIlxcXCI+LDwvc3VwPlwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICQodGhpcykuaHRtbChcIjxzdXAgY2xhc3M9XFxcImZuIGNnZW5cXFwiIGNvbnRlbnRlZGl0YWJsZT1cXFwiZmFsc2VcXFwiIGRhdGEtcmFzaC1vcmlnaW5hbC1jb250ZW50PVxcXCJcIiArIG9yaWdpbmFsX2NvbnRlbnQgKyBcIlxcXCI+XCIgK1xuICAgICAgICAgICAgICBcIjxhIG5hbWU9XFxcImZuX3BvaW50ZXJfXCIgKyBjdXJyZW50X2lkLnJlcGxhY2UoXCIjXCIsIFwiXCIpICtcbiAgICAgICAgICAgICAgXCJcXFwiIHRpdGxlPVxcXCJGb290bm90ZSBcIiArIGNvdW50ICsgXCI6IFwiICtcbiAgICAgICAgICAgICAgJChjdXJyZW50X2lkKS50ZXh0KCkucmVwbGFjZSgvXFxzKy9nLCBcIiBcIikudHJpbSgpICsgXCJcXFwiPlwiICsgY291bnQgKyBcIjwvYT48L3N1cD5cIik7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICQodGhpcykuaHRtbChcIjxzcGFuIGNsYXNzPVxcXCJlcnJvciBjZ2VuXFxcIiBjb250ZW50ZWRpdGFibGU9XFxcImZhbHNlXFxcIiBkYXRhLXJhc2gtb3JpZ2luYWwtY29udGVudD1cXFwiXCIgKyBvcmlnaW5hbF9jb250ZW50ICtcbiAgICAgICAgICAgICAgXCJcXFwiPkVSUjogZm9vdG5vdGUgJ1wiICsgY3VycmVudF9pZC5yZXBsYWNlKFwiI1wiLCBcIlwiKSArIFwiJyBkb2VzIG5vdCBleGlzdDwvc3Bhbj5cIik7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8qIENvbW1vbiBzZWN0aW9ucyAqL1xuICAgICAgICB9IGVsc2UgaWYgKCQoXCJzZWN0aW9uXCIgKyBjdXJfaWQpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICB2YXIgY3VyX2NvdW50ID0gJChjdXJfaWQpLmZpbmRIaWVyYXJjaGljYWxOdW1iZXIoXG4gICAgICAgICAgICBcInNlY3Rpb246bm90KFtyb2xlPWRvYy1hYnN0cmFjdF0pOm5vdChbcm9sZT1kb2MtYmlibGlvZ3JhcGh5XSk6XCIgK1xuICAgICAgICAgICAgXCJub3QoW3JvbGU9ZG9jLWVuZG5vdGVzXSk6bm90KFtyb2xlPWRvYy1mb290bm90ZXNdKTpub3QoW3JvbGU9ZG9jLWFja25vd2xlZGdlbWVudHNdKVwiKTtcbiAgICAgICAgICBpZiAoY3VyX2NvdW50ICE9IG51bGwgJiYgY3VyX2NvdW50ICE9IFwiXCIpIHtcbiAgICAgICAgICAgICQodGhpcykuaHRtbChcIjxzcGFuIGNsYXNzPVxcXCJjZ2VuXFxcIiBjb250ZW50ZWRpdGFibGU9XFxcImZhbHNlXFxcIiBkYXRhLXJhc2gtb3JpZ2luYWwtY29udGVudD1cXFwiXCIgKyBvcmlnaW5hbF9jb250ZW50ICtcbiAgICAgICAgICAgICAgXCJcXFwiPlNlY3Rpb24gXCIgKyBjdXJfY291bnQgKyBcIjwvc3Bhbj5cIik7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8qIFJlZmVyZW5jZSB0byBmaWd1cmUgYm94ZXMgKi9cbiAgICAgICAgfSBlbHNlIGlmIChyZWZlcmVuY2VkX2VsZW1lbnRfZmlndXJlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICB2YXIgY3VyX2NvdW50ID0gcmVmZXJlbmNlZF9lbGVtZW50X2ZpZ3VyZS5maW5kTnVtYmVyKGZpZ3VyZWJveF9zZWxlY3Rvcik7XG4gICAgICAgICAgaWYgKGN1cl9jb3VudCAhPSAwKSB7XG4gICAgICAgICAgICAkKHRoaXMpLmh0bWwoXCI8c3BhbiBjbGFzcz1cXFwiY2dlblxcXCIgY29udGVudGVkaXRhYmxlPVxcXCJmYWxzZVxcXCIgZGF0YS1yYXNoLW9yaWdpbmFsLWNvbnRlbnQ9XFxcIlwiICsgb3JpZ2luYWxfY29udGVudCArXG4gICAgICAgICAgICAgIFwiXFxcIj5GaWd1cmUgXCIgKyBjdXJfY291bnQgKyBcIjwvc3Bhbj5cIik7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8qIFJlZmVyZW5jZSB0byB0YWJsZSBib3hlcyAqL1xuICAgICAgICB9IGVsc2UgaWYgKHJlZmVyZW5jZWRfZWxlbWVudF90YWJsZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgdmFyIGN1cl9jb3VudCA9IHJlZmVyZW5jZWRfZWxlbWVudF90YWJsZS5maW5kTnVtYmVyKHRhYmxlYm94X3NlbGVjdG9yKTtcbiAgICAgICAgICBpZiAoY3VyX2NvdW50ICE9IDApIHtcbiAgICAgICAgICAgICQodGhpcykuaHRtbChcIjxzcGFuIGNsYXNzPVxcXCJjZ2VuXFxcIiBjb250ZW50ZWRpdGFibGU9XFxcImZhbHNlXFxcIiBkYXRhLXJhc2gtb3JpZ2luYWwtY29udGVudD1cXFwiXCIgKyBvcmlnaW5hbF9jb250ZW50ICtcbiAgICAgICAgICAgICAgXCJcXFwiPlRhYmxlIFwiICsgY3VyX2NvdW50ICsgXCI8L3NwYW4+XCIpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvKiBSZWZlcmVuY2UgdG8gZm9ybXVsYSBib3hlcyAqL1xuICAgICAgICB9IGVsc2UgaWYgKHJlZmVyZW5jZWRfZWxlbWVudF9mb3JtdWxhLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICB2YXIgY3VyX2NvdW50ID0gcmVmZXJlbmNlZF9lbGVtZW50X2Zvcm11bGEuZmluZE51bWJlcihmb3JtdWxhYm94X3NlbGVjdG9yKTtcbiAgICAgICAgICBpZiAoY3VyX2NvdW50ICE9IDApIHtcbiAgICAgICAgICAgICQodGhpcykuaHRtbChcIjxzcGFuIGNsYXNzPVxcXCJjZ2VuXFxcIiBjb250ZW50ZWRpdGFibGU9XFxcImZhbHNlXFxcIiBkYXRhLXJhc2gtb3JpZ2luYWwtY29udGVudD1cXFwiXCIgKyBvcmlnaW5hbF9jb250ZW50ICtcbiAgICAgICAgICAgICAgXCJcXFwiPkZvcm11bGEgXCIgKyBjdXJfY291bnQgKyBcIjwvc3Bhbj5cIik7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8qIFJlZmVyZW5jZSB0byBsaXN0aW5nIGJveGVzICovXG4gICAgICAgIH0gZWxzZSBpZiAocmVmZXJlbmNlZF9lbGVtZW50X2xpc3RpbmcubGVuZ3RoID4gMCkge1xuICAgICAgICAgIHZhciBjdXJfY291bnQgPSByZWZlcmVuY2VkX2VsZW1lbnRfbGlzdGluZy5maW5kTnVtYmVyKGxpc3Rpbmdib3hfc2VsZWN0b3IpO1xuICAgICAgICAgIGlmIChjdXJfY291bnQgIT0gMCkge1xuICAgICAgICAgICAgJCh0aGlzKS5odG1sKFwiPHNwYW4gY2xhc3M9XFxcImNnZW5cXFwiIGNvbnRlbnRlZGl0YWJsZT1cXFwiZmFsc2VcXFwiIGRhdGEtcmFzaC1vcmlnaW5hbC1jb250ZW50PVxcXCJcIiArIG9yaWdpbmFsX2NvbnRlbnQgK1xuICAgICAgICAgICAgICBcIlxcXCI+TGlzdGluZyBcIiArIGN1cl9jb3VudCArIFwiPC9zcGFuPlwiKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgJCh0aGlzKS5odG1sKFwiPHNwYW4gY2xhc3M9XFxcImVycm9yIGNnZW5cXFwiIGNvbnRlbnRlZGl0YWJsZT1cXFwiZmFsc2VcXFwiIGRhdGEtcmFzaC1vcmlnaW5hbC1jb250ZW50PVxcXCJcIiArIG9yaWdpbmFsX2NvbnRlbnQgK1xuICAgICAgICAgICAgXCJcXFwiPkVSUjogcmVmZXJlbmNlZCBlbGVtZW50ICdcIiArIGN1cl9pZC5yZXBsYWNlKFwiI1wiLCBcIlwiKSArXG4gICAgICAgICAgICBcIicgaGFzIG5vdCB0aGUgY29ycmVjdCB0eXBlIChpdCBzaG91bGQgYmUgZWl0aGVyIGEgZmlndXJlLCBhIHRhYmxlLCBhIGZvcm11bGEsIGEgbGlzdGluZywgb3IgYSBzZWN0aW9uKTwvc3Bhbj5cIik7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICQodGhpcykucmVwbGFjZVdpdGgoXCI8c3BhbiBjbGFzcz1cXFwiZXJyb3IgY2dlblxcXCIgY29udGVudGVkaXRhYmxlPVxcXCJmYWxzZVxcXCIgZGF0YS1yYXNoLW9yaWdpbmFsLWNvbnRlbnQ9XFxcIlwiICsgb3JpZ2luYWxfY29udGVudCArXG4gICAgICAgICAgXCJcXFwiPkVSUjogcmVmZXJlbmNlZCBlbGVtZW50ICdcIiArIGN1cl9pZC5yZXBsYWNlKFwiI1wiLCBcIlwiKSArIFwiJyBkb2VzIG5vdCBleGlzdDwvc3Bhbj5cIik7XG4gICAgICB9XG4gICAgfVxuICB9KTtcbiAgLyogL0VORCBSZWZlcmVuY2VzICovXG59XG5cbmZ1bmN0aW9uIHVwZGF0ZVJlZmVyZW5jZXMoKSB7XG5cbiAgaWYgKCQoJ3NwYW4uY2dlbltkYXRhLXJhc2gtb3JpZ2luYWwtY29udGVudF0nKS5sZW5ndGgpIHtcblxuICAgIC8vIFJlc3RvcmUgYWxsIHNhdmVkIGNvbnRlbnRcbiAgICAkKCdzcGFuLmNnZW5bZGF0YS1yYXNoLW9yaWdpbmFsLWNvbnRlbnRdJykuZWFjaChmdW5jdGlvbiAoKSB7XG5cbiAgICAgIC8vIFNhdmUgb3JpZ2luYWwgY29udGVudCBhbmQgcmVmZXJlbmNlXG4gICAgICBsZXQgb3JpZ2luYWxfY29udGVudCA9ICQodGhpcykuYXR0cignZGF0YS1yYXNoLW9yaWdpbmFsLWNvbnRlbnQnKVxuICAgICAgbGV0IG9yaWdpbmFsX3JlZmVyZW5jZSA9ICQodGhpcykucGFyZW50KCdhJykuYXR0cignaHJlZicpXG5cbiAgICAgICQodGhpcykucGFyZW50KCdhJykucmVwbGFjZVdpdGgoYDxhIGNvbnRlbnRlZGl0YWJsZT1cImZhbHNlXCIgaHJlZj1cIiR7b3JpZ2luYWxfcmVmZXJlbmNlfVwiPiR7b3JpZ2luYWxfY29udGVudH08L2E+YClcbiAgICB9KVxuXG4gICAgcmVmZXJlbmNlcygpXG4gIH1cbn0iLCIvKipcbiAqIFRoaXMgc2NyaXB0IGNvbnRhaW5zIGFsbCBmaWd1cmUgYm94IGF2YWlsYWJsZSB3aXRoIFJBU0guXG4gKiBcbiAqIHBsdWdpbnM6XG4gKiAgcmFqZV90YWJsZVxuICogIHJhamVfZmlndXJlXG4gKiAgcmFqZV9mb3JtdWxhXG4gKiAgcmFqZV9saXN0aW5nXG4gKi9cbmNvbnN0IERJU0FCTEVfU0VMRUNUT1JfRklHVVJFUyA9ICdmaWd1cmUgKiwgaDEsIGgyLCBoMywgaDQsIGg1LCBoNidcblxuY29uc3QgRklHVVJFX1NFTEVDVE9SID0gJ2ZpZ3VyZVtpZF0nXG5cbmNvbnN0IEZJR1VSRV9UQUJMRV9TRUxFQ1RPUiA9IGAke0ZJR1VSRV9TRUxFQ1RPUn06aGFzKHRhYmxlKWBcbmNvbnN0IFRBQkxFX1NVRkZJWCA9ICd0YWJsZV8nXG5cbmNvbnN0IEZJR1VSRV9JTUFHRV9TRUxFQ1RPUiA9IGAke0ZJR1VSRV9TRUxFQ1RPUn06aGFzKGltZzpub3QoW3JvbGU9bWF0aF0pKWBcbmNvbnN0IElNQUdFX1NVRkZJWCA9ICdpbWdfJ1xuXG5jb25zdCBGSUdVUkVfRk9STVVMQV9TRUxFQ1RPUiA9IGAke0ZJR1VSRV9TRUxFQ1RPUn06aGFzKHN2Z1tyb2xlPW1hdGhdKWBcbmNvbnN0IElOTElORV9GT1JNVUxBX1NFTEVDVE9SID0gYHNwYW46aGFzKHN2Z1tyb2xlPW1hdGhdKWBcbmNvbnN0IEZPUk1VTEFfU1VGRklYID0gJ2Zvcm11bGFfJ1xuXG5jb25zdCBGSUdVUkVfTElTVElOR19TRUxFQ1RPUiA9IGAke0ZJR1VSRV9TRUxFQ1RPUn06aGFzKHByZTpoYXMoY29kZSkpYFxuY29uc3QgTElTVElOR19TVUZGSVggPSAnbGlzdGluZ18nXG5cbmxldCByZW1vdmVfbGlzdGluZyA9IDBcblxuLyoqXG4gKiBSYWplX3RhYmxlXG4gKi9cbnRpbnltY2UuUGx1Z2luTWFuYWdlci5hZGQoJ3JhamVfdGFibGUnLCBmdW5jdGlvbiAoZWRpdG9yLCB1cmwpIHtcblxuICAvLyBBZGQgYSBidXR0b24gdGhhdCBoYW5kbGUgdGhlIGlubGluZSBlbGVtZW50XG4gIGVkaXRvci5hZGRCdXR0b24oJ3JhamVfdGFibGUnLCB7XG4gICAgdGl0bGU6ICdyYWplX3RhYmxlJyxcbiAgICBpY29uOiAnaWNvbi10YWJsZScsXG4gICAgdG9vbHRpcDogJ1RhYmxlJyxcbiAgICBkaXNhYmxlZFN0YXRlU2VsZWN0b3I6IERJU0FCTEVfU0VMRUNUT1JfRklHVVJFUyxcblxuICAgIC8vIEJ1dHRvbiBiZWhhdmlvdXJcbiAgICBvbmNsaWNrOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgIC8vIE9uIGNsaWNrIGEgZGlhbG9nIGlzIG9wZW5lZFxuICAgICAgZWRpdG9yLndpbmRvd01hbmFnZXIub3Blbih7XG4gICAgICAgIHRpdGxlOiAnU2VsZWN0IFRhYmxlIHNpemUnLFxuICAgICAgICBib2R5OiBbe1xuICAgICAgICAgIHR5cGU6ICd0ZXh0Ym94JyxcbiAgICAgICAgICBuYW1lOiAnd2lkdGgnLFxuICAgICAgICAgIGxhYmVsOiAnQ29sdW1ucydcbiAgICAgICAgfSwge1xuICAgICAgICAgIHR5cGU6ICd0ZXh0Ym94JyxcbiAgICAgICAgICBuYW1lOiAnaGVpZ3RoJyxcbiAgICAgICAgICBsYWJlbDogJ1Jvd3MnXG4gICAgICAgIH1dLFxuICAgICAgICBvblN1Ym1pdDogZnVuY3Rpb24gKGUpIHtcblxuICAgICAgICAgIC8vIEdldCB3aWR0aCBhbmQgaGVpZ3RoXG4gICAgICAgICAgdGFibGUuYWRkKGUuZGF0YS53aWR0aCwgZS5kYXRhLmhlaWd0aClcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9XG4gIH0pXG5cbiAgLy8gQmVjYXVzZSBzb21lIGJlaGF2aW91cnMgYXJlbid0IGFjY2VwdGVkLCBSQUpFIG11c3QgY2hlY2sgc2VsZWN0aW9uIGFuZCBhY2NlcHQgYmFja3NwYWNlLCBjYW5jIGFuZCBlbnRlciBwcmVzc1xuICBlZGl0b3Iub24oJ2tleURvd24nLCBmdW5jdGlvbiAoZSkge1xuXG4gICAgLy8ga2V5Q29kZSA4IGlzIGJhY2tzcGFjZSwgNDYgaXMgY2FuY1xuICAgIGlmIChlLmtleUNvZGUgPT0gOClcbiAgICAgIHJldHVybiBoYW5kbGVGaWd1cmVEZWxldGUodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uKVxuXG4gICAgaWYgKGUua2V5Q29kZSA9PSA0NilcbiAgICAgIHJldHVybiBoYW5kbGVGaWd1cmVDYW5jKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbilcblxuICAgIC8vIEhhbmRsZSBlbnRlciBrZXkgaW4gZmlnY2FwdGlvblxuICAgIGlmIChlLmtleUNvZGUgPT0gMTMpXG4gICAgICByZXR1cm4gaGFuZGxlRmlndXJlRW50ZXIodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uKVxuXG4gICAgZS5zdG9wUHJvcGFnYXRpb24oKVxuICB9KVxuXG4gIC8vIEhhbmRsZSBzdHJhbmdlIHN0cnVjdHVyYWwgbW9kaWZpY2F0aW9uIGVtcHR5IGZpZ3VyZXMgb3Igd2l0aCBjYXB0aW9uIGFzIGZpcnN0IGNoaWxkXG4gIGVkaXRvci5vbignbm9kZUNoYW5nZScsIGZ1bmN0aW9uIChlKSB7XG4gICAgaGFuZGxlRmlndXJlQ2hhbmdlKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbilcbiAgfSlcblxuICB0YWJsZSA9IHtcblxuICAgIC8qKlxuICAgICAqIEFkZCB0aGUgbmV3IHRhYmxlICh3aXRoIGdpdmVuIHNpemUpIGF0IHRoZSBjYXJldCBwb3NpdGlvblxuICAgICAqL1xuICAgIGFkZDogZnVuY3Rpb24gKHdpZHRoLCBoZWlndGgpIHtcblxuICAgICAgLy8gR2V0IHRoZSByZWZlcmVuY2Ugb2YgdGhlIGN1cnJlbnQgc2VsZWN0ZWQgZWxlbWVudFxuICAgICAgbGV0IHNlbGVjdGVkRWxlbWVudCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcblxuICAgICAgLy8gR2V0IHRoZSByZWZlcmVuY2Ugb2YgdGhlIG5ldyBjcmVhdGVkIHRhYmxlXG4gICAgICBsZXQgbmV3VGFibGUgPSB0aGlzLmNyZWF0ZSh3aWR0aCwgaGVpZ3RoLCBnZXRTdWNjZXNzaXZlRWxlbWVudElkKEZJR1VSRV9UQUJMRV9TRUxFQ1RPUiwgVEFCTEVfU1VGRklYKSlcblxuICAgICAgLy8gQmVnaW4gYXRvbWljIFVORE8gbGV2ZWwgXG4gICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIHNlbGVjdGVkIGVsZW1lbnQgaXMgbm90IGVtcHR5LCBhbmQgYWRkIHRhYmxlIGFmdGVyXG4gICAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQudGV4dCgpLnRyaW0oKS5sZW5ndGggIT0gMCkge1xuXG4gICAgICAgICAgLy8gSWYgc2VsZWN0aW9uIGlzIGF0IHN0YXJ0IG9mIHRoZSBzZWxlY3RlZCBlbGVtZW50XG4gICAgICAgICAgaWYgKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRSbmcoKS5zdGFydE9mZnNldCA9PSAwKVxuICAgICAgICAgICAgc2VsZWN0ZWRFbGVtZW50LmJlZm9yZShuZXdUYWJsZSlcblxuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIHNlbGVjdGVkRWxlbWVudC5hZnRlcihuZXdUYWJsZSlcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIElmIHNlbGVjdGVkIGVsZW1lbnQgaXMgZW1wdHksIHJlcGxhY2UgaXQgd2l0aCB0aGUgbmV3IHRhYmxlXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBzZWxlY3RlZEVsZW1lbnQucmVwbGFjZVdpdGgobmV3VGFibGUpXG5cbiAgICAgICAgLy8gU2F2ZSB1cGRhdGVzIFxuICAgICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcblxuICAgICAgICAvLyBVcGRhdGUgYWxsIGNhcHRpb25zIHdpdGggUkFTSCBmdW5jdGlvblxuICAgICAgICBjYXB0aW9ucygpXG5cbiAgICAgICAgLy8gVXBkYXRlIFJlbmRlcmVkIFJBU0hcbiAgICAgICAgdXBkYXRlSWZyYW1lRnJvbVNhdmVkQ29udGVudCgpXG4gICAgICB9KVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgdGhlIG5ldyB0YWJsZSB1c2luZyBwYXNzZWQgd2lkdGggYW5kIGhlaWdodFxuICAgICAqL1xuICAgIGNyZWF0ZTogZnVuY3Rpb24gKHdpZHRoLCBoZWlnaHQsIGlkKSB7XG5cbiAgICAgIC8vIElmIHdpZHRoIGFuZCBoZWlndGggYXJlIHBvc2l0aXZlXG4gICAgICB0cnkge1xuICAgICAgICBpZiAod2lkdGggPiAwICYmIGhlaWdodCA+IDApIHtcblxuICAgICAgICAgIC8vIENyZWF0ZSBmaWd1cmUgYW5kIHRhYmxlXG4gICAgICAgICAgbGV0IGZpZ3VyZSA9ICQoYDxmaWd1cmUgaWQ9XCIke2lkfVwiPjwvZmlndXJlPmApXG4gICAgICAgICAgbGV0IHRhYmxlID0gJChgPHRhYmxlPjwvdGFibGU+YClcblxuICAgICAgICAgIC8vIFBvcHVsYXRlIHdpdGggd2lkdGggJiBoZWlndGhcbiAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8PSBoZWlnaHQ7IGkrKykge1xuXG4gICAgICAgICAgICBsZXQgcm93ID0gJChgPHRyPjwvdHI+YClcbiAgICAgICAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgd2lkdGg7IHgrKykge1xuXG4gICAgICAgICAgICAgIGlmIChpID09IDApXG4gICAgICAgICAgICAgICAgcm93LmFwcGVuZChgPHRoPkhlYWRpbmcgY2VsbCAke3grMX08L3RoPmApXG5cbiAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIHJvdy5hcHBlbmQoYDx0ZD48cD5EYXRhIGNlbGwgJHt4KzF9PC9wPjwvdGQ+YClcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGFibGUuYXBwZW5kKHJvdylcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBmaWd1cmUuYXBwZW5kKHRhYmxlKVxuICAgICAgICAgIGZpZ3VyZS5hcHBlbmQoYDxmaWdjYXB0aW9uPkNhcHRpb24uPC9maWdjYXB0aW9uPmApXG5cbiAgICAgICAgICByZXR1cm4gZmlndXJlXG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2ggKGUpIHt9XG4gICAgfVxuICB9XG59KVxuXG4vKipcbiAqIFJhamVfZmlndXJlXG4gKi9cbnRpbnltY2UuUGx1Z2luTWFuYWdlci5hZGQoJ3JhamVfaW1hZ2UnLCBmdW5jdGlvbiAoZWRpdG9yLCB1cmwpIHtcblxuICAvLyBBZGQgYSBidXR0b24gdGhhdCBoYW5kbGUgdGhlIGlubGluZSBlbGVtZW50XG4gIGVkaXRvci5hZGRCdXR0b24oJ3JhamVfaW1hZ2UnLCB7XG4gICAgdGl0bGU6ICdyYWplX2ltYWdlJyxcbiAgICBpY29uOiAnaWNvbi1pbWFnZScsXG4gICAgdG9vbHRpcDogJ0ltYWdlIGJsb2NrJyxcbiAgICBkaXNhYmxlZFN0YXRlU2VsZWN0b3I6IERJU0FCTEVfU0VMRUNUT1JfRklHVVJFUyxcblxuICAgIC8vIEJ1dHRvbiBiZWhhdmlvdXJcbiAgICBvbmNsaWNrOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgIGxldCBmaWxlbmFtZSA9IHNlbGVjdEltYWdlKClcblxuICAgICAgaWYgKGZpbGVuYW1lICE9IG51bGwpXG4gICAgICAgIGltYWdlLmFkZChmaWxlbmFtZSwgZmlsZW5hbWUpXG4gICAgfVxuICB9KVxuXG4gIC8vIEJlY2F1c2Ugc29tZSBiZWhhdmlvdXJzIGFyZW4ndCBhY2NlcHRlZCwgUkFKRSBtdXN0IGNoZWNrIHNlbGVjdGlvbiBhbmQgYWNjZXB0IGJhY2tzcGFjZSwgY2FuYyBhbmQgZW50ZXIgcHJlc3NcbiAgZWRpdG9yLm9uKCdrZXlEb3duJywgZnVuY3Rpb24gKGUpIHtcblxuICAgIC8vIGtleUNvZGUgOCBpcyBiYWNrc3BhY2VcbiAgICBpZiAoZS5rZXlDb2RlID09IDgpXG4gICAgICByZXR1cm4gaGFuZGxlRmlndXJlRGVsZXRlKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbilcblxuICAgIGlmIChlLmtleUNvZGUgPT0gNDYpXG4gICAgICByZXR1cm4gaGFuZGxlRmlndXJlQ2FuYyh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24pXG5cbiAgICAvLyBIYW5kbGUgZW50ZXIga2V5IGluIGZpZ2NhcHRpb25cbiAgICBpZiAoZS5rZXlDb2RlID09IDEzKVxuICAgICAgcmV0dXJuIGhhbmRsZUZpZ3VyZUVudGVyKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbilcbiAgfSlcblxuICBpbWFnZSA9IHtcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIGFkZDogZnVuY3Rpb24gKHVybCwgYWx0KSB7XG5cbiAgICAgIC8vIEdldCB0aGUgcmVmZXJlY2Ugb2YgdGhlIHNlbGVjdGVkIGVsZW1lbnRcbiAgICAgIGxldCBzZWxlY3RlZEVsZW1lbnQgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG4gICAgICBsZXQgbmV3RmlndXJlID0gdGhpcy5jcmVhdGUodXJsLCBhbHQsIGdldFN1Y2Nlc3NpdmVFbGVtZW50SWQoRklHVVJFX0lNQUdFX1NFTEVDVE9SLCBJTUFHRV9TVUZGSVgpKVxuXG4gICAgICAvLyBCZWdpbiBhdG9taWMgVU5ETyBsZXZlbCBcbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAvLyBDaGVjayBpZiB0aGUgc2VsZWN0ZWQgZWxlbWVudCBpcyBub3QgZW1wdHksIGFuZCBhZGQgdGFibGUgYWZ0ZXJcbiAgICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC50ZXh0KCkudHJpbSgpLmxlbmd0aCAhPSAwKSB7XG5cbiAgICAgICAgICAvLyBJZiBzZWxlY3Rpb24gaXMgYXQgc3RhcnQgb2YgdGhlIHNlbGVjdGVkIGVsZW1lbnRcbiAgICAgICAgICBpZiAodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldFJuZygpLnN0YXJ0T2Zmc2V0ID09IDApXG4gICAgICAgICAgICBzZWxlY3RlZEVsZW1lbnQuYmVmb3JlKG5ld0ZpZ3VyZSlcblxuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIHNlbGVjdGVkRWxlbWVudC5hZnRlcihuZXdGaWd1cmUpXG4gICAgICAgIH1cblxuICAgICAgICAvLyBJZiBzZWxlY3RlZCBlbGVtZW50IGlzIGVtcHR5LCByZXBsYWNlIGl0IHdpdGggdGhlIG5ldyB0YWJsZVxuICAgICAgICBlbHNlXG4gICAgICAgICAgc2VsZWN0ZWRFbGVtZW50LnJlcGxhY2VXaXRoKG5ld0ZpZ3VyZSlcblxuICAgICAgICAvLyBTYXZlIHVwZGF0ZXMgXG4gICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuXG4gICAgICAgIC8vIFVwZGF0ZSBhbGwgY2FwdGlvbnMgd2l0aCBSQVNIIGZ1bmN0aW9uXG4gICAgICAgIGNhcHRpb25zKClcblxuICAgICAgICAvLyBVcGRhdGUgUmVuZGVyZWQgUkFTSFxuICAgICAgICB1cGRhdGVJZnJhbWVGcm9tU2F2ZWRDb250ZW50KClcbiAgICAgIH0pXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIGNyZWF0ZTogZnVuY3Rpb24gKHVybCwgYWx0LCBpZCkge1xuICAgICAgcmV0dXJuICQoYDxmaWd1cmUgaWQ9XCIke2lkfVwiPjxwPjxpbWcgc3JjPVwiJHt1cmx9XCIgJHthbHQ/J2FsdD1cIicrYWx0KydcIic6Jyd9IC8+PC9wPjxmaWdjYXB0aW9uPkNhcHRpb24uPC9maWdjYXB0aW9uPjwvZmlndXJlPmApXG4gICAgfVxuICB9XG59KVxuXG4vKipcbiAqIFJhamVfZm9ybXVsYVxuICovXG5cbmZ1bmN0aW9uIG9wZW5Gb3JtdWxhRWRpdG9yKGZvcm11bGFWYWx1ZSwgY2FsbGJhY2spIHtcbiAgdGlueW1jZS5hY3RpdmVFZGl0b3Iud2luZG93TWFuYWdlci5vcGVuKHtcbiAgICAgIHRpdGxlOiAnTWF0aCBmb3JtdWxhIGVkaXRvcicsXG4gICAgICB1cmw6ICdqcy9yYWplLWNvcmUvcGx1Z2luL3JhamVfZm9ybXVsYS5odG1sJyxcbiAgICAgIHdpZHRoOiA4MDAsXG4gICAgICBoZWlnaHQ6IDUwMCxcbiAgICAgIG9uQ2xvc2U6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgICBsZXQgb3V0cHV0ID0gdGlueW1jZS5hY3RpdmVFZGl0b3IuZm9ybXVsYV9vdXRwdXRcblxuICAgICAgICAvLyBJZiBhdCBsZWFzdCBmb3JtdWxhIGlzIHdyaXR0ZW5cbiAgICAgICAgaWYgKG91dHB1dCAhPSBudWxsKSB7XG5cbiAgICAgICAgICAvLyBJZiBoYXMgaWQsIFJBSkUgbXVzdCB1cGRhdGUgaXRcbiAgICAgICAgICBpZiAob3V0cHV0LmZvcm11bGFfaWQpXG4gICAgICAgICAgICBmb3JtdWxhLnVwZGF0ZShvdXRwdXQuZm9ybXVsYV9zdmcsIG91dHB1dC5mb3JtdWxhX2lkKVxuXG4gICAgICAgICAgLy8gT3IgYWRkIGl0IG5vcm1hbGx5XG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgZm9ybXVsYS5hZGQob3V0cHV0LmZvcm11bGFfc3ZnKVxuXG4gICAgICAgICAgLy8gU2V0IGZvcm11bGEgbnVsbFxuICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLmZvcm11bGFfb3V0cHV0ID0gbnVsbFxuICAgICAgICB9XG5cbiAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iud2luZG93TWFuYWdlci5jbG9zZSgpXG4gICAgICB9XG4gICAgfSxcbiAgICBmb3JtdWxhVmFsdWVcbiAgKVxufVxuXG50aW55bWNlLlBsdWdpbk1hbmFnZXIuYWRkKCdyYWplX2Zvcm11bGEnLCBmdW5jdGlvbiAoZWRpdG9yLCB1cmwpIHtcblxuICAvLyBBZGQgYSBidXR0b24gdGhhdCBoYW5kbGUgdGhlIGlubGluZSBlbGVtZW50XG4gIGVkaXRvci5hZGRCdXR0b24oJ3JhamVfZm9ybXVsYScsIHtcbiAgICB0aXRsZTogJ3JhamVfZm9ybXVsYScsXG4gICAgaWNvbjogJ2ljb24tZm9ybXVsYScsXG4gICAgdG9vbHRpcDogJ0Zvcm11bGEnLFxuICAgIGRpc2FibGVkU3RhdGVTZWxlY3RvcjogRElTQUJMRV9TRUxFQ1RPUl9GSUdVUkVTLFxuXG4gICAgLy8gQnV0dG9uIGJlaGF2aW91clxuICAgIG9uY2xpY2s6IGZ1bmN0aW9uICgpIHtcbiAgICAgIG9wZW5Gb3JtdWxhRWRpdG9yKClcbiAgICB9XG4gIH0pXG5cbiAgLy8gQmVjYXVzZSBzb21lIGJlaGF2aW91cnMgYXJlbid0IGFjY2VwdGVkLCBSQUpFIG11c3QgY2hlY2sgc2VsZWN0aW9uIGFuZCBhY2NlcHQgYmFja3NwYWNlLCBjYW5jIGFuZCBlbnRlciBwcmVzc1xuICBlZGl0b3Iub24oJ2tleURvd24nLCBmdW5jdGlvbiAoZSkge1xuXG4gICAgLy8ga2V5Q29kZSA4IGlzIGJhY2tzcGFjZVxuICAgIGlmIChlLmtleUNvZGUgPT0gOClcbiAgICAgIHJldHVybiBoYW5kbGVGaWd1cmVEZWxldGUodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uKVxuXG4gICAgaWYgKGUua2V5Q29kZSA9PSA0NilcbiAgICAgIHJldHVybiBoYW5kbGVGaWd1cmVDYW5jKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbilcblxuICAgIC8vIEhhbmRsZSBlbnRlciBrZXkgaW4gZmlnY2FwdGlvblxuICAgIGlmIChlLmtleUNvZGUgPT0gMTMpXG4gICAgICByZXR1cm4gaGFuZGxlRmlndXJlRW50ZXIodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uKVxuICB9KVxuXG4gIGVkaXRvci5vbignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuICAgIGxldCBzZWxlY3RlZEVsZW1lbnQgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG5cbiAgICAvLyBPcGVuIGZvcm11bGEgZWRpdG9yIGNsaWNraW5nIG9uIG1hdGggZm9ybXVsYXNcbiAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LmlzKEZJR1VSRV9GT1JNVUxBX1NFTEVDVE9SKSkge1xuICAgICAgb3BlbkZvcm11bGFFZGl0b3Ioe1xuICAgICAgICBmb3JtdWxhX3ZhbDogc2VsZWN0ZWRFbGVtZW50LmZpbmQoJ3N2Z1tyb2xlPW1hdGhdJykuYXR0cignZGF0YS1tYXRoLW9yaWdpbmFsLWlucHV0JyksXG4gICAgICAgIGZvcm11bGFfaWQ6IHNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKEZJR1VSRV9TRUxFQ1RPUikuYXR0cignaWQnKVxuICAgICAgfSlcbiAgICB9XG4gIH0pXG5cbiAgZm9ybXVsYSA9IHtcbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBhZGQ6IGZ1bmN0aW9uIChmb3JtdWxhX3N2Zykge1xuXG4gICAgICBsZXQgc2VsZWN0ZWRFbGVtZW50ID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuICAgICAgbGV0IG5ld0Zvcm11bGEgPSB0aGlzLmNyZWF0ZShmb3JtdWxhX3N2ZywgZ2V0U3VjY2Vzc2l2ZUVsZW1lbnRJZChgJHtGSUdVUkVfRk9STVVMQV9TRUxFQ1RPUn0sJHtJTkxJTkVfRk9STVVMQV9TRUxFQ1RPUn1gLCBGT1JNVUxBX1NVRkZJWCkpXG5cbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAvLyBDaGVjayBpZiB0aGUgc2VsZWN0ZWQgZWxlbWVudCBpcyBub3QgZW1wdHksIGFuZCBhZGQgdGFibGUgYWZ0ZXJcbiAgICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC50ZXh0KCkudHJpbSgpLmxlbmd0aCAhPSAwKVxuICAgICAgICAgIHNlbGVjdGVkRWxlbWVudC5hZnRlcihuZXdGb3JtdWxhKVxuXG4gICAgICAgIC8vIElmIHNlbGVjdGVkIGVsZW1lbnQgaXMgZW1wdHksIHJlcGxhY2UgaXQgd2l0aCB0aGUgbmV3IHRhYmxlXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBzZWxlY3RlZEVsZW1lbnQucmVwbGFjZVdpdGgobmV3Rm9ybXVsYSlcblxuICAgICAgICAvLyBTYXZlIHVwZGF0ZXMgXG4gICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuXG4gICAgICAgIGNhcHRpb25zKClcblxuICAgICAgICAvL3NlbGVjdFJhbmdlKCQobmV3Rm9ybXVsYSkubmV4dCgncCcpWzBdLCAwKVxuXG4gICAgICAgIC8vIFVwZGF0ZSBSZW5kZXJlZCBSQVNIXG4gICAgICAgIHVwZGF0ZUlmcmFtZUZyb21TYXZlZENvbnRlbnQoKVxuICAgICAgfSlcblxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICB1cGRhdGU6IGZ1bmN0aW9uIChmb3JtdWxhX3N2ZywgZm9ybXVsYV9pZCkge1xuXG4gICAgICBsZXQgc2VsZWN0ZWRGaWd1cmUgPSAkKGAjJHtmb3JtdWxhX2lkfWApXG5cbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICBzZWxlY3RlZEZpZ3VyZS5maW5kKCdzdmcnKS5yZXBsYWNlV2l0aChmb3JtdWxhX3N2ZylcbiAgICAgICAgdXBkYXRlSWZyYW1lRnJvbVNhdmVkQ29udGVudCgpXG4gICAgICB9KVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBjcmVhdGU6IGZ1bmN0aW9uIChmb3JtdWxhX3N2ZywgaWQpIHtcbiAgICAgIHJldHVybiBgPGZpZ3VyZSBpZD1cIiR7aWR9XCIgY29udGVudGVkaXRhYmxlPVwiZmFsc2VcIj48cD48c3Bhbj4ke2Zvcm11bGFfc3ZnWzBdLm91dGVySFRNTH08L3NwYW4+PC9wPjwvZmlndXJlPjxwPjxici8+PC9wPmBcbiAgICB9XG4gIH1cbn0pXG5cbmZ1bmN0aW9uIG9wZW5JbmxpbmVGb3JtdWxhRWRpdG9yKGZvcm11bGFWYWx1ZSwgY2FsbGJhY2spIHtcbiAgdGlueW1jZS5hY3RpdmVFZGl0b3Iud2luZG93TWFuYWdlci5vcGVuKHtcbiAgICAgIHRpdGxlOiAnTWF0aCBmb3JtdWxhIGVkaXRvcicsXG4gICAgICB1cmw6ICdqcy9yYWplLWNvcmUvcGx1Z2luL3JhamVfZm9ybXVsYS5odG1sJyxcbiAgICAgIHdpZHRoOiA4MDAsXG4gICAgICBoZWlnaHQ6IDUwMCxcbiAgICAgIG9uQ2xvc2U6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgICBsZXQgb3V0cHV0ID0gdGlueW1jZS5hY3RpdmVFZGl0b3IuZm9ybXVsYV9vdXRwdXRcblxuICAgICAgICAvLyBJZiBhdCBsZWFzdCBmb3JtdWxhIGlzIHdyaXR0ZW5cbiAgICAgICAgaWYgKG91dHB1dCAhPSBudWxsKSB7XG5cbiAgICAgICAgICAvLyBJZiBoYXMgaWQsIFJBSkUgbXVzdCB1cGRhdGUgaXRcbiAgICAgICAgICBpZiAob3V0cHV0LmZvcm11bGFfaWQpXG4gICAgICAgICAgICBpbmxpbmVfZm9ybXVsYS51cGRhdGUob3V0cHV0LmZvcm11bGFfc3ZnLCBvdXRwdXQuZm9ybXVsYV9pZClcblxuICAgICAgICAgIC8vIE9yIGFkZCBpdCBub3JtYWxseVxuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIGlubGluZV9mb3JtdWxhLmFkZChvdXRwdXQuZm9ybXVsYV9zdmcpXG5cbiAgICAgICAgICAvLyBTZXQgZm9ybXVsYSBudWxsXG4gICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IuZm9ybXVsYV9vdXRwdXQgPSBudWxsXG4gICAgICAgIH1cblxuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci53aW5kb3dNYW5hZ2VyLmNsb3NlKClcbiAgICAgIH1cbiAgICB9LFxuICAgIGZvcm11bGFWYWx1ZVxuICApXG59XG5cbnRpbnltY2UuUGx1Z2luTWFuYWdlci5hZGQoJ3JhamVfaW5saW5lX2Zvcm11bGEnLCBmdW5jdGlvbiAoZWRpdG9yLCB1cmwpIHtcblxuICBlZGl0b3IuYWRkQnV0dG9uKCdyYWplX2lubGluZV9mb3JtdWxhJywge1xuICAgIGljb246ICdpY29uLWlubGluZS1mb3JtdWxhJyxcbiAgICB0b29sdGlwOiAnSW5saW5lIGZvcm11bGEnLFxuICAgIGRpc2FibGVkU3RhdGVTZWxlY3RvcjogYCR7RElTQUJMRV9TRUxFQ1RPUl9JTkxJTkV9LDpoZWFkZXJgLFxuXG4gICAgLy8gQnV0dG9uIGJlaGF2aW91clxuICAgIG9uY2xpY2s6IGZ1bmN0aW9uICgpIHtcbiAgICAgIG9wZW5JbmxpbmVGb3JtdWxhRWRpdG9yKClcbiAgICB9XG4gIH0pXG5cbiAgZWRpdG9yLm9uKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XG4gICAgbGV0IHNlbGVjdGVkRWxlbWVudCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcblxuICAgIC8vIE9wZW4gZm9ybXVsYSBlZGl0b3IgY2xpY2tpbmcgb24gbWF0aCBmb3JtdWxhc1xuICAgIGlmIChzZWxlY3RlZEVsZW1lbnQuY2hpbGRyZW4oJ3N2Z1tyb2xlPW1hdGhdJykubGVuZ3RoKSB7XG5cbiAgICAgIG9wZW5JbmxpbmVGb3JtdWxhRWRpdG9yKHtcbiAgICAgICAgZm9ybXVsYV92YWw6IHNlbGVjdGVkRWxlbWVudC5jaGlsZHJlbignc3ZnW3JvbGU9bWF0aF0nKS5hdHRyKCdkYXRhLW1hdGgtb3JpZ2luYWwtaW5wdXQnKSxcbiAgICAgICAgZm9ybXVsYV9pZDogc2VsZWN0ZWRFbGVtZW50LmF0dHIoJ2lkJylcbiAgICAgIH0pXG4gICAgfVxuICB9KVxuXG4gIGlubGluZV9mb3JtdWxhID0ge1xuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIGFkZDogZnVuY3Rpb24gKGZvcm11bGFfc3ZnKSB7XG5cbiAgICAgIGxldCBzZWxlY3RlZEVsZW1lbnQgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG4gICAgICBsZXQgbmV3Rm9ybXVsYSA9IHRoaXMuY3JlYXRlKGZvcm11bGFfc3ZnLCBnZXRTdWNjZXNzaXZlRWxlbWVudElkKGAke0ZJR1VSRV9GT1JNVUxBX1NFTEVDVE9SfSwke0lOTElORV9GT1JNVUxBX1NFTEVDVE9SfWAsIEZPUk1VTEFfU1VGRklYKSlcblxuICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZXRDb250ZW50KG5ld0Zvcm11bGEpXG5cbiAgICAgICAgLy8gU2F2ZSB1cGRhdGVzIFxuICAgICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcblxuICAgICAgICBjYXB0aW9ucygpXG5cbiAgICAgICAgLy8gVXBkYXRlIFJlbmRlcmVkIFJBU0hcbiAgICAgICAgdXBkYXRlSWZyYW1lRnJvbVNhdmVkQ29udGVudCgpXG4gICAgICB9KVxuXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIHVwZGF0ZTogZnVuY3Rpb24gKGZvcm11bGFfc3ZnLCBmb3JtdWxhX2lkKSB7XG5cbiAgICAgIGxldCBzZWxlY3RlZEZpZ3VyZSA9ICQoYCMke2Zvcm11bGFfaWR9YClcblxuICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIHNlbGVjdGVkRmlndXJlLmZpbmQoJ3N2ZycpLnJlcGxhY2VXaXRoKGZvcm11bGFfc3ZnKVxuICAgICAgICB1cGRhdGVJZnJhbWVGcm9tU2F2ZWRDb250ZW50KClcbiAgICAgIH0pXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIGNyZWF0ZTogZnVuY3Rpb24gKGZvcm11bGFfc3ZnLCBpZCkge1xuICAgICAgcmV0dXJuIGA8c3BhbiBpZD1cIiR7aWR9XCIgY29udGVudGVkaXRhYmxlPVwiZmFsc2VcIj4ke2Zvcm11bGFfc3ZnWzBdLm91dGVySFRNTH08L3NwYW4+YFxuICAgIH1cbiAgfVxufSlcblxuLyoqXG4gKiBSYWplX2xpc3RpbmdcbiAqL1xudGlueW1jZS5QbHVnaW5NYW5hZ2VyLmFkZCgncmFqZV9saXN0aW5nJywgZnVuY3Rpb24gKGVkaXRvciwgdXJsKSB7XG5cbiAgLy8gQWRkIGEgYnV0dG9uIHRoYXQgaGFuZGxlIHRoZSBpbmxpbmUgZWxlbWVudFxuICBlZGl0b3IuYWRkQnV0dG9uKCdyYWplX2xpc3RpbmcnLCB7XG4gICAgdGl0bGU6ICdyYWplX2xpc3RpbmcnLFxuICAgIGljb246ICdpY29uLWxpc3RpbmcnLFxuICAgIHRvb2x0aXA6ICdMaXN0aW5nJyxcbiAgICBkaXNhYmxlZFN0YXRlU2VsZWN0b3I6IERJU0FCTEVfU0VMRUNUT1JfRklHVVJFUyxcblxuICAgIC8vIEJ1dHRvbiBiZWhhdmlvdXJcbiAgICBvbmNsaWNrOiBmdW5jdGlvbiAoKSB7XG4gICAgICBsaXN0aW5nLmFkZCgpXG4gICAgfVxuICB9KVxuXG5cblxuICAvLyBCZWNhdXNlIHNvbWUgYmVoYXZpb3VycyBhcmVuJ3QgYWNjZXB0ZWQsIFJBSkUgbXVzdCBjaGVjayBzZWxlY3Rpb24gYW5kIGFjY2VwdCBiYWNrc3BhY2UsIGNhbmMgYW5kIGVudGVyIHByZXNzXG4gIGVkaXRvci5vbigna2V5RG93bicsIGZ1bmN0aW9uIChlKSB7XG5cbiAgICAvKipcbiAgICAgKiBOT1RFOiB0aGlzIGJlaHZhaW91ciBpcyB0aGUgc2FtZSBmb3IgY29kZWJsb2NrXG4gICAgICovXG4gICAgbGV0IHNlbGVjdGVkRWxlbWVudCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcbiAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LnBhcmVudHMoJ3ByZTpoYXMoY29kZSknKS5sZW5ndGgpIHtcblxuICAgICAgLyoqXG4gICAgICAgKiBQcm9wZXIgbGlzdGluZyBlZGl0b3IgYmVoYXZpb3VyXG4gICAgICAgKi9cbiAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQuaXMoJ2NvZGUnKSkge1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBFTlRFUlxuICAgICAgICAgKi9cbiAgICAgICAgaWYgKGUua2V5Q29kZSA9PSAxMykge1xuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgICAgIHJldHVybiBsaXN0aW5nLnNldENvbnRlbnQoYFxcbmApXG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogVEFCXG4gICAgICAgICAqL1xuICAgICAgICBpZiAoZS5rZXlDb2RlID09IDkpIHtcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgICByZXR1cm4gbGlzdGluZy5zZXRDb250ZW50KGBcXHRgKVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChlLmtleUNvZGUgPT0gMTMpXG4gICAgICAgIHJldHVybiBoYW5kbGVGaWd1cmVFbnRlcih0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24pXG5cbiAgICAgIC8vIGtleUNvZGUgOCBpcyBiYWNrc3BhY2VcbiAgICAgIGlmIChlLmtleUNvZGUgPT0gOClcbiAgICAgICAgcmV0dXJuIGhhbmRsZUZpZ3VyZURlbGV0ZSh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24pXG5cbiAgICAgIC8qXG4gICAgICAvLyBrZXlDb2RlIDggaXMgYmFja3NwYWNlXG4gICAgICBpZiAoZS5rZXlDb2RlID09IDgpXG4gICAgICAgIHJldHVybiBoYW5kbGVGaWd1cmVEZWxldGUodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uKVxuXG4gICAgICBpZiAoZS5rZXlDb2RlID09IDQ2KVxuICAgICAgICByZXR1cm4gaGFuZGxlRmlndXJlQ2FuYyh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24pXG5cbiAgICAgIC8vIEhhbmRsZSBlbnRlciBrZXkgaW4gZmlnY2FwdGlvblxuICAgICAgaWYgKGUua2V5Q29kZSA9PSAxMylcbiAgICAgICAgcmV0dXJuIGhhbmRsZUZpZ3VyZUVudGVyKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbilcbiAgICAgICAgKi9cbiAgICB9XG4gICAgLypcbiAgICBpZiAoZS5rZXlDb2RlID09IDkpIHtcbiAgICAgIGlmICh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uaXNDb2xsYXBzZWQoKSAmJiAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpLnBhcmVudHMoYGNvZGUsJHtGSUdVUkVfU0VMRUNUT1J9YCkubGVuZ3RoKSB7XG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZXRDb250ZW50KCdcXHQnKVxuICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoZS5rZXlDb2RlID09IDM3KSB7XG4gICAgICBsZXQgcmFuZ2UgPSB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Um5nKClcbiAgICAgIGxldCBzdGFydE5vZGUgPSAkKHJhbmdlLnN0YXJ0Q29udGFpbmVyKVxuICAgICAgaWYgKHN0YXJ0Tm9kZS5wYXJlbnQoKS5pcygnY29kZScpICYmIChzdGFydE5vZGUucGFyZW50KCkuY29udGVudHMoKS5pbmRleChzdGFydE5vZGUpID09IDAgJiYgcmFuZ2Uuc3RhcnRPZmZzZXQgPT0gMSkpIHtcbiAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLnNldEN1cnNvckxvY2F0aW9uKHN0YXJ0Tm9kZS5wYXJlbnRzKEZJR1VSRV9TRUxFQ1RPUikucHJldigncCw6aGVhZGVyJylbMF0sIDEpXG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgfVxuICAgIH0qL1xuICB9KVxuXG4gIGxpc3RpbmcgPSB7XG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgYWRkOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgIGxldCBzZWxlY3RlZEVsZW1lbnQgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG4gICAgICBsZXQgbmV3TGlzdGluZyA9IHRoaXMuY3JlYXRlKGdldFN1Y2Nlc3NpdmVFbGVtZW50SWQoRklHVVJFX0xJU1RJTkdfU0VMRUNUT1IsIExJU1RJTkdfU1VGRklYKSlcblxuICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIC8vIENoZWNrIGlmIHRoZSBzZWxlY3RlZCBwYXJhZ3JhcGggaXMgbm90IGVtcHR5LCBhZGQgdGhlIG5ldyBsaXN0aW5nIHJpZ2h0IGJlbG93XG4gICAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQudGV4dCgpLnRyaW0oKS5sZW5ndGggIT0gMClcbiAgICAgICAgICBzZWxlY3RlZEVsZW1lbnQuYWZ0ZXIobmV3TGlzdGluZylcblxuICAgICAgICAvLyBJZiBzZWxlY3RlZCBwYXJhZ3JhcGggaXMgZW1wdHksIHJlcGxhY2UgaXQgd2l0aCB0aGUgbmV3IHRhYmxlXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBzZWxlY3RlZEVsZW1lbnQucmVwbGFjZVdpdGgobmV3TGlzdGluZylcblxuICAgICAgICAvLyBTYXZlIHVwZGF0ZXMgXG4gICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuXG4gICAgICAgIC8vIFVwZGF0ZSBhbGwgY2FwdGlvbnMgd2l0aCBSQVNIIGZ1bmN0aW9uXG4gICAgICAgIGNhcHRpb25zKClcblxuICAgICAgICAvLyBNb3ZlIHRoZSBjYXJldFxuICAgICAgICBzZWxlY3RSYW5nZShuZXdMaXN0aW5nLmZpbmQoJ2NvZGUnKVswXSwgMClcblxuICAgICAgICAvLyBVcGRhdGUgUmVuZGVyZWQgUkFTSFxuICAgICAgICB1cGRhdGVJZnJhbWVGcm9tU2F2ZWRDb250ZW50KClcbiAgICAgIH0pXG5cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgY3JlYXRlOiBmdW5jdGlvbiAoaWQpIHtcbiAgICAgIHJldHVybiAkKGA8ZmlndXJlIGlkPVwiJHtpZH1cIj48cHJlPjxjb2RlPiR7WkVST19TUEFDRX08L2NvZGU+PC9wcmU+PGZpZ2NhcHRpb24+Q2FwdGlvbi48L2ZpZ2NhcHRpb24+PC9maWd1cmU+YClcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgc2V0Q29udGVudDogZnVuY3Rpb24gKGNoYXIpIHtcbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZXRDb250ZW50KGNoYXIpXG4gICAgfVxuICB9XG59KVxuXG4vKipcbiAqIFJhamUgY29kZWJsb2NrXG4gKi9cbnRpbnltY2UuUGx1Z2luTWFuYWdlci5hZGQoJ3JhamVfY29kZWJsb2NrJywgZnVuY3Rpb24gKGVkaXRvciwgdXJsKSB7XG5cbiAgLy8gQWRkIGEgYnV0dG9uIHRoYXQgaGFuZGxlIHRoZSBpbmxpbmUgZWxlbWVudFxuICBlZGl0b3IuYWRkQnV0dG9uKCdyYWplX2NvZGVibG9jaycsIHtcbiAgICB0aXRsZTogJ3JhamVfY29kZWJsb2NrJyxcbiAgICBpY29uOiAnaWNvbi1ibG9jay1jb2RlJyxcbiAgICB0b29sdGlwOiAnQmxvY2sgY29kZScsXG4gICAgZGlzYWJsZWRTdGF0ZVNlbGVjdG9yOiBgJHtESVNBQkxFX1NFTEVDVE9SX0ZJR1VSRVN9LGNvZGUscHJlYCxcblxuICAgIC8vIEJ1dHRvbiBiZWhhdmlvdXJcbiAgICBvbmNsaWNrOiBmdW5jdGlvbiAoKSB7XG4gICAgICBibG9ja2NvZGUuYWRkKClcbiAgICB9XG4gIH0pXG5cbiAgYmxvY2tjb2RlID0ge1xuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIGFkZDogZnVuY3Rpb24gKCkge1xuXG4gICAgICBsZXQgc2VsZWN0ZWRFbGVtZW50ID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuICAgICAgbGV0IGJsb2NrQ29kZSA9IHRoaXMuY3JlYXRlKGdldFN1Y2Nlc3NpdmVFbGVtZW50SWQoRklHVVJFX0xJU1RJTkdfU0VMRUNUT1IsIExJU1RJTkdfU1VGRklYKSlcblxuICAgICAgaWYgKCFzZWxlY3RlZEVsZW1lbnQucGFyZW50cygncHJlLGNvZGUnKS5sZW5ndGgpIHtcblxuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICAvLyBDaGVjayBpZiB0aGUgc2VsZWN0ZWQgcGFyYWdyYXBoIGlzIG5vdCBlbXB0eSwgYWRkIHRoZSBuZXcgbGlzdGluZyByaWdodCBiZWxvd1xuICAgICAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQudGV4dCgpLnRyaW0oKS5sZW5ndGggIT0gMClcbiAgICAgICAgICAgIHNlbGVjdGVkRWxlbWVudC5hZnRlcihibG9ja0NvZGUpXG5cbiAgICAgICAgICAvLyBJZiBzZWxlY3RlZCBwYXJhZ3JhcGggaXMgZW1wdHksIHJlcGxhY2UgaXQgd2l0aCB0aGUgbmV3IHRhYmxlXG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgc2VsZWN0ZWRFbGVtZW50LnJlcGxhY2VXaXRoKGJsb2NrQ29kZSlcblxuICAgICAgICAgIC8vIFNhdmUgdXBkYXRlcyBcbiAgICAgICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcblxuICAgICAgICAgIC8vIFVwZGF0ZSBhbGwgY2FwdGlvbnMgd2l0aCBSQVNIIGZ1bmN0aW9uXG4gICAgICAgICAgY2FwdGlvbnMoKVxuXG4gICAgICAgICAgLy8gTW92ZSB0aGUgY2FyZXRcbiAgICAgICAgICBzZWxlY3RSYW5nZShibG9ja0NvZGUuZmluZCgnY29kZScpWzBdLCAwKVxuXG4gICAgICAgICAgLy8gVXBkYXRlIFJlbmRlcmVkIFJBU0hcbiAgICAgICAgICB1cGRhdGVJZnJhbWVGcm9tU2F2ZWRDb250ZW50KClcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgY3JlYXRlOiBmdW5jdGlvbiAoaWQpIHtcbiAgICAgIHJldHVybiAkKGA8cHJlPjxjb2RlPiR7WkVST19TUEFDRX08L2NvZGU+PC9wcmU+YClcbiAgICB9XG4gIH1cbn0pXG5cbi8qKlxuICogUmFqZSBxdW90ZWJsb2NrXG4gKi9cbnRpbnltY2UuUGx1Z2luTWFuYWdlci5hZGQoJ3JhamVfcXVvdGVibG9jaycsIGZ1bmN0aW9uIChlZGl0b3IsIHVybCkge1xuXG4gIC8vIEFkZCBhIGJ1dHRvbiB0aGF0IGhhbmRsZSB0aGUgaW5saW5lIGVsZW1lbnRcbiAgZWRpdG9yLmFkZEJ1dHRvbigncmFqZV9xdW90ZWJsb2NrJywge1xuICAgIHRpdGxlOiAncmFqZV9xdW90ZWJsb2NrJyxcbiAgICBpY29uOiAnaWNvbi1ibG9jay1xdW90ZScsXG4gICAgdG9vbHRpcDogJ0Jsb2NrIHF1b3RlJyxcbiAgICBkaXNhYmxlZFN0YXRlU2VsZWN0b3I6IGAke0RJU0FCTEVfU0VMRUNUT1JfRklHVVJFU30sYmxvY2txdW90ZWAsXG5cbiAgICAvLyBCdXR0b24gYmVoYXZpb3VyXG4gICAgb25jbGljazogZnVuY3Rpb24gKCkge1xuICAgICAgYmxvY2txdW90ZS5hZGQoKVxuICAgIH1cbiAgfSlcblxuICBlZGl0b3Iub24oJ2tleURvd24nLCBmdW5jdGlvbiAoZSkge1xuXG4gICAgbGV0IHNlbGVjdGVkRWxlbWVudCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcbiAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LmlzKCdwJykgJiYgc2VsZWN0ZWRFbGVtZW50LnBhcmVudCgpLmlzKCdibG9ja3F1b3RlJykpIHtcblxuICAgICAgLyoqXG4gICAgICAgKiBFbnRlclxuICAgICAgICovXG4gICAgICBpZiAoZS5rZXlDb2RlID09IDEzKSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKVxuXG4gICAgICAgIC8vIEV4aXQgZnJvbSB0aGUgYmxvY2txdW90ZSBpZiB0aGUgY3VycmVudCBwIGlzIGVtcHR5XG4gICAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQudGV4dCgpLnRyaW0oKS5sZW5ndGggPT0gMClcbiAgICAgICAgICByZXR1cm4gYmxvY2txdW90ZS5leGl0KClcblxuICAgICAgICBibG9ja3F1b3RlLmFkZFBhcmFncmFwaCgpXG4gICAgICB9XG4gICAgfVxuICB9KVxuXG4gIGJsb2NrcXVvdGUgPSB7XG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgYWRkOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgIGxldCBzZWxlY3RlZEVsZW1lbnQgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG4gICAgICBsZXQgYmxvY2tRdW90ZSA9IHRoaXMuY3JlYXRlKGdldFN1Y2Nlc3NpdmVFbGVtZW50SWQoRklHVVJFX0xJU1RJTkdfU0VMRUNUT1IsIExJU1RJTkdfU1VGRklYKSlcblxuICAgICAgaWYgKCFzZWxlY3RlZEVsZW1lbnQucGFyZW50cygncHJlLGNvZGUnKS5sZW5ndGgpIHtcblxuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICAvLyBDaGVjayBpZiB0aGUgc2VsZWN0ZWQgcGFyYWdyYXBoIGlzIG5vdCBlbXB0eSwgYWRkIHRoZSBuZXcgbGlzdGluZyByaWdodCBiZWxvd1xuICAgICAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQudGV4dCgpLnRyaW0oKS5sZW5ndGggIT0gMClcbiAgICAgICAgICAgIHNlbGVjdGVkRWxlbWVudC5hZnRlcihibG9ja1F1b3RlKVxuXG4gICAgICAgICAgLy8gSWYgc2VsZWN0ZWQgcGFyYWdyYXBoIGlzIGVtcHR5LCByZXBsYWNlIGl0IHdpdGggdGhlIG5ldyB0YWJsZVxuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIHNlbGVjdGVkRWxlbWVudC5yZXBsYWNlV2l0aChibG9ja1F1b3RlKVxuXG4gICAgICAgICAgLy8gU2F2ZSB1cGRhdGVzIFxuICAgICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuXG4gICAgICAgICAgLy8gVXBkYXRlIGFsbCBjYXB0aW9ucyB3aXRoIFJBU0ggZnVuY3Rpb25cbiAgICAgICAgICBjYXB0aW9ucygpXG5cbiAgICAgICAgICAvLyBNb3ZlIHRoZSBjYXJldFxuICAgICAgICAgIG1vdmVDYXJldChibG9ja1F1b3RlWzBdKVxuXG4gICAgICAgICAgLy8gVXBkYXRlIFJlbmRlcmVkIFJBU0hcbiAgICAgICAgICB1cGRhdGVJZnJhbWVGcm9tU2F2ZWRDb250ZW50KClcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgY3JlYXRlOiBmdW5jdGlvbiAoaWQpIHtcbiAgICAgIHJldHVybiAkKGA8YmxvY2txdW90ZT48cD4ke1pFUk9fU1BBQ0V9PC9wPjwvYmxvY2txdW90ZT5gKVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBnZXRMYXN0Tm90RW1wdHlOb2RlOiBmdW5jdGlvbiAobm9kZXMpIHtcblxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBub2Rlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoKG5vZGVzW2ldLm5vZGVUeXBlID09IDMgfHwgbm9kZXNbaV0udGFnTmFtZSA9PSAnYnInKSAmJiAhbm9kZXNbaV0ubGVuZ3RoKVxuICAgICAgICAgIG5vZGVzLnNwbGljZShpLCAxKVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gbm9kZXNbbm9kZXMubGVuZ3RoIC0gMV1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgYWRkUGFyYWdyYXBoOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgIGNvbnN0IEJSID0gJzxicj4nXG5cbiAgICAgIC8vIEdldCB0aGUgcmVmZXJlbmNlcyBvZiB0aGUgZXhpc3RpbmcgZWxlbWVudFxuICAgICAgbGV0IHBhcmFncmFwaCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcblxuICAgICAgLy8gUGxhY2Vob2xkZXIgdGV4dCBvZiB0aGUgbmV3IGxpXG4gICAgICBsZXQgdGV4dCA9IEJSXG4gICAgICBsZXQgdGV4dE5vZGVzID0gcGFyYWdyYXBoLmNvbnRlbnRzKClcblxuICAgICAgLy8gSWYgdGhlcmUgaXMganVzdCBvbmUgbm9kZSB3cmFwcGVkIGluc2lkZSB0aGUgcGFyYWdyYXBoXG4gICAgICBpZiAodGV4dE5vZGVzLmxlbmd0aCA9PSAxKSB7XG5cbiAgICAgICAgLy8gR2V0IHRoZSBzdGFydCBvZmZzZXQgYW5kIHRleHQgb2YgdGhlIGN1cnJlbnQgbGlcbiAgICAgICAgbGV0IHN0YXJ0T2Zmc2V0ID0gdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldFJuZygpLnN0YXJ0T2Zmc2V0XG4gICAgICAgIGxldCB3aG9sZVRleHQgPSBwYXJhZ3JhcGgudGV4dCgpXG5cbiAgICAgICAgLy8gSWYgdGhlIGN1cnNvciBpc24ndCBhdCB0aGUgZW5kIGJ1dCBpdCdzIGluIHRoZSBtaWRkbGVcbiAgICAgICAgLy8gR2V0IHRoZSByZW1haW5pbmcgdGV4dCBmcm9tIHRoZSBjdXJzb3IgdG8gdGhlIGVuZFxuICAgICAgICBpZiAoc3RhcnRPZmZzZXQgIT0gd2hvbGVUZXh0Lmxlbmd0aClcbiAgICAgICAgICB0ZXh0ID0gd2hvbGVUZXh0LnN1YnN0cmluZyhzdGFydE9mZnNldCwgd2hvbGVUZXh0Lmxlbmd0aClcblxuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICAvLyBVcGRhdGUgdGhlIHRleHQgb2YgdGhlIGN1cnJlbnQgbGlcbiAgICAgICAgICBwYXJhZ3JhcGgudGV4dCh3aG9sZVRleHQuc3Vic3RyaW5nKDAsIHN0YXJ0T2Zmc2V0KSlcblxuICAgICAgICAgIGlmICghcGFyYWdyYXBoLnRleHQoKS5sZW5ndGgpXG4gICAgICAgICAgICBwYXJhZ3JhcGguaHRtbChCUilcblxuICAgICAgICAgIC8vIENyZWF0ZSBhbmQgYWRkIHRoZSBuZXcgbGlcbiAgICAgICAgICBsZXQgbmV3UGFyYWdyYXBoID0gJChgPHA+JHt0ZXh0fTwvcD5gKVxuICAgICAgICAgIHBhcmFncmFwaC5hZnRlcihuZXdQYXJhZ3JhcGgpXG5cbiAgICAgICAgICAvLyBNb3ZlIHRoZSBjYXJldCB0byB0aGUgbmV3IGxpXG4gICAgICAgICAgbW92ZUNhcmV0KG5ld1BhcmFncmFwaFswXSwgdHJ1ZSlcblxuICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgY29udGVudFxuICAgICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuICAgICAgICB9KVxuICAgICAgfVxuXG4gICAgICAvLyBJbnN0ZWFkIGlmIHRoZXJlIGFyZSBtdWx0aXBsZSBub2RlcyBpbnNpZGUgdGhlIHBhcmFncmFwaFxuICAgICAgZWxzZSB7XG5cbiAgICAgICAgLy8gSXN0YW50aWF0ZSB0aGUgcmFuZ2UgdG8gYmUgc2VsZWN0ZWRcbiAgICAgICAgbGV0IHJhbmdlID0gZG9jdW1lbnQuY3JlYXRlUmFuZ2UoKVxuXG4gICAgICAgIC8vIFN0YXJ0IHRoZSByYW5nZSBmcm9tIHRoZSBzZWxlY3RlZCBub2RlIGFuZCBvZmZzZXQgYW5kIGVuZHMgaXQgYXQgdGhlIGVuZCBvZiB0aGUgbGFzdCBub2RlXG4gICAgICAgIHJhbmdlLnNldFN0YXJ0KHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRSbmcoKS5zdGFydENvbnRhaW5lciwgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldFJuZygpLnN0YXJ0T2Zmc2V0KVxuICAgICAgICByYW5nZS5zZXRFbmQodGhpcy5nZXRMYXN0Tm90RW1wdHlOb2RlKHRleHROb2RlcyksIDEpXG5cbiAgICAgICAgLy8gU2VsZWN0IHRoZSByYW5nZVxuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2V0Um5nKHJhbmdlKVxuXG4gICAgICAgIC8vIFNhdmUgdGhlIGh0bWwgY29udGVudFxuICAgICAgICB3aG9sZVRleHQgPSB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Q29udGVudCgpXG5cbiAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgcGFyYWdyYXBoLmh0bWwocGFyYWdyYXBoLmh0bWwoKS5yZXBsYWNlKHdob2xlVGV4dCwgJycpKVxuXG4gICAgICAgICAgaWYgKCFwYXJhZ3JhcGgudGV4dCgpLmxlbmd0aClcbiAgICAgICAgICAgIHBhcmFncmFwaC5odG1sKEJSKVxuXG4gICAgICAgICAgLy8gQ3JlYXRlIGFuZCBhZGQgdGhlIG5ldyBsaVxuICAgICAgICAgIGxldCBuZXdQYXJhZ3JhcGggPSAkKGA8cD4ke3dob2xlVGV4dH08L3A+YClcbiAgICAgICAgICBwYXJhZ3JhcGguYWZ0ZXIobmV3UGFyYWdyYXBoKVxuXG4gICAgICAgICAgLy8gTW92ZSB0aGUgY2FyZXQgdG8gdGhlIG5ldyBsaVxuICAgICAgICAgIG1vdmVDYXJldChuZXdQYXJhZ3JhcGhbMF0sIHRydWUpXG5cbiAgICAgICAgICAvLyBVcGRhdGUgdGhlIGNvbnRlbnRcbiAgICAgICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgZXhpdDogZnVuY3Rpb24gKCkge1xuICAgICAgbGV0IHBhcmFncmFwaCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcbiAgICAgIGxldCBibG9ja3F1b3RlID0gcGFyYWdyYXBoLnBhcmVudCgpXG5cbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICBwYXJhZ3JhcGgucmVtb3ZlKClcblxuICAgICAgICBpZiAoIWJsb2NrcXVvdGUubmV4dCgpLmxlbmd0aCkge1xuICAgICAgICAgIGJsb2NrcXVvdGUuYWZ0ZXIoJChgPHA+PGJyLz48L3A+YCkpXG4gICAgICAgIH1cblxuICAgICAgICBtb3ZlQ2FyZXQoYmxvY2txdW90ZS5uZXh0KClbMF0pXG5cbiAgICAgIH0pXG4gICAgfVxuICB9XG59KVxuXG4vKipcbiAqIFVwZGF0ZSB0YWJsZSBjYXB0aW9ucyB3aXRoIGEgUkFTSCBmdW5jaW9uIFxuICovXG5mdW5jdGlvbiBjYXB0aW9ucygpIHtcblxuICAvKiBDYXB0aW9ucyAqL1xuICAkKGZpZ3VyZWJveF9zZWxlY3RvcikuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGN1cl9jYXB0aW9uID0gJCh0aGlzKS5wYXJlbnRzKFwiZmlndXJlXCIpLmZpbmQoXCJmaWdjYXB0aW9uXCIpO1xuICAgIHZhciBjdXJfbnVtYmVyID0gJCh0aGlzKS5maW5kTnVtYmVyKGZpZ3VyZWJveF9zZWxlY3Rvcik7XG4gICAgY3VyX2NhcHRpb24uZmluZCgnc3Ryb25nJykucmVtb3ZlKCk7XG4gICAgY3VyX2NhcHRpb24uaHRtbChcIjxzdHJvbmcgY2xhc3M9XFxcImNnZW5cXFwiIGRhdGEtcmFzaC1vcmlnaW5hbC1jb250ZW50PVxcXCJcXFwiIGNvbnRlbnRlZGl0YWJsZT1cXFwiZmFsc2VcXFwiPkZpZ3VyZSBcIiArIGN1cl9udW1iZXIgK1xuICAgICAgXCIuIDwvc3Ryb25nPlwiICsgY3VyX2NhcHRpb24uaHRtbCgpKTtcbiAgfSk7XG4gICQodGFibGVib3hfc2VsZWN0b3IpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgIHZhciBjdXJfY2FwdGlvbiA9ICQodGhpcykucGFyZW50cyhcImZpZ3VyZVwiKS5maW5kKFwiZmlnY2FwdGlvblwiKTtcbiAgICB2YXIgY3VyX251bWJlciA9ICQodGhpcykuZmluZE51bWJlcih0YWJsZWJveF9zZWxlY3Rvcik7XG4gICAgY3VyX2NhcHRpb24uZmluZCgnc3Ryb25nJykucmVtb3ZlKCk7XG4gICAgY3VyX2NhcHRpb24uaHRtbChcIjxzdHJvbmcgY2xhc3M9XFxcImNnZW5cXFwiIGRhdGEtcmFzaC1vcmlnaW5hbC1jb250ZW50PVxcXCJcXFwiIGNvbnRlbnRlZGl0YWJsZT1cXFwiZmFsc2VcXFwiID5UYWJsZSBcIiArIGN1cl9udW1iZXIgK1xuICAgICAgXCIuIDwvc3Ryb25nPlwiICsgY3VyX2NhcHRpb24uaHRtbCgpKTtcbiAgfSk7XG4gICQoZm9ybXVsYWJveF9zZWxlY3RvcikuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGN1cl9jYXB0aW9uID0gJCh0aGlzKS5wYXJlbnRzKFwiZmlndXJlXCIpLmZpbmQoXCJwXCIpO1xuICAgIHZhciBjdXJfbnVtYmVyID0gJCh0aGlzKS5maW5kTnVtYmVyKGZvcm11bGFib3hfc2VsZWN0b3IpO1xuICAgIGN1cl9jYXB0aW9uLmZpbmQoJ3NwYW4uY2dlbicpLnJlbW92ZSgpO1xuICAgIGN1cl9jYXB0aW9uLmh0bWwoY3VyX2NhcHRpb24uaHRtbCgpICsgXCI8c3BhbiBjb250ZW50ZWRpdGFibGU9XFxcImZhbHNlXFxcIiBjbGFzcz1cXFwiY2dlblxcXCIgZGF0YS1yYXNoLW9yaWdpbmFsLWNvbnRlbnQ9XFxcIlxcXCIgPiAoXCIgK1xuICAgICAgY3VyX251bWJlciArIFwiKTwvc3Bhbj5cIik7XG4gIH0pO1xuICAkKGxpc3Rpbmdib3hfc2VsZWN0b3IpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgIHZhciBjdXJfY2FwdGlvbiA9ICQodGhpcykucGFyZW50cyhcImZpZ3VyZVwiKS5maW5kKFwiZmlnY2FwdGlvblwiKTtcbiAgICB2YXIgY3VyX251bWJlciA9ICQodGhpcykuZmluZE51bWJlcihsaXN0aW5nYm94X3NlbGVjdG9yKTtcbiAgICBjdXJfY2FwdGlvbi5maW5kKCdzdHJvbmcnKS5yZW1vdmUoKTtcbiAgICBjdXJfY2FwdGlvbi5odG1sKFwiPHN0cm9uZyBjbGFzcz1cXFwiY2dlblxcXCIgZGF0YS1yYXNoLW9yaWdpbmFsLWNvbnRlbnQ9XFxcIlxcXCIgY29udGVudGVkaXRhYmxlPVxcXCJmYWxzZVxcXCI+TGlzdGluZyBcIiArIGN1cl9udW1iZXIgK1xuICAgICAgXCIuIDwvc3Ryb25nPlwiICsgY3VyX2NhcHRpb24uaHRtbCgpKTtcbiAgfSk7XG4gIC8qIC9FTkQgQ2FwdGlvbnMgKi9cbn1cblxuLyoqXG4gKiBcbiAqIEBwYXJhbSB7Kn0gc2VsID0+IHRpbnltY2Ugc2VsZWN0aW9uXG4gKiBcbiAqIE1haW5seSBpdCBjaGVja3Mgd2hlcmUgc2VsZWN0aW9uIHN0YXJ0cyBhbmQgZW5kcyB0byBibG9jayB1bmFsbG93ZWQgZGVsZXRpb25cbiAqIEluIHNhbWUgZmlndXJlIGFyZW4ndCBibG9ja2VkLCB1bmxlc3Mgc2VsZWN0aW9uIHN0YXJ0IE9SIGVuZCBpbnNpZGUgZmlnY2FwdGlvbiAobm90IGJvdGgpXG4gKi9cbmZ1bmN0aW9uIGhhbmRsZUZpZ3VyZURlbGV0ZShzZWwpIHtcblxuICB0cnkge1xuXG4gICAgLy8gR2V0IHJlZmVyZW5jZSBvZiBzdGFydCBhbmQgZW5kIG5vZGVcbiAgICBsZXQgc3RhcnROb2RlID0gJChzZWwuZ2V0Um5nKCkuc3RhcnRDb250YWluZXIpXG4gICAgbGV0IHN0YXJ0Tm9kZVBhcmVudCA9IHN0YXJ0Tm9kZS5wYXJlbnRzKEZJR1VSRV9TRUxFQ1RPUilcblxuICAgIGxldCBlbmROb2RlID0gJChzZWwuZ2V0Um5nKCkuZW5kQ29udGFpbmVyKVxuICAgIGxldCBlbmROb2RlUGFyZW50ID0gZW5kTm9kZS5wYXJlbnRzKEZJR1VSRV9TRUxFQ1RPUilcblxuICAgIC8vIElmIGF0IGxlYXN0IHNlbGVjdGlvbiBzdGFydCBvciBlbmQgaXMgaW5zaWRlIHRoZSBmaWd1cmVcbiAgICBpZiAoc3RhcnROb2RlUGFyZW50Lmxlbmd0aCB8fCBlbmROb2RlUGFyZW50Lmxlbmd0aCkge1xuXG4gICAgICAvLyBJZiBzZWxlY3Rpb24gd3JhcHMgZW50aXJlbHkgYSBmaWd1cmUgZnJvbSB0aGUgc3RhcnQgb2YgZmlyc3QgZWxlbWVudCAodGggaW4gdGFibGUpIGFuZCBzZWxlY3Rpb24gZW5kc1xuICAgICAgaWYgKGVuZE5vZGUucGFyZW50cygnZmlnY2FwdGlvbicpLmxlbmd0aCkge1xuXG4gICAgICAgIGxldCBjb250ZW50cyA9IGVuZE5vZGUucGFyZW50KCkuY29udGVudHMoKVxuICAgICAgICBpZiAoc3RhcnROb2RlLmlzKEZJR1VSRV9TRUxFQ1RPUikgJiYgY29udGVudHMuaW5kZXgoZW5kTm9kZSkgPT0gY29udGVudHMubGVuZ3RoIC0gMSAmJiBzZWwuZ2V0Um5nKCkuZW5kT2Zmc2V0ID09IGVuZE5vZGUudGV4dCgpLmxlbmd0aCkge1xuICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgICAgLy8gTW92ZSBjdXJzb3IgYXQgdGhlIHByZXZpb3VzIGVsZW1lbnQgYW5kIHJlbW92ZSBmaWd1cmVcbiAgICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLmZvY3VzKClcbiAgICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZXRDdXJzb3JMb2NhdGlvbihzdGFydE5vZGUucHJldigpWzBdLCAxKVxuICAgICAgICAgICAgc3RhcnROb2RlLnJlbW92ZSgpXG5cbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gSWYgc2VsZWN0aW9uIGRvZXNuJ3Qgc3RhcnQgYW5kIGVuZCBpbiB0aGUgc2FtZSBmaWd1cmUsIGJ1dCBvbmUgYmVldHdlbiBzdGFydCBvciBlbmQgaXMgaW5zaWRlIHRoZSBmaWdjYXB0aW9uLCBtdXN0IGJsb2NrXG4gICAgICBpZiAoc3RhcnROb2RlLnBhcmVudHMoJ2ZpZ2NhcHRpb24nKS5sZW5ndGggIT0gZW5kTm9kZS5wYXJlbnRzKCdmaWdjYXB0aW9uJykubGVuZ3RoICYmIChzdGFydE5vZGUucGFyZW50cygnZmlnY2FwdGlvbicpLmxlbmd0aCB8fCBlbmROb2RlLnBhcmVudHMoJ2ZpZ2NhcHRpb24nKS5sZW5ndGgpKVxuICAgICAgICByZXR1cm4gZmFsc2VcblxuICAgICAgLy8gSWYgdGhlIGZpZ3VyZSBpcyBub3QgdGhlIHNhbWUsIG11c3QgYmxvY2tcbiAgICAgIC8vIEJlY2F1c2UgYSBzZWxlY3Rpb24gY2FuIHN0YXJ0IGluIGZpZ3VyZVggYW5kIGVuZCBpbiBmaWd1cmVZXG4gICAgICBpZiAoKHN0YXJ0Tm9kZVBhcmVudC5hdHRyKCdpZCcpICE9IGVuZE5vZGVQYXJlbnQuYXR0cignaWQnKSkpXG4gICAgICAgIHJldHVybiBmYWxzZVxuXG4gICAgICAvLyBJZiBjdXJzb3IgaXMgYXQgc3RhcnQgb2YgY29kZSBwcmV2ZW50XG4gICAgICBpZiAoc3RhcnROb2RlLnBhcmVudHMoRklHVVJFX1NFTEVDVE9SKS5maW5kKCdwcmUnKS5sZW5ndGgpIHtcblxuICAgICAgICAvLyBJZiBhdCB0aGUgc3RhcnQgb2YgcHJlPmNvZGUsIHByZXNzaW5nIDJ0aW1lcyBiYWNrc3BhY2Ugd2lsbCByZW1vdmUgZXZlcnl0aGluZyBcbiAgICAgICAgaWYgKHN0YXJ0Tm9kZS5wYXJlbnQoKS5pcygnY29kZScpICYmIChzdGFydE5vZGUucGFyZW50KCkuY29udGVudHMoKS5pbmRleChzdGFydE5vZGUpID09IDAgJiYgc2VsLmdldFJuZygpLnN0YXJ0T2Zmc2V0ID09IDEpKSB7XG4gICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc3RhcnROb2RlLnBhcmVudHMoRklHVVJFX1NFTEVDVE9SKS5yZW1vdmUoKVxuICAgICAgICAgIH0pXG4gICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgIH1cblxuXG4gICAgICAgIGlmIChzdGFydE5vZGUucGFyZW50KCkuaXMoJ3ByZScpICYmIHNlbC5nZXRSbmcoKS5zdGFydE9mZnNldCA9PSAwKVxuICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0cnVlXG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxufVxuXG4vKipcbiAqIFxuICogQHBhcmFtIHsqfSBzZWwgXG4gKi9cbmZ1bmN0aW9uIGhhbmRsZUZpZ3VyZUNhbmMoc2VsKSB7XG5cbiAgLy8gR2V0IHJlZmVyZW5jZSBvZiBzdGFydCBhbmQgZW5kIG5vZGVcbiAgbGV0IHN0YXJ0Tm9kZSA9ICQoc2VsLmdldFJuZygpLnN0YXJ0Q29udGFpbmVyKVxuICBsZXQgc3RhcnROb2RlUGFyZW50ID0gc3RhcnROb2RlLnBhcmVudHMoRklHVVJFX1NFTEVDVE9SKVxuXG4gIGxldCBlbmROb2RlID0gJChzZWwuZ2V0Um5nKCkuZW5kQ29udGFpbmVyKVxuICBsZXQgZW5kTm9kZVBhcmVudCA9IGVuZE5vZGUucGFyZW50cyhGSUdVUkVfU0VMRUNUT1IpXG5cbiAgLy8gSWYgYXQgbGVhc3Qgc2VsZWN0aW9uIHN0YXJ0IG9yIGVuZCBpcyBpbnNpZGUgdGhlIGZpZ3VyZVxuICBpZiAoc3RhcnROb2RlUGFyZW50Lmxlbmd0aCB8fCBlbmROb2RlUGFyZW50Lmxlbmd0aCkge1xuXG4gICAgLy8gSWYgc2VsZWN0aW9uIGRvZXNuJ3Qgc3RhcnQgYW5kIGVuZCBpbiB0aGUgc2FtZSBmaWd1cmUsIGJ1dCBvbmUgYmVldHdlbiBzdGFydCBvciBlbmQgaXMgaW5zaWRlIHRoZSBmaWdjYXB0aW9uLCBtdXN0IGJsb2NrXG4gICAgaWYgKHN0YXJ0Tm9kZS5wYXJlbnRzKCdmaWdjYXB0aW9uJykubGVuZ3RoICE9IGVuZE5vZGUucGFyZW50cygnZmlnY2FwdGlvbicpLmxlbmd0aCAmJiAoc3RhcnROb2RlLnBhcmVudHMoJ2ZpZ2NhcHRpb24nKS5sZW5ndGggfHwgZW5kTm9kZS5wYXJlbnRzKCdmaWdjYXB0aW9uJykubGVuZ3RoKSlcbiAgICAgIHJldHVybiBmYWxzZVxuXG4gICAgLy8gSWYgdGhlIGZpZ3VyZSBpcyBub3QgdGhlIHNhbWUsIG11c3QgYmxvY2tcbiAgICAvLyBCZWNhdXNlIGEgc2VsZWN0aW9uIGNhbiBzdGFydCBpbiBmaWd1cmVYIGFuZCBlbmQgaW4gZmlndXJlWVxuICAgIGlmICgoc3RhcnROb2RlUGFyZW50LmF0dHIoJ2lkJykgIT0gZW5kTm9kZVBhcmVudC5hdHRyKCdpZCcpKSlcbiAgICAgIHJldHVybiBmYWxzZVxuXG4gIH1cblxuICAvLyBUaGlzIGFsZ29yaXRobSBkb2Vzbid0IHdvcmsgaWYgY2FyZXQgaXMgaW4gZW1wdHkgdGV4dCBlbGVtZW50XG5cbiAgLy8gQ3VycmVudCBlbGVtZW50IGNhbiBiZSBvciB0ZXh0IG9yIHBcbiAgbGV0IHBhcmFncmFwaCA9IHN0YXJ0Tm9kZS5pcygncCcpID8gc3RhcnROb2RlIDogc3RhcnROb2RlLnBhcmVudHMoJ3AnKS5maXJzdCgpXG4gIC8vIFNhdmUgYWxsIGNobGRyZW4gbm9kZXMgKHRleHQgaW5jbHVkZWQpXG4gIGxldCBwYXJhZ3JhcGhDb250ZW50ID0gcGFyYWdyYXBoLmNvbnRlbnRzKClcblxuICAvLyBJZiBuZXh0IHRoZXJlIGlzIGEgZmlndXJlXG4gIGlmIChwYXJhZ3JhcGgubmV4dCgpLmlzKEZJR1VSRV9TRUxFQ1RPUikpIHtcblxuICAgIGlmIChlbmROb2RlWzBdLm5vZGVUeXBlID09IDMpIHtcblxuICAgICAgLy8gSWYgdGhlIGVuZCBub2RlIGlzIGEgdGV4dCBpbnNpZGUgYSBzdHJvbmcsIGl0cyBpbmRleCB3aWxsIGJlIC0xLlxuICAgICAgLy8gSW4gdGhpcyBjYXNlIHRoZSBlZGl0b3IgbXVzdCBpdGVyYXRlIHVudGlsIGl0IGZhY2UgYSBpbmxpbmUgZWxlbWVudFxuICAgICAgaWYgKHBhcmFncmFwaENvbnRlbnQuaW5kZXgoZW5kTm9kZSkgPT0gLTEpIC8vJiYgcGFyYWdyYXBoLnBhcmVudHMoU0VDVElPTl9TRUxFQ1RPUikubGVuZ3RoKVxuICAgICAgICBlbmROb2RlID0gZW5kTm9kZS5wYXJlbnQoKVxuXG4gICAgICAvLyBJZiBpbmRleCBvZiB0aGUgaW5saW5lIGVsZW1lbnQgaXMgZXF1YWwgb2YgY2hpbGRyZW4gbm9kZSBsZW5ndGhcbiAgICAgIC8vIEFORCB0aGUgY3Vyc29yIGlzIGF0IHRoZSBsYXN0IHBvc2l0aW9uXG4gICAgICAvLyBSZW1vdmUgdGhlIG5leHQgZmlndXJlIGluIG9uZSB1bmRvIGxldmVsXG4gICAgICBpZiAocGFyYWdyYXBoQ29udGVudC5pbmRleChlbmROb2RlKSArIDEgPT0gcGFyYWdyYXBoQ29udGVudC5sZW5ndGggJiYgcGFyYWdyYXBoQ29udGVudC5sYXN0KCkudGV4dCgpLmxlbmd0aCA9PSBzZWwuZ2V0Um5nKCkuZW5kT2Zmc2V0KSB7XG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBwYXJhZ3JhcGgubmV4dCgpLnJlbW92ZSgpXG4gICAgICAgIH0pXG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0cnVlXG59XG5cbi8qKlxuICogXG4gKiBAcGFyYW0geyp9IHNlbCA9PiB0aW55bWNlIHNlbGVjdGlvblxuICogXG4gKiBBZGQgYSBwYXJhZ3JhcGggYWZ0ZXIgdGhlIGZpZ3VyZVxuICovXG5mdW5jdGlvbiBoYW5kbGVGaWd1cmVFbnRlcihzZWwpIHtcblxuICBsZXQgc2VsZWN0ZWRFbGVtZW50ID0gJChzZWwuZ2V0Tm9kZSgpKVxuICBpZiAoc2VsZWN0ZWRFbGVtZW50LmlzKCdmaWdjYXB0aW9uJykgfHwgKHNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKEZJR1VSRV9TRUxFQ1RPUikubGVuZ3RoICYmIHNlbGVjdGVkRWxlbWVudC5pcygncCcpKSkge1xuXG4gICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAvL2FkZCBhIG5ldyBwYXJhZ3JhcGggYWZ0ZXIgdGhlIGZpZ3VyZVxuICAgICAgc2VsZWN0ZWRFbGVtZW50LnBhcmVudChGSUdVUkVfU0VMRUNUT1IpLmFmdGVyKCc8cD48YnIvPjwvcD4nKVxuXG4gICAgICAvL21vdmUgY2FyZXQgYXQgdGhlIHN0YXJ0IG9mIG5ldyBwXG4gICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2V0Q3Vyc29yTG9jYXRpb24oc2VsZWN0ZWRFbGVtZW50LnBhcmVudChGSUdVUkVfU0VMRUNUT1IpWzBdLm5leHRTaWJsaW5nLCAwKVxuICAgIH0pXG4gICAgcmV0dXJuIGZhbHNlXG4gIH0gZWxzZSBpZiAoc2VsZWN0ZWRFbGVtZW50LmlzKCd0aCcpKVxuICAgIHJldHVybiBmYWxzZVxuICByZXR1cm4gdHJ1ZVxufVxuXG4vKipcbiAqIFxuICogQHBhcmFtIHsqfSBzZWwgPT4gdGlueW1jZSBzZWxlY3Rpb25cbiAqL1xuZnVuY3Rpb24gaGFuZGxlRmlndXJlQ2hhbmdlKHNlbCkge1xuXG4gIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuXG4gIC8vIElmIHJhc2gtZ2VuZXJhdGVkIHNlY3Rpb24gaXMgZGVsZXRlLCByZS1hZGQgaXRcbiAgaWYgKCQoJ2ZpZ2NhcHRpb246bm90KDpoYXMoc3Ryb25nKSknKS5sZW5ndGgpIHtcbiAgICBjYXB0aW9ucygpXG4gICAgdXBkYXRlSWZyYW1lRnJvbVNhdmVkQ29udGVudCgpXG4gIH1cbn0iLCIvKipcbiAqIHJhamVfaW5saW5lX2NvZGUgcGx1Z2luIFJBSkVcbiAqL1xuXG5jb25zdCBESVNBQkxFX1NFTEVDVE9SX0lOTElORSA9ICd0YWJsZSwgaW1nLCBwcmUsIGNvZGUsIHNlY3Rpb25bcm9sZT1kb2MtYmlibGlvZ3JhcGh5XSdcblxuY29uc3QgSU5MSU5FX0VSUk9SUyA9ICdFcnJvciwgSW5saW5lIGVsZW1lbnRzIGNhbiBiZSBPTkxZIGNyZWF0ZWQgaW5zaWRlIHRoZSBzYW1lIHBhcmFncmFwaCdcblxuLyoqXG4gKiBcbiAqL1xubGV0IGlubGluZSA9IHtcblxuICAvKipcbiAgICogXG4gICAqL1xuICBoYW5kbGU6IGZ1bmN0aW9uICh0eXBlKSB7XG4gICAgbGV0IHNlbGVjdGVkRWxlbWVudCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcblxuICAgIC8vIElmIHRoZXJlIGlzbid0IGFueSBpbmxpbmUgY29kZVxuICAgIGlmICghc2VsZWN0ZWRFbGVtZW50LmlzKHR5cGUpICYmICFzZWxlY3RlZEVsZW1lbnQucGFyZW50cyh0eXBlKS5sZW5ndGgpIHtcblxuICAgICAgbGV0IHRleHQgPSBaRVJPX1NQQUNFXG5cbiAgICAgIC8vIENoZWNrIGlmIHRoZSBzZWxlY3Rpb24gc3RhcnRzIGFuZCBlbmRzIGluIHRoZSBzYW1lIHBhcmFncmFwaFxuICAgICAgaWYgKCF0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uaXNDb2xsYXBzZWQoKSkge1xuXG4gICAgICAgIGxldCBzdGFydE5vZGUgPSB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0U3RhcnQoKVxuICAgICAgICBsZXQgZW5kTm9kZSA9IHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRFbmQoKVxuXG4gICAgICAgIC8vIE5vdGlmeSB0aGUgZXJyb3IgYW5kIGV4aXRcbiAgICAgICAgaWYgKHN0YXJ0Tm9kZSAhPSBlbmROb2RlKSB7XG4gICAgICAgICAgbm90aWZ5KElOTElORV9FUlJPUlMsICdlcnJvcicsIDMwMDApXG4gICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgIH1cblxuICAgICAgICAvLyBTYXZlIHRoZSBzZWxlY3RlZCBjb250ZW50IGFzIHRleHRcbiAgICAgICAgdGV4dCArPSB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Q29udGVudCgpXG4gICAgICB9XG5cbiAgICAgIC8vIFVwZGF0ZSB0aGUgY3VycmVudCBzZWxlY3Rpb24gd2l0aCBjb2RlIGVsZW1lbnRcbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAvLyBHZXQgdGhlIGluZGV4IG9mIHRoZSBjdXJyZW50IHNlbGVjdGVkIG5vZGVcbiAgICAgICAgbGV0IHByZXZpb3VzTm9kZUluZGV4ID0gc2VsZWN0ZWRFbGVtZW50LmNvbnRlbnRzKCkuaW5kZXgoJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Um5nKCkuc3RhcnRDb250YWluZXIpKVxuXG4gICAgICAgIC8vIEFkZCBjb2RlIGVsZW1lbnRcbiAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLnNldENvbnRlbnQoYDwke3R5cGV9PiR7dGV4dH08LyR7dHlwZX0+JHsodHlwZSA9PSAncScgPyBaRVJPX1NQQUNFIDogJycpfWApXG4gICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuXG4gICAgICAgIC8vIE1vdmUgY2FyZXQgYXQgdGhlIGVuZCBvZiB0aGUgc3VjY2Vzc2l2ZSBub2RlIG9mIHByZXZpb3VzIHNlbGVjdGVkIG5vZGVcbiAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLnNldEN1cnNvckxvY2F0aW9uKHNlbGVjdGVkRWxlbWVudC5jb250ZW50cygpW3ByZXZpb3VzTm9kZUluZGV4ICsgMV0sIDEpXG4gICAgICB9KVxuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogXG4gICAqL1xuICBleGl0OiBmdW5jdGlvbiAoKSB7XG4gICAgLy8gR2V0IHRoZSBjdXJyZW50IG5vZGUgaW5kZXgsIHJlbGF0aXZlIHRvIGl0cyBwYXJlbnRcbiAgICBsZXQgc2VsZWN0ZWRFbGVtZW50ID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuICAgIGxldCBwYXJlbnRDb250ZW50ID0gc2VsZWN0ZWRFbGVtZW50LnBhcmVudCgpLmNvbnRlbnRzKClcbiAgICBsZXQgaW5kZXggPSBwYXJlbnRDb250ZW50LmluZGV4KHNlbGVjdGVkRWxlbWVudClcblxuICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgLy8gQ2hlY2sgaWYgdGhlIGN1cnJlbnQgbm9kZSBoYXMgYSB0ZXh0IGFmdGVyXG4gICAgICBpZiAodHlwZW9mIHBhcmVudENvbnRlbnRbaW5kZXggKyAxXSAhPSAndW5kZWZpbmVkJyAmJiAkKHBhcmVudENvbnRlbnRbaW5kZXggKyAxXSkuaXMoJ3RleHQnKSkge1xuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2V0Q3Vyc29yTG9jYXRpb24ocGFyZW50Q29udGVudFtpbmRleCArIDFdLCAwKVxuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2V0Q29udGVudChaRVJPX1NQQUNFKVxuICAgICAgfVxuXG4gICAgICAvLyBJZiB0aGUgbm9kZSBoYXNuJ3QgdGV4dCBhZnRlciwgcmFqZSBoYXMgdG8gYWRkIGl0XG4gICAgICBlbHNlIHtcbiAgICAgICAgc2VsZWN0ZWRFbGVtZW50LmFmdGVyKFpFUk9fU1BBQ0UpXG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZXRDdXJzb3JMb2NhdGlvbihwYXJlbnRDb250ZW50W2luZGV4ICsgMV0sIDApXG4gICAgICB9XG4gICAgfSlcbiAgfSxcblxuICAvKipcbiAgICogXG4gICAqL1xuICByZXBsYWNlVGV4dDogZnVuY3Rpb24gKGNoYXIpIHtcblxuICAgIGxldCBzZWxlY3RlZEVsZW1lbnQgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG4gICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAvLyBTZXQgdGhlIG5ldyBjaGFyIGFuZCBvdmVyd3JpdGUgY3VycmVudCB0ZXh0XG4gICAgICBzZWxlY3RlZEVsZW1lbnQuaHRtbChjaGFyKVxuXG4gICAgICAvLyBNb3ZlIHRoZSBjYXJldCBhdCB0aGUgZW5kIG9mIGN1cnJlbnQgdGV4dFxuICAgICAgbGV0IGNvbnRlbnQgPSBzZWxlY3RlZEVsZW1lbnQuY29udGVudHMoKVxuICAgICAgbW92ZUNhcmV0KGNvbnRlbnRbY29udGVudC5sZW5ndGggLSAxXSlcbiAgICB9KVxuICB9XG59XG5cbi8qKlxuICogXG4gKi9cbnRpbnltY2UuUGx1Z2luTWFuYWdlci5hZGQoJ3JhamVfaW5saW5lQ29kZScsIGZ1bmN0aW9uIChlZGl0b3IsIHVybCkge1xuXG4gIGNvbnN0IENPREUgPSAnY29kZSdcblxuICAvLyBBZGQgYSBidXR0b24gdGhhdCBvcGVucyBhIHdpbmRvd1xuICBlZGl0b3IuYWRkQnV0dG9uKCdyYWplX2lubGluZUNvZGUnLCB7XG4gICAgdGl0bGU6ICdpbmxpbmVfY29kZScsXG4gICAgaWNvbjogJ2ljb24taW5saW5lLWNvZGUnLFxuICAgIHRvb2x0aXA6ICdJbmxpbmUgY29kZScsXG4gICAgZGlzYWJsZWRTdGF0ZVNlbGVjdG9yOiBESVNBQkxFX1NFTEVDVE9SX0lOTElORSxcblxuICAgIC8vIEJ1dHRvbiBiZWhhdmlvdXJcbiAgICBvbmNsaWNrOiBmdW5jdGlvbiAoKSB7XG4gICAgICBpbmxpbmUuaGFuZGxlKENPREUpXG4gICAgfVxuICB9KVxuXG4gIGVkaXRvci5vbigna2V5RG93bicsIGZ1bmN0aW9uIChlKSB7XG5cbiAgICAvLyBDaGVjayBpZiB0aGUgc2VsZWN0ZWQgZWxlbWVudCBpcyBhIENPREUgdGhhdCBpc24ndCBpbnNpZGUgYSBGSUdVUkUgb3IgUFJFXG4gICAgbGV0IHNlbGVjdGVkRWxlbWVudCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcbiAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LmlzKCdjb2RlJykgJiYgIXNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKEZJR1VSRV9TRUxFQ1RPUikubGVuZ3RoICYmICFzZWxlY3RlZEVsZW1lbnQucGFyZW50cygncHJlJykubGVuZ3RoKSB7XG5cbiAgICAgIC8qKlxuICAgICAgICogQ2hlY2sgaWYgRU5URVIgaXMgcHJlc3NlZFxuICAgICAgICovXG4gICAgICBpZiAoZS5rZXlDb2RlID09IDEzKSB7XG5cbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKClcbiAgICAgICAgaW5saW5lLmV4aXQoKVxuICAgICAgfVxuXG4gICAgICAvKipcbiAgICAgICAqIENoZWNrIGlmIGEgUFJJTlRBQkxFIENIQVIgaXMgcHJlc3NlZFxuICAgICAgICovXG4gICAgICBpZiAoY2hlY2tJZlByaW50YWJsZUNoYXIoZS5rZXlDb2RlKSkge1xuXG4gICAgICAgIC8vIElmIHRoZSBmaXJzdCBjaGFyIGlzIFpFUk9fU1BBQ0UgYW5kIHRoZSBjb2RlIGhhcyBubyBjaGFyXG4gICAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQudGV4dCgpLmxlbmd0aCA9PSAyICYmIGAmIyR7c2VsZWN0ZWRFbGVtZW50LnRleHQoKS5jaGFyQ29kZUF0KDApfTtgID09IFpFUk9fU1BBQ0UpIHtcbiAgICAgICAgICBcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpXG4gICAgICAgICAgaW5saW5lLnJlcGxhY2VUZXh0KGUua2V5KVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9KVxufSlcblxuLyoqXG4gKiAgSW5saW5lIHF1b3RlIHBsdWdpbiBSQUpFXG4gKi9cbnRpbnltY2UuUGx1Z2luTWFuYWdlci5hZGQoJ3JhamVfaW5saW5lUXVvdGUnLCBmdW5jdGlvbiAoZWRpdG9yLCB1cmwpIHtcblxuICBjb25zdCBRID0gJ3EnXG5cbiAgLy8gQWRkIGEgYnV0dG9uIHRoYXQgaGFuZGxlIHRoZSBpbmxpbmUgZWxlbWVudFxuICBlZGl0b3IuYWRkQnV0dG9uKCdyYWplX2lubGluZVF1b3RlJywge1xuICAgIHRpdGxlOiAnaW5saW5lX3F1b3RlJyxcbiAgICBpY29uOiAnaWNvbi1pbmxpbmUtcXVvdGUnLFxuICAgIHRvb2x0aXA6ICdJbmxpbmUgcXVvdGUnLFxuICAgIGRpc2FibGVkU3RhdGVTZWxlY3RvcjogRElTQUJMRV9TRUxFQ1RPUl9JTkxJTkUsXG5cbiAgICAvLyBCdXR0b24gYmVoYXZpb3VyXG4gICAgb25jbGljazogZnVuY3Rpb24gKCkge1xuICAgICAgaW5saW5lLmhhbmRsZSgncScpXG4gICAgfVxuICB9KVxuXG4gIGVkaXRvci5vbigna2V5RG93bicsIGZ1bmN0aW9uIChlKSB7XG5cbiAgICAvLyBDaGVjayBpZiB0aGUgc2VsZWN0ZWQgZWxlbWVudCBpcyBhIENPREUgdGhhdCBpc24ndCBpbnNpZGUgYSBGSUdVUkUgb3IgUFJFXG4gICAgbGV0IHNlbGVjdGVkRWxlbWVudCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcbiAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LmlzKCdxJykpIHtcblxuICAgICAgLyoqXG4gICAgICAgKiBDaGVjayBpZiBFTlRFUiBpcyBwcmVzc2VkXG4gICAgICAgKi9cbiAgICAgIGlmIChlLmtleUNvZGUgPT0gMTMpIHtcblxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKVxuICAgICAgICBpbmxpbmUuZXhpdCgpXG4gICAgICB9XG5cbiAgICAgIC8qKlxuICAgICAgICogQ2hlY2sgaWYgYSBQUklOVEFCTEUgQ0hBUiBpcyBwcmVzc2VkXG4gICAgICAgKi9cbiAgICAgIGlmIChjaGVja0lmUHJpbnRhYmxlQ2hhcihlLmtleUNvZGUpKSB7XG5cbiAgICAgICAgLy8gSWYgdGhlIGZpcnN0IGNoYXIgaXMgWkVST19TUEFDRSBhbmQgdGhlIGNvZGUgaGFzIG5vIGNoYXJcbiAgICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC50ZXh0KCkubGVuZ3RoID09IDEgJiYgYCYjJHtzZWxlY3RlZEVsZW1lbnQudGV4dCgpLmNoYXJDb2RlQXQoMCl9O2AgPT0gWkVST19TUEFDRSkge1xuXG4gICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKVxuICAgICAgICAgIGlubGluZS5yZXBsYWNlVGV4dChlLmtleSlcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfSlcbn0pXG5cbi8qKlxuICogXG4gKi9cbnRpbnltY2UuUGx1Z2luTWFuYWdlci5hZGQoJ3JhamVfZXh0ZXJuYWxMaW5rJywgZnVuY3Rpb24gKGVkaXRvciwgdXJsKSB7XG5cbiAgZWRpdG9yLmFkZEJ1dHRvbigncmFqZV9leHRlcm5hbExpbmsnLCB7XG4gICAgdGl0bGU6ICdleHRlcm5hbF9saW5rJyxcbiAgICBpY29uOiAnaWNvbi1leHRlcm5hbC1saW5rJyxcbiAgICB0b29sdGlwOiAnRXh0ZXJuYWwgbGluaycsXG4gICAgZGlzYWJsZWRTdGF0ZVNlbGVjdG9yOiBESVNBQkxFX1NFTEVDVE9SX0lOTElORSxcblxuICAgIC8vIEJ1dHRvbiBiZWhhdmlvdXJcbiAgICBvbmNsaWNrOiBmdW5jdGlvbiAoKSB7fVxuICB9KVxuXG5cbiAgbGV0IGxpbmsgPSB7XG4gICAgYWRkOiBmdW5jdGlvbiAoKSB7XG5cbiAgICB9XG4gIH1cbn0pXG5cbi8qKlxuICogXG4gKi9cbnRpbnltY2UuUGx1Z2luTWFuYWdlci5hZGQoJ3JhamVfaW5saW5lRmlndXJlJywgZnVuY3Rpb24gKGVkaXRvciwgdXJsKSB7XG4gIGVkaXRvci5hZGRCdXR0b24oJ3JhamVfaW5saW5lRmlndXJlJywge1xuICAgIHRleHQ6ICdpbmxpbmVfZmlndXJlJyxcbiAgICB0b29sdGlwOiAnSW5saW5lIHF1b3RlJyxcbiAgICBkaXNhYmxlZFN0YXRlU2VsZWN0b3I6IERJU0FCTEVfU0VMRUNUT1JfSU5MSU5FLFxuXG4gICAgLy8gQnV0dG9uIGJlaGF2aW91clxuICAgIG9uY2xpY2s6IGZ1bmN0aW9uICgpIHt9XG4gIH0pXG59KSIsInRpbnltY2UuUGx1Z2luTWFuYWdlci5hZGQoJ3JhamVfbGlzdHMnLCBmdW5jdGlvbiAoZWRpdG9yLCB1cmwpIHtcblxuICBjb25zdCBPTCA9ICdvbCdcbiAgY29uc3QgVUwgPSAndWwnXG5cbiAgZWRpdG9yLmFkZEJ1dHRvbigncmFqZV9vbCcsIHtcbiAgICB0aXRsZTogJ3JhamVfb2wnLFxuICAgIGljb246ICdpY29uLW9sJyxcbiAgICB0b29sdGlwOiAnT3JkZXJlZCBsaXN0JyxcbiAgICBkaXNhYmxlZFN0YXRlU2VsZWN0b3I6IERJU0FCTEVfU0VMRUNUT1JfRklHVVJFUyxcblxuICAgIC8vIEJ1dHRvbiBiZWhhdmlvdXJcbiAgICBvbmNsaWNrOiBmdW5jdGlvbiAoKSB7XG4gICAgICBsaXN0LmFkZChPTClcbiAgICB9XG4gIH0pXG5cbiAgZWRpdG9yLmFkZEJ1dHRvbigncmFqZV91bCcsIHtcbiAgICB0aXRsZTogJ3JhamVfdWwnLFxuICAgIGljb246ICdpY29uLXVsJyxcbiAgICB0b29sdGlwOiAnVW5vcmRlcmVkIGxpc3QnLFxuICAgIGRpc2FibGVkU3RhdGVTZWxlY3RvcjogRElTQUJMRV9TRUxFQ1RPUl9GSUdVUkVTLFxuXG4gICAgLy8gQnV0dG9uIGJlaGF2aW91clxuICAgIG9uY2xpY2s6IGZ1bmN0aW9uICgpIHtcbiAgICAgIGxpc3QuYWRkKFVMKVxuICAgIH1cbiAgfSlcblxuICAvKipcbiAgICogXG4gICAqL1xuICBlZGl0b3Iub24oJ2tleURvd24nLCBmdW5jdGlvbiAoZSkge1xuXG5cbiAgICAvLyBDaGVjayBpZiB0aGUgc2VsZWN0ZWQgZWxlbWVudCBpcyBhIFAgaW5zaWRlIGEgbGlzdCAoT0wsIFVMKVxuICAgIGxldCBzZWxlY3RlZEVsZW1lbnQgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG4gICAgaWYgKHNlbGVjdGVkRWxlbWVudC5pcygncCcpICYmIChzZWxlY3RlZEVsZW1lbnQucGFyZW50cygndWwnKS5sZW5ndGggfHwgc2VsZWN0ZWRFbGVtZW50LnBhcmVudHMoJ2xpJykubGVuZ3RoKSkge1xuXG5cbiAgICAgIC8qKlxuICAgICAgICogQ2hlY2sgaWYgQ01EK0VOVEVSIG9yIENUUkwrRU5URVIgYXJlIHByZXNzZWRcbiAgICAgICAqL1xuICAgICAgaWYgKChlLm1ldGFLZXkgfHwgZS5jdHJsS2V5KSAmJiBlLmtleUNvZGUgPT0gMTMpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgIGxpc3QuYWRkUGFyYWdyYXBoKClcbiAgICAgIH1cblxuICAgICAgLyoqXG4gICAgICAgKiBDaGVjayBpZiBTSElGVCtUQUIgaXMgcHJlc3NlZFxuICAgICAgICovXG4gICAgICBlbHNlIGlmIChlLnNoaWZ0S2V5ICYmIGUua2V5Q29kZSA9PSA5KSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgICBsaXN0LmRlTmVzdCgpXG4gICAgICB9XG5cbiAgICAgIC8qKlxuICAgICAgICogQ2hlY2sgaWYgRU5URVIgaXMgcHJlc3NlZFxuICAgICAgICovXG4gICAgICBlbHNlIGlmIChlLmtleUNvZGUgPT0gMTMpIHtcblxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcblxuICAgICAgICAvLyBDaGVjayBpZiB0aGUgc2VsZWN0aW9uIGlzIGNvbGxhcHNlZFxuICAgICAgICBpZiAodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmlzQ29sbGFwc2VkKCkpIHtcblxuICAgICAgICAgIGlmICghc2VsZWN0ZWRFbGVtZW50LnRleHQoKS50cmltKCkubGVuZ3RoKSB7XG5cbiAgICAgICAgICAgIC8vIERlIG5lc3RcbiAgICAgICAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQucGFyZW50cygndWwsb2wnKS5sZW5ndGggPiAxKVxuICAgICAgICAgICAgICBsaXN0LmRlTmVzdCgpXG5cbiAgICAgICAgICAgIC8vIFJlbW92ZSB0aGUgZW1wdHkgTElcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgbGlzdC5yZW1vdmVMaXN0SXRlbSgpXG5cbiAgICAgICAgICB9IGVsc2VcbiAgICAgICAgICAgIGxpc3QuYWRkTGlzdEl0ZW0oKVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8qKlxuICAgICAgICogQ2hlY2sgaWYgVEFCIGlzIHByZXNzZWRcbiAgICAgICAqL1xuICAgICAgZWxzZSBpZiAoZS5rZXlDb2RlID09IDkpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgIGxpc3QubmVzdCgpXG4gICAgICB9XG4gICAgfVxuICB9KVxuXG5cbiAgLyoqXG4gICAqIFxuICAgKi9cbiAgbGV0IGxpc3QgPSB7XG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBhZGQ6IGZ1bmN0aW9uICh0eXBlKSB7XG5cbiAgICAgIC8vIEdldCB0aGUgY3VycmVudCBlbGVtZW50IFxuICAgICAgbGV0IHNlbGVjdGVkRWxlbWVudCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcbiAgICAgIGxldCB0ZXh0ID0gJzxicj4nXG5cbiAgICAgIC8vIElmIHRoZSBjdXJyZW50IGVsZW1lbnQgaGFzIHRleHQsIHNhdmUgaXRcbiAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQudGV4dCgpLnRyaW0oKS5sZW5ndGggPiAwKVxuICAgICAgICB0ZXh0ID0gc2VsZWN0ZWRFbGVtZW50LnRleHQoKS50cmltKClcblxuICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIGxldCBuZXdMaXN0ID0gJChgPCR7dHlwZX0+PGxpPjxwPiR7dGV4dH08L3A+PC9saT48LyR7dHlwZX0+YClcblxuICAgICAgICAvLyBBZGQgdGhlIG5ldyBlbGVtZW50XG4gICAgICAgIHNlbGVjdGVkRWxlbWVudC5yZXBsYWNlV2l0aChuZXdMaXN0KVxuXG4gICAgICAgIC8vIFNhdmUgY2hhbmdlc1xuICAgICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcblxuICAgICAgICAvLyBNb3ZlIHRoZSBjdXJzb3JcbiAgICAgICAgbW92ZUNhcmV0KG5ld0xpc3QuZmluZCgncCcpWzBdLCBmYWxzZSlcbiAgICAgIH0pXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIGFkZExpc3RJdGVtOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgIGNvbnN0IEJSID0gJzxicj4nXG5cbiAgICAgIC8vIEdldCB0aGUgcmVmZXJlbmNlcyBvZiB0aGUgZXhpc3RpbmcgZWxlbWVudFxuICAgICAgbGV0IHAgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG4gICAgICBsZXQgbGlzdEl0ZW0gPSBwLnBhcmVudCgnbGknKVxuXG4gICAgICAvLyBQbGFjZWhvbGRlciB0ZXh0IG9mIHRoZSBuZXcgbGlcbiAgICAgIGxldCBuZXdUZXh0ID0gQlJcbiAgICAgIGxldCBub2RlcyA9IHAuY29udGVudHMoKVxuXG4gICAgICAvLyBJZiB0aGVyZSBpcyBqdXN0IG9uZSBub2RlIHdyYXBwZWQgaW5zaWRlIHRoZSBwYXJhZ3JhcGhcbiAgICAgIGlmIChub2Rlcy5sZW5ndGggPT0gMSkge1xuXG4gICAgICAgIC8vIEdldCB0aGUgc3RhcnQgb2Zmc2V0IGFuZCB0ZXh0IG9mIHRoZSBjdXJyZW50IGxpXG4gICAgICAgIGxldCBzdGFydE9mZnNldCA9IHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRSbmcoKS5zdGFydE9mZnNldFxuICAgICAgICBsZXQgcFRleHQgPSBwLnRleHQoKVxuXG4gICAgICAgIC8vIElmIHRoZSBjdXJzb3IgaXNuJ3QgYXQgdGhlIGVuZFxuICAgICAgICBpZiAoc3RhcnRPZmZzZXQgIT0gcFRleHQubGVuZ3RoKSB7XG5cbiAgICAgICAgICAvLyBHZXQgdGhlIHJlbWFpbmluZyB0ZXh0XG4gICAgICAgICAgbmV3VGV4dCA9IHBUZXh0LnN1YnN0cmluZyhzdGFydE9mZnNldCwgcFRleHQubGVuZ3RoKVxuICAgICAgICB9XG5cbiAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgLy8gVXBkYXRlIHRoZSB0ZXh0IG9mIHRoZSBjdXJyZW50IGxpXG4gICAgICAgICAgcC50ZXh0KHBUZXh0LnN1YnN0cmluZygwLCBzdGFydE9mZnNldCkpXG5cbiAgICAgICAgICBpZiAoIXAudGV4dCgpLmxlbmd0aClcbiAgICAgICAgICAgIHAuaHRtbChCUilcblxuICAgICAgICAgIC8vIENyZWF0ZSBhbmQgYWRkIHRoZSBuZXcgbGlcbiAgICAgICAgICBsZXQgbmV3TGlzdEl0ZW0gPSAkKGA8bGk+PHA+JHtuZXdUZXh0fTwvcD48L2xpPmApXG4gICAgICAgICAgbGlzdEl0ZW0uYWZ0ZXIobmV3TGlzdEl0ZW0pXG5cbiAgICAgICAgICAvLyBNb3ZlIHRoZSBjYXJldCB0byB0aGUgbmV3IGxpXG4gICAgICAgICAgbW92ZUNhcmV0KG5ld0xpc3RJdGVtWzBdLCB0cnVlKVxuXG4gICAgICAgICAgLy8gVXBkYXRlIHRoZSBjb250ZW50XG4gICAgICAgICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG4gICAgICAgIH0pXG4gICAgICB9XG5cbiAgICAgIC8vIEluc3RlYWQgaWYgdGhlcmUgYXJlIG11bHRpcGxlIG5vZGVzIGluc2lkZSB0aGUgcGFyYWdyYXBoXG4gICAgICBlbHNlIHtcblxuICAgICAgICAvLyBJc3RhbnRpYXRlIHRoZSByYW5nZSB0byBiZSBzZWxlY3RlZFxuICAgICAgICBsZXQgcmFuZ2UgPSBkb2N1bWVudC5jcmVhdGVSYW5nZSgpXG5cbiAgICAgICAgLy8gU3RhcnQgdGhlIHJhbmdlIGZyb20gdGhlIHNlbGVjdGVkIG5vZGUgYW5kIG9mZnNldCBhbmQgZW5kcyBpdCBhdCB0aGUgZW5kIG9mIHRoZSBsYXN0IG5vZGVcbiAgICAgICAgcmFuZ2Uuc2V0U3RhcnQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldFJuZygpLnN0YXJ0Q29udGFpbmVyLCB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Um5nKCkuc3RhcnRPZmZzZXQpXG4gICAgICAgIHJhbmdlLnNldEVuZCh0aGlzLmdldExhc3ROb3RFbXB0eU5vZGUobm9kZXMpLCAxKVxuXG4gICAgICAgIC8vIFNlbGVjdCB0aGUgcmFuZ2VcbiAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLnNldFJuZyhyYW5nZSlcblxuICAgICAgICAvLyBTYXZlIHRoZSBodG1sIGNvbnRlbnRcbiAgICAgICAgbmV3VGV4dCA9IHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRDb250ZW50KClcblxuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICBwLmh0bWwocC5odG1sKCkucmVwbGFjZShuZXdUZXh0LCAnJykpXG5cbiAgICAgICAgICBpZiAoIXAudGV4dCgpLmxlbmd0aClcbiAgICAgICAgICAgIHAuaHRtbChCUilcblxuICAgICAgICAgIC8vIENyZWF0ZSBhbmQgYWRkIHRoZSBuZXcgbGlcbiAgICAgICAgICBsZXQgbmV3TGlzdEl0ZW0gPSAkKGA8bGk+PHA+JHtuZXdUZXh0fTwvcD48L2xpPmApXG4gICAgICAgICAgbGlzdEl0ZW0uYWZ0ZXIobmV3TGlzdEl0ZW0pXG5cbiAgICAgICAgICAvLyBNb3ZlIHRoZSBjYXJldCB0byB0aGUgbmV3IGxpXG4gICAgICAgICAgbW92ZUNhcmV0KG5ld0xpc3RJdGVtWzBdLCB0cnVlKVxuXG4gICAgICAgICAgLy8gVXBkYXRlIHRoZSBjb250ZW50XG4gICAgICAgICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIGdldExhc3ROb3RFbXB0eU5vZGU6IGZ1bmN0aW9uIChub2Rlcykge1xuXG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG5vZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChub2Rlc1tpXS5ub2RlVHlwZSA9PSAzICYmICFub2Rlc1tpXS5sZW5ndGgpXG4gICAgICAgICAgbm9kZXMuc3BsaWNlKGksIDEpXG4gICAgICB9XG5cbiAgICAgIHJldHVybiBub2Rlc1tub2Rlcy5sZW5ndGggLSAxXVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICByZW1vdmVMaXN0SXRlbTogZnVuY3Rpb24gKCkge1xuXG4gICAgICAvLyBHZXQgdGhlIHNlbGVjdGVkIGxpc3RJdGVtXG4gICAgICBsZXQgbGlzdEl0ZW0gPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpLnBhcmVudCgnbGknKVxuXG4gICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgLy8gQWRkIGEgZW1wdHkgcGFyYWdyYXBoIGFmdGVyIHRoZSBsaXN0XG4gICAgICAgIGxldCBuZXdQID0gJCgnPHA+PGJyPjwvcD4nKVxuICAgICAgICBsaXN0SXRlbS5wYXJlbnQoKS5hZnRlcihuZXdQKVxuXG4gICAgICAgIC8vIENoZWNrIGlmIHRoZSBsaXN0IGhhcyBleGFjdGx5IG9uZSBjaGlsZCByZW1vdmUgdGhlIGxpc3RcbiAgICAgICAgaWYgKGxpc3RJdGVtLnBhcmVudCgpLmNoaWxkcmVuKCdsaScpLmxlbmd0aCA9PSAxKSB7XG4gICAgICAgICAgbGV0IGxpc3QgPSBsaXN0SXRlbS5wYXJlbnQoKVxuICAgICAgICAgIGxpc3QucmVtb3ZlKClcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIElmIHRoZSBsaXN0IGhhcyBtb3JlIGNoaWxkcmVuIHJlbW92ZSB0aGUgc2VsZWN0ZWQgY2hpbGRcbiAgICAgICAgZWxzZVxuICAgICAgICAgIGxpc3RJdGVtLnJlbW92ZSgpXG5cbiAgICAgICAgbW92ZUNhcmV0KG5ld1BbMF0pXG5cbiAgICAgICAgLy8gVXBkYXRlIHRoZSBjb250ZW50XG4gICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuICAgICAgfSlcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgbmVzdDogZnVuY3Rpb24gKCkge1xuXG4gICAgICBsZXQgcCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcbiAgICAgIGxldCBsaXN0SXRlbSA9IHAucGFyZW50KCdsaScpXG5cbiAgICAgIC8vIENoZWNrIGlmIHRoZSBjdXJyZW50IGxpIGhhcyBhdCBsZWFzdCBvbmUgcHJldmlvdXMgZWxlbWVudFxuICAgICAgaWYgKGxpc3RJdGVtLnByZXZBbGwoKS5sZW5ndGggPiAwKSB7XG5cbiAgICAgICAgLy8gQ3JlYXRlIHRoZSBuZXcgbGlzdFxuICAgICAgICBsZXQgdGV4dCA9ICc8YnI+J1xuXG4gICAgICAgIGlmIChwLnRleHQoKS50cmltKCkubGVuZ3RoKVxuICAgICAgICAgIHRleHQgPSBwLnRleHQoKS50cmltKClcblxuICAgICAgICAvLyBHZXQgdHlwZSBvZiB0aGUgcGFyZW50IGxpc3RcbiAgICAgICAgbGV0IHR5cGUgPSBsaXN0SXRlbS5wYXJlbnQoKVswXS50YWdOYW1lLnRvTG93ZXJDYXNlKClcblxuICAgICAgICAvLyBDcmVhdGUgdGhlIG5ldyBuZXN0ZWQgbGlzdFxuICAgICAgICBsZXQgbmV3TGlzdEl0ZW0gPSAkKGxpc3RJdGVtWzBdLm91dGVySFRNTClcblxuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICAvLyBJZiB0aGUgcHJldmlvdXMgZWxlbWVudCBoYXMgYSBsaXN0XG4gICAgICAgICAgaWYgKGxpc3RJdGVtLnByZXYoKS5maW5kKCd1bCxvbCcpLmxlbmd0aClcbiAgICAgICAgICAgIGxpc3RJdGVtLnByZXYoKS5maW5kKCd1bCxvbCcpLmFwcGVuZChuZXdMaXN0SXRlbSlcblxuICAgICAgICAgIC8vIEFkZCB0aGUgbmV3IGxpc3QgaW5zaWRlIHRoZSBwcmV2aW91cyBsaVxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgbmV3TGlzdEl0ZW0gPSAkKGA8JHt0eXBlfT4ke25ld0xpc3RJdGVtWzBdLm91dGVySFRNTH08LyR7dHlwZX0+YClcbiAgICAgICAgICAgIGxpc3RJdGVtLnByZXYoKS5hcHBlbmQobmV3TGlzdEl0ZW0pXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgbGlzdEl0ZW0ucmVtb3ZlKClcblxuICAgICAgICAgIC8vIE1vdmUgdGhlIGNhcmV0IGF0IHRoZSBlbmQgb2YgdGhlIG5ldyBwIFxuICAgICAgICAgIG1vdmVDYXJldChuZXdMaXN0SXRlbS5maW5kKCdwJylbMF0pXG5cbiAgICAgICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgZGVOZXN0OiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgIGxldCBsaXN0SXRlbSA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSkucGFyZW50KCdsaScpXG4gICAgICBsZXQgbGlzdCA9IGxpc3RJdGVtLnBhcmVudCgpXG5cbiAgICAgIC8vIENoZWNrIGlmIHRoZSBjdXJyZW50IGxpc3QgaGFzIGF0IGxlYXN0IGFub3RoZXIgbGlzdCBhcyBwYXJlbnRcbiAgICAgIGlmIChsaXN0SXRlbS5wYXJlbnRzKCd1bCxvbCcpLmxlbmd0aCA+IDEpIHtcblxuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICAvLyBHZXQgYWxsIGxpOiBjdXJyZW50IGFuZCBpZiB0aGVyZSBhcmUgc3VjY2Vzc2l2ZVxuICAgICAgICAgIGxldCBuZXh0TGkgPSBbbGlzdEl0ZW1dXG4gICAgICAgICAgaWYgKGxpc3RJdGVtLm5leHRBbGwoKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBsaXN0SXRlbS5uZXh0QWxsKCkuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgIG5leHRMaS5wdXNoKCQodGhpcykpXG4gICAgICAgICAgICB9KVxuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIE1vdmUgYWxsIGxpIG91dCBmcm9tIHRoZSBuZXN0ZWQgbGlzdFxuICAgICAgICAgIGZvciAobGV0IGkgPSBuZXh0TGkubGVuZ3RoIC0gMTsgaSA+IC0xOyBpLS0pIHtcbiAgICAgICAgICAgIG5leHRMaVtpXS5yZW1vdmUoKVxuICAgICAgICAgICAgbGlzdC5wYXJlbnQoKS5hZnRlcihuZXh0TGlbaV0pXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gSWYgZW1wdHkgcmVtb3ZlIHRoZSBsaXN0XG4gICAgICAgICAgaWYgKCFsaXN0LmNoaWxkcmVuKCdsaScpLmxlbmd0aClcbiAgICAgICAgICAgIGxpc3QucmVtb3ZlKClcblxuICAgICAgICAgIC8vIE1vdmUgdGhlIGNhcmV0IGF0IHRoZSBlbmRcbiAgICAgICAgICBtb3ZlQ2FyZXQobGlzdEl0ZW0uZmluZCgncCcpWzBdKVxuICAgICAgICB9KVxuICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBhZGRQYXJhZ3JhcGg6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgLy8gR2V0IHJlZmVyZW5jZXMgb2YgY3VycmVudCBwXG4gICAgICBsZXQgcCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcbiAgICAgIGxldCBzdGFydE9mZnNldCA9IHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRSbmcoKS5zdGFydE9mZnNldFxuICAgICAgbGV0IHBUZXh0ID0gcC50ZXh0KCkudHJpbSgpXG5cbiAgICAgIGxldCB0ZXh0ID0gJzxicj4nXG5cbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAvLyBJZiB0aGUgRU5URVIgYnJlYWtzIHBcbiAgICAgICAgaWYgKHN0YXJ0T2Zmc2V0ICE9IHBUZXh0Lmxlbmd0aCkge1xuXG4gICAgICAgICAgLy8gVXBkYXRlIHRoZSB0ZXh0IG9mIHRoZSBjdXJyZW50IGxpXG4gICAgICAgICAgcC50ZXh0KHBUZXh0LnN1YnN0cmluZygwLCBzdGFydE9mZnNldCkpXG5cbiAgICAgICAgICAvLyBHZXQgdGhlIHJlbWFpbmluZyB0ZXh0XG4gICAgICAgICAgdGV4dCA9IHBUZXh0LnN1YnN0cmluZyhzdGFydE9mZnNldCwgcFRleHQubGVuZ3RoKVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ3JlYXRlIGFuZCBhZGQgdGhlIGVsZW1lbnRcbiAgICAgICAgbGV0IG5ld1AgPSAkKGA8cD4ke3RleHR9PC9wPmApXG4gICAgICAgIHAuYWZ0ZXIobmV3UClcblxuICAgICAgICBtb3ZlQ2FyZXQobmV3UFswXSwgdHJ1ZSlcbiAgICAgIH0pXG4gICAgfVxuICB9XG59KSIsIi8qKlxuICogXG4gKi9cblxuZnVuY3Rpb24gb3Blbk1ldGFkYXRhRGlhbG9nKCkge1xuICB0aW55bWNlLmFjdGl2ZUVkaXRvci53aW5kb3dNYW5hZ2VyLm9wZW4oe1xuICAgIHRpdGxlOiAnRWRpdCBtZXRhZGF0YScsXG4gICAgdXJsOiAnanMvcmFqZS1jb3JlL3BsdWdpbi9yYWplX21ldGFkYXRhLmh0bWwnLFxuICAgIHdpZHRoOiA5NTAsXG4gICAgaGVpZ2h0OiA4MDAsXG4gICAgb25DbG9zZTogZnVuY3Rpb24gKCkge1xuXG4gICAgICBpZiAodGlueW1jZS5hY3RpdmVFZGl0b3IudXBkYXRlZF9tZXRhZGF0YSAhPSBudWxsKSB7XG5cbiAgICAgICAgbWV0YWRhdGEudXBkYXRlKHRpbnltY2UuYWN0aXZlRWRpdG9yLnVwZGF0ZWRfbWV0YWRhdGEpXG5cbiAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudXBkYXRlZF9tZXRhZGF0YSA9PSBudWxsXG4gICAgICB9XG5cbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLndpbmRvd01hbmFnZXIuY2xvc2UoKVxuICAgIH1cbiAgfSwgbWV0YWRhdGEuZ2V0QWxsTWV0YWRhdGEoKSlcbn1cblxudGlueW1jZS5QbHVnaW5NYW5hZ2VyLmFkZCgncmFqZV9tZXRhZGF0YScsIGZ1bmN0aW9uIChlZGl0b3IsIHVybCkge1xuXG4gIC8vIEFkZCBhIGJ1dHRvbiB0aGF0IGhhbmRsZSB0aGUgaW5saW5lIGVsZW1lbnRcbiAgZWRpdG9yLmFkZEJ1dHRvbigncmFqZV9tZXRhZGF0YScsIHtcbiAgICB0ZXh0OiAnTWV0YWRhdGEnLFxuICAgIGljb246IGZhbHNlLFxuICAgIHRvb2x0aXA6ICdFZGl0IG1ldGFkYXRhJyxcblxuICAgIC8vIEJ1dHRvbiBiZWhhdmlvdXJcbiAgICBvbmNsaWNrOiBmdW5jdGlvbiAoKSB7XG4gICAgICBvcGVuTWV0YWRhdGFEaWFsb2coKVxuICAgIH1cbiAgfSlcblxuICBlZGl0b3Iub24oJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcbiAgICBpZiAoJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKS5pcyhIRUFERVJfU0VMRUNUT1IpKVxuICAgICAgb3Blbk1ldGFkYXRhRGlhbG9nKClcbiAgfSlcblxuICBtZXRhZGF0YSA9IHtcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIGdldEFsbE1ldGFkYXRhOiBmdW5jdGlvbiAoKSB7XG4gICAgICBsZXQgaGVhZGVyID0gJChIRUFERVJfU0VMRUNUT1IpXG4gICAgICBsZXQgc3VidGl0bGUgPSBoZWFkZXIuZmluZCgnaDEudGl0bGUgPiBzbWFsbCcpLnRleHQoKVxuICAgICAgbGV0IGRhdGEgPSB7XG4gICAgICAgIHN1YnRpdGxlOiBzdWJ0aXRsZSxcbiAgICAgICAgdGl0bGU6IGhlYWRlci5maW5kKCdoMS50aXRsZScpLnRleHQoKS5yZXBsYWNlKHN1YnRpdGxlLCAnJyksXG4gICAgICAgIGF1dGhvcnM6IG1ldGFkYXRhLmdldEF1dGhvcnMoaGVhZGVyKSxcbiAgICAgICAgY2F0ZWdvcmllczogbWV0YWRhdGEuZ2V0Q2F0ZWdvcmllcyhoZWFkZXIpLFxuICAgICAgICBrZXl3b3JkczogbWV0YWRhdGEuZ2V0S2V5d29yZHMoaGVhZGVyKVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gZGF0YVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBnZXRBdXRob3JzOiBmdW5jdGlvbiAoaGVhZGVyKSB7XG4gICAgICBsZXQgYXV0aG9ycyA9IFtdXG5cbiAgICAgIGhlYWRlci5maW5kKCdhZGRyZXNzLmxlYWQuYXV0aG9ycycpLmVhY2goZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIC8vIEdldCBhbGwgYWZmaWxpYXRpb25zXG4gICAgICAgIGxldCBhZmZpbGlhdGlvbnMgPSBbXVxuICAgICAgICAkKHRoaXMpLmZpbmQoJ3NwYW4nKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBhZmZpbGlhdGlvbnMucHVzaCgkKHRoaXMpLnRleHQoKSlcbiAgICAgICAgfSlcblxuICAgICAgICAvLyBwdXNoIHNpbmdsZSBhdXRob3JcbiAgICAgICAgYXV0aG9ycy5wdXNoKHtcbiAgICAgICAgICBuYW1lOiAkKHRoaXMpLmNoaWxkcmVuKCdzdHJvbmcuYXV0aG9yX25hbWUnKS50ZXh0KCksXG4gICAgICAgICAgZW1haWw6ICQodGhpcykuZmluZCgnY29kZS5lbWFpbCA+IGEnKS50ZXh0KCksXG4gICAgICAgICAgYWZmaWxpYXRpb25zOiBhZmZpbGlhdGlvbnNcbiAgICAgICAgfSlcbiAgICAgIH0pXG5cbiAgICAgIHJldHVybiBhdXRob3JzXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIGdldENhdGVnb3JpZXM6IGZ1bmN0aW9uIChoZWFkZXIpIHtcbiAgICAgIGxldCBjYXRlZ29yaWVzID0gW11cblxuICAgICAgaGVhZGVyLmZpbmQoJ3AuYWNtX3N1YmplY3RfY2F0ZWdvcmllcyA+IGNvZGUnKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY2F0ZWdvcmllcy5wdXNoKCQodGhpcykudGV4dCgpKVxuICAgICAgfSlcblxuICAgICAgcmV0dXJuIGNhdGVnb3JpZXNcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgZ2V0S2V5d29yZHM6IGZ1bmN0aW9uIChoZWFkZXIpIHtcbiAgICAgIGxldCBrZXl3b3JkcyA9IFtdXG5cbiAgICAgIGhlYWRlci5maW5kKCd1bC5saXN0LWlubGluZSA+IGxpID4gY29kZScpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICBrZXl3b3Jkcy5wdXNoKCQodGhpcykudGV4dCgpKVxuICAgICAgfSlcblxuICAgICAgcmV0dXJuIGtleXdvcmRzXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIHVwZGF0ZTogZnVuY3Rpb24gKHVwZGF0ZWRNZXRhZGF0YSkge1xuXG4gICAgICAkKCdoZWFkIG1ldGFbcHJvcGVydHldLCBoZWFkIGxpbmtbcHJvcGVydHldLCBoZWFkIG1ldGFbbmFtZV0nKS5yZW1vdmUoKVxuXG4gICAgICBsZXQgY3VycmVudE1ldGFkYXRhID0gbWV0YWRhdGEuZ2V0QWxsTWV0YWRhdGEoKVxuXG4gICAgICAvLyBVcGRhdGUgdGl0bGUgYW5kIHN1YnRpdGxlXG4gICAgICBpZiAodXBkYXRlZE1ldGFkYXRhLnRpdGxlICE9IGN1cnJlbnRNZXRhZGF0YS50aXRsZSB8fCB1cGRhdGVkTWV0YWRhdGEuc3VidGl0bGUgIT0gY3VycmVudE1ldGFkYXRhLnN1YnRpdGxlKSB7XG4gICAgICAgIGxldCB0ZXh0ID0gdXBkYXRlZE1ldGFkYXRhLnRpdGxlXG5cbiAgICAgICAgaWYgKHVwZGF0ZWRNZXRhZGF0YS5zdWJ0aXRsZS50cmltKCkubGVuZ3RoKVxuICAgICAgICAgIHRleHQgKz0gYCAtLSAke3VwZGF0ZWRNZXRhZGF0YS5zdWJ0aXRsZX1gXG5cbiAgICAgICAgJCgndGl0bGUnKS50ZXh0KHRleHQpXG4gICAgICB9XG5cbiAgICAgIGxldCBhZmZpbGlhdGlvbnNDYWNoZSA9IFtdXG5cbiAgICAgIHVwZGF0ZWRNZXRhZGF0YS5hdXRob3JzLmZvckVhY2goZnVuY3Rpb24gKGF1dGhvcikge1xuXG4gICAgICAgICQoJ2hlYWQnKS5hcHBlbmQoYDxtZXRhIGFib3V0PVwibWFpbHRvOiR7YXV0aG9yLmVtYWlsfVwiIHR5cGVvZj1cInNjaGVtYTpQZXJzb25cIiBwcm9wZXJ0eT1cInNjaGVtYTpuYW1lXCIgbmFtZT1cImRjLmNyZWF0b3JcIiBjb250ZW50PVwiJHthdXRob3IubmFtZX1cIj5gKVxuICAgICAgICAkKCdoZWFkJykuYXBwZW5kKGA8bWV0YSBhYm91dD1cIm1haWx0bzoke2F1dGhvci5lbWFpbH1cIiBwcm9wZXJ0eT1cInNjaGVtYTplbWFpbFwiIGNvbnRlbnQ9XCIke2F1dGhvci5lbWFpbH1cIj5gKVxuXG4gICAgICAgIGF1dGhvci5hZmZpbGlhdGlvbnMuZm9yRWFjaChmdW5jdGlvbiAoYWZmaWxpYXRpb24pIHtcblxuICAgICAgICAgIC8vIExvb2sgdXAgZm9yIGFscmVhZHkgZXhpc3RpbmcgYWZmaWxpYXRpb25cbiAgICAgICAgICBsZXQgdG9BZGQgPSB0cnVlXG4gICAgICAgICAgbGV0IGlkXG5cbiAgICAgICAgICBhZmZpbGlhdGlvbnNDYWNoZS5mb3JFYWNoKGZ1bmN0aW9uIChhZmZpbGlhdGlvbkNhY2hlKSB7XG4gICAgICAgICAgICBpZiAoYWZmaWxpYXRpb25DYWNoZS5jb250ZW50ID09IGFmZmlsaWF0aW9uKSB7XG4gICAgICAgICAgICAgIHRvQWRkID0gZmFsc2VcbiAgICAgICAgICAgICAgaWQgPSBhZmZpbGlhdGlvbkNhY2hlLmlkXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSlcblxuICAgICAgICAgIC8vIElmIHRoZXJlIGlzIG5vIGV4aXN0aW5nIGFmZmlsaWF0aW9uLCBhZGQgaXRcbiAgICAgICAgICBpZiAodG9BZGQpIHtcbiAgICAgICAgICAgIGxldCBnZW5lcmF0ZWRJZCA9IGAjYWZmaWxpYXRpb25fJHthZmZpbGlhdGlvbnNDYWNoZS5sZW5ndGgrMX1gXG4gICAgICAgICAgICBhZmZpbGlhdGlvbnNDYWNoZS5wdXNoKHtcbiAgICAgICAgICAgICAgaWQ6IGdlbmVyYXRlZElkLFxuICAgICAgICAgICAgICBjb250ZW50OiBhZmZpbGlhdGlvblxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIGlkID0gZ2VuZXJhdGVkSWRcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAkKCdoZWFkJykuYXBwZW5kKGA8bGluayBhYm91dD1cIm1haWx0bzoke2F1dGhvci5lbWFpbH1cIiBwcm9wZXJ0eT1cInNjaGVtYTphZmZpbGlhdGlvblwiIGhyZWY9XCIke2lkfVwiPmApXG4gICAgICAgIH0pXG4gICAgICB9KVxuXG4gICAgICBhZmZpbGlhdGlvbnNDYWNoZS5mb3JFYWNoKGZ1bmN0aW9uIChhZmZpbGlhdGlvbkNhY2hlKSB7XG4gICAgICAgICQoJ2hlYWQnKS5hcHBlbmQoYDxtZXRhIGFib3V0PVwiJHthZmZpbGlhdGlvbkNhY2hlLmlkfVwiIHR5cGVvZj1cInNjaGVtYTpPcmdhbml6YXRpb25cIiBwcm9wZXJ0eT1cInNjaGVtYTpuYW1lXCIgY29udGVudD1cIiR7YWZmaWxpYXRpb25DYWNoZS5jb250ZW50fVwiPmApXG4gICAgICB9KVxuXG4gICAgICB1cGRhdGVkTWV0YWRhdGEuY2F0ZWdvcmllcy5mb3JFYWNoKGZ1bmN0aW9uKGNhdGVnb3J5KXtcbiAgICAgICAgJCgnaGVhZCcpLmFwcGVuZChgPG1ldGEgbmFtZT1cImRjdGVybXMuc3ViamVjdFwiIGNvbnRlbnQ9XCIke2NhdGVnb3J5fVwiLz5gKVxuICAgICAgfSlcblxuICAgICAgdXBkYXRlZE1ldGFkYXRhLmtleXdvcmRzLmZvckVhY2goZnVuY3Rpb24oa2V5d29yZCl7XG4gICAgICAgICQoJ2hlYWQnKS5hcHBlbmQoYDxtZXRhIHByb3BlcnR5PVwicHJpc206a2V5d29yZFwiIGNvbnRlbnQ9XCIke2tleXdvcmR9XCIvPmApXG4gICAgICB9KVxuXG4gICAgICAkKCcjcmFqZV9yb290JykuYWRkSGVhZGVySFRNTCgpXG4gICAgICBzZXROb25FZGl0YWJsZUhlYWRlcigpXG4gICAgICB1cGRhdGVJZnJhbWVGcm9tU2F2ZWRDb250ZW50KClcbiAgICB9XG4gIH1cblxufSkiLCJ0aW55bWNlLlBsdWdpbk1hbmFnZXIuYWRkKCdyYWplX3NhdmUnLCBmdW5jdGlvbiAoZWRpdG9yLCB1cmwpIHtcblxuICBzYXZlTWFuYWdlciA9IHtcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIGluaXRTYXZlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAvLyBSZXR1cm4gdGhlIG1lc3NhZ2UgZm9yIHRoZSBiYWNrZW5kXG4gICAgICByZXR1cm4ge1xuICAgICAgICB0aXRsZTogc2F2ZU1hbmFnZXIuZ2V0VGl0bGUoKSxcbiAgICAgICAgZG9jdW1lbnQ6IHNhdmVNYW5hZ2VyLmdldERlcmFzaGVkQXJ0aWNsZSgpXG4gICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIHNhdmVBczogZnVuY3Rpb24gKCkge1xuXG4gICAgICAvLyBTZW5kIG1lc3NhZ2UgdG8gdGhlIGJhY2tlbmRcbiAgICAgIHNhdmVBc0FydGljbGUoc2F2ZU1hbmFnZXIuaW5pdFNhdmUoKSlcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgc2F2ZTogZnVuY3Rpb24gKCkge1xuXG4gICAgICAvLyBTZW5kIG1lc3NhZ2UgdG8gdGhlIGJhY2tlbmRcbiAgICAgIHNhdmVBcnRpY2xlKHNhdmVNYW5hZ2VyLmluaXRTYXZlKCkpXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJldHVybiB0aGUgUkFTSCBhcnRpY2xlIHJlbmRlcmVkICh3aXRob3V0IHRpbnltY2UpXG4gICAgICovXG4gICAgZ2V0RGVyYXNoZWRBcnRpY2xlOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgIC8vIFNhdmUgaHRtbCByZWZlcmVuY2VzXG4gICAgICBsZXQgYXJ0aWNsZSA9ICQoJ2h0bWwnKS5jbG9uZSgpXG4gICAgICBsZXQgdGlueW1jZVNhdmVkQ29udGVudCA9IGFydGljbGUuZmluZCgnI3JhamVfcm9vdCcpXG5cbiAgICAgIGFydGljbGUucmVtb3ZlQXR0cignY2xhc3MnKVxuXG4gICAgICAvL3JlcGxhY2UgYm9keSB3aXRoIHRoZSByaWdodCBvbmUgKHRoaXMgYWN0aW9uIHJlbW92ZSB0aW55bWNlKVxuICAgICAgYXJ0aWNsZS5maW5kKCdib2R5JykuaHRtbCh0aW55bWNlU2F2ZWRDb250ZW50Lmh0bWwoKSlcbiAgICAgIGFydGljbGUuZmluZCgnYm9keScpLnJlbW92ZUF0dHIoJ3N0eWxlJylcbiAgICAgIGFydGljbGUuZmluZCgnYm9keScpLnJlbW92ZUF0dHIoJ2NsYXNzJylcblxuICAgICAgLy9yZW1vdmUgYWxsIHN0eWxlIGFuZCBsaW5rIHVuLW5lZWRlZCBmcm9tIHRoZSBoZWFkXG4gICAgICBhcnRpY2xlLmZpbmQoJ2hlYWQnKS5jaGlsZHJlbignc3R5bGVbdHlwZT1cInRleHQvY3NzXCJdJykucmVtb3ZlKClcbiAgICAgIGFydGljbGUuZmluZCgnaGVhZCcpLmNoaWxkcmVuKCdsaW5rW2lkXScpLnJlbW92ZSgpXG5cbiAgICAgIC8vIEV4ZWN1dGUgZGVyYXNoIChyZXBsYWNlIGFsbCBjZ2VuIGVsZW1lbnRzIHdpdGggaXRzIG9yaWdpbmFsIGNvbnRlbnQpXG4gICAgICBhcnRpY2xlLmZpbmQoJypbZGF0YS1yYXNoLW9yaWdpbmFsLWNvbnRlbnRdJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIGxldCBvcmlnaW5hbENvbnRlbnQgPSAkKHRoaXMpLmF0dHIoJ2RhdGEtcmFzaC1vcmlnaW5hbC1jb250ZW50JylcbiAgICAgICAgJCh0aGlzKS5yZXBsYWNlV2l0aChvcmlnaW5hbENvbnRlbnQpXG4gICAgICB9KVxuXG4gICAgICAvLyBFeGVjdXRlIGRlcmFzaCBjaGFuZ2luZyB0aGUgd3JhcHBlclxuICAgICAgYXJ0aWNsZS5maW5kKCcqW2RhdGEtcmFzaC1vcmlnaW5hbC13cmFwcGVyXScpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICBsZXQgY29udGVudCA9ICQodGhpcykuaHRtbCgpXG4gICAgICAgIGxldCB3cmFwcGVyID0gJCh0aGlzKS5hdHRyKCdkYXRhLXJhc2gtb3JpZ2luYWwtd3JhcHBlcicpXG4gICAgICAgICQodGhpcykucmVwbGFjZVdpdGgoYDwke3dyYXBwZXJ9PiR7Y29udGVudH08LyR7d3JhcHBlcn0+YClcbiAgICAgIH0pXG5cbiAgICAgIC8vIFJlbW92ZSB0YXJnZXQgZnJvbSBUaW55TUNFIGxpbmtcbiAgICAgIGFydGljbGUuZmluZCgnYVt0YXJnZXRdJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICQodGhpcykucmVtb3ZlQXR0cigndGFyZ2V0JylcbiAgICAgIH0pXG5cbiAgICAgIC8vIFJlbW92ZSBjb250ZW50ZWRpdGFibGUgZnJvbSBUaW55TUNFIGxpbmtcbiAgICAgIGFydGljbGUuZmluZCgnYVtjb250ZW50ZWRpdGFibGVdJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICQodGhpcykucmVtb3ZlQXR0cignY29udGVudGVkaXRhYmxlJylcbiAgICAgIH0pXG5cbiAgICAgIC8vIFJlbW92ZSBub3QgYWxsb3dlZCBzcGFuIGVsbWVudHMgaW5zaWRlIHRoZSBmb3JtdWxhXG4gICAgICBhcnRpY2xlLmZpbmQoRklHVVJFX0ZPUk1VTEFfU0VMRUNUT1IpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICAkKHRoaXMpLmNoaWxkcmVuKCdwJykuaHRtbCgkKHRoaXMpLmZpbmQoJ3NwYW5bY29udGVudGVkaXRhYmxlXScpLmh0bWwoKSlcbiAgICAgIH0pXG5cbiAgICAgIGFydGljbGUuZmluZChgJHtGSUdVUkVfRk9STVVMQV9TRUxFQ1RPUn0sJHtJTkxJTkVfRk9STVVMQV9TRUxFQ1RPUn1gKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCQodGhpcykuZmluZCgnc3ZnW2RhdGEtbWF0aG1sXScpLmxlbmd0aCkge1xuICAgICAgICAgICQodGhpcykuY2hpbGRyZW4oJ3AnKS5odG1sKCQodGhpcykuZmluZCgnc3ZnW2RhdGEtbWF0aG1sXScpLmF0dHIoJ2RhdGEtbWF0aG1sJykpXG4gICAgICAgIH1cbiAgICAgIH0pXG5cbiAgICAgIC8vIFJlcGxhY2UgdGJvZHkgd2l0aCBpdHMgY29udGVudCAjXG4gICAgICBhcnRpY2xlLmZpbmQoJ3Rib2R5JykuZWFjaChmdW5jdGlvbigpe1xuICAgICAgICAkKHRoaXMpLnJlcGxhY2VXaXRoKCQodGhpcykuaHRtbCgpKVxuICAgICAgfSlcblxuICAgICAgcmV0dXJuIG5ldyBYTUxTZXJpYWxpemVyKCkuc2VyaWFsaXplVG9TdHJpbmcoYXJ0aWNsZVswXSlcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0dXJuIHRoZSB0aXRsZSBcbiAgICAgKi9cbiAgICBnZXRUaXRsZTogZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuICQoJ3RpdGxlJykudGV4dCgpXG4gICAgfSxcblxuICB9XG59KSIsIi8qKlxuICogUkFTSCBzZWN0aW9uIHBsdWdpbiBSQUpFXG4gKi9cblxuY29uc3QgTk9OX0VESVRBQkxFX0hFQURFUl9TRUxFQ1RPUiA9ICdoZWFkZXIucGFnZS1oZWFkZXIuY29udGFpbmVyLmNnZW4nXG5jb25zdCBCSUJMSU9FTlRSWV9TVUZGSVggPSAnYmlibGlvZW50cnlfJ1xuY29uc3QgRU5ETk9URV9TVUZGSVggPSAnZW5kbm90ZV8nXG5cbmNvbnN0IEJJQkxJT0dSQVBIWV9TRUxFQ1RPUiA9ICdzZWN0aW9uW3JvbGU9ZG9jLWJpYmxpb2dyYXBoeV0nXG5jb25zdCBCSUJMSU9FTlRSWV9TRUxFQ1RPUiA9ICdsaVtyb2xlPWRvYy1iaWJsaW9lbnRyeV0nXG5cbmNvbnN0IEVORE5PVEVTX1NFTEVDVE9SID0gJ3NlY3Rpb25bcm9sZT1kb2MtZW5kbm90ZXNdJ1xuY29uc3QgRU5ETk9URV9TRUxFQ1RPUiA9ICdzZWN0aW9uW3JvbGU9ZG9jLWVuZG5vdGVdJ1xuXG5jb25zdCBBQlNUUkFDVF9TRUxFQ1RPUiA9ICdzZWN0aW9uW3JvbGU9ZG9jLWFic3RyYWN0XSdcbmNvbnN0IEFDS05PV0xFREdFTUVOVFNfU0VMRUNUT1IgPSAnc2VjdGlvbltyb2xlPWRvYy1hY2tub3dsZWRnZW1lbnRzXSdcblxuY29uc3QgTUFJTl9TRUNUSU9OX1NFTEVDVE9SID0gJ2RpdiNyYWplX3Jvb3QgPiBzZWN0aW9uOm5vdChbcm9sZV0pJ1xuY29uc3QgU0VDVElPTl9TRUxFQ1RPUiA9ICdzZWN0aW9uOm5vdChbcm9sZV0pJ1xuY29uc3QgU1BFQ0lBTF9TRUNUSU9OX1NFTEVDVE9SID0gJ3NlY3Rpb25bcm9sZV0nXG5cbmNvbnN0IE1FTlVfU0VMRUNUT1IgPSAnZGl2W2lkXj1tY2V1X11baWQkPS1ib2R5XVtyb2xlPW1lbnVdJ1xuXG5jb25zdCBEQVRBX1VQR1JBREUgPSAnZGF0YS11cGdyYWRlJ1xuY29uc3QgREFUQV9ET1dOR1JBREUgPSAnZGF0YS1kb3duZ3JhZGUnXG5cbmNvbnN0IEhFQURJTkcgPSAnSGVhZGluZyAnXG5cbmNvbnN0IEhFQURJTkdfVFJBU0ZPUk1BVElPTl9GT1JCSURERU4gPSAnRXJyb3IsIHlvdSBjYW5ub3QgdHJhbnNmb3JtIHRoZSBjdXJyZW50IGhlYWRlciBpbiB0aGlzIHdheSEnXG5cbnRpbnltY2UuUGx1Z2luTWFuYWdlci5hZGQoJ3JhamVfc2VjdGlvbicsIGZ1bmN0aW9uIChlZGl0b3IsIHVybCkge1xuXG4gIGxldCByYWplX3NlY3Rpb25fZmxhZyA9IGZhbHNlXG4gIGxldCByYWplX3N0b3JlZF9zZWxlY3Rpb25cblxuICBlZGl0b3IuYWRkQnV0dG9uKCdyYWplX3NlY3Rpb24nLCB7XG4gICAgdHlwZTogJ21lbnVidXR0b24nLFxuICAgIHRleHQ6ICdIZWFkaW5ncycsXG4gICAgdGl0bGU6ICdoZWFkaW5nJyxcbiAgICBpY29uczogZmFsc2UsXG5cbiAgICAvLyBTZWN0aW9ucyBzdWIgbWVudVxuICAgIG1lbnU6IFt7XG4gICAgICB0ZXh0OiBgJHtIRUFESU5HfTEuYCxcbiAgICAgIG9uY2xpY2s6IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIHNlY3Rpb24uYWRkT3JEb3duVXBncmFkZShlLCAxKVxuICAgICAgfVxuICAgIH0sIHtcbiAgICAgIHRleHQ6IGAke0hFQURJTkd9MS4xLmAsXG4gICAgICBvbmNsaWNrOiBmdW5jdGlvbiAoZSkge1xuICAgICAgICBzZWN0aW9uLmFkZE9yRG93blVwZ3JhZGUoZSwgMilcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICB0ZXh0OiBgJHtIRUFESU5HfTEuMS4xLmAsXG4gICAgICBvbmNsaWNrOiBmdW5jdGlvbiAoZSkge1xuICAgICAgICBzZWN0aW9uLmFkZE9yRG93blVwZ3JhZGUoZSwgMylcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICB0ZXh0OiBgJHtIRUFESU5HfTEuMS4xLjEuYCxcbiAgICAgIG9uY2xpY2s6IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIHNlY3Rpb24uYWRkT3JEb3duVXBncmFkZShlLCA0KVxuICAgICAgfVxuICAgIH0sIHtcbiAgICAgIHRleHQ6IGAke0hFQURJTkd9MS4xLjEuMS4xLmAsXG4gICAgICBvbmNsaWNrOiBmdW5jdGlvbiAoZSkge1xuICAgICAgICBzZWN0aW9uLmFkZE9yRG93blVwZ3JhZGUoZSwgNSlcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICB0ZXh0OiBgJHtIRUFESU5HfTEuMS4xLjEuMS4xLmAsXG4gICAgICBvbmNsaWNrOiBmdW5jdGlvbiAoZSkge1xuICAgICAgICBzZWN0aW9uLmFkZE9yRG93blVwZ3JhZGUoZSwgNilcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICB0ZXh0OiAnU3BlY2lhbCcsXG4gICAgICBtZW51OiBbe1xuICAgICAgICAgIHRleHQ6ICdBYnN0cmFjdCcsXG4gICAgICAgICAgb25jbGljazogZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgICBzZWN0aW9uLmFkZEFic3RyYWN0KClcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICB0ZXh0OiAnQWNrbm93bGVkZ2VtZW50cycsXG4gICAgICAgICAgb25jbGljazogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VjdGlvbi5hZGRBY2tub3dsZWRnZW1lbnRzKClcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICB0ZXh0OiAnUmVmZXJlbmNlcycsXG4gICAgICAgICAgb25jbGljazogZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcblxuICAgICAgICAgICAgLy8gT25seSBpZiBiaWJsaW9ncmFwaHkgc2VjdGlvbiBkb2Vzbid0IGV4aXN0c1xuICAgICAgICAgICAgaWYgKCEkKEJJQkxJT0dSQVBIWV9TRUxFQ1RPUikubGVuZ3RoKSB7XG5cbiAgICAgICAgICAgICAgLy8gVE9ETyBjaGFuZ2UgaGVyZVxuICAgICAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgLy8gQWRkIG5ldyBiaWJsaW9lbnRyeVxuICAgICAgICAgICAgICAgIHNlY3Rpb24uYWRkQmlibGlvZW50cnkoKVxuXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIGlmcmFtZVxuICAgICAgICAgICAgICAgIHVwZGF0ZUlmcmFtZUZyb21TYXZlZENvbnRlbnQoKVxuXG4gICAgICAgICAgICAgICAgLy9tb3ZlIGNhcmV0IGFuZCBzZXQgZm9jdXMgdG8gYWN0aXZlIGFkaXRvciAjMTA1XG4gICAgICAgICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLnNlbGVjdCh0aW55bWNlLmFjdGl2ZUVkaXRvci5kb20uc2VsZWN0KGAke0JJQkxJT0VOVFJZX1NFTEVDVE9SfTpsYXN0LWNoaWxkYClbMF0sIHRydWUpXG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9IGVsc2VcbiAgICAgICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLnNlbGVjdCh0aW55bWNlLmFjdGl2ZUVkaXRvci5kb20uc2VsZWN0KGAke0JJQkxJT0dSQVBIWV9TRUxFQ1RPUn0+aDFgKVswXSlcblxuICAgICAgICAgICAgc2Nyb2xsVG8oYCR7QklCTElPRU5UUllfU0VMRUNUT1J9Omxhc3QtY2hpbGRgKVxuXG4gICAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5mb2N1cygpXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICBdXG4gICAgfV1cbiAgfSlcblxuICBlZGl0b3Iub24oJ2tleURvd24nLCBmdW5jdGlvbiAoZSkge1xuXG4gICAgLy8gaW5zdGFuY2Ugb2YgdGhlIHNlbGVjdGVkIGVsZW1lbnRcbiAgICBsZXQgc2VsZWN0ZWRFbGVtZW50ID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuXG4gICAgdHJ5IHtcblxuICAgICAgbGV0IGtleWNvZGUgPSBlLmtleUNvZGVcblxuICAgICAgLy8gU2F2ZSBib3VuZHMgb2YgY3VycmVudCBzZWxlY3Rpb24gKHN0YXJ0IGFuZCBlbmQpXG4gICAgICBsZXQgc3RhcnROb2RlID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Um5nKCkuc3RhcnRDb250YWluZXIpXG4gICAgICBsZXQgZW5kTm9kZSA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldFJuZygpLmVuZENvbnRhaW5lcilcblxuICAgICAgY29uc3QgU1BFQ0lBTF9DSEFSUyA9XG4gICAgICAgIChrZXljb2RlID4gNDcgJiYga2V5Y29kZSA8IDU4KSB8fCAvLyBudW1iZXIga2V5c1xuICAgICAgICAoa2V5Y29kZSA+IDk1ICYmIGtleWNvZGUgPCAxMTIpIHx8IC8vIG51bXBhZCBrZXlzXG4gICAgICAgIChrZXljb2RlID4gMTg1ICYmIGtleWNvZGUgPCAxOTMpIHx8IC8vIDs9LC0uL2AgKGluIG9yZGVyKVxuICAgICAgICAoa2V5Y29kZSA+IDIxOCAmJiBrZXljb2RlIDwgMjIzKTsgLy8gW1xcXScgKGluIG9yZGVyKVxuXG4gICAgICAvLyBCbG9jayBzcGVjaWFsIGNoYXJzIGluIHNwZWNpYWwgZWxlbWVudHNcbiAgICAgIGlmIChTUEVDSUFMX0NIQVJTICYmXG4gICAgICAgIChzdGFydE5vZGUucGFyZW50cyhTUEVDSUFMX1NFQ1RJT05fU0VMRUNUT1IpLmxlbmd0aCB8fCBlbmROb2RlLnBhcmVudHMoU1BFQ0lBTF9TRUNUSU9OX1NFTEVDVE9SKS5sZW5ndGgpICYmXG4gICAgICAgIChzdGFydE5vZGUucGFyZW50cygnaDEnKS5sZW5ndGggPiAwIHx8IGVuZE5vZGUucGFyZW50cygnaDEnKS5sZW5ndGggPiAwKSlcbiAgICAgICAgcmV0dXJuIGZhbHNlXG5cbiAgICAgIC8vICMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuICAgICAgLy8gIyMjIEJBQ0tTUEFDRSAmJiBDQU5DIFBSRVNTRUQgIyMjXG4gICAgICAvLyAjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiAgICAgIGlmIChlLmtleUNvZGUgPT0gOCB8fCBlLmtleUNvZGUgPT0gNDYpIHtcblxuICAgICAgICAvL2xldCB0b1JlbW92ZVNlY3Rpb25zID0gc2VjdGlvbi5nZXRTZWN0aW9uc2luU2VsZWN0aW9uKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbilcbiAgICAgICAgcmFqZV9zZWN0aW9uX2ZsYWcgPSB0cnVlXG5cbiAgICAgICAgLy8gUHJldmVudCByZW1vdmUgZnJvbSBoZWFkZXJcbiAgICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC5pcyhOT05fRURJVEFCTEVfSEVBREVSX1NFTEVDVE9SKSB8fFxuICAgICAgICAgIChzZWxlY3RlZEVsZW1lbnQuYXR0cignZGF0YS1tY2UtY2FyZXQnKSA9PSAnYWZ0ZXInICYmIHNlbGVjdGVkRWxlbWVudC5wYXJlbnQoKS5pcyhSQUpFX1NFTEVDVE9SKSkgfHxcbiAgICAgICAgICAoc2VsZWN0ZWRFbGVtZW50LmF0dHIoJ2RhdGEtbWNlLWNhcmV0JykgJiYgc2VsZWN0ZWRFbGVtZW50LnBhcmVudCgpLmlzKFJBSkVfU0VMRUNUT1IpKSA9PSAnYmVmb3JlJylcbiAgICAgICAgICByZXR1cm4gZmFsc2VcblxuICAgICAgICAvLyBJZiBzZWxlY3Rpb24gaXNuJ3QgY29sbGFwc2VkIG1hbmFnZSBkZWxldGVcbiAgICAgICAgaWYgKCF0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uaXNDb2xsYXBzZWQoKSkge1xuICAgICAgICAgIHJldHVybiBzZWN0aW9uLm1hbmFnZURlbGV0ZSgpXG4gICAgICAgIH1cblxuICAgICAgICAvLyBJZiBTRUxFQ1RJT04gU1RBUlRTIG9yIEVORFMgaW4gc3BlY2lhbCBzZWN0aW9uXG4gICAgICAgIGVsc2UgaWYgKHN0YXJ0Tm9kZS5wYXJlbnRzKFNQRUNJQUxfU0VDVElPTl9TRUxFQ1RPUikubGVuZ3RoIHx8IGVuZE5vZGUucGFyZW50cyhTUEVDSUFMX1NFQ1RJT05fU0VMRUNUT1IpLmxlbmd0aCkge1xuXG4gICAgICAgICAgbGV0IHN0YXJ0T2Zmc2V0ID0gdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldFJuZygpLnN0YXJ0T2Zmc2V0XG4gICAgICAgICAgbGV0IHN0YXJ0T2Zmc2V0Tm9kZSA9IDBcbiAgICAgICAgICBsZXQgZW5kT2Zmc2V0ID0gdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldFJuZygpLmVuZE9mZnNldFxuICAgICAgICAgIGxldCBlbmRPZmZzZXROb2RlID0gdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldFJuZygpLmVuZENvbnRhaW5lci5sZW5ndGhcblxuICAgICAgICAgIC8vIENvbXBsZXRlbHkgcmVtb3ZlIHRoZSBjdXJyZW50IHNwZWNpYWwgc2VjdGlvbiBpZiBpcyBlbnRpcmVseSBzZWxlY3RlZFxuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoZSBzZWxlY3Rpb24gY29udGFpbnMgdGhlIGVudGlyZSBzZWN0aW9uXG4gICAgICAgICAgICBzdGFydE9mZnNldCA9PSBzdGFydE9mZnNldE5vZGUgJiYgZW5kT2Zmc2V0ID09IGVuZE9mZnNldE5vZGUgJiZcblxuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIHNlbGVjdGlvbiBzdGFydHMgZnJvbSBoMVxuICAgICAgICAgICAgKHN0YXJ0Tm9kZS5wYXJlbnRzKCdoMScpLmxlbmd0aCAhPSBlbmROb2RlLnBhcmVudHMoJ2gxJykubGVuZ3RoKSAmJiAoc3RhcnROb2RlLnBhcmVudHMoJ2gxJykubGVuZ3RoIHx8IGVuZE5vZGUucGFyZW50cygnaDEnKS5sZW5ndGgpICYmXG5cbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoZSBzZWxlY3Rpb24gZW5kcyBpbiB0aGUgbGFzdCBjaGlsZFxuICAgICAgICAgICAgKHN0YXJ0Tm9kZS5wYXJlbnRzKFNQRUNJQUxfU0VDVElPTl9TRUxFQ1RPUikuY2hpbGRyZW4oKS5sZW5ndGggPT0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Um5nKCkuZW5kQ29udGFpbmVyKS5wYXJlbnRzVW50aWwoU1BFQ0lBTF9TRUNUSU9OX1NFTEVDVE9SKS5pbmRleCgpICsgMSkpIHtcblxuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIFJlbW92ZSB0aGUgY3VycmVudCBzcGVjaWFsIHNlY3Rpb24gaWYgc2VsZWN0aW9uIGlzIGF0IHRoZSBzdGFydCBvZiBoMSBBTkQgc2VsZWN0aW9uIGlzIGNvbGxhcHNlZCBcbiAgICAgICAgICBpZiAodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmlzQ29sbGFwc2VkKCkgJiYgKHN0YXJ0Tm9kZS5wYXJlbnRzKCdoMScpLmxlbmd0aCB8fCBzdGFydE5vZGUuaXMoJ2gxJykpICYmIHN0YXJ0T2Zmc2V0ID09IDApIHtcblxuICAgICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgICAgIC8vIFJlbW92ZSB0aGUgc2VjdGlvbiBhbmQgdXBkYXRlIFxuICAgICAgICAgICAgICBzZWxlY3RlZEVsZW1lbnQucGFyZW50KFNQRUNJQUxfU0VDVElPTl9TRUxFQ1RPUikucmVtb3ZlKClcbiAgICAgICAgICAgICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG5cbiAgICAgICAgICAgICAgLy8gVXBkYXRlIHJlZmVyZW5jZXNcbiAgICAgICAgICAgICAgdXBkYXRlUmVmZXJlbmNlcygpXG4gICAgICAgICAgICAgIHVwZGF0ZUlmcmFtZUZyb21TYXZlZENvbnRlbnQoKVxuICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gQ2hlayBpZiBpbnNpZGUgdGhlIHNlbGVjdGlvbiB0byByZW1vdmUsIHRoZXJlIGlzIGJpYmxpb2dyYXBoeVxuICAgICAgICAgIGxldCBoYXNCaWJsaW9ncmFwaHkgPSBmYWxzZVxuICAgICAgICAgICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldENvbnRlbnQoKSkuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAoJCh0aGlzKS5pcyhCSUJMSU9HUkFQSFlfU0VMRUNUT1IpKVxuICAgICAgICAgICAgICBoYXNCaWJsaW9ncmFwaHkgPSB0cnVlXG4gICAgICAgICAgfSlcblxuICAgICAgICAgIGlmIChoYXNCaWJsaW9ncmFwaHkpIHtcblxuICAgICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgICAgIC8vIEV4ZWN1dGUgbm9ybWFsIGRlbGV0ZVxuICAgICAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5leGVjQ29tbWFuZCgnZGVsZXRlJylcblxuICAgICAgICAgICAgICAvLyBVcGRhdGUgc2F2ZWQgY29udGVudFxuICAgICAgICAgICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcblxuICAgICAgICAgICAgICAvLyBSZW1vdmUgc2VsZWN0b3Igd2l0aG91dCBoYWRlclxuICAgICAgICAgICAgICAkKEJJQkxJT0dSQVBIWV9TRUxFQ1RPUikucmVtb3ZlKClcblxuICAgICAgICAgICAgICAvLyBVcGRhdGUgaWZyYW1lIGFuZCByZXN0b3JlIHNlbGVjdGlvblxuICAgICAgICAgICAgICB1cGRhdGVJZnJhbWVGcm9tU2F2ZWRDb250ZW50KClcbiAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIGlmIHNlbGVjdGlvbiBzdGFydHMgb3IgZW5kcyBpbiBhIGJpYmxpb2VudHJ5XG4gICAgICAgICAgaWYgKHN0YXJ0Tm9kZS5wYXJlbnRzKEJJQkxJT0VOVFJZX1NFTEVDVE9SKS5sZW5ndGggfHwgZW5kTm9kZS5wYXJlbnRzKEJJQkxJT0VOVFJZX1NFTEVDVE9SKS5sZW5ndGgpIHtcblxuICAgICAgICAgICAgLy8gQm90aCBkZWxldGUgZXZlbnQgYW5kIHVwZGF0ZSBhcmUgc3RvcmVkIGluIGEgc2luZ2xlIHVuZG8gbGV2ZWxcbiAgICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5leGVjQ29tbWFuZCgnZGVsZXRlJylcbiAgICAgICAgICAgICAgc2VjdGlvbi51cGRhdGVCaWJsaW9ncmFwaHlTZWN0aW9uKClcbiAgICAgICAgICAgICAgdXBkYXRlUmVmZXJlbmNlcygpXG5cbiAgICAgICAgICAgICAgLy8gdXBkYXRlIGlmcmFtZVxuICAgICAgICAgICAgICB1cGRhdGVJZnJhbWVGcm9tU2F2ZWRDb250ZW50KClcbiAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG5cbiAgICAgIH1cbiAgICB9IGNhdGNoIChleGNlcHRpb24pIHt9XG5cbiAgICAvLyAjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiAgICAvLyAjIyMjIyMjIyMgRU5URVIgUFJFU1NFRCAjIyMjIyMjIyNcbiAgICAvLyAjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiAgICBpZiAoZS5rZXlDb2RlID09IDEzKSB7XG5cbiAgICAgIC8vIFdoZW4gZW50ZXIgaXMgcHJlc3NlZCBpbnNpZGUgYW4gaGVhZGVyLCBub3QgYXQgdGhlIGVuZCBvZiBpdFxuICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC5pcygnaDEsaDIsaDMsaDQsaDUsaDYnKSAmJiBzZWxlY3RlZEVsZW1lbnQudGV4dCgpLnRyaW0oKS5sZW5ndGggIT0gdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldFJuZygpLnN0YXJ0T2Zmc2V0KSB7XG5cbiAgICAgICAgc2VjdGlvbi5hZGRXaXRoRW50ZXIoKVxuICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgIH1cblxuICAgICAgLy8gSWYgc2VsZWN0aW9uIGlzIGJlZm9yZS9hZnRlciBoZWFkZXJcbiAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQuaXMoJ3AnKSkge1xuXG4gICAgICAgIC8vIEJsb2NrIGVudGVyIGJlZm9yZSBoZWFkZXJcbiAgICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC5hdHRyKCdkYXRhLW1jZS1jYXJldCcpID09ICdiZWZvcmUnKVxuICAgICAgICAgIHJldHVybiBmYWxzZVxuXG5cbiAgICAgICAgLy8gQWRkIG5ldyBzZWN0aW9uIGFmdGVyIGhlYWRlclxuICAgICAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LmF0dHIoJ2RhdGEtbWNlLWNhcmV0JykgPT0gJ2FmdGVyJykge1xuICAgICAgICAgIHNlY3Rpb24uYWRkKDEpXG4gICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gSWYgZW50ZXIgaXMgcHJlc3NlZCBpbnNpZGUgYmlibGlvZ3JhcGh5IHNlbGVjdG9yXG4gICAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LnBhcmVudHMoQklCTElPR1JBUEhZX1NFTEVDVE9SKS5sZW5ndGgpIHtcblxuICAgICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcblxuICAgICAgICBsZXQgaWQgPSBnZXRTdWNjZXNzaXZlRWxlbWVudElkKEJJQkxJT0VOVFJZX1NFTEVDVE9SLCBCSUJMSU9FTlRSWV9TVUZGSVgpXG5cbiAgICAgICAgLy8gUHJlc3NpbmcgZW50ZXIgaW4gaDEgd2lsbCBhZGQgYSBuZXcgYmlibGlvZW50cnkgYW5kIGNhcmV0IHJlcG9zaXRpb25cbiAgICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC5pcygnaDEnKSkge1xuXG4gICAgICAgICAgc2VjdGlvbi5hZGRCaWJsaW9lbnRyeShpZClcbiAgICAgICAgICB1cGRhdGVJZnJhbWVGcm9tU2F2ZWRDb250ZW50KClcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIElmIHNlbGVjdGVkIGVsZW1lbnQgaXMgaW5zaWRlIHRleHRcbiAgICAgICAgZWxzZSBpZiAoc2VsZWN0ZWRFbGVtZW50LmlzKCdwJykpXG4gICAgICAgICAgc2VjdGlvbi5hZGRCaWJsaW9lbnRyeShpZCwgbnVsbCwgc2VsZWN0ZWRFbGVtZW50LnBhcmVudCgnbGknKSlcblxuXG4gICAgICAgIC8vIElmIHNlbGVjdGVkIGVsZW1lbnQgaXMgd2l0aG91dCB0ZXh0XG4gICAgICAgIGVsc2UgaWYgKHNlbGVjdGVkRWxlbWVudC5pcygnbGknKSlcbiAgICAgICAgICBzZWN0aW9uLmFkZEJpYmxpb2VudHJ5KGlkLCBudWxsLCBzZWxlY3RlZEVsZW1lbnQpXG5cbiAgICAgICAgLy8gTW92ZSBjYXJldCAjMTA1XG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZXRDdXJzb3JMb2NhdGlvbih0aW55bWNlLmFjdGl2ZUVkaXRvci5kb20uc2VsZWN0KGAke0JJQkxJT0VOVFJZX1NFTEVDVE9SfSMke2lkfSA+IHBgKVswXSwgZmFsc2UpXG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgfVxuXG4gICAgICAvLyBBZGRpbmcgc2VjdGlvbnMgd2l0aCBzaG9ydGN1dHMgI1xuICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC5pcygncCcpICYmIHNlbGVjdGVkRWxlbWVudC50ZXh0KCkudHJpbSgpLnN1YnN0cmluZygwLCAxKSA9PSAnIycpIHtcblxuICAgICAgICBsZXQgbGV2ZWwgPSBzZWN0aW9uLmdldExldmVsRnJvbUhhc2goc2VsZWN0ZWRFbGVtZW50LnRleHQoKS50cmltKCkpXG4gICAgICAgIGxldCBkZWVwbmVzcyA9ICQoc2VsZWN0ZWRFbGVtZW50KS5wYXJlbnRzVW50aWwoUkFKRV9TRUxFQ1RPUikubGVuZ3RoIC0gbGV2ZWwgKyAxXG5cbiAgICAgICAgLy8gSW5zZXJ0IHNlY3Rpb24gb25seSBpZiBjYXJldCBpcyBpbnNpZGUgYWJzdHJhY3Qgc2VjdGlvbiwgYW5kIHVzZXIgaXMgZ29pbmcgdG8gaW5zZXJ0IGEgc3ViIHNlY3Rpb25cbiAgICAgICAgLy8gT1IgdGhlIGN1cnNvciBpc24ndCBpbnNpZGUgb3RoZXIgc3BlY2lhbCBzZWN0aW9uc1xuICAgICAgICAvLyBBTkQgc2VsZWN0ZWRFbGVtZW50IGlzbid0IGluc2lkZSBhIGZpZ3VyZVxuICAgICAgICBpZiAoKChzZWxlY3RlZEVsZW1lbnQucGFyZW50cyhBQlNUUkFDVF9TRUxFQ1RPUikubGVuZ3RoICYmIGRlZXBuZXNzID4gMCkgfHwgIXNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKFNQRUNJQUxfU0VDVElPTl9TRUxFQ1RPUikubGVuZ3RoKSAmJiAhc2VsZWN0ZWRFbGVtZW50LnBhcmVudHMoRklHVVJFX1NFTEVDVE9SKS5sZW5ndGgpIHtcblxuICAgICAgICAgIHNlY3Rpb24uYWRkKGxldmVsLCBzZWxlY3RlZEVsZW1lbnQudGV4dCgpLnN1YnN0cmluZyhsZXZlbCkudHJpbSgpKVxuICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9KVxuXG4gIGVkaXRvci5vbignTm9kZUNoYW5nZScsIGZ1bmN0aW9uIChlKSB7XG4gICAgc2VjdGlvbi51cGRhdGVTZWN0aW9uVG9vbGJhcigpXG4gIH0pXG59KVxuXG5zZWN0aW9uID0ge1xuXG4gIC8qKlxuICAgKiBGdW5jdGlvbiBjYWxsZWQgd2hlbiBhIG5ldyBzZWN0aW9uIG5lZWRzIHRvIGJlIGF0dGFjaGVkLCB3aXRoIGJ1dHRvbnNcbiAgICovXG4gIGFkZDogZnVuY3Rpb24gKGxldmVsLCB0ZXh0KSB7XG5cbiAgICAvLyBTZWxlY3QgY3VycmVudCBub2RlXG4gICAgbGV0IHNlbGVjdGVkRWxlbWVudCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcblxuICAgIC8vIENyZWF0ZSB0aGUgc2VjdGlvblxuICAgIGxldCBuZXdTZWN0aW9uID0gdGhpcy5jcmVhdGUodGV4dCAhPSBudWxsID8gdGV4dCA6IHNlbGVjdGVkRWxlbWVudC5odG1sKCkudHJpbSgpLCBsZXZlbClcblxuICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgLy8gQ2hlY2sgd2hhdCBraW5kIG9mIHNlY3Rpb24gbmVlZHMgdG8gYmUgaW5zZXJ0ZWRcbiAgICAgIGlmIChzZWN0aW9uLm1hbmFnZVNlY3Rpb24oc2VsZWN0ZWRFbGVtZW50LCBuZXdTZWN0aW9uLCBsZXZlbCA/IGxldmVsIDogc2VsZWN0ZWRFbGVtZW50LnBhcmVudHNVbnRpbChSQUpFX1NFTEVDVE9SKS5sZW5ndGgpKSB7XG5cbiAgICAgICAgLy8gUmVtb3ZlIHRoZSBzZWxlY3RlZCBzZWN0aW9uXG4gICAgICAgIHNlbGVjdGVkRWxlbWVudC5yZW1vdmUoKVxuXG4gICAgICAgIC8vIElmIHRoZSBuZXcgaGVhZGluZyBoYXMgdGV4dCBub2RlcywgdGhlIG9mZnNldCB3b24ndCBiZSAwIChhcyBub3JtYWwpIGJ1dCBpbnN0ZWFkIGl0J2xsIGJlIGxlbmd0aCBvZiBub2RlIHRleHRcbiAgICAgICAgbW92ZUNhcmV0KG5ld1NlY3Rpb24uZmluZCgnOmhlYWRlcicpLmZpcnN0KClbMF0pXG5cbiAgICAgICAgLy8gVXBkYXRlIGVkaXRvciBjb250ZW50XG4gICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuICAgICAgfVxuICAgIH0pXG4gIH0sXG5cbiAgLyoqXG4gICAqIFxuICAgKi9cbiAgYWRkT3JEb3duVXBncmFkZTogZnVuY3Rpb24gKGUsIGxldmVsKSB7XG5cbiAgICBsZXQgc2VsZWN0ZWRNZW51SXRlbSA9ICQoZS50YXJnZXQpLnBhcmVudCgnLm1jZS1tZW51LWl0ZW0nKVxuXG4gICAgaWYgKHNlbGVjdGVkTWVudUl0ZW0uYXR0cihEQVRBX1VQR1JBREUpKVxuICAgICAgcmV0dXJuIHRoaXMudXBncmFkZSgpXG5cbiAgICBpZiAoc2VsZWN0ZWRNZW51SXRlbS5hdHRyKERBVEFfRE9XTkdSQURFKSlcbiAgICAgIHJldHVybiB0aGlzLmRvd25ncmFkZSgpXG5cbiAgICByZXR1cm4gdGhpcy5hZGQobGV2ZWwpXG4gIH0sXG5cbiAgLyoqXG4gICAqIEZ1bmN0aW9uIGNhbGxlZCB3aGVuIGEgbmV3IHNlY3Rpb24gbmVlZHMgdG8gYmUgYXR0YWNoZWQsIHdpdGggYnV0dG9uc1xuICAgKi9cbiAgYWRkV2l0aEVudGVyOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAvLyBTZWxlY3QgY3VycmVudCBub2RlXG4gICAgbGV0IHNlbGVjdGVkRWxlbWVudCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcblxuICAgIC8vIElmIHRoZSBzZWN0aW9uIGlzbid0IHNwZWNpYWxcbiAgICBpZiAoIXNlbGVjdGVkRWxlbWVudC5wYXJlbnQoKS5hdHRyKCdyb2xlJykpIHtcblxuICAgICAgbGV2ZWwgPSBzZWxlY3RlZEVsZW1lbnQucGFyZW50c1VudGlsKFJBSkVfU0VMRUNUT1IpLmxlbmd0aFxuXG4gICAgICAvLyBDcmVhdGUgdGhlIHNlY3Rpb25cbiAgICAgIGxldCBuZXdTZWN0aW9uID0gdGhpcy5jcmVhdGUoc2VsZWN0ZWRFbGVtZW50LnRleHQoKS50cmltKCkuc3Vic3RyaW5nKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRSbmcoKS5zdGFydE9mZnNldCksIGxldmVsKVxuXG4gICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgLy8gQ2hlY2sgd2hhdCBraW5kIG9mIHNlY3Rpb24gbmVlZHMgdG8gYmUgaW5zZXJ0ZWRcbiAgICAgICAgc2VjdGlvbi5tYW5hZ2VTZWN0aW9uKHNlbGVjdGVkRWxlbWVudCwgbmV3U2VjdGlvbiwgbGV2ZWwpXG5cbiAgICAgICAgLy8gUmVtb3ZlIHRoZSBzZWxlY3RlZCBzZWN0aW9uXG4gICAgICAgIHNlbGVjdGVkRWxlbWVudC5odG1sKHNlbGVjdGVkRWxlbWVudC50ZXh0KCkudHJpbSgpLnN1YnN0cmluZygwLCB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Um5nKCkuc3RhcnRPZmZzZXQpKVxuXG4gICAgICAgIG1vdmVDYXJldChuZXdTZWN0aW9uLmZpbmQoJzpoZWFkZXInKS5maXJzdCgpWzBdLCB0cnVlKVxuXG4gICAgICAgIC8vIFVwZGF0ZSBlZGl0b3JcbiAgICAgICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG4gICAgICB9KVxuICAgIH0gZWxzZVxuICAgICAgbm90aWZ5KCdFcnJvciwgaGVhZGVycyBvZiBzcGVjaWFsIHNlY3Rpb25zIChhYnN0cmFjdCwgYWNrbm93bGVkbWVudHMpIGNhbm5vdCBiZSBzcGxpdHRlZCcsICdlcnJvcicsIDQwMDApXG4gIH0sXG5cbiAgLyoqXG4gICAqIEdldCB0aGUgbGFzdCBpbnNlcnRlZCBpZFxuICAgKi9cbiAgZ2V0TmV4dElkOiBmdW5jdGlvbiAoKSB7XG4gICAgbGV0IGlkID0gMFxuICAgICQoJ3NlY3Rpb25baWRdJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAoJCh0aGlzKS5hdHRyKCdpZCcpLmluZGV4T2YoJ3NlY3Rpb24nKSA+IC0xKSB7XG4gICAgICAgIGxldCBjdXJySWQgPSBwYXJzZUludCgkKHRoaXMpLmF0dHIoJ2lkJykucmVwbGFjZSgnc2VjdGlvbicsICcnKSlcbiAgICAgICAgaWQgPSBpZCA+IGN1cnJJZCA/IGlkIDogY3VycklkXG4gICAgICB9XG4gICAgfSlcbiAgICByZXR1cm4gYHNlY3Rpb24ke2lkKzF9YFxuICB9LFxuXG4gIC8qKlxuICAgKiBSZXRyaWV2ZSBhbmQgdGhlbiByZW1vdmUgZXZlcnkgc3VjY2Vzc2l2ZSBlbGVtZW50cyBcbiAgICovXG4gIGdldFN1Y2Nlc3NpdmVFbGVtZW50czogZnVuY3Rpb24gKGVsZW1lbnQsIGRlZXBuZXNzKSB7XG5cbiAgICBsZXQgc3VjY2Vzc2l2ZUVsZW1lbnRzID0gJCgnPGRpdj48L2Rpdj4nKVxuXG4gICAgd2hpbGUgKGRlZXBuZXNzID49IDApIHtcblxuICAgICAgaWYgKGVsZW1lbnQubmV4dEFsbCgnOm5vdCguZm9vdGVyKScpKSB7XG5cbiAgICAgICAgLy8gSWYgdGhlIGRlZXBuZXNzIGlzIDAsIG9ubHkgcGFyYWdyYXBoIGFyZSBzYXZlZCAobm90IHNlY3Rpb25zKVxuICAgICAgICBpZiAoZGVlcG5lc3MgPT0gMCkge1xuICAgICAgICAgIC8vIFN1Y2Nlc3NpdmUgZWxlbWVudHMgY2FuIGJlIHAgb3IgZmlndXJlc1xuICAgICAgICAgIHN1Y2Nlc3NpdmVFbGVtZW50cy5hcHBlbmQoZWxlbWVudC5uZXh0QWxsKGBwLCR7RklHVVJFX1NFTEVDVE9SfWApKVxuICAgICAgICAgIGVsZW1lbnQubmV4dEFsbCgpLnJlbW92ZShgcCwke0ZJR1VSRV9TRUxFQ1RPUn1gKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHN1Y2Nlc3NpdmVFbGVtZW50cy5hcHBlbmQoZWxlbWVudC5uZXh0QWxsKCkpXG4gICAgICAgICAgZWxlbWVudC5uZXh0QWxsKCkucmVtb3ZlKClcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBlbGVtZW50ID0gZWxlbWVudC5wYXJlbnQoJ3NlY3Rpb24nKVxuICAgICAgZGVlcG5lc3MtLVxuICAgIH1cblxuICAgIHJldHVybiAkKHN1Y2Nlc3NpdmVFbGVtZW50cy5odG1sKCkpXG4gIH0sXG5cbiAgLyoqXG4gICAqIFxuICAgKi9cbiAgZ2V0TGV2ZWxGcm9tSGFzaDogZnVuY3Rpb24gKHRleHQpIHtcblxuICAgIGxldCBsZXZlbCA9IDBcbiAgICB0ZXh0ID0gdGV4dC5zdWJzdHJpbmcoMCwgdGV4dC5sZW5ndGggPj0gNiA/IDYgOiB0ZXh0Lmxlbmd0aClcblxuICAgIHdoaWxlICh0ZXh0Lmxlbmd0aCA+IDApIHtcblxuICAgICAgaWYgKHRleHQuc3Vic3RyaW5nKHRleHQubGVuZ3RoIC0gMSkgPT0gJyMnKVxuICAgICAgICBsZXZlbCsrXG5cbiAgICAgICAgdGV4dCA9IHRleHQuc3Vic3RyaW5nKDAsIHRleHQubGVuZ3RoIC0gMSlcbiAgICB9XG5cbiAgICByZXR1cm4gbGV2ZWxcbiAgfSxcblxuICAvKipcbiAgICogUmV0dXJuIEpRZXVyeSBvYmplY3QgdGhhdCByZXByZXNlbnQgdGhlIHNlY3Rpb25cbiAgICovXG4gIGNyZWF0ZTogZnVuY3Rpb24gKHRleHQsIGxldmVsKSB7XG4gICAgLy8gQ3JlYXRlIHRoZSBzZWN0aW9uXG5cbiAgICAvLyBUcmltIHdoaXRlIHNwYWNlcyBhbmQgYWRkIHplcm9fc3BhY2UgY2hhciBpZiBub3RoaW5nIGlzIGluc2lkZVxuXG4gICAgaWYgKHR5cGVvZiB0ZXh0ICE9IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgIHRleHQgPSB0ZXh0LnRyaW0oKVxuICAgICAgaWYgKHRleHQubGVuZ3RoID09IDApXG4gICAgICAgIHRleHQgPSBcIjxicj5cIlxuICAgIH0gZWxzZVxuICAgICAgdGV4dCA9IFwiPGJyPlwiXG5cbiAgICByZXR1cm4gJChgPHNlY3Rpb24gaWQ9XCIke3RoaXMuZ2V0TmV4dElkKCl9XCI+PGgke2xldmVsfSBkYXRhLXJhc2gtb3JpZ2luYWwtd3JhcHBlcj1cImgxXCI+JHt0ZXh0fTwvaCR7bGV2ZWx9Pjwvc2VjdGlvbj5gKVxuICB9LFxuXG4gIC8qKlxuICAgKiBDaGVjayB3aGF0IGtpbmQgb2Ygc2VjdGlvbiBuZWVkcyB0byBiZSBhZGRlZCwgYW5kIHByZWNlZWRcbiAgICovXG4gIG1hbmFnZVNlY3Rpb246IGZ1bmN0aW9uIChzZWxlY3RlZEVsZW1lbnQsIG5ld1NlY3Rpb24sIGxldmVsKSB7XG5cbiAgICBsZXQgZGVlcG5lc3MgPSAkKHNlbGVjdGVkRWxlbWVudCkucGFyZW50c1VudGlsKFJBSkVfU0VMRUNUT1IpLmxlbmd0aCAtIGxldmVsICsgMVxuXG4gICAgaWYgKGRlZXBuZXNzID49IDApIHtcblxuICAgICAgLy8gQmxvY2sgaW5zZXJ0IHNlbGVjdGlvbiBpZiBjYXJldCBpcyBpbnNpZGUgc3BlY2lhbCBzZWN0aW9uLCBhbmQgdXNlciBpcyBnb2luZyB0byBpbnNlcnQgYSBzdWIgc2VjdGlvblxuICAgICAgaWYgKChzZWxlY3RlZEVsZW1lbnQucGFyZW50cyhTUEVDSUFMX1NFQ1RJT05fU0VMRUNUT1IpLmxlbmd0aCAmJiBkZWVwbmVzcyAhPSAxKSB8fCAoc2VsZWN0ZWRFbGVtZW50LnBhcmVudHMoQUNLTk9XTEVER0VNRU5UU19TRUxFQ1RPUikubGVuZ3RoICYmXG4gICAgICAgICAgc2VsZWN0ZWRFbGVtZW50LnBhcmVudHMoQklCTElPR1JBUEhZX1NFTEVDVE9SKSAmJlxuICAgICAgICAgIHNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKEVORE5PVEVTX1NFTEVDVE9SKSkpXG4gICAgICAgIHJldHVybiBmYWxzZVxuXG4gICAgICAvLyBHZXQgZGlyZWN0IHBhcmVudCBhbmQgYW5jZXN0b3IgcmVmZXJlbmNlXG4gICAgICBsZXQgc3VjY2Vzc2l2ZUVsZW1lbnRzID0gdGhpcy5nZXRTdWNjZXNzaXZlRWxlbWVudHMoc2VsZWN0ZWRFbGVtZW50LCBkZWVwbmVzcylcblxuICAgICAgaWYgKHN1Y2Nlc3NpdmVFbGVtZW50cy5sZW5ndGgpXG4gICAgICAgIG5ld1NlY3Rpb24uYXBwZW5kKHN1Y2Nlc3NpdmVFbGVtZW50cylcblxuICAgICAgLy8gQ0FTRTogc3ViIHNlY3Rpb25cbiAgICAgIGlmIChkZWVwbmVzcyA9PSAwKVxuICAgICAgICBzZWxlY3RlZEVsZW1lbnQuYWZ0ZXIobmV3U2VjdGlvbilcblxuICAgICAgLy8gQ0FTRTogc2libGluZyBzZWN0aW9uXG4gICAgICBlbHNlIGlmIChkZWVwbmVzcyA9PSAxKVxuICAgICAgICBzZWxlY3RlZEVsZW1lbnQucGFyZW50KCdzZWN0aW9uJykuYWZ0ZXIobmV3U2VjdGlvbilcblxuICAgICAgLy8gQ0FTRTogYW5jZXN0b3Igc2VjdGlvbiBhdCBhbnkgdXBsZXZlbFxuICAgICAgZWxzZVxuICAgICAgICAkKHNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKCdzZWN0aW9uJylbZGVlcG5lc3MgLSAxXSkuYWZ0ZXIobmV3U2VjdGlvbilcblxuICAgICAgaGVhZGluZ0RpbWVuc2lvbigpXG5cbiAgICAgIHJldHVybiB0cnVlXG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIHVwZ3JhZGU6IGZ1bmN0aW9uICgpIHtcblxuICAgIGxldCBzZWxlY3RlZEVsZW1lbnQgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG5cbiAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LmlzKCc6aGVhZGVyJykpIHtcblxuICAgICAgLy8gR2V0IHRoZSByZWZlcmVuY2VzIG9mIHNlbGVjdGVkIGFuZCBwYXJlbnQgc2VjdGlvblxuICAgICAgbGV0IHNlbGVjdGVkU2VjdGlvbiA9IHNlbGVjdGVkRWxlbWVudC5wYXJlbnQoU0VDVElPTl9TRUxFQ1RPUilcbiAgICAgIGxldCBwYXJlbnRTZWN0aW9uID0gc2VsZWN0ZWRTZWN0aW9uLnBhcmVudChTRUNUSU9OX1NFTEVDVE9SKVxuXG4gICAgICAvLyBJZiB0aGVyZSBpcyBhIHBhcmVudCBzZWN0aW9uIHVwZ3JhZGUgaXMgYWxsb3dlZFxuICAgICAgaWYgKHBhcmVudFNlY3Rpb24ubGVuZ3RoKSB7XG5cbiAgICAgICAgLy8gRXZlcnl0aGluZyBpbiBoZXJlLCBpcyBhbiBhdG9taWMgdW5kbyBsZXZlbFxuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICAvLyBTYXZlIHRoZSBzZWN0aW9uIGFuZCBkZXRhY2hcbiAgICAgICAgICBsZXQgYm9keVNlY3Rpb24gPSAkKHNlbGVjdGVkU2VjdGlvblswXS5vdXRlckhUTUwpXG4gICAgICAgICAgc2VsZWN0ZWRTZWN0aW9uLmRldGFjaCgpXG5cbiAgICAgICAgICAvLyBVcGRhdGUgZGltZW5zaW9uIGFuZCBtb3ZlIHRoZSBzZWN0aW9uIG91dFxuICAgICAgICAgIHBhcmVudFNlY3Rpb24uYWZ0ZXIoYm9keVNlY3Rpb24pXG5cbiAgICAgICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcbiAgICAgICAgICBoZWFkaW5nRGltZW5zaW9uKClcbiAgICAgICAgICB1cGRhdGVJZnJhbWVGcm9tU2F2ZWRDb250ZW50KClcbiAgICAgICAgfSlcbiAgICAgIH1cblxuICAgICAgLy8gTm90aWZ5IGVycm9yXG4gICAgICBlbHNlXG4gICAgICAgIG5vdGlmeShIRUFESU5HX1RSQVNGT1JNQVRJT05fRk9SQklEREVOLCAnZXJyb3InLCAyMDAwKVxuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogXG4gICAqL1xuICBkb3duZ3JhZGU6IGZ1bmN0aW9uICgpIHtcblxuICAgIGxldCBzZWxlY3RlZEVsZW1lbnQgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG5cbiAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LmlzKCdoMSxoMixoMyxoNCxoNSxoNicpKSB7XG4gICAgICAvLyBHZXQgdGhlIHJlZmVyZW5jZXMgb2Ygc2VsZWN0ZWQgYW5kIHNpYmxpbmcgc2VjdGlvblxuICAgICAgbGV0IHNlbGVjdGVkU2VjdGlvbiA9IHNlbGVjdGVkRWxlbWVudC5wYXJlbnQoU0VDVElPTl9TRUxFQ1RPUilcbiAgICAgIGxldCBzaWJsaW5nU2VjdGlvbiA9IHNlbGVjdGVkU2VjdGlvbi5wcmV2KFNFQ1RJT05fU0VMRUNUT1IpXG5cbiAgICAgIC8vIElmIHRoZXJlIGlzIGEgcHJldmlvdXMgc2libGluZyBzZWN0aW9uIGRvd25ncmFkZSBpcyBhbGxvd2VkXG4gICAgICBpZiAoc2libGluZ1NlY3Rpb24ubGVuZ3RoKSB7XG5cbiAgICAgICAgLy8gRXZlcnl0aGluZyBpbiBoZXJlLCBpcyBhbiBhdG9taWMgdW5kbyBsZXZlbFxuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICAvLyBTYXZlIHRoZSBzZWN0aW9uIGFuZCBkZXRhY2hcbiAgICAgICAgICBsZXQgYm9keVNlY3Rpb24gPSAkKHNlbGVjdGVkU2VjdGlvblswXS5vdXRlckhUTUwpXG4gICAgICAgICAgc2VsZWN0ZWRTZWN0aW9uLmRldGFjaCgpXG5cbiAgICAgICAgICAvLyBVcGRhdGUgZGltZW5zaW9uIGFuZCBtb3ZlIHRoZSBzZWN0aW9uIG91dFxuICAgICAgICAgIHNpYmxpbmdTZWN0aW9uLmFwcGVuZChib2R5U2VjdGlvbilcblxuICAgICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuICAgICAgICAgIC8vIFJlZnJlc2ggdGlueW1jZSBjb250ZW50IGFuZCBzZXQgdGhlIGhlYWRpbmcgZGltZW5zaW9uXG4gICAgICAgICAgaGVhZGluZ0RpbWVuc2lvbigpXG4gICAgICAgICAgdXBkYXRlSWZyYW1lRnJvbVNhdmVkQ29udGVudCgpXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gTm90aWZ5IGVycm9yXG4gICAgZWxzZVxuICAgICAgbm90aWZ5KEhFQURJTkdfVFJBU0ZPUk1BVElPTl9GT1JCSURERU4sICdlcnJvcicsIDIwMDApXG4gIH0sXG5cbiAgLyoqXG4gICAqIFxuICAgKi9cbiAgYWRkQWJzdHJhY3Q6IGZ1bmN0aW9uICgpIHtcblxuICAgIGlmICghJChBQlNUUkFDVF9TRUxFQ1RPUikubGVuZ3RoKSB7XG5cbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAvLyBUaGlzIHNlY3Rpb24gY2FuIG9ubHkgYmUgcGxhY2VkIGFmdGVyIG5vbiBlZGl0YWJsZSBoZWFkZXJcbiAgICAgICAgJChOT05fRURJVEFCTEVfSEVBREVSX1NFTEVDVE9SKS5hZnRlcihgPHNlY3Rpb24gaWQ9XCJkb2MtYWJzdHJhY3RcIiByb2xlPVwiZG9jLWFic3RyYWN0XCI+PGgxPkFic3RyYWN0PC9oMT48L3NlY3Rpb24+YClcblxuICAgICAgICB1cGRhdGVJZnJhbWVGcm9tU2F2ZWRDb250ZW50KClcbiAgICAgIH0pXG4gICAgfVxuXG4gICAgLy9tb3ZlIGNhcmV0IGFuZCBzZXQgZm9jdXMgdG8gYWN0aXZlIGFkaXRvciAjMTA1XG4gICAgbW92ZUNhcmV0KHRpbnltY2UuYWN0aXZlRWRpdG9yLmRvbS5zZWxlY3QoYCR7QUJTVFJBQ1RfU0VMRUNUT1J9ID4gaDFgKVswXSlcbiAgICBzY3JvbGxUbyhBQlNUUkFDVF9TRUxFQ1RPUilcbiAgfSxcblxuICAvKipcbiAgICogXG4gICAqL1xuICBhZGRBY2tub3dsZWRnZW1lbnRzOiBmdW5jdGlvbiAoKSB7XG5cbiAgICBpZiAoISQoQUNLTk9XTEVER0VNRU5UU19TRUxFQ1RPUikubGVuZ3RoKSB7XG5cbiAgICAgIGxldCBhY2sgPSAkKGA8c2VjdGlvbiBpZD1cImRvYy1hY2tub3dsZWRnZW1lbnRzXCIgcm9sZT1cImRvYy1hY2tub3dsZWRnZW1lbnRzXCI+PGgxPkFja25vd2xlZGdlbWVudHM8L2gxPjwvc2VjdGlvbj5gKVxuXG4gICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgLy8gSW5zZXJ0IHRoaXMgc2VjdGlvbiBhZnRlciBsYXN0IG5vbiBzcGVjaWFsIHNlY3Rpb24gXG4gICAgICAgIC8vIE9SIGFmdGVyIGFic3RyYWN0IHNlY3Rpb24gXG4gICAgICAgIC8vIE9SIGFmdGVyIG5vbiBlZGl0YWJsZSBoZWFkZXJcbiAgICAgICAgaWYgKCQoTUFJTl9TRUNUSU9OX1NFTEVDVE9SKS5sZW5ndGgpXG4gICAgICAgICAgJChNQUlOX1NFQ1RJT05fU0VMRUNUT1IpLmxhc3QoKS5hZnRlcihhY2spXG5cbiAgICAgICAgZWxzZSBpZiAoJChBQlNUUkFDVF9TRUxFQ1RPUikubGVuZ3RoKVxuICAgICAgICAgICQoQUJTVFJBQ1RfU0VMRUNUT1IpLmFmdGVyKGFjaylcblxuICAgICAgICBlbHNlXG4gICAgICAgICAgJChOT05fRURJVEFCTEVfSEVBREVSX1NFTEVDVE9SKS5hZnRlcihhY2spXG5cbiAgICAgICAgdXBkYXRlSWZyYW1lRnJvbVNhdmVkQ29udGVudCgpXG4gICAgICB9KVxuICAgIH1cblxuICAgIC8vbW92ZSBjYXJldCBhbmQgc2V0IGZvY3VzIHRvIGFjdGl2ZSBhZGl0b3IgIzEwNVxuICAgIG1vdmVDYXJldCh0aW55bWNlLmFjdGl2ZUVkaXRvci5kb20uc2VsZWN0KGAke0FDS05PV0xFREdFTUVOVFNfU0VMRUNUT1J9ID4gaDFgKVswXSlcbiAgICBzY3JvbGxUbyhBQ0tOT1dMRURHRU1FTlRTX1NFTEVDVE9SKVxuICB9LFxuXG4gIC8qKlxuICAgKiBUaGlzIG1ldGhvZCBpcyB0aGUgbWFpbiBvbmUuIEl0J3MgY2FsbGVkIGJlY2F1c2UgYWxsIHRpbWVzIHRoZSBpbnRlbnQgaXMgdG8gYWRkIGEgbmV3IGJpYmxpb2VudHJ5IChzaW5nbGUgcmVmZXJlbmNlKVxuICAgKiBUaGVuIGl0IGNoZWNrcyBpZiBpcyBuZWNlc3NhcnkgdG8gYWRkIHRoZSBlbnRpcmUgPHNlY3Rpb24+IG9yIG9ubHkgdGhlIG1pc3NpbmcgPHVsPlxuICAgKi9cbiAgYWRkQmlibGlvZW50cnk6IGZ1bmN0aW9uIChpZCwgdGV4dCwgbGlzdEl0ZW0pIHtcblxuICAgIC8vIEFkZCBiaWJsaW9ncmFwaHkgc2VjdGlvbiBpZiBub3QgZXhpc3RzXG4gICAgaWYgKCEkKEJJQkxJT0dSQVBIWV9TRUxFQ1RPUikubGVuZ3RoKSB7XG5cbiAgICAgIGxldCBiaWJsaW9ncmFwaHkgPSAkKGA8c2VjdGlvbiBpZD1cImRvYy1iaWJsaW9ncmFwaHlcIiByb2xlPVwiZG9jLWJpYmxpb2dyYXBoeVwiPjxoMT5SZWZlcmVuY2VzPC9oMT48dWw+PC91bD48L3NlY3Rpb24+YClcblxuICAgICAgLy8gVGhpcyBzZWN0aW9uIGlzIGFkZGVkIGFmdGVyIGFja25vd2xlZGdlbWVudHMgc2VjdGlvblxuICAgICAgLy8gT1IgYWZ0ZXIgbGFzdCBub24gc3BlY2lhbCBzZWN0aW9uXG4gICAgICAvLyBPUiBhZnRlciBhYnN0cmFjdCBzZWN0aW9uXG4gICAgICAvLyBPUiBhZnRlciBub24gZWRpdGFibGUgaGVhZGVyIFxuICAgICAgaWYgKCQoQUNLTk9XTEVER0VNRU5UU19TRUxFQ1RPUikubGVuZ3RoKVxuICAgICAgICAkKEFDS05PV0xFREdFTUVOVFNfU0VMRUNUT1IpLmFmdGVyKGJpYmxpb2dyYXBoeSlcblxuICAgICAgZWxzZSBpZiAoJChNQUlOX1NFQ1RJT05fU0VMRUNUT1IpLmxlbmd0aClcbiAgICAgICAgJChNQUlOX1NFQ1RJT05fU0VMRUNUT1IpLmxhc3QoKS5hZnRlcihiaWJsaW9ncmFwaHkpXG5cbiAgICAgIGVsc2UgaWYgKCQoQUJTVFJBQ1RfU0VMRUNUT1IpLmxlbmd0aClcbiAgICAgICAgJChBQlNUUkFDVF9TRUxFQ1RPUikuYWZ0ZXIoYmlibGlvZ3JhcGh5KVxuXG4gICAgICBlbHNlXG4gICAgICAgICQoTk9OX0VESVRBQkxFX0hFQURFUl9TRUxFQ1RPUikuYWZ0ZXIoYmlibGlvZ3JhcGh5KVxuXG4gICAgfVxuXG4gICAgLy8gQWRkIHVsIGluIGJpYmxpb2dyYXBoeSBzZWN0aW9uIGlmIG5vdCBleGlzdHNcbiAgICBpZiAoISQoQklCTElPR1JBUEhZX1NFTEVDVE9SKS5maW5kKCd1bCcpLmxlbmd0aClcbiAgICAgICQoQklCTElPR1JBUEhZX1NFTEVDVE9SKS5hcHBlbmQoJzx1bD48L3VsPicpXG5cbiAgICAvLyBJRiBpZCBhbmQgdGV4dCBhcmVuJ3QgcGFzc2VkIGFzIHBhcmFtZXRlcnMsIHRoZXNlIGNhbiBiZSByZXRyaWV2ZWQgb3IgaW5pdCBmcm9tIGhlcmVcbiAgICBpZCA9IChpZCkgPyBpZCA6IGdldFN1Y2Nlc3NpdmVFbGVtZW50SWQoQklCTElPRU5UUllfU0VMRUNUT1IsIEJJQkxJT0VOVFJZX1NVRkZJWClcbiAgICB0ZXh0ID0gdGV4dCA/IHRleHQgOiAnPGJyLz4nXG5cbiAgICBsZXQgbmV3SXRlbSA9ICQoYDxsaSByb2xlPVwiZG9jLWJpYmxpb2VudHJ5XCIgaWQ9XCIke2lkfVwiPjxwPiR7dGV4dH08L3A+PC9saT5gKVxuXG4gICAgLy8gQXBwZW5kIG5ldyBsaSB0byB1bCBhdCBsYXN0IHBvc2l0aW9uXG4gICAgLy8gT1IgaW5zZXJ0IHRoZSBuZXcgbGkgcmlnaHQgYWZ0ZXIgdGhlIGN1cnJlbnQgb25lXG4gICAgaWYgKCFsaXN0SXRlbSlcbiAgICAgICQoYCR7QklCTElPR1JBUEhZX1NFTEVDVE9SfSB1bGApLmFwcGVuZChuZXdJdGVtKVxuXG4gICAgZWxzZVxuICAgICAgbGlzdEl0ZW0uYWZ0ZXIobmV3SXRlbSlcbiAgfSxcblxuICAvKipcbiAgICogXG4gICAqL1xuICB1cGRhdGVCaWJsaW9ncmFwaHlTZWN0aW9uOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAvLyBTeW5jaHJvbml6ZSBpZnJhbWUgYW5kIHN0b3JlZCBjb250ZW50XG4gICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG5cbiAgICAvLyBSZW1vdmUgYWxsIHNlY3Rpb25zIHdpdGhvdXQgcCBjaGlsZFxuICAgICQoYCR7QklCTElPRU5UUllfU0VMRUNUT1J9Om5vdCg6aGFzKHApKWApLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgJCh0aGlzKS5yZW1vdmUoKVxuICAgIH0pXG4gIH0sXG5cbiAgLyoqXG4gICAqIFxuICAgKi9cbiAgYWRkRW5kbm90ZTogZnVuY3Rpb24gKGlkKSB7XG5cbiAgICAvLyBBZGQgdGhlIHNlY3Rpb24gaWYgaXQgbm90IGV4aXN0c1xuICAgIGlmICghJChFTkROT1RFX1NFTEVDVE9SKS5sZW5ndGgpIHtcblxuICAgICAgbGV0IGVuZG5vdGVzID0gJChgPHNlY3Rpb24gaWQ9XCJkb2MtZW5kbm90ZXNcIiByb2xlPVwiZG9jLWVuZG5vdGVzXCI+PGgxIGRhdGEtcmFzaC1vcmlnaW5hbC1jb250ZW50PVwiXCI+Rm9vdG5vdGVzPC9oMT48L3NlY3Rpb24+YClcblxuICAgICAgLy8gSW5zZXJ0IHRoaXMgc2VjdGlvbiBhZnRlciBiaWJsaW9ncmFwaHkgc2VjdGlvblxuICAgICAgLy8gT1IgYWZ0ZXIgYWNrbm93bGVkZ2VtZW50cyBzZWN0aW9uXG4gICAgICAvLyBPUiBhZnRlciBub24gc3BlY2lhbCBzZWN0aW9uIHNlbGVjdG9yXG4gICAgICAvLyBPUiBhZnRlciBhYnN0cmFjdCBzZWN0aW9uXG4gICAgICAvLyBPUiBhZnRlciBub24gZWRpdGFibGUgaGVhZGVyIFxuICAgICAgaWYgKCQoQklCTElPR1JBUEhZX1NFTEVDVE9SKS5sZW5ndGgpXG4gICAgICAgICQoQklCTElPR1JBUEhZX1NFTEVDVE9SKS5hZnRlcihlbmRub3RlcylcblxuICAgICAgZWxzZSBpZiAoJChBQ0tOT1dMRURHRU1FTlRTX1NFTEVDVE9SKS5sZW5ndGgpXG4gICAgICAgICQoQUNLTk9XTEVER0VNRU5UU19TRUxFQ1RPUikuYWZ0ZXIoZW5kbm90ZXMpXG5cbiAgICAgIGVsc2UgaWYgKCQoTUFJTl9TRUNUSU9OX1NFTEVDVE9SKS5sZW5ndGgpXG4gICAgICAgICQoTUFJTl9TRUNUSU9OX1NFTEVDVE9SKS5sYXN0KCkuYWZ0ZXIoZW5kbm90ZXMpXG5cbiAgICAgIGVsc2UgaWYgKCQoQUJTVFJBQ1RfU0VMRUNUT1IpLmxlbmd0aClcbiAgICAgICAgJChBQlNUUkFDVF9TRUxFQ1RPUikuYWZ0ZXIoZW5kbm90ZXMpXG5cbiAgICAgIGVsc2VcbiAgICAgICAgJChOT05fRURJVEFCTEVfSEVBREVSX1NFTEVDVE9SKS5hZnRlcihlbmRub3RlcylcbiAgICB9XG5cbiAgICAvLyBDcmVhdGUgYW5kIGFwcGVuZCB0aGUgbmV3IGVuZG5vdGVcbiAgICBsZXQgZW5kbm90ZSA9ICQoYDxzZWN0aW9uIHJvbGU9XCJkb2MtZW5kbm90ZVwiIGlkPVwiJHtpZH1cIj48cD48YnIvPjwvcD48L3NlY3Rpb24+YClcbiAgICAkKEVORE5PVEVTX1NFTEVDVE9SKS5hcHBlbmQoZW5kbm90ZSlcbiAgfSxcblxuICAvKipcbiAgICogXG4gICAqL1xuICB1cGRhdGVTZWN0aW9uVG9vbGJhcjogZnVuY3Rpb24gKCkge1xuXG4gICAgLy8gRHJvcGRvd24gbWVudSByZWZlcmVuY2VcbiAgICBsZXQgbWVudSA9ICQoTUVOVV9TRUxFQ1RPUilcblxuICAgIGlmIChtZW51Lmxlbmd0aCkge1xuICAgICAgc2VjdGlvbi5yZXN0b3JlU2VjdGlvblRvb2xiYXIobWVudSlcblxuICAgICAgLy8gU2F2ZSBjdXJyZW50IHNlbGVjdGVkIGVsZW1lbnRcbiAgICAgIGxldCBzZWxlY3RlZEVsZW1lbnQgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRSbmcoKS5zdGFydENvbnRhaW5lcilcblxuICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudFswXS5ub2RlVHlwZSA9PSAzKVxuICAgICAgICBzZWxlY3RlZEVsZW1lbnQgPSBzZWxlY3RlZEVsZW1lbnQucGFyZW50KClcblxuICAgICAgLy8gSWYgY3VycmVudCBlbGVtZW50IGlzIHBcbiAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQuaXMoJ3AnKSB8fCBzZWxlY3RlZEVsZW1lbnQucGFyZW50KCkuaXMoJ3AnKSkge1xuXG4gICAgICAgIC8vIENoZWNrIGlmIGNhcmV0IGlzIGluc2lkZSBzcGVjaWFsIHNlY3Rpb25cbiAgICAgICAgLy8gSW4gdGhpcyBjYXNlIGVuYWJsZSBvbmx5IGZpcnN0IG1lbnVpdGVtIGlmIGNhcmV0IGlzIGluIGFic3RyYWN0XG4gICAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQucGFyZW50cyhTUEVDSUFMX1NFQ1RJT05fU0VMRUNUT1IpLmxlbmd0aCkge1xuXG4gICAgICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKEFCU1RSQUNUX1NFTEVDVE9SKS5sZW5ndGgpXG4gICAgICAgICAgICBtZW51LmNoaWxkcmVuKGA6bHQoMSlgKS5yZW1vdmVDbGFzcygnbWNlLWRpc2FibGVkJylcblxuICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gR2V0IGRlZXBuZXNzIG9mIHRoZSBzZWN0aW9uXG4gICAgICAgIGxldCBkZWVwbmVzcyA9IHNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKFNFQ1RJT05fU0VMRUNUT1IpLmxlbmd0aCArIDFcblxuICAgICAgICAvLyBSZW1vdmUgZGlzYWJsaW5nIGNsYXNzIG9uIGZpcnN0IHtkZWVwbmVzc30gbWVudSBpdGVtc1xuICAgICAgICBtZW51LmNoaWxkcmVuKGA6bHQoJHtkZWVwbmVzc30pYCkucmVtb3ZlQ2xhc3MoJ21jZS1kaXNhYmxlZCcpXG5cbiAgICAgICAgLy8gR2V0IHRoZSBzZWN0aW9uIGxpc3QgYW5kIHVwZGF0ZSB0aGUgZHJvcGRvd24gd2l0aCB0aGUgcmlnaHQgdGV4dHNcbiAgICAgICAgbGV0IGxpc3QgPSBzZWN0aW9uLmdldEFuY2VzdG9yU2VjdGlvbnNMaXN0KHNlbGVjdGVkRWxlbWVudClcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPD0gbGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIG1lbnUuY2hpbGRyZW4oYDplcSgke2l9KWApLmZpbmQoJ3NwYW4ubWNlLXRleHQnKS50ZXh0KGxpc3RbaV0pXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gRW5hYmxlIG9ubHkgZm9yIHVwZ3JhZGUvZG93bmdyYWRlXG4gICAgICBlbHNlIGlmICghc2VsZWN0ZWRFbGVtZW50LnBhcmVudHMoU1BFQ0lBTF9TRUNUSU9OX1NFTEVDVE9SKS5sZW5ndGggJiYgc2VsZWN0ZWRFbGVtZW50LmlzKCdoMSxoMixoMycpKSB7XG5cbiAgICAgICAgLy8gR2V0IHRoZSBzZWxlY3RlZCBzZWN0aW9uXG4gICAgICAgIGxldCBzZWxlY3RlZFNlY3Rpb24gPSBzZWxlY3RlZEVsZW1lbnQucGFyZW50cyhTRUNUSU9OX1NFTEVDVE9SKS5maXJzdCgpXG5cbiAgICAgICAgLy8gR2V0IHRoZSBudW1iZXIgb2YgdGhlIGhlYWRpbmcgKGVnLiBIMSA9PiAxLCBIMiA9PiAyKVxuICAgICAgICBsZXQgaW5kZXggPSBwYXJzZUludChzZWxlY3RlZEVsZW1lbnQucHJvcCgndGFnTmFtZScpLnRvTG93ZXJDYXNlKCkucmVwbGFjZSgnaCcsICcnKSlcblxuICAgICAgICAvLyBHZXQgdGhlIGRlZXBuZXNzIG9mIHRoZSBzZWN0aW9uIChlZy4gMSBpZiBpcyBhIG1haW4gc2VjdGlvbiwgMiBpZiBpcyBhIHN1YnNlY3Rpb24pXG4gICAgICAgIGxldCBkZWVwbmVzcyA9IHNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKFNFQ1RJT05fU0VMRUNUT1IpLmxlbmd0aFxuXG4gICAgICAgIC8vIEdldCB0aGUgbGlzdCBvZiB0ZXh0cyB0aGF0IGFyZSBiZWVcbiAgICAgICAgbGV0IGxpc3QgPSBzZWN0aW9uLmdldEFuY2VzdG9yU2VjdGlvbnNMaXN0KHNlbGVjdGVkRWxlbWVudClcblxuICAgICAgICAvLyBUaGUgdGV4dCBpbmRleCBpbiBsaXN0XG4gICAgICAgIGxldCBpID0gZGVlcG5lc3MgLSBpbmRleFxuXG4gICAgICAgIC8vIENoZWNrIGlmIHRoZSBjdXJyZW50IHNlY3Rpb24gaGFzIGEgcHJldmlvdXMgc2VjdGlvbiBcbiAgICAgICAgLy8gSW4gdGhpcyBjYXNlIHRoZSB1cGdyYWRlIGlzIHBlcm1pdHRlZFxuICAgICAgICBpZiAoc2VsZWN0ZWRTZWN0aW9uLnByZXYoKS5pcyhTRUNUSU9OX1NFTEVDVE9SKSkge1xuXG4gICAgICAgICAgLy8gbWVudSBpdGVtIGluc2lkZSB0aGUgZHJvcGRvd25cbiAgICAgICAgICBsZXQgbWVudUl0ZW0gPSBtZW51LmNoaWxkcmVuKGA6ZXEoJHtpbmRleH0pYClcblxuICAgICAgICAgIGxldCB0bXAgPSBsaXN0W2luZGV4XS5yZXBsYWNlKEhFQURJTkcsICcnKVxuICAgICAgICAgIHRtcCA9IHRtcC5zcGxpdCgnLicpXG4gICAgICAgICAgdG1wW2luZGV4IC0gMV0gPSBwYXJzZUludCh0bXBbaW5kZXggLSAxXSkgLSAxXG5cbiAgICAgICAgICBsZXQgdGV4dCA9IEhFQURJTkcgKyB0bXAuam9pbignLicpXG5cbiAgICAgICAgICBtZW51SXRlbS5maW5kKCdzcGFuLm1jZS10ZXh0JykudGV4dCh0ZXh0KVxuICAgICAgICAgIG1lbnVJdGVtLnJlbW92ZUNsYXNzKCdtY2UtZGlzYWJsZWQnKVxuICAgICAgICAgIG1lbnVJdGVtLmF0dHIoREFUQV9ET1dOR1JBREUsIHRydWUpXG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayBpZiB0aGUgY3VycmVudCBzZWN0aW9uIGhhcyBhIHBhcmVudFxuICAgICAgICAvLyBJbiB0aGlzIGNhc2UgdGhlIHVwZ3JhZGUgaXMgcGVybWl0dGVkXG4gICAgICAgIGlmIChzZWxlY3RlZFNlY3Rpb24ucGFyZW50KFNFQ1RJT05fU0VMRUNUT1IpLmxlbmd0aCkge1xuXG4gICAgICAgICAgaW5kZXggPSBpbmRleCAtIDJcblxuICAgICAgICAgIC8vIG1lbnUgaXRlbSBpbnNpZGUgdGhlIGRyb3Bkb3duXG4gICAgICAgICAgbGV0IG1lbnVJdGVtID0gbWVudS5jaGlsZHJlbihgOmVxKCR7aW5kZXh9KWApXG4gICAgICAgICAgbWVudUl0ZW0uZmluZCgnc3Bhbi5tY2UtdGV4dCcpLnRleHQobGlzdFtpbmRleF0pXG4gICAgICAgICAgbWVudUl0ZW0ucmVtb3ZlQ2xhc3MoJ21jZS1kaXNhYmxlZCcpXG4gICAgICAgICAgbWVudUl0ZW0uYXR0cihEQVRBX1VQR1JBREUsIHRydWUpXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gRGlzYWJsZSBpbiBhbnkgb3RoZXIgY2FzZXNcbiAgICAgIGVsc2VcbiAgICAgICAgbWVudS5jaGlsZHJlbignOmd0KDEwKScpLmFkZENsYXNzKCdtY2UtZGlzYWJsZWQnKVxuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogXG4gICAqL1xuICBnZXRBbmNlc3RvclNlY3Rpb25zTGlzdDogZnVuY3Rpb24gKHNlbGVjdGVkRWxlbWVudCkge1xuXG4gICAgbGV0IHByZUhlYWRlcnMgPSBbXVxuICAgIGxldCBsaXN0ID0gW11cbiAgICBsZXQgcGFyZW50U2VjdGlvbnMgPSBzZWxlY3RlZEVsZW1lbnQucGFyZW50cygnc2VjdGlvbicpXG5cbiAgICAvLyBTYXZlIGluZGV4IG9mIGFsbCBwYXJlbnQgc2VjdGlvbnNcbiAgICBmb3IgKGxldCBpID0gcGFyZW50U2VjdGlvbnMubGVuZ3RoOyBpID4gMDsgaS0tKSB7XG4gICAgICBsZXQgZWxlbSA9ICQocGFyZW50U2VjdGlvbnNbaSAtIDFdKVxuICAgICAgbGV0IGluZGV4ID0gZWxlbS5wYXJlbnQoKS5jaGlsZHJlbihTRUNUSU9OX1NFTEVDVE9SKS5pbmRleChlbGVtKSArIDFcbiAgICAgIHByZUhlYWRlcnMucHVzaChpbmRleClcbiAgICB9XG5cbiAgICAvLyBVcGRhdGUgdGV4dCBvZiBhbGwgbWVudSBpdGVtXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPD0gcHJlSGVhZGVycy5sZW5ndGg7IGkrKykge1xuXG4gICAgICBsZXQgdGV4dCA9IEhFQURJTkdcblxuICAgICAgLy8gVXBkYXRlIHRleHQgYmFzZWQgb24gc2VjdGlvbiBzdHJ1Y3R1cmVcbiAgICAgIGlmIChpICE9IHByZUhlYWRlcnMubGVuZ3RoKSB7XG4gICAgICAgIGZvciAobGV0IHggPSAwOyB4IDw9IGk7IHgrKylcbiAgICAgICAgICB0ZXh0ICs9IGAke3ByZUhlYWRlcnNbeF0gKyAoeCA9PSBpID8gMSA6IDApfS5gXG4gICAgICB9XG5cbiAgICAgIC8vIEluIHRoaXMgY2FzZSByYWplIGNoYW5nZXMgdGV4dCBvZiBuZXh0IHN1YiBoZWFkaW5nXG4gICAgICBlbHNlIHtcbiAgICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCBpOyB4KyspXG4gICAgICAgICAgdGV4dCArPSBgJHtwcmVIZWFkZXJzW3hdfS5gXG5cbiAgICAgICAgdGV4dCArPSAnMS4nXG4gICAgICB9XG5cbiAgICAgIGxpc3QucHVzaCh0ZXh0KVxuICAgIH1cblxuICAgIHJldHVybiBsaXN0XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJlc3RvcmUgbm9ybWFsIHRleHQgaW4gc2VjdGlvbiB0b29sYmFyIGFuZCBkaXNhYmxlIGFsbFxuICAgKi9cbiAgcmVzdG9yZVNlY3Rpb25Ub29sYmFyOiBmdW5jdGlvbiAobWVudSkge1xuXG4gICAgbGV0IGNudCA9IDFcblxuICAgIG1lbnUuY2hpbGRyZW4oJzpsdCg2KScpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgbGV0IHRleHQgPSBIRUFESU5HXG5cbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY250OyBpKyspXG4gICAgICAgIHRleHQgKz0gYDEuYFxuXG4gICAgICAvLyBSZW1vdmUgZGF0YSBlbGVtZW50c1xuICAgICAgJCh0aGlzKS5yZW1vdmVBdHRyKERBVEFfVVBHUkFERSlcbiAgICAgICQodGhpcykucmVtb3ZlQXR0cihEQVRBX0RPV05HUkFERSlcblxuICAgICAgJCh0aGlzKS5maW5kKCdzcGFuLm1jZS10ZXh0JykudGV4dCh0ZXh0KVxuICAgICAgJCh0aGlzKS5hZGRDbGFzcygnbWNlLWRpc2FibGVkJylcblxuICAgICAgY250KytcbiAgICB9KVxuXG4gICAgLy8gRW5hYmxlIHVwZ3JhZGUvZG93bmdyYWRlIGxhc3QgdGhyZWUgbWVudSBpdGVtc1xuICAgIG1lbnUuY2hpbGRyZW4oJzpndCgxMCknKS5yZW1vdmVDbGFzcygnbWNlLWRpc2FibGVkJylcbiAgfSxcblxuICAvKipcbiAgICogXG4gICAqL1xuICBtYW5hZ2VEZWxldGU6IGZ1bmN0aW9uICgpIHtcblxuICAgIGxldCBzZWxlY3RlZENvbnRlbnQgPSB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Q29udGVudCgpXG5cbiAgICAvLyBJZiB0aGUgc2VsZWN0ZWQgY29udGVudCBoYXMgSFRNTCBpbnNpZGVcbiAgICBpZiAoc2VsZWN0ZWRDb250ZW50LmluZGV4T2YoJzwnKSA+IC0xKSB7XG5cbiAgICAgIHNlbGVjdGVkQ29udGVudCA9ICQoc2VsZWN0ZWRDb250ZW50KVxuICAgICAgbGV0IGhhc1NlY3Rpb24gPSBmYWxzZVxuICAgICAgLy8gQ2hlY2sgaWYgb25lIG9mIHRoZSBzZWxlY3RlZCBlbGVtZW50IGlzIGEgc2VjdGlvblxuICAgICAgc2VsZWN0ZWRDb250ZW50LmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoJCh0aGlzKS5pcyhTRUNUSU9OX1NFTEVDVE9SKSlcbiAgICAgICAgICByZXR1cm4gaGFzU2VjdGlvbiA9IHRydWVcbiAgICAgIH0pXG5cbiAgICAgIC8vIElmIHRoZSBzZWxlY3RlZCBjb250ZW50IGhhcyBhIHNlY3Rpb24gaW5zaWRlLCB0aGVuIG1hbmFnZSBkZWxldGVcbiAgICAgIGlmIChoYXNTZWN0aW9uKSB7XG5cbiAgICAgICAgbGV0IHJhbmdlID0gdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldFJuZygpXG4gICAgICAgIGxldCBzdGFydE5vZGUgPSAkKHJhbmdlLnN0YXJ0Q29udGFpbmVyKS5wYXJlbnQoKVxuICAgICAgICBsZXQgZW5kTm9kZSA9ICQocmFuZ2UuZW5kQ29udGFpbmVyKS5wYXJlbnQoKVxuICAgICAgICBsZXQgY29tbW9uQW5jZXN0b3JDb250YWluZXIgPSAkKHJhbmdlLmNvbW1vbkFuY2VzdG9yQ29udGFpbmVyKVxuXG4gICAgICAgIC8vIERlZXBuZXNzIGlzIHJlbGF0aXZlIHRvIHRoZSBjb21tb24gYW5jZXN0b3IgY29udGFpbmVyIG9mIHRoZSByYW5nZSBzdGFydENvbnRhaW5lciBhbmQgZW5kXG4gICAgICAgIGxldCBkZWVwbmVzcyA9IGVuZE5vZGUucGFyZW50KCdzZWN0aW9uJykucGFyZW50c1VudGlsKGNvbW1vbkFuY2VzdG9yQ29udGFpbmVyKS5sZW5ndGggKyAxXG4gICAgICAgIGxldCBjdXJyZW50RWxlbWVudCA9IGVuZE5vZGVcbiAgICAgICAgbGV0IHRvTW92ZUVsZW1lbnRzID0gW11cblxuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICAvLyBHZXQgYW5kIGRldGFjaCBhbGwgbmV4dF9lbmRcbiAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8PSBkZWVwbmVzczsgaSsrKSB7XG4gICAgICAgICAgICBjdXJyZW50RWxlbWVudC5uZXh0QWxsKCdzZWN0aW9uLHAsZmlndXJlLHByZSx1bCxvbCxibG9ja3F1b3RlJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgIHRvTW92ZUVsZW1lbnRzLnB1c2goJCh0aGlzKSlcblxuICAgICAgICAgICAgICAkKHRoaXMpLmRldGFjaCgpXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgY3VycmVudEVsZW1lbnQgPSBjdXJyZW50RWxlbWVudC5wYXJlbnQoKVxuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIEV4ZWN1dGUgZGVsZXRlXG4gICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IuZXhlY0NvbW1hbmQoJ2RlbGV0ZScpXG5cbiAgICAgICAgICAvLyBEZXRhY2ggYWxsIG5leHRfYmVnaW5cbiAgICAgICAgICBzdGFydE5vZGUubmV4dEFsbCgpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJCh0aGlzKS5kZXRhY2goKVxuICAgICAgICAgIH0pXG5cbiAgICAgICAgICAvLyBBcHBlbmQgYWxsIG5leHRfZW5kIHRvIHN0YXJ0bm9kZSBwYXJlbnRcbiAgICAgICAgICB0b01vdmVFbGVtZW50cy5mb3JFYWNoKGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgICAgICAgICBzdGFydE5vZGUucGFyZW50KCdzZWN0aW9uJykuYXBwZW5kKGVsZW1lbnQpXG4gICAgICAgICAgfSlcblxuICAgICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuXG4gICAgICAgICAgLy8gUmVmcmVzaCBoZWFkaW5nc1xuICAgICAgICAgIGhlYWRpbmdEaW1lbnNpb24oKVxuXG4gICAgICAgICAgLy8gVXBkYXRlIHJlZmVyZW5jZXMgaWYgbmVlZGVkXG4gICAgICAgICAgdXBkYXRlUmVmZXJlbmNlcygpXG5cbiAgICAgICAgICB1cGRhdGVJZnJhbWVGcm9tU2F2ZWRDb250ZW50KClcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9XG4gIH1cbn0iXX0=

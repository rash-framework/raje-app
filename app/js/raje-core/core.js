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

const DATA_MATH_ORIGINAL_INPUT = 'data-math-original-input'
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

      // Set plugins [table image link codesample]
      plugins: "searchreplace raje_inlineFigure fullscreen raje_externalLink raje_inlineCode raje_inlineQuote raje_section  noneditable raje_image raje_quoteblock raje_codeblock raje_table raje_listing raje_inline_formula raje_formula raje_crossref raje_footnotes raje_metadata raje_lists raje_save raje_annotations spellchecker paste table link",

      // Remove menubar
      menubar: false,

      // Custom toolbar
      toolbar: 'undo redo bold italic link superscript subscript raje_inlineCode raje_inlineQuote raje_inline_formula raje_crossref raje_footnotes | raje_ol raje_ul raje_codeblock raje_quoteblock raje_table raje_image raje_listing raje_formula | searchreplace spellchecker | raje_section raje_metadata raje_save',

      spellchecker_callback: function (method, text, success, failure) {
        tinymce.util.JSONRequest.sendRPC({
          url: "spellchecker.php",
          method: "spellcheck",
          params: {
            lang: this.getLanguage(),
            words: text.match(this.getWordCharPattern())
          },
          success: function (result) {
            success(result);
          },
          error: function (error, xhr) {
            failure("Spellcheck error: " + error);
          }
        });
      },

      spellchecker_languages: '',

      // Set default target
      default_link_target: "_blank",

      // Prepend protocol if the link starts with www
      link_assume_external_targets: true,

      // Hide target list
      target_list: false,

      // Hide title
      link_title: false,

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
      convert_urls: false,

      // Setup full screen on init
      setup: function (editor) {

        let pasteBookmark

        /**
         * 
         */
        editor.on('init', function (e) {

          editor.execCommand('mceFullScreen')

          // Move caret at the first h1 element of main section
          // Or right after heading
          tinymce.activeEditor.selection.setCursorLocation(tinymce.activeEditor.dom.select(FIRST_HEADING)[0], 0)
        })

        /**
         * 
         */
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

          // Don't capture the click of the sidebar annotation
          if (!$(e.srcElement).parents(SIDEBAR_ANNOTATION).length)

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

            /*
            if (selectedElement.is('span#_mce_caret[data-mce-bogus]') || selectedElement.parent().is('span#_mce_caret[data-mce-bogus]')) {

              // Remove span normally created with bold
              if (selectedElement.parent().is('span#_mce_caret[data-mce-bogus]'))
                selectedElement = selectedElement.parent()

              let bm = tinymce.activeEditor.selection.getBookmark()
              selectedElement.replaceWith(selectedElement.html())
              tinymce.activeEditor.selection.moveToBookmark(bm)
            }
            */
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
    tinymce.activeEditor.$(elementSelector)[0].scrollIntoView();
  }

  /**
   * 
   */
  function getSuccessiveElementId(elementSelector, SUFFIX) {

    let lastId = 0

    tinymce.activeEditor.$(elementSelector).each(function () {
      let currentId = parseInt($(this).attr('id').replace(SUFFIX, ''))
      lastId = currentId > lastId ? currentId : lastId
    })

    return `${SUFFIX}${lastId+1}`
  }

  /**
   * 
   */
  function headingDimension() {
    tinymce.activeEditor.$('h1,h2,h3,h4,h5,h6').each(function () {

      if (!$(this).parents(HEADER_SELECTOR).length && !$(this).parents(SPECIAL_SECTION_SELECTOR).length) {
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
  function checkIfSpecialChar(keycode) {

    return (keycode > 47 && keycode < 58) || // number keys
      (keycode > 95 && keycode < 112) || // numpad keys
      (keycode > 185 && keycode < 193) || // ;=,-./` (in order)
      (keycode > 218 && keycode < 223)
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
    $(SIDEBAR_ANNOTATION).addClass('mceNonEditable')
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

    // For each figure formula
    $('figure[id^="formula_"]').each(function () {

      // Get the id
      let id = $(this).attr('id')
      let asciiMath = $(this).attr(DATA_MATH_ORIGINAL_INPUT)
      $(this).removeAttr(DATA_MATH_ORIGINAL_INPUT)

      MathJax.Hub.Queue(

        // Process the formula by id
        ["Typeset", MathJax.Hub, id],
        function () {

          // Get the element, svg and mathml content
          let figureFormula = $(`#${id}`)
          let svgContent = figureFormula.find('svg')
          let mmlContent = figureFormula.find('script[type="math/mml"]').html()

          // Add the role
          svgContent.attr('role', 'math')
          svgContent.attr('data-mathml', mmlContent)

          // Add the asciimath input if exists
          if (typeof asciiMath != 'undefined')
            svgContent.attr(DATA_MATH_ORIGINAL_INPUT, asciiMath)

          // Update the figure content and its caption
          figureFormula.html(`<p><span>${svgContent[0].outerHTML}</span></p>`)
          captions()

          formula.updateStructure(figureFormula)

          // Update the content and clear the whole undo levels set
          //updateIframeFromSavedContent()
          tinymce.activeEditor.undoManager.clear()
        }
      )
    })
  }

  /** */
  selectionContent = {

    /**
     * 
     */
    containsBibliography: function (selection) {

      let rng = selection.getRng()

      // Save the starting element
      let start = rng.startContainer
      let startNode = $(start.nodeType == 3 ? start.parentNode : start)

      // Save the ending element
      let end = rng.endContainer
      let endNode = $(end.nodeType == 3 ? end.parentNode : end)

      // Controls if the selection has the bibliography inside
      return ($(rng.commonAncestorContainer).find(BIBLIOGRAPHY_SELECTOR).length &&
          (!startNode.is(`${BIBLIOGRAPHY_SELECTOR} > h1`) ||
            !endNode.is(`${BIBLIOGRAPHY_SELECTOR} > h1`))) ||

        // Or if the selection is the bibliography
        ($(rng.commonAncestorContainer).is(BIBLIOGRAPHY_SELECTOR) &&
          (startNode.is('h1') && rng.startOffset == 0) &&
          (endNode.is('p') && rng.endOffset == end.length))
    },

    /**
     * 
     */
    isAtBeginningOfEmptyBiblioentry: function (selection) {

      let rng = selection.getRng()

      // Save the starting element
      let start = rng.startContainer
      let startNode = $(start.nodeType == 3 ? start.parentNode : start)

      // Save the ending element
      let end = rng.endContainer
      let endNode = $(end.nodeType == 3 ? end.parentNode : end)

      return (rng.commonAncestorContainer.nodeType == 3 || $(rng.commonAncestorContainer).is(`${BIBLIOENTRY_SELECTOR} > p`)) &&
        (startNode.is(endNode) && startNode.is(`${BIBLIOENTRY_SELECTOR} > p`)) &&
        (rng.startOffset == rng.endOffset && rng.startOffset == 0)
    },

    /**
     * 
     */
    isAtBeginningOfEmptyEndnote: function (selection) {

      let rng = selection.getRng()

      // Save the starting element
      let start = rng.startContainer
      let startNode = $(start.nodeType == 3 ? start.parentNode : start)

      // Save the ending element
      let end = rng.endContainer
      let endNode = $(end.nodeType == 3 ? end.parentNode : end)

      return ($(rng.commonAncestorContainer).parent().is(ENDNOTE_SELECTOR) && startNode.is(endNode) && startNode.is(`${ENDNOTE_SELECTOR} > p:first-child`)) &&
        ((rng.startOffset == rng.endOffset && rng.startOffset == 0) || (/\r|\n/.exec(start.innerText) != null))
    },

    /**
     * 
     */
    containsBiblioentries: function (selection) {

      let rng = selection.getRng()

      // Save the starting element
      let start = rng.startContainer
      let startNode = $(start.nodeType == 3 ? start.parentNode : start)

      // Save the ending element
      let end = rng.endContainer
      let endNode = $(end.nodeType == 3 ? end.parentNode : end)

      // Check if the selection contains more than one biblioentry
      return ($(rng.commonAncestorContainer).is(`${BIBLIOGRAPHY_SELECTOR} > ul`) || $(rng.commonAncestorContainer).is(BIBLIOGRAPHY_SELECTOR)) &&
        (Boolean(startNode.parent(BIBLIOENTRY_SELECTOR).length) || startNode.is('h1')) &&
        Boolean(endNode.parents(BIBLIOENTRY_SELECTOR).length)
    },
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

  cursor = {

    /**
     * 
     */
    isInsideHeading: function (selection) {

      let rng = selection.getRng()

      // Save the starting element
      let start = rng.startContainer
      let startNode = $(start.nodeType == 3 ? start.parentNode : start)

      // Save the ending element
      let end = rng.endContainer
      let endNode = $(end.nodeType == 3 ? end.parentNode : end)

      // Check if the selection contains more than one biblioentry
      return $(rng.commonAncestorContainer).is(':header') &&
        $(rng.commonAncestorContainer).text().trim().length != rng.startOffset
    },

    isInsideTable: function (selection) {

      let rng = selection.getRng()

      // Save the starting element
      let start = rng.startContainer
      let startNode = $(start.nodeType == 3 ? start.parentNode : start)

      // Save the ending element
      let end = rng.endContainer
      let endNode = $(end.nodeType == 3 ? end.parentNode : end)

      // Check if the selection contains more than one biblioentry
      return ($(rng.commonAncestorContainer).is(FIGURE_TABLE_SELECTOR) || $(rng.commonAncestorContainer).parents(FIGURE_TABLE_SELECTOR).length) &&
        $(rng.commonAncestorContainer).text().trim().length != rng.startOffset
    }
  }
}
//#region 1_raje_section.js Constants

// Text of button labels
const HEADING_BUTTON_LABEL = 'Heading '
const SPECIAL_BUTTON_LABEL = 'Special'
const ABSTRACT_BUTTON_LABEL = 'Abstract'
const ACKNOWLEDGEMENTS_BUTTON_LABEL = 'Acknowledgements'
const REFERENCES_BUTTON_LABEL = 'References'
const HEADINGS_BUTTONLIST_LABEL = 'Headings'

// Message text
const HEADING_TRASFORMATION_FORBIDDEN = 'Error, you cannot transform the current header in this way!'

// Section selector
const MAIN_SECTION_SELECTOR = 'section:not([role])'
const SECTION_SELECTOR = 'section:not([role])'
const SPECIAL_SECTION_SELECTOR = 'section[role]'
const BIBLIOGRAPHY_SELECTOR = 'section[role=doc-bibliography]'
const ENDNOTES_SELECTOR = 'section[role=doc-endnotes]'
const ENDNOTE_SELECTOR = 'section[role=doc-endnote]'

// Element selector
const H1 = 'h1'
const BIBLIOENTRY_SELECTOR = 'li[role=doc-biblioentry]'


//#endregion

//#region commands

const DELETE_CMD = 'Delete'
const UNDO_CMD = 'Undo'
const REDO_CMD = 'Redo'

//#endregion

//#region Annotations

const side_note_reply_selector = '.side_note_reply'
const toggle_annotation_selector = '#toggleAnnotations'
const toggle_sidebar_selector = '#toggleSidebar'

//#endregion

const NON_EDITABLE_HEADER_SELECTOR = 'header.page-header.container.cgen'
const BIBLIOENTRY_SUFFIX = 'biblioentry_'
const ENDNOTE_SUFFIX = 'endnote_'


const ABSTRACT_SELECTOR = 'section[role=doc-abstract]'
const ACKNOWLEDGEMENTS_SELECTOR = 'section[role=doc-acknowledgements]'



const MENU_SELECTOR = 'div[id^=mceu_][id$=-body][role=menu]'

const DATA_UPGRADE = 'data-upgrade'
const DATA_DOWNGRADE = 'data-downgrade'





const DISABLE_SELECTOR_FIGURES = 'figure *, h1, h2, h3, h4, h5, h6,' + BIBLIOGRAPHY_SELECTOR

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

const DISABLE_SELECTOR_INLINE = 'table, img, pre, code'

const SIDEBAR_ANNOTATION = 'aside#annotations'

const INLINE_ERRORS = 'Error, Inline elements can be ONLY created inside the same paragraph'


/**
 * RASH section plugin RAJE
 */

tinymce.PluginManager.add('raje_section', function (editor) {

  // Add the button to select the section
  editor.addButton('raje_section', {
    type: 'menubutton',
    text: HEADINGS_BUTTONLIST_LABEL,
    title: 'heading',
    icons: false,

    // Sections sub menu
    menu: [{
      text: `${HEADING_BUTTON_LABEL}1.`,
      onclick: function (e) {
        section.addOrDownUpgrade(e, 1)
      }
    }, {
      text: `${HEADING_BUTTON_LABEL}1.1.`,
      onclick: function (e) {
        section.addOrDownUpgrade(e, 2)
      }
    }, {
      text: `${HEADING_BUTTON_LABEL}1.1.1.`,
      onclick: function (e) {
        section.addOrDownUpgrade(e, 3)
      }
    }, {
      text: `${HEADING_BUTTON_LABEL}1.1.1.1.`,
      onclick: function (e) {
        section.addOrDownUpgrade(e, 4)
      }
    }, {
      text: `${HEADING_BUTTON_LABEL}1.1.1.1.1.`,
      onclick: function (e) {
        section.addOrDownUpgrade(e, 5)
      }
    }, {
      text: `${HEADING_BUTTON_LABEL}1.1.1.1.1.1.`,
      onclick: function (e) {
        section.addOrDownUpgrade(e, 6)
      }
    }, {
      text: SPECIAL_BUTTON_LABEL,
      menu: [{
          text: ABSTRACT_BUTTON_LABEL,
          onclick: function () {

            section.addAbstract()
          }
        },
        {
          text: ACKNOWLEDGEMENTS_BUTTON_LABEL,
          onclick: function () {
            section.addAcknowledgements()
          }
        },
        {
          text: REFERENCES_BUTTON_LABEL,
          onclick: function () {
            section.handleAddBliblioentry()
          }
        }
      ]
    }]
  })

  editor.on('keyDown', function (e) {

    // instance of the selected element
    let selectedElement = $(tinymce.activeEditor.selection.getNode())
    let selection = tinymce.activeEditor.selection

    let startNode = $(selection.getRng().startContainer)
    let endNode = $(selection.getRng().endContainer)

    // Check if the caret is inside a section
    if ((section.cursorInSection(selection) || section.cursorInSpecialSection(selection))) {

      // Block special chars in special elements
      if (checkIfSpecialChar(e.keyCode) &&
        (startNode.parents(SPECIAL_SECTION_SELECTOR).length || endNode.parents(SPECIAL_SECTION_SELECTOR).length) &&
        (startNode.parents(H1).length > 0 || endNode.parents(H1).length > 0)) {

        e.stopImmediatePropagation()
        return false
      }

      /**
       * Check if BACKSPACE or CANC are pressed
       */
      if (e.keyCode == 8 || e.keyCode == 46) {

        // If the section isn't collapsed
        if (!tinymce.activeEditor.selection.isCollapsed()) {

          // If the selection contains at least a biblioentry
          if (selectionContent.containsBiblioentries(selection)) {

            e.stopImmediatePropagation()

            // Both delete event and update are stored in a single undo level
            tinymce.activeEditor.undoManager.transact(function () {

              tinymce.activeEditor.execCommand(DELETE_CMD)
              section.updateBibliographySection()
              updateReferences()

              tinymce.triggerSave()
            })

            return false
          }

          // If the selection contains the entire bibliography section
          if (selectionContent.containsBibliography(selection)) {

            e.stopImmediatePropagation()

            tinymce.activeEditor.undoManager.transact(function () {

              // Execute normal delete
              tinymce.activeEditor.$(BIBLIOGRAPHY_SELECTOR).remove()
              updateReferences()

              tinymce.triggerSave()
            })

            return false
          }

          // Restructure the entire body if the section isn't collapsed and not inside a special section
          if (!section.cursorInSpecialSection(selection)) {
            e.stopImmediatePropagation()
            section.manageDelete()
            tinymce.triggerSave()
            return false
          }
        }

        // If the section is collapsed
        if (tinymce.activeEditor.selection.isCollapsed()) {

          // If the selection is inside a special section
          if (section.cursorInSpecialSection(selection)) {

            // Remove special section if the cursor is at the beginning
            if ((startNode.parents(H1).length || startNode.is(H1)) && tinymce.activeEditor.selection.getRng().startOffset == 0) {

              e.stopImmediatePropagation()
              section.deleteSpecialSection(selectedElement)
              return false
            }

            // if the cursor is at the beginning of a empty p inside its biblioentry, remove it and update the references
            if (selectionContent.isAtBeginningOfEmptyBiblioentry(selection)) {

              e.stopImmediatePropagation()

              tinymce.activeEditor.undoManager.transact(function () {

                // Execute normal delete
                tinymce.activeEditor.execCommand(DELETE_CMD)
                updateReferences()

                tinymce.triggerSave()
              })

              return false
            }

            // if the cursor is at the beginning of the first empty p inside a footnote, remove it and update the references
            if (selectionContent.isAtBeginningOfEmptyEndnote(selection)) {

              e.stopImmediatePropagation()

              tinymce.activeEditor.undoManager.transact(function () {

                let endnote = selectedElement.parents(ENDNOTE_SELECTOR)

                // If the current endnote is the last one remove the entire footnotes section
                if (!endnote.prev(ENDNOTE_SELECTOR).length && !endnote.next(ENDNOTE_SELECTOR).length)
                  $(ENDNOTES_SELECTOR).remove()

                else 
                  tinymce.activeEditor.execCommand(DELETE_CMD)
                

                updateReferences()

                tinymce.triggerSave()
              })

              return false
            }
          }
        }

        // Prevent remove from header
        if (selectedElement.is(NON_EDITABLE_HEADER_SELECTOR) ||
          (selectedElement.attr('data-mce-caret') == 'after' && selectedElement.parent().is(RAJE_SELECTOR)) ||
          (selectedElement.attr('data-mce-caret') && selectedElement.parent().is(RAJE_SELECTOR)) == 'before')
          return false
      }

      /**
       * Check if ENTER is pressed
       */
      if (e.keyCode == 13) {

        // When enter is pressed inside an header, not at the end of it
        if (cursor.isInsideHeading(selection)) {
          e.stopImmediatePropagation()
          section.addWithEnter()
          return false
        }

        // If selection is before/after header
        if (selectedElement.is('p')) {

          // Block enter before header
          if (selectedElement.attr('data-mce-caret') == 'before') {
            e.stopImmediatePropagation()
            return false
          }


          // Add new section after header
          if (selectedElement.attr('data-mce-caret') == 'after') {
            e.stopImmediatePropagation()
            section.add(1)
            return false
          }
        }

        // If enter is pressed inside bibliography selector
        if (selectedElement.parents(BIBLIOGRAPHY_SELECTOR).length) {

          let id = getSuccessiveElementId(BIBLIOENTRY_SELECTOR, BIBLIOENTRY_SUFFIX)

          // Pressing enter in h1 will add a new biblioentry and caret reposition
          if (selectedElement.is(H1)) {

            section.addBiblioentry(id)
            tinymce.triggerSave()
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
  add: (level, text) => {

    // Select current node
    let selectedElement = $(tinymce.activeEditor.selection.getNode())

    // Create the section
    let newSection = section.create(text != null ? text : selectedElement.html().trim(), level)

    tinymce.activeEditor.undoManager.transact(function () {

      // Check what kind of section needs to be inserted
      if (section.manageSection(selectedElement, newSection, level ? level : selectedElement.parentsUntil(RAJE_SELECTOR).length)) {

        // Remove the selected section
        selectedElement.remove()

        // If the new heading has text nodes, the offset won't be 0 (as normal) but instead it'll be length of node text
        moveCaret(newSection.find(':header').first()[0])

        tinymce.triggerSave()
      }
    })
  },

  /**
   * 
   */
  addOrDownUpgrade: (e, level) => {

    let selectedMenuItem = $(e.target).parent('.mce-menu-item')

    // Upgrade the header selected from iframe
    if (selectedMenuItem.attr(DATA_UPGRADE))
      return this.upgrade()

    // Downgrade the header selected from iframe
    if (selectedMenuItem.attr(DATA_DOWNGRADE))
      return this.downgrade()

    // Transform the paragraph selected from iframe
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
    tinymce.activeEditor.$('section[id]').each(function () {
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

    let deepness = $(selectedElement).parentsUntil('body').length - level + 1

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

      // If there is a parent section, the upgrade is allowed
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

          // Refresh tinymce content and set the heading dimension
          headingDimension()
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

    if (!tinymce.activeEditor.$(ABSTRACT_SELECTOR).length) {

      tinymce.activeEditor.undoManager.transact(function () {

        // This section can only be placed after non editable header
        tinymce.activeEditor.$(NON_EDITABLE_HEADER_SELECTOR).after(`<section id="doc-abstract" role="doc-abstract"><h1>Abstract</h1></section>`)
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

    if (!tinymce.activeEditor.$(ACKNOWLEDGEMENTS_SELECTOR).length) {

      let ack = $(`<section id="doc-acknowledgements" role="doc-acknowledgements"><h1>Acknowledgements</h1></section>`)

      tinymce.activeEditor.undoManager.transact(function () {

        // Insert this section after last non special section 
        // OR after abstract section 
        // OR after non editable header
        if (tinymce.activeEditor.$(MAIN_SECTION_SELECTOR).length)
          tinymce.activeEditor.$(MAIN_SECTION_SELECTOR).last().after(ack)

        else if (tinymce.activeEditor.$(ABSTRACT_SELECTOR).length)
          tinymce.activeEditor.$(ABSTRACT_SELECTOR).after(ack)

        else
          tinymce.activeEditor.$(NON_EDITABLE_HEADER_SELECTOR).after(ack)
      })
    }

    //move caret and set focus to active aditor #105
    moveCaret(tinymce.activeEditor.dom.select(`${ACKNOWLEDGEMENTS_SELECTOR} > h1`)[0])
    scrollTo(ACKNOWLEDGEMENTS_SELECTOR)
  },

  handleAddBliblioentry: function () {

    // Only if bibliography section doesn't exists
    if (!tinymce.activeEditor.$(BIBLIOGRAPHY_SELECTOR).length) {

      tinymce.activeEditor.undoManager.transact(function () {

        // Add new biblioentry
        section.addBiblioentry()

        //move caret and set focus to active aditor #105
        tinymce.activeEditor.selection.select(tinymce.activeEditor.dom.select(`${BIBLIOENTRY_SELECTOR}:last-child`)[0], true)
      })
    } else
      tinymce.activeEditor.selection.select(tinymce.activeEditor.dom.select(`${BIBLIOGRAPHY_SELECTOR}>h1`)[0])

    scrollTo(`${BIBLIOENTRY_SELECTOR}:last-child`)
    tinymce.triggerSave()
    tinymce.activeEditor.focus()
  },

  /**
   * This method is the main one. It's called because all times the intent is to add a new biblioentry (single reference)
   * Then it checks if is necessary to add the entire <section> or only the missing <ul>
   */
  addBiblioentry: function (id, text, listItem) {

    // Add bibliography section if not exists
    if (!tinymce.activeEditor.$(BIBLIOGRAPHY_SELECTOR).length) {

      let bibliography = $(`<section id="doc-bibliography" role="doc-bibliography"><h1>References</h1><ul></ul></section>`)

      // This section is added after acknowledgements section
      // OR after last non special section
      // OR after abstract section
      // OR after non editable header 
      if (tinymce.activeEditor.$(ACKNOWLEDGEMENTS_SELECTOR).length)
        tinymce.activeEditor.$(ACKNOWLEDGEMENTS_SELECTOR).after(bibliography)

      else if (tinymce.activeEditor.$(MAIN_SECTION_SELECTOR).length)
        tinymce.activeEditor.$(MAIN_SECTION_SELECTOR).last().after(bibliography)

      else if (tinymce.activeEditor.$(ABSTRACT_SELECTOR).length)
        tinymce.activeEditor.$(ABSTRACT_SELECTOR).after(bibliography)

      else
        tinymce.activeEditor.$(NON_EDITABLE_HEADER_SELECTOR).after(bibliography)

    }

    // Add ul in bibliography section if not exists
    if (!tinymce.activeEditor.$(BIBLIOGRAPHY_SELECTOR).find('ul').length)
      tinymce.activeEditor.$(BIBLIOGRAPHY_SELECTOR).append('<ul></ul>')

    // IF id and text aren't passed as parameters, these can be retrieved or init from here
    id = (id) ? id : getSuccessiveElementId(BIBLIOENTRY_SELECTOR, BIBLIOENTRY_SUFFIX)
    text = text ? text : '<br/>'

    let newItem = $(`<li role="doc-biblioentry" id="${id}"><p>${text}</p></li>`)

    // Append new li to ul at last position
    // OR insert the new li right after the current one
    if (!listItem)
      tinymce.activeEditor.$(`${BIBLIOGRAPHY_SELECTOR} ul`).append(newItem)

    else
      listItem.after(newItem)
  },

  /**
   * 
   */
  updateBibliographySection: function () {

    // Remove all sections without p child
    tinymce.activeEditor.$(`${BIBLIOENTRY_SELECTOR}:not(:has(p))`).each(function () {
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

          let tmp = list[index].replace(HEADING_BUTTON_LABEL, '')
          tmp = tmp.split('.')
          tmp[index - 1] = parseInt(tmp[index - 1]) - 1

          let text = HEADING_BUTTON_LABEL + tmp.join('.')

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

      let text = HEADING_BUTTON_LABEL

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
      let text = HEADING_BUTTON_LABEL

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
          tinymce.activeEditor.execCommand(DELETE_CMD)

          // Detach all next_begin
          startNode.nextAll().each(function () {
            $(this).detach()
          })

          // Append all next_end to startnode parent
          toMoveElements.forEach(function (element) {
            startNode.parent('section').append(element)
          })

          // Refresh headings
          headingDimension()

          // Update references if needed
          updateReferences()
        })
      }
    }
  },

  /**
   * 
   */
  deleteSpecialSection: function (selectedElement) {

    tinymce.activeEditor.undoManager.transact(function () {

      // Remove the section and update 
      selectedElement.parent(SPECIAL_SECTION_SELECTOR).remove()

      // Update references
      updateReferences()

      tinymce.triggerSave()
    })
  },

  /**
   * 
   */
  cursorInSection: function (selection) {

    return $(selection.getNode()).is(SECTION_SELECTOR) || Boolean($(selection.getNode()).parents(SECTION_SELECTOR).length)
  },

  /**
   * 
   */
  cursorInSpecialSection: function (selection) {

    return $(selection.getNode()).is(SPECIAL_SECTION_SELECTOR) ||
      Boolean($(selection.getRng().startContainer).parents(SPECIAL_SECTION_SELECTOR).length) ||
      Boolean($(selection.getRng().endContainer).parents(SPECIAL_SECTION_SELECTOR).length)
  }
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

      tinymce.activeEditor.$('section').each(function () {

        let level = ''

        if (!$(this).is(ENDNOTE_SELECTOR)) {

          // Sections without role have :after
          if (!$(this).attr('role')) {

            // Save its deepness
            let parentSections = $(this).parentsUntil('body')

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
        }
      })

      return sections
    },

    getAllReferenceableTables: function () {
      let tables = []

      tinymce.activeEditor.$('figure:has(table)').each(function () {
        tables.push({
          reference: $(this).attr('id'),
          text: $(this).find('figcaption').text()
        })
      })

      return tables
    },

    getAllReferenceableListings: function () {
      let listings = []

      tinymce.activeEditor.$('figure:has(pre:has(code))').each(function () {
        listings.push({
          reference: $(this).attr('id'),
          text: $(this).find('figcaption').text()
        })
      })

      return listings
    },

    getAllReferenceableFigures: function () {
      let figures = []

      tinymce.activeEditor.$(FIGURE_IMAGE_SELECTOR).each(function () {
        figures.push({
          reference: $(this).attr('id'),
          text: $(this).find('figcaption').text()
        })
      })

      return figures
    },

    getAllReferenceableFormulas: function () {
      let formulas = []

      tinymce.activeEditor.$(formulabox_selector).each(function () {
        formulas.push({
          reference: $(this).parents(FIGURE_SELECTOR).attr('id'),
          text: `Formula ${$(this).parents(FIGURE_SELECTOR).find('span.cgen').text()}`
        })
      })

      return formulas
    },

    getAllReferenceableReferences: function () {
      let references = []
      
      tinymce.activeEditor.$('section[role=doc-bibliography] li').each(function () {
        references.push({
          reference: $(this).attr('id'),
          text: $(this).text(),
          level: $(this).index() + 1
        })
      })

      return references
    },

    add: function (reference) {

      // Create the empty reference with a whitespace at the end
      tinymce.activeEditor.selection.setContent(`<a contenteditable="false" href="#${reference}">&nbsp;</a>&nbsp;`)
      tinymce.triggerSave()
    },

    update: function () {

      // Update the reference (in saved content)
      references()

      // Prevent adding of nested a as footnotes
      tinymce.activeEditor.$('a>sup>a').each(function () {
        $(this).parent().html($(this).text())
      })
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

  tinymce.triggerSave()

  /* References */
  tinymce.activeEditor.$("a[href]").each(function () {
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
            /* START Removed <a> from <sup> */
            $(this).html("<sup class=\"fn cgen\" contenteditable=\"false\" data-rash-original-content=\"" + original_content + "\"" +
              "name=\"fn_pointer_" + current_id.replace("#", "") +
              "\" title=\"Footnote " + count + ": " +
              $(current_id).text().replace(/\s+/g, " ").trim() + "\">" + count + "</sup>");
            /* END Removed <a> from <sup> */
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

  if (tinymce.activeEditor.$('span.cgen[data-rash-original-content],sup.cgen.fn').length) {

    // Restore all saved content
    tinymce.activeEditor.$('span.cgen[data-rash-original-content],sup.cgen.fn').each(function () {

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
let remove_listing = 0

/**
 * 
 * @param {*} formulaValue 
 * @param {*} callback 
 */
function openInlineFormulaEditor(formulaValue) {
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

/**
 * 
 * @param {*} formulaValue 
 * @param {*} callback 
 */
function openFormulaEditor(formulaValue) {
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

/**
 * Raje_table
 */
tinymce.PluginManager.add('raje_table', function (editor) {

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

    // TODO if inside table

    // keyCode 8 is backspace, 46 is canc
    if (e.keyCode == 8)
      return handleFigureDelete(tinymce.activeEditor.selection)

    if (e.keyCode == 46)
      return handleFigureCanc(tinymce.activeEditor.selection)

    // Handle enter key in figcaption
    if (e.keyCode == 13)
      return handleFigureEnter(tinymce.activeEditor.selection)

    e.stopImmediatePropagation()
  })

  // Handle strange structural modification empty figures or with caption as first child
  editor.on('nodeChange', function () {
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

        // Update all captions with RASH function
        captions()

        // Update all cross-ref
        updateReferences()

        // Save updates 
        tinymce.triggerSave()
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

        // Update all captions with RASH function
        captions()

        // Update all cross-ref
        updateReferences()

        // Save updates 
        tinymce.triggerSave()
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

    let selectedElement = $(tinymce.activeEditor.selection.getNode())

    if (formula.cursorInFormula(selectedElement)) {

      // keyCode 8 is backspace
      if (e.keyCode == 8) {
        e.stopImmediatePropagation()
        return handleFigureDelete(tinymce.activeEditor.selection)
      }

      if (e.keyCode == 46) {
        e.stopImmediatePropagation()
        return handleFigureCanc(tinymce.activeEditor.selection)
      }

      // Handle enter key in figcaption
      if (e.keyCode == 13) {
        e.stopImmediatePropagation()
        return handleFigureEnter(tinymce.activeEditor.selection)
      }

      // Block printable chars in p
      if (selectedElement.is('p') && checkIfPrintableChar(e.keyCode)) {
        e.stopImmediatePropagation()
        return false
      }
    }
  })

  editor.on('click', function (e) {
    let selectedElement = $(tinymce.activeEditor.selection.getNode())

    // Open formula editor clicking on math formulas
    // ONly if the current element the span with contenteditable="false"
    if (selectedElement.is('span[contenteditable=false]') && formula.cursorInFormula(selectedElement)) {

      e.stopImmediatePropagation()

      let figure = selectedElement

      if (!selectedElement.is(FIGURE_FORMULA_SELECTOR))
        figure = selectedElement.parents(FIGURE_FORMULA_SELECTOR)

      openFormulaEditor({
        formula_val: figure.find('svg[data-math-original-input]').attr('data-math-original-input'),
        formula_id: figure.attr('id')
      })
    }
  })

  formula = {
    /**
     * 
     */
    add: function (formula_svg) {

      let selectedElement = $(tinymce.activeEditor.selection.getNode())
      let id = getSuccessiveElementId(FIGURE_FORMULA_SELECTOR, FORMULA_SUFFIX)
      let newFormula = this.create(formula_svg, id)

      tinymce.activeEditor.undoManager.transact(function () {

        // Check if the selected element is not empty, and add the new formula right after
        if (selectedElement.text().trim().length != 0)
          selectedElement.after(newFormula)

        // If selected element is empty, replace it with the new formula
        else
          selectedElement.replaceWith(newFormula)

        // Save updates 
        tinymce.triggerSave()
        captions()

        newFormula = $(`#${id}`)

        formula.updateStructure(newFormula)

        // Add a new empty p after the formula
        if (!newFormula.next().length)
          newFormula.after('<p><br/></p>')

        // Update all cross-ref
        updateReferences()

        // Update Rendered RASH
        //updateIframeFromSavedContent()

        // Move the caret at the start of the next element
        moveCaret(tinymce.activeEditor.dom.getNext(tinymce.activeEditor.dom.get(id), '*'), true)
      })

    },

    /**
     * 
     */
    update: function (formula_svg, formula_id) {

      let selectedFigure = $(`#${formula_id}`)

      tinymce.activeEditor.undoManager.transact(function () {

        selectedFigure.find('svg').replaceWith(formula_svg)
        //updateIframeFromSavedContent()
      })
    },

    /**
     * 
     */
    create: function (formula_svg, id) {
      return `<figure id="${id}"><p><span>${formula_svg[0].outerHTML}</span></p></figure>`
    },

    /**
     * 
     */
    cursorInFormula: function (selectedElement) {

      return (

        // If the selected element is the formula figure
        (selectedElement.is(FIGURE_FORMULA_SELECTOR)) ||

        // If the selected element is inside the formula figure
        selectedElement.parents(FIGURE_FORMULA_SELECTOR).length) == 1 ? true : false
    },

    /**
     * 
     */
    updateStructure: function (formula) {

      // Add a not editable span
      let paragraph = formula.children('p')
      let paragraphContent = paragraph.html()
      paragraph.html(`<span contenteditable="false">${paragraphContent}</span>`)
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

    // NOTE: this behvaiour is the same for codeblock 
    let selectedElement = $(tinymce.activeEditor.selection.getNode())
    if (selectedElement.parents('pre:has(code)').length) {


      if (selectedElement.is('code')) {


        // ENTER
        if (e.keyCode == 13) {
          e.preventDefault()
          return listing.setContent(`\n`)
        }

        //TAB
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


        // Update all captions with RASH function
        captions()

        // Move the caret
        selectRange(newListing.find('code')[0], 0)

        // Update all cross-ref
        updateReferences()

        // Save updates 
        tinymce.triggerSave()
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
 * 
 */
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
      let newFormula = this.create(formula_svg, getSuccessiveElementId(FIGURE_FORMULA_SELECTOR, FORMULA_SUFFIX))

      tinymce.activeEditor.undoManager.transact(function () {

        tinymce.activeEditor.selection.setContent(newFormula)

        // Save updates 
        tinymce.triggerSave()

        captions()

        // Update all cross-ref
        updateReferences()

        // Update Rendered RASH
        //updateIframeFromSavedContent()
      })

    },

    /**
     * 
     */
    update: function (formula_svg, formula_id) {

      let selectedFigure = $(`#${formula_id}`)

      tinymce.activeEditor.undoManager.transact(function () {

        selectedFigure.find('svg').replaceWith(formula_svg)
        //updateIframeFromSavedContent()
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

          // Update all captions with RASH function
          captions()

          // Move the caret
          selectRange(blockCode.find('code')[0], 0)

          // Save updates 
          tinymce.triggerSave()
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

      //ENTER
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

          // Update all captions with RASH function
          captions()

          // Move the caret
          moveCaret(blockQuote[0])

          // Save updates 
          tinymce.triggerSave()
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
  tinymce.activeEditor.$(figurebox_selector).each(function () {
    var cur_caption = $(this).parents("figure").find("figcaption");
    var cur_number = $(this).findNumberRaje(figurebox_selector);
    cur_caption.find('strong').remove();
    cur_caption.html("<strong class=\"cgen\" data-rash-original-content=\"\" contenteditable=\"false\">Figure " + cur_number +
      ". </strong>" + cur_caption.html());
  });
  tinymce.activeEditor.$(tablebox_selector).each(function () {
    var cur_caption = $(this).parents("figure").find("figcaption");
    var cur_number = $(this).findNumberRaje(tablebox_selector);
    cur_caption.find('strong').remove();
    cur_caption.html("<strong class=\"cgen\" data-rash-original-content=\"\" contenteditable=\"false\" >Table " + cur_number +
      ". </strong>" + cur_caption.html());
  });
  tinymce.activeEditor.$(formulabox_selector).each(function () {
    var cur_caption = $(this).parents("figure").find("p");
    var cur_number = $(this).findNumberRaje(formulabox_selector);

    if (cur_caption.find('span.cgen').length) {
      cur_caption.find('span.cgen').remove();
      cur_caption.find('span[contenteditable]').append("<span class=\"cgen\" data-rash-original-content=\"\" > (" + cur_number + ")</span>")
    } else
      cur_caption.html(cur_caption.html() + "<span class=\"cgen\" data-rash-original-content=\"\" > (" +
        cur_number + ")</span>");
  });
  tinymce.activeEditor.$(listingbox_selector).each(function () {
    var cur_caption = $(this).parents("figure").find("figcaption");
    var cur_number = $(this).findNumberRaje(listingbox_selector);
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
function handleFigureChange() {

  // If rash-generated section is delete, re-add it
  if ($('figcaption:not(:has(strong))').length) {
    captions()
    tinymce.triggerSave()
  }
}
/**
 * raje_inline_code plugin RAJE
 */

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

      // Check if ENTER is pressed
      if (e.keyCode == 13) {

        e.preventDefault()
        e.stopImmediatePropagation()
        inline.exit()
      }

      //Check if a PRINTABLE CHAR is pressed
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

      // Check if ENTER is pressed
      if (e.keyCode == 13) {

        e.preventDefault()
        e.stopImmediatePropagation()
        inline.exit()
      }

      // Check if a PRINTABLE CHAR is pressed
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

      tinymce.activeEditor.$('body').addHeaderHTML()
      setNonEditableHeader()

      tinymce.triggerSave()
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

      tinymce.triggerSave()

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

      // If the plugin raje_annotations is added to tinymce 
      if (typeof tinymce.activeEditor.plugins.raje_annotations != undefined)
        article = updateAnnotationsOnSave(article)

      // Execute derash (replace all cgen elements with its original content)
      article.find('*[data-rash-original-content]').each(function () {
        let originalContent = $(this).attr('data-rash-original-content')
        $(this).replaceWith(originalContent)
      })

      article.find('*[data-rash-original-parent-content]').each(function () {
        let originalContent = $(this).attr('data-rash-original-parent-content')
        $(this).parent().replaceWith(originalContent)
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

      // Remove not allowed span elments inside the formula, inline_formula
      article.find(`${FIGURE_FORMULA_SELECTOR},${INLINE_FORMULA_SELECTOR}`).each(function () {
        $(this).children('p').html($(this).find('span[contenteditable]').html())
      })

      article.find(`${FIGURE_FORMULA_SELECTOR},${INLINE_FORMULA_SELECTOR}`).each(function () {
        let svg = $(this).find('svg[data-mathml]')
        if (svg.length) {

          $(this).attr(DATA_MATH_ORIGINAL_INPUT, svg.attr(DATA_MATH_ORIGINAL_INPUT))
          $(this).children('p').html(svg.attr('data-mathml'))
        }
      })

      // Replace tbody with its content #
      article.find('tbody').each(function () {
        $(this).replaceWith($(this).html())
      })

      return `<!DOCTYPE html>${new XMLSerializer().serializeToString(article[0])}`
    },

    /**
     * Return the title 
     */
    getTitle: function () {
      return $('title').text()
    },

  }
})
const not_annotable_elements = `${NON_EDITABLE_HEADER_SELECTOR},${SIDEBAR_ANNOTATION},${INLINE_FORMULA_SELECTOR}`
const annotatorPopupSelector = '#annotatorPopup'
const annotatorFormPopupSelector = '#annotatorFormPopup'
const annotationWrapper = 'span[data-rash-annotation-type]'

const commenting = 'commenting'

tinymce.PluginManager.add('raje_annotations', function (editor) {


  editor.on('click', e => {

    let clickedElement = $(e.srcElement)

    // Close annotatorFormPopup if the user click somewhere else
    if ($(annotatorFormPopupSelector).is(':visible') && (!clickedElement.is(annotatorFormPopupSelector) || !clickedElement.parents(annotatorFormPopupSelector).length))
      hideAnnotationFormPopup()
  })

  editor.on('MouseUp', e => {

    hideAnnotationPopup()

    // If the selection is not collapsed and the element selected is an "annotable element"
    if (!tinymce.activeEditor.selection.isCollapsed() && !$(tinymce.activeEditor.selection.getNode()).is(not_annotable_elements))
      handleAnnotation(e)
  })

  editor.on('init', () => {

    // This is needed because tinymce changes "application" in "mce-application"
    editor.$('script[type="mce-application/ld+json"]').each(function () {
      $(this).attr('type', 'application/ld+json')
    })

    AnnotationContext.render()

    editor.$(toggle_annotation_selector).on('click', function () {
      AnnotationContext.toggleAnnotation()
    })

    editor.$(toggle_sidebar_selector).on('click', function () {
      AnnotationContext.toggleAnnotationToolbar()
    })
  })

  editor.on('keyDown', function (e) {

    let focusElement = editor.$(editor.selection.getNode())

    if (focusElement.is('span[data-rash-annotation-type="wrap"]')) {

      if (e.keyCode == 13) {

        e.preventDefault()
        inline.exit()
      }
    }
  })

  editor.on('ExecCommand', function (e) {

    if (e.command == UNDO_CMD || e.command == REDO_CMD) {

      editor.$(toggle_annotation_selector).on('click', function () {
        AnnotationContext.toggleAnnotation()
      })

      editor.$(toggle_sidebar_selector).on('click', function () {
        AnnotationContext.toggleAnnotationToolbar()
      })

      ANNOTATIONS.forEach(annotation => annotation.setEvents())
    }
  })
})

/**
 * 
 */
handleAnnotation = e => {

  // Show the popup
  showAnnotationPopup(e.clientX, e.clientY)
}

/**
 * 
 */
createAnnotationCommenting = text => {

  const creator = ipcRenderer.sendSync('getSettings').username

  const selection = tinymce.activeEditor.selection

  const range = selection.getRng()

  const rangeStartOffset = range.startOffset
  const rangeEndOffset = range.endOffset

  const nextId = AnnotationContext.getNextAnnotationId()

  const startCssSelector = AnnotationContext.getCssSelector($(selection.getStart()))
  const startOffset = AnnotationContext.getOffset(range.startContainer, rangeStartOffset, startCssSelector)

  const endCssSelector = AnnotationContext.getCssSelector($(selection.getEnd()))
  const endOffset = AnnotationContext.getOffset(range.endContainer, rangeEndOffset, endCssSelector)

  const data = {
    "id": nextId,
    "@contenxt": "http://www.w3.org/ns/anno.jsonld",
    "created": Date.now() + (-(new Date().getTimezoneOffset() * 60000)),
    "bodyValue": text,
    "creator": creator,
    "Motivation": commenting,
    "target": {
      "selector": {
        "startSelector": {
          "@type": "CssSelector",
          "@value": startCssSelector
        },
        "endSelector": {
          "@type": "CssSelector",
          "@value": endCssSelector
        },
        "start": {
          "@type": "DataPositionSelector",
          "@value": startOffset
        },
        "end": {
          "@type": "DataPositionSelector",
          "@value": endOffset
        }
      }
    }
  }

  tinymce.activeEditor.undoManager.transact(function () {

    tinymce.activeEditor.$('body').append(`<script id="${nextId}" type="application/ld+json">${JSON.stringify(data, null, 2) }</script>`)
    AnnotationContext.clearAnnotations()
    AnnotationContext.render()
  })
}

/**
 * 
 */
createAnnotationReplying = (text, targetId) => {

  const creator = ipcRenderer.sendSync('getSettings').username
  const nextId = AnnotationContext.getNextAnnotationId()

  const data = {
    "id": nextId,
    "@contenxt": "http://www.w3.org/ns/anno.jsonld",
    "created": Date.now() + (-(new Date().getTimezoneOffset() * 60000)),
    "bodyValue": text,
    "creator": creator,
    "Motivation": replying,
    "target": targetId
  }

  // Add the new annotation without clearing everything
  tinymce.activeEditor.undoManager.transact(function () {

    tinymce.activeEditor.$('body').append(`<script id="${nextId}" type="application/ld+json">${JSON.stringify(data, null, 2) }</script>`)
    AnnotationContext.renderSingle(nextId, data)
  })
}

/**
 * 
 */
showAnnotationPopup = (x, y) => {

  let annotatorPopup = $(`
    <div id='annotatorPopup'>
      <div class="annotatorPopup_arrow"></div>
      <span class="glyphicon glyphicon-pencil" aria-hidden="true"></span>
    </div>`)

  annotatorPopup.css({
    top: y - 20,
    left: x - 18.5
  })

  annotatorPopup.on('click', function () {
    showAnnotationFormPopup()
  })

  annotatorPopup.appendTo('body')
}

/**
 * 
 */
showAnnotationFormPopup = () => {

  let annotatorFormPopup = $(`
    <div id="annotatorFormPopup">
      <textarea class="form-control" rows="3"></textarea>
      <div class="annotatorFormPopup_footer">
        <a id="annotatorFormPopup_save" class="btn btn-success btn-xs">Annotate</a>
      </div>
    </div>
  `)

  annotatorFormPopup.appendTo('body')

  annotatorFormPopup.css({
    top: $(annotatorPopupSelector).offset().top - annotatorFormPopup.height() / 2 - 20,
    left: $(annotatorPopupSelector).offset().left
  })

  $(`${annotatorFormPopupSelector} a.btn-success`).on('click', function () {

    createAnnotationCommenting($(`${annotatorFormPopupSelector}>textarea`).val(), commenting)
    hideAnnotationFormPopup()
  })

  // Hide the last annotation popup
  hideAnnotationPopup()

  $(`${annotatorFormPopupSelector}>textarea`).focus()

}

/**
 * 
 */
hideAnnotationFormPopup = () => {
  $(annotatorFormPopupSelector).remove()
}

/**
 * 
 */
hideAnnotationPopup = () => {
  $(annotatorPopupSelector).remove()
}

/**
 * 
 */
updateAnnotationsOnSave = article => {

  /**
   * 
   * @param {JQuery object} node 
   * @param {Integer} offset optional, it's needed for the ending offset
   */
  const getOffset = (node, offset = 0) => {

    node = node[0].previousSibling

    while (node != null) {

      if (node.nodeType == 3)
        offset += node.length
      else
        offset += node.innerText.length

      node = node.previousSibling
    }

    return offset
  }

  // Get all annotation scripts
  article.find('script[type="application/ld+json"]').each(function () {

    //TODO update also the Map()
    let json = JSON.parse($(this).html())

    if (json.Motivation == commenting) {

      // Get annotation
      let annotation = ANNOTATIONS.get(json.id)

      // Get the list of highlighted annotations
      const first = tinymce.activeEditor.$(annotation.note_selector).first()
      const last = tinymce.activeEditor.$(annotation.note_selector).last()

      // Update both start and end offsets, the ending offset has also the currnt length
      json.target.selector.start['@value'] = getOffset(first)
      json.target.selector.end['@value'] = getOffset(last, last.text().length)

      // Update both start and end selectors with the right xpath
      json.target.selector.startSelector['@value'] = AnnotationContext.getCssSelector(first)
      json.target.selector.endSelector['@value'] = AnnotationContext.getCssSelector(last)

      $(this).html(JSON.stringify(json, null, 2))
    }
  })

  // Change data-rash-original[-parent]-content
  const content = 'data-rash-original-content'
  const parent = 'data-rash-original-parent-content'
  let attribute

  article.find(annotationWrapper).each(function () {

    if ($(this).attr(content))
      attribute = content

    if ($(this).attr(parent))
      attribute = parent

    $(this).attr(attribute, $(this).html())
  })

  return article
}
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluaXQuanMiLCIwX3JhamVfY29uc3RhbnRzLmpzIiwiMV9yYWplX3NlY3Rpb24uanMiLCIyX3JhamVfY3Jvc3NyZWYuanMiLCIzX3JhamVfZmlndXJlcy5qcyIsIjRfcmFqZV9pbmxpbmVzLmpzIiwiNV9yYWplX2xpc3RzLmpzIiwiNl9yYWplX21ldGFkYXRhLmpzIiwiN19yYWplX3NhdmUuanMiLCI4X3JhamVfYW5ub3RhdGlvbnMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMvcUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3RGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDNTlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzdYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDOW5DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDck9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2hYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN6TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNySEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJjb3JlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBcbiAqIEluaXRpbGl6ZSBUaW55TUNFIGVkaXRvciB3aXRoIGFsbCByZXF1aXJlZCBvcHRpb25zXG4gKi9cblxuLy8gSW52aXNpYmxlIHNwYWNlIGNvbnN0YW50c1xuY29uc3QgWkVST19TUEFDRSA9ICcmIzgyMDM7J1xuY29uc3QgUkFKRV9TRUxFQ1RPUiA9ICdib2R5I3RpbnltY2UnXG5cbi8vIFNlbGVjdG9yIGNvbnN0YW50cyAodG8gbW92ZSBpbnNpZGUgYSBuZXcgY29uc3QgZmlsZSlcbmNvbnN0IEhFQURFUl9TRUxFQ1RPUiA9ICdoZWFkZXIucGFnZS1oZWFkZXIuY29udGFpbmVyLmNnZW4nXG5jb25zdCBGSVJTVF9IRUFESU5HID0gYCR7UkFKRV9TRUxFQ1RPUn0+c2VjdGlvbjpmaXJzdD5oMTpmaXJzdGBcblxuY29uc3QgREFUQV9NQVRIX09SSUdJTkFMX0lOUFVUID0gJ2RhdGEtbWF0aC1vcmlnaW5hbC1pbnB1dCdcbmNvbnN0IFRJTllNQ0VfVE9PTEJBUl9IRUlHVEggPSA3NlxuXG5sZXQgaXBjUmVuZGVyZXIsIHdlYkZyYW1lXG5cbmlmIChoYXNCYWNrZW5kKSB7XG5cbiAgaXBjUmVuZGVyZXIgPSByZXF1aXJlKCdlbGVjdHJvbicpLmlwY1JlbmRlcmVyXG4gIHdlYkZyYW1lID0gcmVxdWlyZSgnZWxlY3Ryb24nKS53ZWJGcmFtZVxuXG4gIC8qKlxuICAgKiBJbml0aWxpc2UgVGlueU1DRSBcbiAgICovXG4gICQoZG9jdW1lbnQpLnJlYWR5KGZ1bmN0aW9uICgpIHtcblxuICAgIC8vIE92ZXJyaWRlIHRoZSBtYXJnaW4gYm90dG9uIGdpdmVuIGJ5IFJBU0ggZm9yIHRoZSBmb290ZXJcbiAgICAkKCdib2R5JykuY3NzKHtcbiAgICAgICdtYXJnaW4tYm90dG9tJzogMFxuICAgIH0pXG5cbiAgICAvL2hpZGUgZm9vdGVyXG4gICAgJCgnZm9vdGVyLmZvb3RlcicpLnJlbW92ZSgpXG5cbiAgICAvL2F0dGFjaCB3aG9sZSBib2R5IGluc2lkZSBhIHBsYWNlaG9sZGVyIGRpdlxuICAgICQoJ2JvZHknKS5odG1sKGA8ZGl2IGlkPVwicmFqZV9yb290XCI+JHskKCdib2R5JykuaHRtbCgpfTwvZGl2PmApXG5cbiAgICAvLyBcbiAgICBzZXROb25FZGl0YWJsZUhlYWRlcigpXG5cbiAgICAvL1xuICAgIG1hdGhtbDJzdmdBbGxGb3JtdWxhcygpXG5cbiAgICB0aW55bWNlLmluaXQoe1xuXG4gICAgICAvLyBTZWxlY3QgdGhlIGVsZW1lbnQgdG8gd3JhcFxuICAgICAgc2VsZWN0b3I6ICcjcmFqZV9yb290JyxcblxuICAgICAgLy8gU2V0IHdpbmRvdyBzaXplXG4gICAgICBoZWlnaHQ6IHdpbmRvdy5pbm5lckhlaWdodCAtIFRJTllNQ0VfVE9PTEJBUl9IRUlHVEgsXG5cbiAgICAgIC8vIFNldCB0aGUgc3R5bGVzIG9mIHRoZSBjb250ZW50IHdyYXBwZWQgaW5zaWRlIHRoZSBlbGVtZW50XG4gICAgICBjb250ZW50X2NzczogWydjc3MvYm9vdHN0cmFwLm1pbi5jc3MnLCAnY3NzL3Jhc2guY3NzJywgJ2Nzcy9yYWplLWNvcmUuY3NzJ10sXG5cbiAgICAgIC8vIFNldCBwbHVnaW5zIFt0YWJsZSBpbWFnZSBsaW5rIGNvZGVzYW1wbGVdXG4gICAgICBwbHVnaW5zOiBcInNlYXJjaHJlcGxhY2UgcmFqZV9pbmxpbmVGaWd1cmUgZnVsbHNjcmVlbiByYWplX2V4dGVybmFsTGluayByYWplX2lubGluZUNvZGUgcmFqZV9pbmxpbmVRdW90ZSByYWplX3NlY3Rpb24gIG5vbmVkaXRhYmxlIHJhamVfaW1hZ2UgcmFqZV9xdW90ZWJsb2NrIHJhamVfY29kZWJsb2NrIHJhamVfdGFibGUgcmFqZV9saXN0aW5nIHJhamVfaW5saW5lX2Zvcm11bGEgcmFqZV9mb3JtdWxhIHJhamVfY3Jvc3NyZWYgcmFqZV9mb290bm90ZXMgcmFqZV9tZXRhZGF0YSByYWplX2xpc3RzIHJhamVfc2F2ZSByYWplX2Fubm90YXRpb25zIHNwZWxsY2hlY2tlciBwYXN0ZSB0YWJsZSBsaW5rXCIsXG5cbiAgICAgIC8vIFJlbW92ZSBtZW51YmFyXG4gICAgICBtZW51YmFyOiBmYWxzZSxcblxuICAgICAgLy8gQ3VzdG9tIHRvb2xiYXJcbiAgICAgIHRvb2xiYXI6ICd1bmRvIHJlZG8gYm9sZCBpdGFsaWMgbGluayBzdXBlcnNjcmlwdCBzdWJzY3JpcHQgcmFqZV9pbmxpbmVDb2RlIHJhamVfaW5saW5lUXVvdGUgcmFqZV9pbmxpbmVfZm9ybXVsYSByYWplX2Nyb3NzcmVmIHJhamVfZm9vdG5vdGVzIHwgcmFqZV9vbCByYWplX3VsIHJhamVfY29kZWJsb2NrIHJhamVfcXVvdGVibG9jayByYWplX3RhYmxlIHJhamVfaW1hZ2UgcmFqZV9saXN0aW5nIHJhamVfZm9ybXVsYSB8IHNlYXJjaHJlcGxhY2Ugc3BlbGxjaGVja2VyIHwgcmFqZV9zZWN0aW9uIHJhamVfbWV0YWRhdGEgcmFqZV9zYXZlJyxcblxuICAgICAgc3BlbGxjaGVja2VyX2NhbGxiYWNrOiBmdW5jdGlvbiAobWV0aG9kLCB0ZXh0LCBzdWNjZXNzLCBmYWlsdXJlKSB7XG4gICAgICAgIHRpbnltY2UudXRpbC5KU09OUmVxdWVzdC5zZW5kUlBDKHtcbiAgICAgICAgICB1cmw6IFwic3BlbGxjaGVja2VyLnBocFwiLFxuICAgICAgICAgIG1ldGhvZDogXCJzcGVsbGNoZWNrXCIsXG4gICAgICAgICAgcGFyYW1zOiB7XG4gICAgICAgICAgICBsYW5nOiB0aGlzLmdldExhbmd1YWdlKCksXG4gICAgICAgICAgICB3b3JkczogdGV4dC5tYXRjaCh0aGlzLmdldFdvcmRDaGFyUGF0dGVybigpKVxuICAgICAgICAgIH0sXG4gICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgc3VjY2VzcyhyZXN1bHQpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgZXJyb3I6IGZ1bmN0aW9uIChlcnJvciwgeGhyKSB7XG4gICAgICAgICAgICBmYWlsdXJlKFwiU3BlbGxjaGVjayBlcnJvcjogXCIgKyBlcnJvcik7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0sXG5cbiAgICAgIHNwZWxsY2hlY2tlcl9sYW5ndWFnZXM6ICcnLFxuXG4gICAgICAvLyBTZXQgZGVmYXVsdCB0YXJnZXRcbiAgICAgIGRlZmF1bHRfbGlua190YXJnZXQ6IFwiX2JsYW5rXCIsXG5cbiAgICAgIC8vIFByZXBlbmQgcHJvdG9jb2wgaWYgdGhlIGxpbmsgc3RhcnRzIHdpdGggd3d3XG4gICAgICBsaW5rX2Fzc3VtZV9leHRlcm5hbF90YXJnZXRzOiB0cnVlLFxuXG4gICAgICAvLyBIaWRlIHRhcmdldCBsaXN0XG4gICAgICB0YXJnZXRfbGlzdDogZmFsc2UsXG5cbiAgICAgIC8vIEhpZGUgdGl0bGVcbiAgICAgIGxpbmtfdGl0bGU6IGZhbHNlLFxuXG4gICAgICAvLyBSZW1vdmUgXCJwb3dlcmVkIGJ5IHRpbnltY2VcIlxuICAgICAgYnJhbmRpbmc6IGZhbHNlLFxuXG4gICAgICAvLyBQcmV2ZW50IGF1dG8gYnIgb24gZWxlbWVudCBpbnNlcnRcbiAgICAgIGFwcGx5X3NvdXJjZV9mb3JtYXR0aW5nOiBmYWxzZSxcblxuICAgICAgLy8gUHJldmVudCBub24gZWRpdGFibGUgb2JqZWN0IHJlc2l6ZVxuICAgICAgb2JqZWN0X3Jlc2l6aW5nOiBmYWxzZSxcblxuICAgICAgLy8gVXBkYXRlIHRoZSB0YWJsZSBwb3BvdmVyIGxheW91dFxuICAgICAgdGFibGVfdG9vbGJhcjogXCJ0YWJsZWluc2VydHJvd2JlZm9yZSB0YWJsZWluc2VydHJvd2FmdGVyIHRhYmxlZGVsZXRlcm93IHwgdGFibGVpbnNlcnRjb2xiZWZvcmUgdGFibGVpbnNlcnRjb2xhZnRlciB0YWJsZWRlbGV0ZWNvbFwiLFxuXG4gICAgICBpbWFnZV9hZHZ0YWI6IHRydWUsXG5cbiAgICAgIHBhc3RlX2Jsb2NrX2Ryb3A6IHRydWUsXG5cbiAgICAgIGV4dGVuZGVkX3ZhbGlkX2VsZW1lbnRzOiBcInN2Z1sqXSxkZWZzWypdLHBhdHRlcm5bKl0sZGVzY1sqXSxtZXRhZGF0YVsqXSxnWypdLG1hc2tbKl0scGF0aFsqXSxsaW5lWypdLG1hcmtlclsqXSxyZWN0WypdLGNpcmNsZVsqXSxlbGxpcHNlWypdLHBvbHlnb25bKl0scG9seWxpbmVbKl0sbGluZWFyR3JhZGllbnRbKl0scmFkaWFsR3JhZGllbnRbKl0sc3RvcFsqXSxpbWFnZVsqXSx2aWV3WypdLHRleHRbKl0sdGV4dFBhdGhbKl0sdGl0bGVbKl0sdHNwYW5bKl0sZ2x5cGhbKl0sc3ltYm9sWypdLHN3aXRjaFsqXSx1c2VbKl1cIixcblxuICAgICAgZm9ybXVsYToge1xuICAgICAgICBwYXRoOiAnbm9kZV9tb2R1bGVzL3RpbnltY2UtZm9ybXVsYS8nXG4gICAgICB9LFxuXG4gICAgICBjbGVhbnVwX29uX3N0YXJ0dXA6IGZhbHNlLFxuICAgICAgdHJpbV9zcGFuX2VsZW1lbnRzOiBmYWxzZSxcbiAgICAgIHZlcmlmeV9odG1sOiBmYWxzZSxcbiAgICAgIGNsZWFudXA6IGZhbHNlLFxuICAgICAgY29udmVydF91cmxzOiBmYWxzZSxcblxuICAgICAgLy8gU2V0dXAgZnVsbCBzY3JlZW4gb24gaW5pdFxuICAgICAgc2V0dXA6IGZ1bmN0aW9uIChlZGl0b3IpIHtcblxuICAgICAgICBsZXQgcGFzdGVCb29rbWFya1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBcbiAgICAgICAgICovXG4gICAgICAgIGVkaXRvci5vbignaW5pdCcsIGZ1bmN0aW9uIChlKSB7XG5cbiAgICAgICAgICBlZGl0b3IuZXhlY0NvbW1hbmQoJ21jZUZ1bGxTY3JlZW4nKVxuXG4gICAgICAgICAgLy8gTW92ZSBjYXJldCBhdCB0aGUgZmlyc3QgaDEgZWxlbWVudCBvZiBtYWluIHNlY3Rpb25cbiAgICAgICAgICAvLyBPciByaWdodCBhZnRlciBoZWFkaW5nXG4gICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLnNldEN1cnNvckxvY2F0aW9uKHRpbnltY2UuYWN0aXZlRWRpdG9yLmRvbS5zZWxlY3QoRklSU1RfSEVBRElORylbMF0sIDApXG4gICAgICAgIH0pXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFxuICAgICAgICAgKi9cbiAgICAgICAgZWRpdG9yLm9uKCdrZXlEb3duJywgZnVuY3Rpb24gKGUpIHtcblxuICAgICAgICAgIC8vIFByZXZlbnQgc2hpZnQrZW50ZXJcbiAgICAgICAgICBpZiAoZS5rZXlDb2RlID09IDEzICYmIGUuc2hpZnRLZXkpXG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcblxuICAgICAgICAgIGlmIChlLmtleUNvZGUgPT0gODYgJiYgZS5tZXRhS2V5KSB7XG5cbiAgICAgICAgICAgIGlmICgkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpLmlzKCdwcmUnKSkge1xuXG4gICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpXG5cbiAgICAgICAgICAgICAgcGFzdGVCb29rbWFyayA9IHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRCb29rbWFyaygpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBcbiAgICAgICAgICovXG4gICAgICAgIGVkaXRvci5vbignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuXG4gICAgICAgICAgLy8gRG9uJ3QgY2FwdHVyZSB0aGUgY2xpY2sgb2YgdGhlIHNpZGViYXIgYW5ub3RhdGlvblxuICAgICAgICAgIGlmICghJChlLnNyY0VsZW1lbnQpLnBhcmVudHMoU0lERUJBUl9BTk5PVEFUSU9OKS5sZW5ndGgpXG5cbiAgICAgICAgICAgIC8vIENhcHR1cmUgdGhlIHRyaXBsZSBjbGljayBldmVudFxuICAgICAgICAgICAgaWYgKGUuZGV0YWlsID09IDMpIHtcblxuICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKVxuXG4gICAgICAgICAgICAgIGxldCB3cmFwcGVyID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Um5nKCkuc3RhcnRDb250YWluZXIpLnBhcmVudHMoJ3AsZmlnY2FwdGlvbiw6aGVhZGVyJykuZmlyc3QoKVxuICAgICAgICAgICAgICBsZXQgc3RhcnRDb250YWluZXIgPSB3cmFwcGVyWzBdXG4gICAgICAgICAgICAgIGxldCBlbmRDb250YWluZXIgPSB3cmFwcGVyWzBdXG4gICAgICAgICAgICAgIGxldCByYW5nZSA9IGRvY3VtZW50LmNyZWF0ZVJhbmdlKClcblxuICAgICAgICAgICAgICAvLyBDaGVjayBpZiB0aGUgd3JhcHBlciBoYXMgbW9yZSB0ZXh0IG5vZGUgaW5zaWRlXG4gICAgICAgICAgICAgIGlmICh3cmFwcGVyLmNvbnRlbnRzKCkubGVuZ3RoID4gMSkge1xuXG4gICAgICAgICAgICAgICAgLy8gSWYgdGhlIGZpcnN0IHRleHQgbm9kZSBpcyBhIG5vdCBlZGl0YWJsZSBzdHJvbmcsIHRoZSBzZWxlY3Rpb24gbXVzdCBzdGFydCB3aXRoIHRoZSBzZWNvbmQgZWxlbWVudFxuICAgICAgICAgICAgICAgIGlmICh3cmFwcGVyLmNvbnRlbnRzKCkuZmlyc3QoKS5pcygnc3Ryb25nW2NvbnRlbnRlZGl0YWJsZT1mYWxzZV0nKSlcbiAgICAgICAgICAgICAgICAgIHN0YXJ0Q29udGFpbmVyID0gd3JhcHBlci5jb250ZW50cygpWzFdXG5cbiAgICAgICAgICAgICAgICAvLyBJbiB0aGlzIGNhc2UgdGhlIGVuZENvbnRhaW5lciB3aWxsIGJlIHRoZSBsYXN0IHRleHQgbm9kZVxuICAgICAgICAgICAgICAgIGVuZENvbnRhaW5lciA9IHdyYXBwZXIuY29udGVudHMoKS5sYXN0KClbMF1cbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIHJhbmdlLnNldFN0YXJ0KHN0YXJ0Q29udGFpbmVyLCAwKVxuXG4gICAgICAgICAgICAgIGlmICh3cmFwcGVyLmlzKCdmaWdjYXB0aW9uJykpXG4gICAgICAgICAgICAgICAgcmFuZ2Uuc2V0RW5kKGVuZENvbnRhaW5lciwgZW5kQ29udGFpbmVyLmxlbmd0aClcblxuICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgcmFuZ2Uuc2V0RW5kKGVuZENvbnRhaW5lciwgMSlcblxuICAgICAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2V0Um5nKHJhbmdlKVxuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0pXG5cbiAgICAgICAgLy8gUHJldmVudCBzcGFuIFxuICAgICAgICBlZGl0b3Iub24oJ25vZGVDaGFuZ2UnLCBmdW5jdGlvbiAoZSkge1xuXG4gICAgICAgICAgbGV0IHNlbGVjdGVkRWxlbWVudCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcblxuICAgICAgICAgIC8vIE1vdmUgY2FyZXQgdG8gZmlyc3QgaGVhZGluZyBpZiBpcyBhZnRlciBvciBiZWZvcmUgbm90IGVkaXRhYmxlIGhlYWRlclxuICAgICAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQuaXMoJ3AnKSAmJiAoc2VsZWN0ZWRFbGVtZW50Lm5leHQoKS5pcyhIRUFERVJfU0VMRUNUT1IpIHx8IChzZWxlY3RlZEVsZW1lbnQucHJldigpLmlzKEhFQURFUl9TRUxFQ1RPUikgJiYgdGlueW1jZS5hY3RpdmVFZGl0b3IuZG9tLnNlbGVjdChGSVJTVF9IRUFESU5HKS5sZW5ndGgpKSlcbiAgICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZXRDdXJzb3JMb2NhdGlvbih0aW55bWNlLmFjdGl2ZUVkaXRvci5kb20uc2VsZWN0KEZJUlNUX0hFQURJTkcpWzBdLCAwKVxuXG4gICAgICAgICAgLy8gSWYgdGhlIGN1cnJlbnQgZWxlbWVudCBpc24ndCBpbnNpZGUgaGVhZGVyLCBvbmx5IGluIHNlY3Rpb24gdGhpcyBpcyBwZXJtaXR0ZWRcbiAgICAgICAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LnBhcmVudHMoJ3NlY3Rpb24nKS5sZW5ndGgpIHtcblxuICAgICAgICAgICAgLypcbiAgICAgICAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQuaXMoJ3NwYW4jX21jZV9jYXJldFtkYXRhLW1jZS1ib2d1c10nKSB8fCBzZWxlY3RlZEVsZW1lbnQucGFyZW50KCkuaXMoJ3NwYW4jX21jZV9jYXJldFtkYXRhLW1jZS1ib2d1c10nKSkge1xuXG4gICAgICAgICAgICAgIC8vIFJlbW92ZSBzcGFuIG5vcm1hbGx5IGNyZWF0ZWQgd2l0aCBib2xkXG4gICAgICAgICAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQucGFyZW50KCkuaXMoJ3NwYW4jX21jZV9jYXJldFtkYXRhLW1jZS1ib2d1c10nKSlcbiAgICAgICAgICAgICAgICBzZWxlY3RlZEVsZW1lbnQgPSBzZWxlY3RlZEVsZW1lbnQucGFyZW50KClcblxuICAgICAgICAgICAgICBsZXQgYm0gPSB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Qm9va21hcmsoKVxuICAgICAgICAgICAgICBzZWxlY3RlZEVsZW1lbnQucmVwbGFjZVdpdGgoc2VsZWN0ZWRFbGVtZW50Lmh0bWwoKSlcbiAgICAgICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLm1vdmVUb0Jvb2ttYXJrKGJtKVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgKi9cbiAgICAgICAgICB9XG4gICAgICAgICAgdXBkYXRlRG9jdW1lbnRTdGF0ZSgpXG4gICAgICAgIH0pXG5cbiAgICAgICAgLy8gVXBkYXRlIHNhdmVkIGNvbnRlbnQgb24gdW5kbyBhbmQgcmVkbyBldmVudHNcbiAgICAgICAgZWRpdG9yLm9uKCdVbmRvJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcbiAgICAgICAgfSlcblxuICAgICAgICBlZGl0b3Iub24oJ1JlZG8nLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuICAgICAgICB9KVxuXG4gICAgICAgIGVkaXRvci5vbignUGFzdGUnLCBmdW5jdGlvbiAoZSkge1xuXG4gICAgICAgICAgbGV0IHRhcmdldCA9ICQoZS50YXJnZXQpXG5cbiAgICAgICAgICAvLyBJZiB0aGUgcGFzdGUgZXZlbnQgaXMgY2FsbGVkIGluc2lkZSBhIGxpc3RpbmdcbiAgICAgICAgICBpZiAocGFzdGVCb29rbWFyayAmJiB0YXJnZXQucGFyZW50cygnZmlndXJlOmhhcyhwcmU6aGFzKGNvZGUpKScpLmxlbmd0aCkge1xuXG4gICAgICAgICAgICBsZXQgZGF0YSA9IGUuY2xpcGJvYXJkRGF0YS5nZXREYXRhKCdUZXh0JylcblxuICAgICAgICAgICAgLy8gUmVzdG9yZSB0aGUgc2VsZWN0aW9uIHNhdmVkIG9uIGNtZCt2XG4gICAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24ubW92ZVRvQm9va21hcmsocGFzdGVCb29rbWFyaylcblxuICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSBjb250ZW50XG4gICAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2V0Q29udGVudChlLmNsaXBib2FyZERhdGEuZ2V0RGF0YSgnVGV4dCcpKVxuXG4gICAgICAgICAgICBwYXN0ZUJvb2ttYXJrID0gbnVsbFxuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgIH0sXG4gICAgfSlcbiAgfSlcblxuICAvKipcbiAgICogT3BlbiBhbmQgY2xvc2UgdGhlIGhlYWRpbmdzIGRyb3Bkb3duXG4gICAqL1xuICAkKHdpbmRvdykubG9hZChmdW5jdGlvbiAoKSB7XG5cbiAgICAvLyBPcGVuIGFuZCBjbG9zZSBtZW51IGhlYWRpbmdzIE7DpGl2ZSB3YXlcbiAgICAkKGBkaXZbYXJpYS1sYWJlbD0naGVhZGluZyddYCkuZmluZCgnYnV0dG9uJykudHJpZ2dlcignY2xpY2snKVxuICAgICQoYGRpdlthcmlhLWxhYmVsPSdoZWFkaW5nJ11gKS5maW5kKCdidXR0b24nKS50cmlnZ2VyKCdjbGljaycpXG4gIH0pXG5cbiAgLyoqXG4gICAqIEFjY2VwdCBhIGpzIG9iamVjdCB0aGF0IGV4aXN0cyBpbiBmcmFtZVxuICAgKiBAcGFyYW0geyp9IGVsZW1lbnQgXG4gICAqL1xuICBmdW5jdGlvbiBtb3ZlQ2FyZXQoZWxlbWVudCwgdG9TdGFydCkge1xuICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZWxlY3QoZWxlbWVudCwgdHJ1ZSlcbiAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uY29sbGFwc2UodG9TdGFydClcblxuICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLmZvY3VzKClcbiAgfVxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGZ1bmN0aW9uIHNlbGVjdFJhbmdlKHN0YXJ0Q29udGFpbmVyLCBzdGFydE9mZnNldCwgZW5kQ29udGFpbmVyLCBlbmRPZmZzZXQpIHtcblxuICAgIGxldCByYW5nZSA9IGRvY3VtZW50LmNyZWF0ZVJhbmdlKClcbiAgICByYW5nZS5zZXRTdGFydChzdGFydENvbnRhaW5lciwgc3RhcnRPZmZzZXQpXG5cbiAgICAvLyBJZiB0aGVzZSBwcm9wZXJ0aWVzIGFyZSBub3QgaW4gdGhlIHNpZ25hdHVyZSB1c2UgdGhlIHN0YXJ0XG4gICAgaWYgKCFlbmRDb250YWluZXIgJiYgIWVuZE9mZnNldCkge1xuICAgICAgZW5kQ29udGFpbmVyID0gc3RhcnRDb250YWluZXJcbiAgICAgIGVuZE9mZnNldCA9IHN0YXJ0T2Zmc2V0XG4gICAgfVxuXG4gICAgcmFuZ2Uuc2V0RW5kKGVuZENvbnRhaW5lciwgZW5kT2Zmc2V0KVxuICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZXRSbmcocmFuZ2UpXG4gIH1cblxuICAvKipcbiAgICogXG4gICAqIEBwYXJhbSB7Kn0gZWxlbWVudCBcbiAgICovXG4gIGZ1bmN0aW9uIG1vdmVDdXJzb3JUb0VuZChlbGVtZW50KSB7XG5cbiAgICBsZXQgaGVhZGluZyA9IGVsZW1lbnRcbiAgICBsZXQgb2Zmc2V0ID0gMFxuXG4gICAgaWYgKGhlYWRpbmcuY29udGVudHMoKS5sZW5ndGgpIHtcblxuICAgICAgaGVhZGluZyA9IGhlYWRpbmcuY29udGVudHMoKS5sYXN0KClcblxuICAgICAgLy8gSWYgdGhlIGxhc3Qgbm9kZSBpcyBhIHN0cm9uZyxlbSxxIGV0Yy4gd2UgaGF2ZSB0byB0YWtlIGl0cyB0ZXh0IFxuICAgICAgaWYgKGhlYWRpbmdbMF0ubm9kZVR5cGUgIT0gMylcbiAgICAgICAgaGVhZGluZyA9IGhlYWRpbmcuY29udGVudHMoKS5sYXN0KClcblxuICAgICAgb2Zmc2V0ID0gaGVhZGluZ1swXS53aG9sZVRleHQubGVuZ3RoXG4gICAgfVxuXG4gICAgdGlueW1jZS5hY3RpdmVFZGl0b3IuZm9jdXMoKVxuICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZXRDdXJzb3JMb2NhdGlvbihoZWFkaW5nWzBdLCBvZmZzZXQpXG4gIH1cblxuICAvKipcbiAgICogXG4gICAqIEBwYXJhbSB7Kn0gZWxlbWVudCBcbiAgICovXG4gIGZ1bmN0aW9uIG1vdmVDdXJzb3JUb1N0YXJ0KGVsZW1lbnQpIHtcblxuICAgIGxldCBoZWFkaW5nID0gZWxlbWVudFxuICAgIGxldCBvZmZzZXQgPSAwXG5cbiAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5mb2N1cygpXG4gICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLnNldEN1cnNvckxvY2F0aW9uKGhlYWRpbmdbMF0sIG9mZnNldClcbiAgfVxuXG5cbiAgLyoqXG4gICAqIENyZWF0ZSBjdXN0b20gaW50byBub3RpZmljYXRpb25cbiAgICogQHBhcmFtIHsqfSB0ZXh0IFxuICAgKiBAcGFyYW0geyp9IHRpbWVvdXQgXG4gICAqL1xuICBmdW5jdGlvbiBub3RpZnkodGV4dCwgdHlwZSwgdGltZW91dCkge1xuXG4gICAgaWYgKHRpbnltY2UuYWN0aXZlRWRpdG9yLm5vdGlmaWNhdGlvbk1hbmFnZXIuZ2V0Tm90aWZpY2F0aW9ucygpLmxlbmd0aClcbiAgICAgIHRvcC50aW55bWNlLmFjdGl2ZUVkaXRvci5ub3RpZmljYXRpb25NYW5hZ2VyLmNsb3NlKClcblxuICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLm5vdGlmaWNhdGlvbk1hbmFnZXIub3Blbih7XG4gICAgICB0ZXh0OiB0ZXh0LFxuICAgICAgdHlwZTogdHlwZSA/IHR5cGUgOiAnaW5mbycsXG4gICAgICB0aW1lb3V0OiAzMDAwXG4gICAgfSlcbiAgfVxuXG4gIC8qKlxuICAgKiBcbiAgICogQHBhcmFtIHsqfSBlbGVtZW50U2VsZWN0b3IgXG4gICAqL1xuICBmdW5jdGlvbiBzY3JvbGxUbyhlbGVtZW50U2VsZWN0b3IpIHtcbiAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci4kKGVsZW1lbnRTZWxlY3RvcilbMF0uc2Nyb2xsSW50b1ZpZXcoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGZ1bmN0aW9uIGdldFN1Y2Nlc3NpdmVFbGVtZW50SWQoZWxlbWVudFNlbGVjdG9yLCBTVUZGSVgpIHtcblxuICAgIGxldCBsYXN0SWQgPSAwXG5cbiAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci4kKGVsZW1lbnRTZWxlY3RvcikuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICBsZXQgY3VycmVudElkID0gcGFyc2VJbnQoJCh0aGlzKS5hdHRyKCdpZCcpLnJlcGxhY2UoU1VGRklYLCAnJykpXG4gICAgICBsYXN0SWQgPSBjdXJyZW50SWQgPiBsYXN0SWQgPyBjdXJyZW50SWQgOiBsYXN0SWRcbiAgICB9KVxuXG4gICAgcmV0dXJuIGAke1NVRkZJWH0ke2xhc3RJZCsxfWBcbiAgfVxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGZ1bmN0aW9uIGhlYWRpbmdEaW1lbnNpb24oKSB7XG4gICAgdGlueW1jZS5hY3RpdmVFZGl0b3IuJCgnaDEsaDIsaDMsaDQsaDUsaDYnKS5lYWNoKGZ1bmN0aW9uICgpIHtcblxuICAgICAgaWYgKCEkKHRoaXMpLnBhcmVudHMoSEVBREVSX1NFTEVDVE9SKS5sZW5ndGggJiYgISQodGhpcykucGFyZW50cyhTUEVDSUFMX1NFQ1RJT05fU0VMRUNUT1IpLmxlbmd0aCkge1xuICAgICAgICB2YXIgY291bnRlciA9IDA7XG4gICAgICAgICQodGhpcykucGFyZW50cyhcInNlY3Rpb25cIikuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgaWYgKCQodGhpcykuY2hpbGRyZW4oXCJoMSxoMixoMyxoNCxoNSxoNlwiKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb3VudGVyKys7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgJCh0aGlzKS5yZXBsYWNlV2l0aChcIjxoXCIgKyBjb3VudGVyICsgXCIgZGF0YS1yYXNoLW9yaWdpbmFsLXdyYXBwZXI9XFxcImgxXFxcIiA+XCIgKyAkKHRoaXMpLmh0bWwoKSArIFwiPC9oXCIgKyBjb3VudGVyICsgXCI+XCIpXG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogXG4gICAqL1xuICBmdW5jdGlvbiBjaGVja0lmUHJpbnRhYmxlQ2hhcihrZXljb2RlKSB7XG5cbiAgICByZXR1cm4gKGtleWNvZGUgPiA0NyAmJiBrZXljb2RlIDwgNTgpIHx8IC8vIG51bWJlciBrZXlzXG4gICAgICAoa2V5Y29kZSA9PSAzMiB8fCBrZXljb2RlID09IDEzKSB8fCAvLyBzcGFjZWJhciAmIHJldHVybiBrZXkocykgKGlmIHlvdSB3YW50IHRvIGFsbG93IGNhcnJpYWdlIHJldHVybnMpXG4gICAgICAoa2V5Y29kZSA+IDY0ICYmIGtleWNvZGUgPCA5MSkgfHwgLy8gbGV0dGVyIGtleXNcbiAgICAgIChrZXljb2RlID4gOTUgJiYga2V5Y29kZSA8IDExMikgfHwgLy8gbnVtcGFkIGtleXNcbiAgICAgIChrZXljb2RlID4gMTg1ICYmIGtleWNvZGUgPCAxOTMpIHx8IC8vIDs9LC0uL2AgKGluIG9yZGVyKVxuICAgICAgKGtleWNvZGUgPiAyMTggJiYga2V5Y29kZSA8IDIyMyk7IC8vIFtcXF0nIChpbiBvcmRlcilcbiAgfVxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGZ1bmN0aW9uIGNoZWNrSWZTcGVjaWFsQ2hhcihrZXljb2RlKSB7XG5cbiAgICByZXR1cm4gKGtleWNvZGUgPiA0NyAmJiBrZXljb2RlIDwgNTgpIHx8IC8vIG51bWJlciBrZXlzXG4gICAgICAoa2V5Y29kZSA+IDk1ICYmIGtleWNvZGUgPCAxMTIpIHx8IC8vIG51bXBhZCBrZXlzXG4gICAgICAoa2V5Y29kZSA+IDE4NSAmJiBrZXljb2RlIDwgMTkzKSB8fCAvLyA7PSwtLi9gIChpbiBvcmRlcilcbiAgICAgIChrZXljb2RlID4gMjE4ICYmIGtleWNvZGUgPCAyMjMpXG4gIH1cblxuICAvKipcbiAgICogXG4gICAqL1xuICBmdW5jdGlvbiBtYXJrVGlueU1DRSgpIHtcbiAgICAkKCdkaXZbaWRePW1jZXVfXScpLmF0dHIoJ2RhdGEtcmFzaC1vcmlnaW5hbC1jb250ZW50JywgJycpXG4gIH1cblxuICAvKipcbiAgICogXG4gICAqL1xuICBmdW5jdGlvbiBzZXROb25FZGl0YWJsZUhlYWRlcigpIHtcbiAgICAkKEhFQURFUl9TRUxFQ1RPUikuYWRkQ2xhc3MoJ21jZU5vbkVkaXRhYmxlJylcbiAgICAkKFNJREVCQVJfQU5OT1RBVElPTikuYWRkQ2xhc3MoJ21jZU5vbkVkaXRhYmxlJylcbiAgfVxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGZ1bmN0aW9uIGNoZWNrSWZBcHAoKSB7XG4gICAgcmV0dXJuIGlwY1JlbmRlcmVyLnNlbmRTeW5jKCdpc0FwcFN5bmMnKVxuICB9XG5cbiAgLyoqXG4gICAqIFxuICAgKi9cbiAgZnVuY3Rpb24gc2VsZWN0SW1hZ2UoKSB7XG4gICAgcmV0dXJuIGlwY1JlbmRlcmVyLnNlbmRTeW5jKCdzZWxlY3RJbWFnZVN5bmMnKVxuICB9XG5cbiAgLyoqXG4gICAqIFNlbmQgYSBtZXNzYWdlIHRvIHRoZSBiYWNrZW5kLCBub3RpZnkgdGhlIHN0cnVjdHVyYWwgY2hhbmdlXG4gICAqIFxuICAgKiBJZiB0aGUgZG9jdW1lbnQgaXMgZHJhZnQgc3RhdGUgPSB0cnVlXG4gICAqIElmIHRoZSBkb2N1bWVudCBpcyBzYXZlZCBzdGF0ZSA9IGZhbHNlXG4gICAqL1xuICBmdW5jdGlvbiB1cGRhdGVEb2N1bWVudFN0YXRlKCkge1xuXG4gICAgLy8gR2V0IHRoZSBJZnJhbWUgY29udGVudCBub3QgaW4geG1sIFxuICAgIGxldCBKcXVlcnlJZnJhbWUgPSAkKGA8ZGl2PiR7dGlueW1jZS5hY3RpdmVFZGl0b3IuZ2V0Q29udGVudCgpfTwvZGl2PmApXG4gICAgbGV0IEpxdWVyeVNhdmVkQ29udGVudCA9ICQoYCNyYWplX3Jvb3RgKVxuXG4gICAgLy8gVHJ1ZSBpZiB0aGV5J3JlIGRpZmZlcmVudCwgRmFsc2UgaXMgdGhleSdyZSBlcXVhbFxuICAgIGlwY1JlbmRlcmVyLnNlbmQoJ3VwZGF0ZURvY3VtZW50U3RhdGUnLCBKcXVlcnlJZnJhbWUuaHRtbCgpICE9IEpxdWVyeVNhdmVkQ29udGVudC5odG1sKCkpXG4gIH1cblxuICAvKipcbiAgICogXG4gICAqL1xuICBmdW5jdGlvbiBzYXZlQXNBcnRpY2xlKG9wdGlvbnMpIHtcbiAgICByZXR1cm4gaXBjUmVuZGVyZXIuc2VuZCgnc2F2ZUFzQXJ0aWNsZScsIG9wdGlvbnMpXG4gIH1cblxuICAvKipcbiAgICogXG4gICAqL1xuICBmdW5jdGlvbiBzYXZlQXJ0aWNsZShvcHRpb25zKSB7XG4gICAgcmV0dXJuIGlwY1JlbmRlcmVyLnNlbmQoJ3NhdmVBcnRpY2xlJywgb3B0aW9ucylcbiAgfVxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGZ1bmN0aW9uIG1hdGhtbDJzdmdBbGxGb3JtdWxhcygpIHtcblxuICAgIC8vIEZvciBlYWNoIGZpZ3VyZSBmb3JtdWxhXG4gICAgJCgnZmlndXJlW2lkXj1cImZvcm11bGFfXCJdJykuZWFjaChmdW5jdGlvbiAoKSB7XG5cbiAgICAgIC8vIEdldCB0aGUgaWRcbiAgICAgIGxldCBpZCA9ICQodGhpcykuYXR0cignaWQnKVxuICAgICAgbGV0IGFzY2lpTWF0aCA9ICQodGhpcykuYXR0cihEQVRBX01BVEhfT1JJR0lOQUxfSU5QVVQpXG4gICAgICAkKHRoaXMpLnJlbW92ZUF0dHIoREFUQV9NQVRIX09SSUdJTkFMX0lOUFVUKVxuXG4gICAgICBNYXRoSmF4Lkh1Yi5RdWV1ZShcblxuICAgICAgICAvLyBQcm9jZXNzIHRoZSBmb3JtdWxhIGJ5IGlkXG4gICAgICAgIFtcIlR5cGVzZXRcIiwgTWF0aEpheC5IdWIsIGlkXSxcbiAgICAgICAgZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgLy8gR2V0IHRoZSBlbGVtZW50LCBzdmcgYW5kIG1hdGhtbCBjb250ZW50XG4gICAgICAgICAgbGV0IGZpZ3VyZUZvcm11bGEgPSAkKGAjJHtpZH1gKVxuICAgICAgICAgIGxldCBzdmdDb250ZW50ID0gZmlndXJlRm9ybXVsYS5maW5kKCdzdmcnKVxuICAgICAgICAgIGxldCBtbWxDb250ZW50ID0gZmlndXJlRm9ybXVsYS5maW5kKCdzY3JpcHRbdHlwZT1cIm1hdGgvbW1sXCJdJykuaHRtbCgpXG5cbiAgICAgICAgICAvLyBBZGQgdGhlIHJvbGVcbiAgICAgICAgICBzdmdDb250ZW50LmF0dHIoJ3JvbGUnLCAnbWF0aCcpXG4gICAgICAgICAgc3ZnQ29udGVudC5hdHRyKCdkYXRhLW1hdGhtbCcsIG1tbENvbnRlbnQpXG5cbiAgICAgICAgICAvLyBBZGQgdGhlIGFzY2lpbWF0aCBpbnB1dCBpZiBleGlzdHNcbiAgICAgICAgICBpZiAodHlwZW9mIGFzY2lpTWF0aCAhPSAndW5kZWZpbmVkJylcbiAgICAgICAgICAgIHN2Z0NvbnRlbnQuYXR0cihEQVRBX01BVEhfT1JJR0lOQUxfSU5QVVQsIGFzY2lpTWF0aClcblxuICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgZmlndXJlIGNvbnRlbnQgYW5kIGl0cyBjYXB0aW9uXG4gICAgICAgICAgZmlndXJlRm9ybXVsYS5odG1sKGA8cD48c3Bhbj4ke3N2Z0NvbnRlbnRbMF0ub3V0ZXJIVE1MfTwvc3Bhbj48L3A+YClcbiAgICAgICAgICBjYXB0aW9ucygpXG5cbiAgICAgICAgICBmb3JtdWxhLnVwZGF0ZVN0cnVjdHVyZShmaWd1cmVGb3JtdWxhKVxuXG4gICAgICAgICAgLy8gVXBkYXRlIHRoZSBjb250ZW50IGFuZCBjbGVhciB0aGUgd2hvbGUgdW5kbyBsZXZlbHMgc2V0XG4gICAgICAgICAgLy91cGRhdGVJZnJhbWVGcm9tU2F2ZWRDb250ZW50KClcbiAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci5jbGVhcigpXG4gICAgICAgIH1cbiAgICAgIClcbiAgICB9KVxuICB9XG5cbiAgLyoqICovXG4gIHNlbGVjdGlvbkNvbnRlbnQgPSB7XG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBjb250YWluc0JpYmxpb2dyYXBoeTogZnVuY3Rpb24gKHNlbGVjdGlvbikge1xuXG4gICAgICBsZXQgcm5nID0gc2VsZWN0aW9uLmdldFJuZygpXG5cbiAgICAgIC8vIFNhdmUgdGhlIHN0YXJ0aW5nIGVsZW1lbnRcbiAgICAgIGxldCBzdGFydCA9IHJuZy5zdGFydENvbnRhaW5lclxuICAgICAgbGV0IHN0YXJ0Tm9kZSA9ICQoc3RhcnQubm9kZVR5cGUgPT0gMyA/IHN0YXJ0LnBhcmVudE5vZGUgOiBzdGFydClcblxuICAgICAgLy8gU2F2ZSB0aGUgZW5kaW5nIGVsZW1lbnRcbiAgICAgIGxldCBlbmQgPSBybmcuZW5kQ29udGFpbmVyXG4gICAgICBsZXQgZW5kTm9kZSA9ICQoZW5kLm5vZGVUeXBlID09IDMgPyBlbmQucGFyZW50Tm9kZSA6IGVuZClcblxuICAgICAgLy8gQ29udHJvbHMgaWYgdGhlIHNlbGVjdGlvbiBoYXMgdGhlIGJpYmxpb2dyYXBoeSBpbnNpZGVcbiAgICAgIHJldHVybiAoJChybmcuY29tbW9uQW5jZXN0b3JDb250YWluZXIpLmZpbmQoQklCTElPR1JBUEhZX1NFTEVDVE9SKS5sZW5ndGggJiZcbiAgICAgICAgICAoIXN0YXJ0Tm9kZS5pcyhgJHtCSUJMSU9HUkFQSFlfU0VMRUNUT1J9ID4gaDFgKSB8fFxuICAgICAgICAgICAgIWVuZE5vZGUuaXMoYCR7QklCTElPR1JBUEhZX1NFTEVDVE9SfSA+IGgxYCkpKSB8fFxuXG4gICAgICAgIC8vIE9yIGlmIHRoZSBzZWxlY3Rpb24gaXMgdGhlIGJpYmxpb2dyYXBoeVxuICAgICAgICAoJChybmcuY29tbW9uQW5jZXN0b3JDb250YWluZXIpLmlzKEJJQkxJT0dSQVBIWV9TRUxFQ1RPUikgJiZcbiAgICAgICAgICAoc3RhcnROb2RlLmlzKCdoMScpICYmIHJuZy5zdGFydE9mZnNldCA9PSAwKSAmJlxuICAgICAgICAgIChlbmROb2RlLmlzKCdwJykgJiYgcm5nLmVuZE9mZnNldCA9PSBlbmQubGVuZ3RoKSlcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgaXNBdEJlZ2lubmluZ09mRW1wdHlCaWJsaW9lbnRyeTogZnVuY3Rpb24gKHNlbGVjdGlvbikge1xuXG4gICAgICBsZXQgcm5nID0gc2VsZWN0aW9uLmdldFJuZygpXG5cbiAgICAgIC8vIFNhdmUgdGhlIHN0YXJ0aW5nIGVsZW1lbnRcbiAgICAgIGxldCBzdGFydCA9IHJuZy5zdGFydENvbnRhaW5lclxuICAgICAgbGV0IHN0YXJ0Tm9kZSA9ICQoc3RhcnQubm9kZVR5cGUgPT0gMyA/IHN0YXJ0LnBhcmVudE5vZGUgOiBzdGFydClcblxuICAgICAgLy8gU2F2ZSB0aGUgZW5kaW5nIGVsZW1lbnRcbiAgICAgIGxldCBlbmQgPSBybmcuZW5kQ29udGFpbmVyXG4gICAgICBsZXQgZW5kTm9kZSA9ICQoZW5kLm5vZGVUeXBlID09IDMgPyBlbmQucGFyZW50Tm9kZSA6IGVuZClcblxuICAgICAgcmV0dXJuIChybmcuY29tbW9uQW5jZXN0b3JDb250YWluZXIubm9kZVR5cGUgPT0gMyB8fCAkKHJuZy5jb21tb25BbmNlc3RvckNvbnRhaW5lcikuaXMoYCR7QklCTElPRU5UUllfU0VMRUNUT1J9ID4gcGApKSAmJlxuICAgICAgICAoc3RhcnROb2RlLmlzKGVuZE5vZGUpICYmIHN0YXJ0Tm9kZS5pcyhgJHtCSUJMSU9FTlRSWV9TRUxFQ1RPUn0gPiBwYCkpICYmXG4gICAgICAgIChybmcuc3RhcnRPZmZzZXQgPT0gcm5nLmVuZE9mZnNldCAmJiBybmcuc3RhcnRPZmZzZXQgPT0gMClcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgaXNBdEJlZ2lubmluZ09mRW1wdHlFbmRub3RlOiBmdW5jdGlvbiAoc2VsZWN0aW9uKSB7XG5cbiAgICAgIGxldCBybmcgPSBzZWxlY3Rpb24uZ2V0Um5nKClcblxuICAgICAgLy8gU2F2ZSB0aGUgc3RhcnRpbmcgZWxlbWVudFxuICAgICAgbGV0IHN0YXJ0ID0gcm5nLnN0YXJ0Q29udGFpbmVyXG4gICAgICBsZXQgc3RhcnROb2RlID0gJChzdGFydC5ub2RlVHlwZSA9PSAzID8gc3RhcnQucGFyZW50Tm9kZSA6IHN0YXJ0KVxuXG4gICAgICAvLyBTYXZlIHRoZSBlbmRpbmcgZWxlbWVudFxuICAgICAgbGV0IGVuZCA9IHJuZy5lbmRDb250YWluZXJcbiAgICAgIGxldCBlbmROb2RlID0gJChlbmQubm9kZVR5cGUgPT0gMyA/IGVuZC5wYXJlbnROb2RlIDogZW5kKVxuXG4gICAgICByZXR1cm4gKCQocm5nLmNvbW1vbkFuY2VzdG9yQ29udGFpbmVyKS5wYXJlbnQoKS5pcyhFTkROT1RFX1NFTEVDVE9SKSAmJiBzdGFydE5vZGUuaXMoZW5kTm9kZSkgJiYgc3RhcnROb2RlLmlzKGAke0VORE5PVEVfU0VMRUNUT1J9ID4gcDpmaXJzdC1jaGlsZGApKSAmJlxuICAgICAgICAoKHJuZy5zdGFydE9mZnNldCA9PSBybmcuZW5kT2Zmc2V0ICYmIHJuZy5zdGFydE9mZnNldCA9PSAwKSB8fCAoL1xccnxcXG4vLmV4ZWMoc3RhcnQuaW5uZXJUZXh0KSAhPSBudWxsKSlcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgY29udGFpbnNCaWJsaW9lbnRyaWVzOiBmdW5jdGlvbiAoc2VsZWN0aW9uKSB7XG5cbiAgICAgIGxldCBybmcgPSBzZWxlY3Rpb24uZ2V0Um5nKClcblxuICAgICAgLy8gU2F2ZSB0aGUgc3RhcnRpbmcgZWxlbWVudFxuICAgICAgbGV0IHN0YXJ0ID0gcm5nLnN0YXJ0Q29udGFpbmVyXG4gICAgICBsZXQgc3RhcnROb2RlID0gJChzdGFydC5ub2RlVHlwZSA9PSAzID8gc3RhcnQucGFyZW50Tm9kZSA6IHN0YXJ0KVxuXG4gICAgICAvLyBTYXZlIHRoZSBlbmRpbmcgZWxlbWVudFxuICAgICAgbGV0IGVuZCA9IHJuZy5lbmRDb250YWluZXJcbiAgICAgIGxldCBlbmROb2RlID0gJChlbmQubm9kZVR5cGUgPT0gMyA/IGVuZC5wYXJlbnROb2RlIDogZW5kKVxuXG4gICAgICAvLyBDaGVjayBpZiB0aGUgc2VsZWN0aW9uIGNvbnRhaW5zIG1vcmUgdGhhbiBvbmUgYmlibGlvZW50cnlcbiAgICAgIHJldHVybiAoJChybmcuY29tbW9uQW5jZXN0b3JDb250YWluZXIpLmlzKGAke0JJQkxJT0dSQVBIWV9TRUxFQ1RPUn0gPiB1bGApIHx8ICQocm5nLmNvbW1vbkFuY2VzdG9yQ29udGFpbmVyKS5pcyhCSUJMSU9HUkFQSFlfU0VMRUNUT1IpKSAmJlxuICAgICAgICAoQm9vbGVhbihzdGFydE5vZGUucGFyZW50KEJJQkxJT0VOVFJZX1NFTEVDVE9SKS5sZW5ndGgpIHx8IHN0YXJ0Tm9kZS5pcygnaDEnKSkgJiZcbiAgICAgICAgQm9vbGVhbihlbmROb2RlLnBhcmVudHMoQklCTElPRU5UUllfU0VMRUNUT1IpLmxlbmd0aClcbiAgICB9LFxuICB9XG5cbiAgLyoqXG4gICAqIFN0YXJ0IHRoZSBzYXZlIGFzIHByb2Nlc3MgZ2V0dGluZyB0aGUgZGF0YSBhbmQgc2VuZGluZyBpdFxuICAgKiB0byB0aGUgbWFpbiBwcm9jZXNzXG4gICAqL1xuICBpcGNSZW5kZXJlci5vbignZXhlY3V0ZVNhdmVBcycsIChldmVudCwgZGF0YSkgPT4ge1xuICAgIHNhdmVNYW5hZ2VyLnNhdmVBcygpXG4gIH0pXG5cbiAgLyoqXG4gICAqIFN0YXJ0IHRoZSBzYXZlIHByb2Nlc3MgZ2V0dGluZyB0aGUgZGF0YSBhbmQgc2VuZGluZyBpdFxuICAgKiB0byB0aGUgbWFpbiBwcm9jZXNzXG4gICAqL1xuICBpcGNSZW5kZXJlci5vbignZXhlY3V0ZVNhdmUnLCAoZXZlbnQsIGRhdGEpID0+IHtcbiAgICBzYXZlTWFuYWdlci5zYXZlKClcbiAgfSlcblxuICAvKipcbiAgICogXG4gICAqL1xuICBpcGNSZW5kZXJlci5vbignbm90aWZ5JywgKGV2ZW50LCBkYXRhKSA9PiB7XG4gICAgbm90aWZ5KGRhdGEudGV4dCwgZGF0YS50eXBlLCBkYXRhLnRpbWVvdXQpXG4gIH0pXG5cbiAgLyoqXG4gICAqIFxuICAgKi9cbiAgaXBjUmVuZGVyZXIub24oJ3VwZGF0ZUNvbnRlbnQnLCAoZXZlbnQsIGRhdGEpID0+IHtcbiAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcbiAgfSlcblxuICBjdXJzb3IgPSB7XG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBpc0luc2lkZUhlYWRpbmc6IGZ1bmN0aW9uIChzZWxlY3Rpb24pIHtcblxuICAgICAgbGV0IHJuZyA9IHNlbGVjdGlvbi5nZXRSbmcoKVxuXG4gICAgICAvLyBTYXZlIHRoZSBzdGFydGluZyBlbGVtZW50XG4gICAgICBsZXQgc3RhcnQgPSBybmcuc3RhcnRDb250YWluZXJcbiAgICAgIGxldCBzdGFydE5vZGUgPSAkKHN0YXJ0Lm5vZGVUeXBlID09IDMgPyBzdGFydC5wYXJlbnROb2RlIDogc3RhcnQpXG5cbiAgICAgIC8vIFNhdmUgdGhlIGVuZGluZyBlbGVtZW50XG4gICAgICBsZXQgZW5kID0gcm5nLmVuZENvbnRhaW5lclxuICAgICAgbGV0IGVuZE5vZGUgPSAkKGVuZC5ub2RlVHlwZSA9PSAzID8gZW5kLnBhcmVudE5vZGUgOiBlbmQpXG5cbiAgICAgIC8vIENoZWNrIGlmIHRoZSBzZWxlY3Rpb24gY29udGFpbnMgbW9yZSB0aGFuIG9uZSBiaWJsaW9lbnRyeVxuICAgICAgcmV0dXJuICQocm5nLmNvbW1vbkFuY2VzdG9yQ29udGFpbmVyKS5pcygnOmhlYWRlcicpICYmXG4gICAgICAgICQocm5nLmNvbW1vbkFuY2VzdG9yQ29udGFpbmVyKS50ZXh0KCkudHJpbSgpLmxlbmd0aCAhPSBybmcuc3RhcnRPZmZzZXRcbiAgICB9LFxuXG4gICAgaXNJbnNpZGVUYWJsZTogZnVuY3Rpb24gKHNlbGVjdGlvbikge1xuXG4gICAgICBsZXQgcm5nID0gc2VsZWN0aW9uLmdldFJuZygpXG5cbiAgICAgIC8vIFNhdmUgdGhlIHN0YXJ0aW5nIGVsZW1lbnRcbiAgICAgIGxldCBzdGFydCA9IHJuZy5zdGFydENvbnRhaW5lclxuICAgICAgbGV0IHN0YXJ0Tm9kZSA9ICQoc3RhcnQubm9kZVR5cGUgPT0gMyA/IHN0YXJ0LnBhcmVudE5vZGUgOiBzdGFydClcblxuICAgICAgLy8gU2F2ZSB0aGUgZW5kaW5nIGVsZW1lbnRcbiAgICAgIGxldCBlbmQgPSBybmcuZW5kQ29udGFpbmVyXG4gICAgICBsZXQgZW5kTm9kZSA9ICQoZW5kLm5vZGVUeXBlID09IDMgPyBlbmQucGFyZW50Tm9kZSA6IGVuZClcblxuICAgICAgLy8gQ2hlY2sgaWYgdGhlIHNlbGVjdGlvbiBjb250YWlucyBtb3JlIHRoYW4gb25lIGJpYmxpb2VudHJ5XG4gICAgICByZXR1cm4gKCQocm5nLmNvbW1vbkFuY2VzdG9yQ29udGFpbmVyKS5pcyhGSUdVUkVfVEFCTEVfU0VMRUNUT1IpIHx8ICQocm5nLmNvbW1vbkFuY2VzdG9yQ29udGFpbmVyKS5wYXJlbnRzKEZJR1VSRV9UQUJMRV9TRUxFQ1RPUikubGVuZ3RoKSAmJlxuICAgICAgICAkKHJuZy5jb21tb25BbmNlc3RvckNvbnRhaW5lcikudGV4dCgpLnRyaW0oKS5sZW5ndGggIT0gcm5nLnN0YXJ0T2Zmc2V0XG4gICAgfVxuICB9XG59IiwiLy8jcmVnaW9uIDFfcmFqZV9zZWN0aW9uLmpzIENvbnN0YW50c1xuXG4vLyBUZXh0IG9mIGJ1dHRvbiBsYWJlbHNcbmNvbnN0IEhFQURJTkdfQlVUVE9OX0xBQkVMID0gJ0hlYWRpbmcgJ1xuY29uc3QgU1BFQ0lBTF9CVVRUT05fTEFCRUwgPSAnU3BlY2lhbCdcbmNvbnN0IEFCU1RSQUNUX0JVVFRPTl9MQUJFTCA9ICdBYnN0cmFjdCdcbmNvbnN0IEFDS05PV0xFREdFTUVOVFNfQlVUVE9OX0xBQkVMID0gJ0Fja25vd2xlZGdlbWVudHMnXG5jb25zdCBSRUZFUkVOQ0VTX0JVVFRPTl9MQUJFTCA9ICdSZWZlcmVuY2VzJ1xuY29uc3QgSEVBRElOR1NfQlVUVE9OTElTVF9MQUJFTCA9ICdIZWFkaW5ncydcblxuLy8gTWVzc2FnZSB0ZXh0XG5jb25zdCBIRUFESU5HX1RSQVNGT1JNQVRJT05fRk9SQklEREVOID0gJ0Vycm9yLCB5b3UgY2Fubm90IHRyYW5zZm9ybSB0aGUgY3VycmVudCBoZWFkZXIgaW4gdGhpcyB3YXkhJ1xuXG4vLyBTZWN0aW9uIHNlbGVjdG9yXG5jb25zdCBNQUlOX1NFQ1RJT05fU0VMRUNUT1IgPSAnc2VjdGlvbjpub3QoW3JvbGVdKSdcbmNvbnN0IFNFQ1RJT05fU0VMRUNUT1IgPSAnc2VjdGlvbjpub3QoW3JvbGVdKSdcbmNvbnN0IFNQRUNJQUxfU0VDVElPTl9TRUxFQ1RPUiA9ICdzZWN0aW9uW3JvbGVdJ1xuY29uc3QgQklCTElPR1JBUEhZX1NFTEVDVE9SID0gJ3NlY3Rpb25bcm9sZT1kb2MtYmlibGlvZ3JhcGh5XSdcbmNvbnN0IEVORE5PVEVTX1NFTEVDVE9SID0gJ3NlY3Rpb25bcm9sZT1kb2MtZW5kbm90ZXNdJ1xuY29uc3QgRU5ETk9URV9TRUxFQ1RPUiA9ICdzZWN0aW9uW3JvbGU9ZG9jLWVuZG5vdGVdJ1xuXG4vLyBFbGVtZW50IHNlbGVjdG9yXG5jb25zdCBIMSA9ICdoMSdcbmNvbnN0IEJJQkxJT0VOVFJZX1NFTEVDVE9SID0gJ2xpW3JvbGU9ZG9jLWJpYmxpb2VudHJ5XSdcblxuXG4vLyNlbmRyZWdpb25cblxuLy8jcmVnaW9uIGNvbW1hbmRzXG5cbmNvbnN0IERFTEVURV9DTUQgPSAnRGVsZXRlJ1xuY29uc3QgVU5ET19DTUQgPSAnVW5kbydcbmNvbnN0IFJFRE9fQ01EID0gJ1JlZG8nXG5cbi8vI2VuZHJlZ2lvblxuXG4vLyNyZWdpb24gQW5ub3RhdGlvbnNcblxuY29uc3Qgc2lkZV9ub3RlX3JlcGx5X3NlbGVjdG9yID0gJy5zaWRlX25vdGVfcmVwbHknXG5jb25zdCB0b2dnbGVfYW5ub3RhdGlvbl9zZWxlY3RvciA9ICcjdG9nZ2xlQW5ub3RhdGlvbnMnXG5jb25zdCB0b2dnbGVfc2lkZWJhcl9zZWxlY3RvciA9ICcjdG9nZ2xlU2lkZWJhcidcblxuLy8jZW5kcmVnaW9uXG5cbmNvbnN0IE5PTl9FRElUQUJMRV9IRUFERVJfU0VMRUNUT1IgPSAnaGVhZGVyLnBhZ2UtaGVhZGVyLmNvbnRhaW5lci5jZ2VuJ1xuY29uc3QgQklCTElPRU5UUllfU1VGRklYID0gJ2JpYmxpb2VudHJ5XydcbmNvbnN0IEVORE5PVEVfU1VGRklYID0gJ2VuZG5vdGVfJ1xuXG5cbmNvbnN0IEFCU1RSQUNUX1NFTEVDVE9SID0gJ3NlY3Rpb25bcm9sZT1kb2MtYWJzdHJhY3RdJ1xuY29uc3QgQUNLTk9XTEVER0VNRU5UU19TRUxFQ1RPUiA9ICdzZWN0aW9uW3JvbGU9ZG9jLWFja25vd2xlZGdlbWVudHNdJ1xuXG5cblxuY29uc3QgTUVOVV9TRUxFQ1RPUiA9ICdkaXZbaWRePW1jZXVfXVtpZCQ9LWJvZHldW3JvbGU9bWVudV0nXG5cbmNvbnN0IERBVEFfVVBHUkFERSA9ICdkYXRhLXVwZ3JhZGUnXG5jb25zdCBEQVRBX0RPV05HUkFERSA9ICdkYXRhLWRvd25ncmFkZSdcblxuXG5cblxuXG5jb25zdCBESVNBQkxFX1NFTEVDVE9SX0ZJR1VSRVMgPSAnZmlndXJlICosIGgxLCBoMiwgaDMsIGg0LCBoNSwgaDYsJyArIEJJQkxJT0dSQVBIWV9TRUxFQ1RPUlxuXG5jb25zdCBGSUdVUkVfU0VMRUNUT1IgPSAnZmlndXJlW2lkXSdcblxuY29uc3QgRklHVVJFX1RBQkxFX1NFTEVDVE9SID0gYCR7RklHVVJFX1NFTEVDVE9SfTpoYXModGFibGUpYFxuY29uc3QgVEFCTEVfU1VGRklYID0gJ3RhYmxlXydcblxuY29uc3QgRklHVVJFX0lNQUdFX1NFTEVDVE9SID0gYCR7RklHVVJFX1NFTEVDVE9SfTpoYXMoaW1nOm5vdChbcm9sZT1tYXRoXSkpYFxuY29uc3QgSU1BR0VfU1VGRklYID0gJ2ltZ18nXG5cbmNvbnN0IEZJR1VSRV9GT1JNVUxBX1NFTEVDVE9SID0gYCR7RklHVVJFX1NFTEVDVE9SfTpoYXMoc3ZnW3JvbGU9bWF0aF0pYFxuY29uc3QgSU5MSU5FX0ZPUk1VTEFfU0VMRUNUT1IgPSBgc3BhbjpoYXMoc3ZnW3JvbGU9bWF0aF0pYFxuY29uc3QgRk9STVVMQV9TVUZGSVggPSAnZm9ybXVsYV8nXG5cbmNvbnN0IEZJR1VSRV9MSVNUSU5HX1NFTEVDVE9SID0gYCR7RklHVVJFX1NFTEVDVE9SfTpoYXMocHJlOmhhcyhjb2RlKSlgXG5jb25zdCBMSVNUSU5HX1NVRkZJWCA9ICdsaXN0aW5nXydcblxuY29uc3QgRElTQUJMRV9TRUxFQ1RPUl9JTkxJTkUgPSAndGFibGUsIGltZywgcHJlLCBjb2RlJ1xuXG5jb25zdCBTSURFQkFSX0FOTk9UQVRJT04gPSAnYXNpZGUjYW5ub3RhdGlvbnMnXG5cbmNvbnN0IElOTElORV9FUlJPUlMgPSAnRXJyb3IsIElubGluZSBlbGVtZW50cyBjYW4gYmUgT05MWSBjcmVhdGVkIGluc2lkZSB0aGUgc2FtZSBwYXJhZ3JhcGgnXG5cbiIsIi8qKlxuICogUkFTSCBzZWN0aW9uIHBsdWdpbiBSQUpFXG4gKi9cblxudGlueW1jZS5QbHVnaW5NYW5hZ2VyLmFkZCgncmFqZV9zZWN0aW9uJywgZnVuY3Rpb24gKGVkaXRvcikge1xuXG4gIC8vIEFkZCB0aGUgYnV0dG9uIHRvIHNlbGVjdCB0aGUgc2VjdGlvblxuICBlZGl0b3IuYWRkQnV0dG9uKCdyYWplX3NlY3Rpb24nLCB7XG4gICAgdHlwZTogJ21lbnVidXR0b24nLFxuICAgIHRleHQ6IEhFQURJTkdTX0JVVFRPTkxJU1RfTEFCRUwsXG4gICAgdGl0bGU6ICdoZWFkaW5nJyxcbiAgICBpY29uczogZmFsc2UsXG5cbiAgICAvLyBTZWN0aW9ucyBzdWIgbWVudVxuICAgIG1lbnU6IFt7XG4gICAgICB0ZXh0OiBgJHtIRUFESU5HX0JVVFRPTl9MQUJFTH0xLmAsXG4gICAgICBvbmNsaWNrOiBmdW5jdGlvbiAoZSkge1xuICAgICAgICBzZWN0aW9uLmFkZE9yRG93blVwZ3JhZGUoZSwgMSlcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICB0ZXh0OiBgJHtIRUFESU5HX0JVVFRPTl9MQUJFTH0xLjEuYCxcbiAgICAgIG9uY2xpY2s6IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIHNlY3Rpb24uYWRkT3JEb3duVXBncmFkZShlLCAyKVxuICAgICAgfVxuICAgIH0sIHtcbiAgICAgIHRleHQ6IGAke0hFQURJTkdfQlVUVE9OX0xBQkVMfTEuMS4xLmAsXG4gICAgICBvbmNsaWNrOiBmdW5jdGlvbiAoZSkge1xuICAgICAgICBzZWN0aW9uLmFkZE9yRG93blVwZ3JhZGUoZSwgMylcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICB0ZXh0OiBgJHtIRUFESU5HX0JVVFRPTl9MQUJFTH0xLjEuMS4xLmAsXG4gICAgICBvbmNsaWNrOiBmdW5jdGlvbiAoZSkge1xuICAgICAgICBzZWN0aW9uLmFkZE9yRG93blVwZ3JhZGUoZSwgNClcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICB0ZXh0OiBgJHtIRUFESU5HX0JVVFRPTl9MQUJFTH0xLjEuMS4xLjEuYCxcbiAgICAgIG9uY2xpY2s6IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIHNlY3Rpb24uYWRkT3JEb3duVXBncmFkZShlLCA1KVxuICAgICAgfVxuICAgIH0sIHtcbiAgICAgIHRleHQ6IGAke0hFQURJTkdfQlVUVE9OX0xBQkVMfTEuMS4xLjEuMS4xLmAsXG4gICAgICBvbmNsaWNrOiBmdW5jdGlvbiAoZSkge1xuICAgICAgICBzZWN0aW9uLmFkZE9yRG93blVwZ3JhZGUoZSwgNilcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICB0ZXh0OiBTUEVDSUFMX0JVVFRPTl9MQUJFTCxcbiAgICAgIG1lbnU6IFt7XG4gICAgICAgICAgdGV4dDogQUJTVFJBQ1RfQlVUVE9OX0xBQkVMLFxuICAgICAgICAgIG9uY2xpY2s6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgICAgc2VjdGlvbi5hZGRBYnN0cmFjdCgpXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgdGV4dDogQUNLTk9XTEVER0VNRU5UU19CVVRUT05fTEFCRUwsXG4gICAgICAgICAgb25jbGljazogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VjdGlvbi5hZGRBY2tub3dsZWRnZW1lbnRzKClcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICB0ZXh0OiBSRUZFUkVOQ0VTX0JVVFRPTl9MQUJFTCxcbiAgICAgICAgICBvbmNsaWNrOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWN0aW9uLmhhbmRsZUFkZEJsaWJsaW9lbnRyeSgpXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICBdXG4gICAgfV1cbiAgfSlcblxuICBlZGl0b3Iub24oJ2tleURvd24nLCBmdW5jdGlvbiAoZSkge1xuXG4gICAgLy8gaW5zdGFuY2Ugb2YgdGhlIHNlbGVjdGVkIGVsZW1lbnRcbiAgICBsZXQgc2VsZWN0ZWRFbGVtZW50ID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuICAgIGxldCBzZWxlY3Rpb24gPSB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb25cblxuICAgIGxldCBzdGFydE5vZGUgPSAkKHNlbGVjdGlvbi5nZXRSbmcoKS5zdGFydENvbnRhaW5lcilcbiAgICBsZXQgZW5kTm9kZSA9ICQoc2VsZWN0aW9uLmdldFJuZygpLmVuZENvbnRhaW5lcilcblxuICAgIC8vIENoZWNrIGlmIHRoZSBjYXJldCBpcyBpbnNpZGUgYSBzZWN0aW9uXG4gICAgaWYgKChzZWN0aW9uLmN1cnNvckluU2VjdGlvbihzZWxlY3Rpb24pIHx8IHNlY3Rpb24uY3Vyc29ySW5TcGVjaWFsU2VjdGlvbihzZWxlY3Rpb24pKSkge1xuXG4gICAgICAvLyBCbG9jayBzcGVjaWFsIGNoYXJzIGluIHNwZWNpYWwgZWxlbWVudHNcbiAgICAgIGlmIChjaGVja0lmU3BlY2lhbENoYXIoZS5rZXlDb2RlKSAmJlxuICAgICAgICAoc3RhcnROb2RlLnBhcmVudHMoU1BFQ0lBTF9TRUNUSU9OX1NFTEVDVE9SKS5sZW5ndGggfHwgZW5kTm9kZS5wYXJlbnRzKFNQRUNJQUxfU0VDVElPTl9TRUxFQ1RPUikubGVuZ3RoKSAmJlxuICAgICAgICAoc3RhcnROb2RlLnBhcmVudHMoSDEpLmxlbmd0aCA+IDAgfHwgZW5kTm9kZS5wYXJlbnRzKEgxKS5sZW5ndGggPiAwKSkge1xuXG4gICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKClcbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICB9XG5cbiAgICAgIC8qKlxuICAgICAgICogQ2hlY2sgaWYgQkFDS1NQQUNFIG9yIENBTkMgYXJlIHByZXNzZWRcbiAgICAgICAqL1xuICAgICAgaWYgKGUua2V5Q29kZSA9PSA4IHx8IGUua2V5Q29kZSA9PSA0Nikge1xuXG4gICAgICAgIC8vIElmIHRoZSBzZWN0aW9uIGlzbid0IGNvbGxhcHNlZFxuICAgICAgICBpZiAoIXRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5pc0NvbGxhcHNlZCgpKSB7XG5cbiAgICAgICAgICAvLyBJZiB0aGUgc2VsZWN0aW9uIGNvbnRhaW5zIGF0IGxlYXN0IGEgYmlibGlvZW50cnlcbiAgICAgICAgICBpZiAoc2VsZWN0aW9uQ29udGVudC5jb250YWluc0JpYmxpb2VudHJpZXMoc2VsZWN0aW9uKSkge1xuXG4gICAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpXG5cbiAgICAgICAgICAgIC8vIEJvdGggZGVsZXRlIGV2ZW50IGFuZCB1cGRhdGUgYXJlIHN0b3JlZCBpbiBhIHNpbmdsZSB1bmRvIGxldmVsXG4gICAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IuZXhlY0NvbW1hbmQoREVMRVRFX0NNRClcbiAgICAgICAgICAgICAgc2VjdGlvbi51cGRhdGVCaWJsaW9ncmFwaHlTZWN0aW9uKClcbiAgICAgICAgICAgICAgdXBkYXRlUmVmZXJlbmNlcygpXG5cbiAgICAgICAgICAgICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG4gICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBJZiB0aGUgc2VsZWN0aW9uIGNvbnRhaW5zIHRoZSBlbnRpcmUgYmlibGlvZ3JhcGh5IHNlY3Rpb25cbiAgICAgICAgICBpZiAoc2VsZWN0aW9uQ29udGVudC5jb250YWluc0JpYmxpb2dyYXBoeShzZWxlY3Rpb24pKSB7XG5cbiAgICAgICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKClcblxuICAgICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgICAgIC8vIEV4ZWN1dGUgbm9ybWFsIGRlbGV0ZVxuICAgICAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci4kKEJJQkxJT0dSQVBIWV9TRUxFQ1RPUikucmVtb3ZlKClcbiAgICAgICAgICAgICAgdXBkYXRlUmVmZXJlbmNlcygpXG5cbiAgICAgICAgICAgICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG4gICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBSZXN0cnVjdHVyZSB0aGUgZW50aXJlIGJvZHkgaWYgdGhlIHNlY3Rpb24gaXNuJ3QgY29sbGFwc2VkIGFuZCBub3QgaW5zaWRlIGEgc3BlY2lhbCBzZWN0aW9uXG4gICAgICAgICAgaWYgKCFzZWN0aW9uLmN1cnNvckluU3BlY2lhbFNlY3Rpb24oc2VsZWN0aW9uKSkge1xuICAgICAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKVxuICAgICAgICAgICAgc2VjdGlvbi5tYW5hZ2VEZWxldGUoKVxuICAgICAgICAgICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG4gICAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJZiB0aGUgc2VjdGlvbiBpcyBjb2xsYXBzZWRcbiAgICAgICAgaWYgKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5pc0NvbGxhcHNlZCgpKSB7XG5cbiAgICAgICAgICAvLyBJZiB0aGUgc2VsZWN0aW9uIGlzIGluc2lkZSBhIHNwZWNpYWwgc2VjdGlvblxuICAgICAgICAgIGlmIChzZWN0aW9uLmN1cnNvckluU3BlY2lhbFNlY3Rpb24oc2VsZWN0aW9uKSkge1xuXG4gICAgICAgICAgICAvLyBSZW1vdmUgc3BlY2lhbCBzZWN0aW9uIGlmIHRoZSBjdXJzb3IgaXMgYXQgdGhlIGJlZ2lubmluZ1xuICAgICAgICAgICAgaWYgKChzdGFydE5vZGUucGFyZW50cyhIMSkubGVuZ3RoIHx8IHN0YXJ0Tm9kZS5pcyhIMSkpICYmIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRSbmcoKS5zdGFydE9mZnNldCA9PSAwKSB7XG5cbiAgICAgICAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKVxuICAgICAgICAgICAgICBzZWN0aW9uLmRlbGV0ZVNwZWNpYWxTZWN0aW9uKHNlbGVjdGVkRWxlbWVudClcbiAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGlmIHRoZSBjdXJzb3IgaXMgYXQgdGhlIGJlZ2lubmluZyBvZiBhIGVtcHR5IHAgaW5zaWRlIGl0cyBiaWJsaW9lbnRyeSwgcmVtb3ZlIGl0IGFuZCB1cGRhdGUgdGhlIHJlZmVyZW5jZXNcbiAgICAgICAgICAgIGlmIChzZWxlY3Rpb25Db250ZW50LmlzQXRCZWdpbm5pbmdPZkVtcHR5QmlibGlvZW50cnkoc2VsZWN0aW9uKSkge1xuXG4gICAgICAgICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKClcblxuICAgICAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICAgICAgICAvLyBFeGVjdXRlIG5vcm1hbCBkZWxldGVcbiAgICAgICAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5leGVjQ29tbWFuZChERUxFVEVfQ01EKVxuICAgICAgICAgICAgICAgIHVwZGF0ZVJlZmVyZW5jZXMoKVxuXG4gICAgICAgICAgICAgICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG4gICAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGlmIHRoZSBjdXJzb3IgaXMgYXQgdGhlIGJlZ2lubmluZyBvZiB0aGUgZmlyc3QgZW1wdHkgcCBpbnNpZGUgYSBmb290bm90ZSwgcmVtb3ZlIGl0IGFuZCB1cGRhdGUgdGhlIHJlZmVyZW5jZXNcbiAgICAgICAgICAgIGlmIChzZWxlY3Rpb25Db250ZW50LmlzQXRCZWdpbm5pbmdPZkVtcHR5RW5kbm90ZShzZWxlY3Rpb24pKSB7XG5cbiAgICAgICAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKVxuXG4gICAgICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgICAgICAgIGxldCBlbmRub3RlID0gc2VsZWN0ZWRFbGVtZW50LnBhcmVudHMoRU5ETk9URV9TRUxFQ1RPUilcblxuICAgICAgICAgICAgICAgIC8vIElmIHRoZSBjdXJyZW50IGVuZG5vdGUgaXMgdGhlIGxhc3Qgb25lIHJlbW92ZSB0aGUgZW50aXJlIGZvb3Rub3RlcyBzZWN0aW9uXG4gICAgICAgICAgICAgICAgaWYgKCFlbmRub3RlLnByZXYoRU5ETk9URV9TRUxFQ1RPUikubGVuZ3RoICYmICFlbmRub3RlLm5leHQoRU5ETk9URV9TRUxFQ1RPUikubGVuZ3RoKVxuICAgICAgICAgICAgICAgICAgJChFTkROT1RFU19TRUxFQ1RPUikucmVtb3ZlKClcblxuICAgICAgICAgICAgICAgIGVsc2UgXG4gICAgICAgICAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5leGVjQ29tbWFuZChERUxFVEVfQ01EKVxuICAgICAgICAgICAgICAgIFxuXG4gICAgICAgICAgICAgICAgdXBkYXRlUmVmZXJlbmNlcygpXG5cbiAgICAgICAgICAgICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcbiAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBQcmV2ZW50IHJlbW92ZSBmcm9tIGhlYWRlclxuICAgICAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LmlzKE5PTl9FRElUQUJMRV9IRUFERVJfU0VMRUNUT1IpIHx8XG4gICAgICAgICAgKHNlbGVjdGVkRWxlbWVudC5hdHRyKCdkYXRhLW1jZS1jYXJldCcpID09ICdhZnRlcicgJiYgc2VsZWN0ZWRFbGVtZW50LnBhcmVudCgpLmlzKFJBSkVfU0VMRUNUT1IpKSB8fFxuICAgICAgICAgIChzZWxlY3RlZEVsZW1lbnQuYXR0cignZGF0YS1tY2UtY2FyZXQnKSAmJiBzZWxlY3RlZEVsZW1lbnQucGFyZW50KCkuaXMoUkFKRV9TRUxFQ1RPUikpID09ICdiZWZvcmUnKVxuICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgfVxuXG4gICAgICAvKipcbiAgICAgICAqIENoZWNrIGlmIEVOVEVSIGlzIHByZXNzZWRcbiAgICAgICAqL1xuICAgICAgaWYgKGUua2V5Q29kZSA9PSAxMykge1xuXG4gICAgICAgIC8vIFdoZW4gZW50ZXIgaXMgcHJlc3NlZCBpbnNpZGUgYW4gaGVhZGVyLCBub3QgYXQgdGhlIGVuZCBvZiBpdFxuICAgICAgICBpZiAoY3Vyc29yLmlzSW5zaWRlSGVhZGluZyhzZWxlY3Rpb24pKSB7XG4gICAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKVxuICAgICAgICAgIHNlY3Rpb24uYWRkV2l0aEVudGVyKClcbiAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIElmIHNlbGVjdGlvbiBpcyBiZWZvcmUvYWZ0ZXIgaGVhZGVyXG4gICAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQuaXMoJ3AnKSkge1xuXG4gICAgICAgICAgLy8gQmxvY2sgZW50ZXIgYmVmb3JlIGhlYWRlclxuICAgICAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQuYXR0cignZGF0YS1tY2UtY2FyZXQnKSA9PSAnYmVmb3JlJykge1xuICAgICAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgICAgfVxuXG5cbiAgICAgICAgICAvLyBBZGQgbmV3IHNlY3Rpb24gYWZ0ZXIgaGVhZGVyXG4gICAgICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC5hdHRyKCdkYXRhLW1jZS1jYXJldCcpID09ICdhZnRlcicpIHtcbiAgICAgICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKClcbiAgICAgICAgICAgIHNlY3Rpb24uYWRkKDEpXG4gICAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJZiBlbnRlciBpcyBwcmVzc2VkIGluc2lkZSBiaWJsaW9ncmFwaHkgc2VsZWN0b3JcbiAgICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKEJJQkxJT0dSQVBIWV9TRUxFQ1RPUikubGVuZ3RoKSB7XG5cbiAgICAgICAgICBsZXQgaWQgPSBnZXRTdWNjZXNzaXZlRWxlbWVudElkKEJJQkxJT0VOVFJZX1NFTEVDVE9SLCBCSUJMSU9FTlRSWV9TVUZGSVgpXG5cbiAgICAgICAgICAvLyBQcmVzc2luZyBlbnRlciBpbiBoMSB3aWxsIGFkZCBhIG5ldyBiaWJsaW9lbnRyeSBhbmQgY2FyZXQgcmVwb3NpdGlvblxuICAgICAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQuaXMoSDEpKSB7XG5cbiAgICAgICAgICAgIHNlY3Rpb24uYWRkQmlibGlvZW50cnkoaWQpXG4gICAgICAgICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBJZiBzZWxlY3RlZCBlbGVtZW50IGlzIGluc2lkZSB0ZXh0XG4gICAgICAgICAgZWxzZSBpZiAoc2VsZWN0ZWRFbGVtZW50LmlzKCdwJykpXG4gICAgICAgICAgICBzZWN0aW9uLmFkZEJpYmxpb2VudHJ5KGlkLCBudWxsLCBzZWxlY3RlZEVsZW1lbnQucGFyZW50KCdsaScpKVxuXG4gICAgICAgICAgLy8gSWYgc2VsZWN0ZWQgZWxlbWVudCBpcyB3aXRob3V0IHRleHRcbiAgICAgICAgICBlbHNlIGlmIChzZWxlY3RlZEVsZW1lbnQuaXMoJ2xpJykpXG4gICAgICAgICAgICBzZWN0aW9uLmFkZEJpYmxpb2VudHJ5KGlkLCBudWxsLCBzZWxlY3RlZEVsZW1lbnQpXG5cbiAgICAgICAgICAvLyBNb3ZlIGNhcmV0ICMxMDVcbiAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2V0Q3Vyc29yTG9jYXRpb24odGlueW1jZS5hY3RpdmVFZGl0b3IuZG9tLnNlbGVjdChgJHtCSUJMSU9FTlRSWV9TRUxFQ1RPUn0jJHtpZH0gPiBwYClbMF0sIGZhbHNlKVxuICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWRkaW5nIHNlY3Rpb25zIHdpdGggc2hvcnRjdXRzICNcbiAgICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC5pcygncCcpICYmIHNlbGVjdGVkRWxlbWVudC50ZXh0KCkudHJpbSgpLnN1YnN0cmluZygwLCAxKSA9PSAnIycpIHtcblxuICAgICAgICAgIGxldCBsZXZlbCA9IHNlY3Rpb24uZ2V0TGV2ZWxGcm9tSGFzaChzZWxlY3RlZEVsZW1lbnQudGV4dCgpLnRyaW0oKSlcbiAgICAgICAgICBsZXQgZGVlcG5lc3MgPSAkKHNlbGVjdGVkRWxlbWVudCkucGFyZW50c1VudGlsKFJBSkVfU0VMRUNUT1IpLmxlbmd0aCAtIGxldmVsICsgMVxuXG4gICAgICAgICAgLy8gSW5zZXJ0IHNlY3Rpb24gb25seSBpZiBjYXJldCBpcyBpbnNpZGUgYWJzdHJhY3Qgc2VjdGlvbiwgYW5kIHVzZXIgaXMgZ29pbmcgdG8gaW5zZXJ0IGEgc3ViIHNlY3Rpb25cbiAgICAgICAgICAvLyBPUiB0aGUgY3Vyc29yIGlzbid0IGluc2lkZSBvdGhlciBzcGVjaWFsIHNlY3Rpb25zXG4gICAgICAgICAgLy8gQU5EIHNlbGVjdGVkRWxlbWVudCBpc24ndCBpbnNpZGUgYSBmaWd1cmVcbiAgICAgICAgICBpZiAoKChzZWxlY3RlZEVsZW1lbnQucGFyZW50cyhBQlNUUkFDVF9TRUxFQ1RPUikubGVuZ3RoICYmIGRlZXBuZXNzID4gMCkgfHwgIXNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKFNQRUNJQUxfU0VDVElPTl9TRUxFQ1RPUikubGVuZ3RoKSAmJiAhc2VsZWN0ZWRFbGVtZW50LnBhcmVudHMoRklHVVJFX1NFTEVDVE9SKS5sZW5ndGgpIHtcblxuICAgICAgICAgICAgc2VjdGlvbi5hZGQobGV2ZWwsIHNlbGVjdGVkRWxlbWVudC50ZXh0KCkuc3Vic3RyaW5nKGxldmVsKS50cmltKCkpXG4gICAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH0pXG5cbiAgZWRpdG9yLm9uKCdOb2RlQ2hhbmdlJywgZnVuY3Rpb24gKGUpIHtcbiAgICBzZWN0aW9uLnVwZGF0ZVNlY3Rpb25Ub29sYmFyKClcbiAgfSlcbn0pXG5cbnNlY3Rpb24gPSB7XG5cbiAgLyoqXG4gICAqIEZ1bmN0aW9uIGNhbGxlZCB3aGVuIGEgbmV3IHNlY3Rpb24gbmVlZHMgdG8gYmUgYXR0YWNoZWQsIHdpdGggYnV0dG9uc1xuICAgKi9cbiAgYWRkOiAobGV2ZWwsIHRleHQpID0+IHtcblxuICAgIC8vIFNlbGVjdCBjdXJyZW50IG5vZGVcbiAgICBsZXQgc2VsZWN0ZWRFbGVtZW50ID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuXG4gICAgLy8gQ3JlYXRlIHRoZSBzZWN0aW9uXG4gICAgbGV0IG5ld1NlY3Rpb24gPSBzZWN0aW9uLmNyZWF0ZSh0ZXh0ICE9IG51bGwgPyB0ZXh0IDogc2VsZWN0ZWRFbGVtZW50Lmh0bWwoKS50cmltKCksIGxldmVsKVxuXG4gICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAvLyBDaGVjayB3aGF0IGtpbmQgb2Ygc2VjdGlvbiBuZWVkcyB0byBiZSBpbnNlcnRlZFxuICAgICAgaWYgKHNlY3Rpb24ubWFuYWdlU2VjdGlvbihzZWxlY3RlZEVsZW1lbnQsIG5ld1NlY3Rpb24sIGxldmVsID8gbGV2ZWwgOiBzZWxlY3RlZEVsZW1lbnQucGFyZW50c1VudGlsKFJBSkVfU0VMRUNUT1IpLmxlbmd0aCkpIHtcblxuICAgICAgICAvLyBSZW1vdmUgdGhlIHNlbGVjdGVkIHNlY3Rpb25cbiAgICAgICAgc2VsZWN0ZWRFbGVtZW50LnJlbW92ZSgpXG5cbiAgICAgICAgLy8gSWYgdGhlIG5ldyBoZWFkaW5nIGhhcyB0ZXh0IG5vZGVzLCB0aGUgb2Zmc2V0IHdvbid0IGJlIDAgKGFzIG5vcm1hbCkgYnV0IGluc3RlYWQgaXQnbGwgYmUgbGVuZ3RoIG9mIG5vZGUgdGV4dFxuICAgICAgICBtb3ZlQ2FyZXQobmV3U2VjdGlvbi5maW5kKCc6aGVhZGVyJykuZmlyc3QoKVswXSlcblxuICAgICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcbiAgICAgIH1cbiAgICB9KVxuICB9LFxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGFkZE9yRG93blVwZ3JhZGU6IChlLCBsZXZlbCkgPT4ge1xuXG4gICAgbGV0IHNlbGVjdGVkTWVudUl0ZW0gPSAkKGUudGFyZ2V0KS5wYXJlbnQoJy5tY2UtbWVudS1pdGVtJylcblxuICAgIC8vIFVwZ3JhZGUgdGhlIGhlYWRlciBzZWxlY3RlZCBmcm9tIGlmcmFtZVxuICAgIGlmIChzZWxlY3RlZE1lbnVJdGVtLmF0dHIoREFUQV9VUEdSQURFKSlcbiAgICAgIHJldHVybiB0aGlzLnVwZ3JhZGUoKVxuXG4gICAgLy8gRG93bmdyYWRlIHRoZSBoZWFkZXIgc2VsZWN0ZWQgZnJvbSBpZnJhbWVcbiAgICBpZiAoc2VsZWN0ZWRNZW51SXRlbS5hdHRyKERBVEFfRE9XTkdSQURFKSlcbiAgICAgIHJldHVybiB0aGlzLmRvd25ncmFkZSgpXG5cbiAgICAvLyBUcmFuc2Zvcm0gdGhlIHBhcmFncmFwaCBzZWxlY3RlZCBmcm9tIGlmcmFtZVxuICAgIHJldHVybiB0aGlzLmFkZChsZXZlbClcbiAgfSxcblxuICAvKipcbiAgICogRnVuY3Rpb24gY2FsbGVkIHdoZW4gYSBuZXcgc2VjdGlvbiBuZWVkcyB0byBiZSBhdHRhY2hlZCwgd2l0aCBidXR0b25zXG4gICAqL1xuICBhZGRXaXRoRW50ZXI6IGZ1bmN0aW9uICgpIHtcblxuICAgIC8vIFNlbGVjdCBjdXJyZW50IG5vZGVcbiAgICBsZXQgc2VsZWN0ZWRFbGVtZW50ID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuXG4gICAgLy8gSWYgdGhlIHNlY3Rpb24gaXNuJ3Qgc3BlY2lhbFxuICAgIGlmICghc2VsZWN0ZWRFbGVtZW50LnBhcmVudCgpLmF0dHIoJ3JvbGUnKSkge1xuXG4gICAgICBsZXZlbCA9IHNlbGVjdGVkRWxlbWVudC5wYXJlbnRzVW50aWwoUkFKRV9TRUxFQ1RPUikubGVuZ3RoXG5cbiAgICAgIC8vIENyZWF0ZSB0aGUgc2VjdGlvblxuICAgICAgbGV0IG5ld1NlY3Rpb24gPSB0aGlzLmNyZWF0ZShzZWxlY3RlZEVsZW1lbnQudGV4dCgpLnRyaW0oKS5zdWJzdHJpbmcodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldFJuZygpLnN0YXJ0T2Zmc2V0KSwgbGV2ZWwpXG5cbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAvLyBDaGVjayB3aGF0IGtpbmQgb2Ygc2VjdGlvbiBuZWVkcyB0byBiZSBpbnNlcnRlZFxuICAgICAgICBzZWN0aW9uLm1hbmFnZVNlY3Rpb24oc2VsZWN0ZWRFbGVtZW50LCBuZXdTZWN0aW9uLCBsZXZlbClcblxuICAgICAgICAvLyBSZW1vdmUgdGhlIHNlbGVjdGVkIHNlY3Rpb25cbiAgICAgICAgc2VsZWN0ZWRFbGVtZW50Lmh0bWwoc2VsZWN0ZWRFbGVtZW50LnRleHQoKS50cmltKCkuc3Vic3RyaW5nKDAsIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRSbmcoKS5zdGFydE9mZnNldCkpXG5cbiAgICAgICAgbW92ZUNhcmV0KG5ld1NlY3Rpb24uZmluZCgnOmhlYWRlcicpLmZpcnN0KClbMF0sIHRydWUpXG5cbiAgICAgICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG4gICAgICB9KVxuICAgIH0gZWxzZVxuICAgICAgbm90aWZ5KCdFcnJvciwgaGVhZGVycyBvZiBzcGVjaWFsIHNlY3Rpb25zIChhYnN0cmFjdCwgYWNrbm93bGVkbWVudHMpIGNhbm5vdCBiZSBzcGxpdHRlZCcsICdlcnJvcicsIDQwMDApXG4gIH0sXG5cbiAgLyoqXG4gICAqIEdldCB0aGUgbGFzdCBpbnNlcnRlZCBpZFxuICAgKi9cbiAgZ2V0TmV4dElkOiBmdW5jdGlvbiAoKSB7XG4gICAgbGV0IGlkID0gMFxuICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLiQoJ3NlY3Rpb25baWRdJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAoJCh0aGlzKS5hdHRyKCdpZCcpLmluZGV4T2YoJ3NlY3Rpb24nKSA+IC0xKSB7XG4gICAgICAgIGxldCBjdXJySWQgPSBwYXJzZUludCgkKHRoaXMpLmF0dHIoJ2lkJykucmVwbGFjZSgnc2VjdGlvbicsICcnKSlcbiAgICAgICAgaWQgPSBpZCA+IGN1cnJJZCA/IGlkIDogY3VycklkXG4gICAgICB9XG4gICAgfSlcbiAgICByZXR1cm4gYHNlY3Rpb24ke2lkKzF9YFxuICB9LFxuXG4gIC8qKlxuICAgKiBSZXRyaWV2ZSBhbmQgdGhlbiByZW1vdmUgZXZlcnkgc3VjY2Vzc2l2ZSBlbGVtZW50cyBcbiAgICovXG4gIGdldFN1Y2Nlc3NpdmVFbGVtZW50czogZnVuY3Rpb24gKGVsZW1lbnQsIGRlZXBuZXNzKSB7XG5cbiAgICBsZXQgc3VjY2Vzc2l2ZUVsZW1lbnRzID0gJCgnPGRpdj48L2Rpdj4nKVxuXG4gICAgd2hpbGUgKGRlZXBuZXNzID49IDApIHtcblxuICAgICAgaWYgKGVsZW1lbnQubmV4dEFsbCgnOm5vdCguZm9vdGVyKScpKSB7XG5cbiAgICAgICAgLy8gSWYgdGhlIGRlZXBuZXNzIGlzIDAsIG9ubHkgcGFyYWdyYXBoIGFyZSBzYXZlZCAobm90IHNlY3Rpb25zKVxuICAgICAgICBpZiAoZGVlcG5lc3MgPT0gMCkge1xuICAgICAgICAgIC8vIFN1Y2Nlc3NpdmUgZWxlbWVudHMgY2FuIGJlIHAgb3IgZmlndXJlc1xuICAgICAgICAgIHN1Y2Nlc3NpdmVFbGVtZW50cy5hcHBlbmQoZWxlbWVudC5uZXh0QWxsKGBwLCR7RklHVVJFX1NFTEVDVE9SfWApKVxuICAgICAgICAgIGVsZW1lbnQubmV4dEFsbCgpLnJlbW92ZShgcCwke0ZJR1VSRV9TRUxFQ1RPUn1gKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHN1Y2Nlc3NpdmVFbGVtZW50cy5hcHBlbmQoZWxlbWVudC5uZXh0QWxsKCkpXG4gICAgICAgICAgZWxlbWVudC5uZXh0QWxsKCkucmVtb3ZlKClcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBlbGVtZW50ID0gZWxlbWVudC5wYXJlbnQoJ3NlY3Rpb24nKVxuICAgICAgZGVlcG5lc3MtLVxuICAgIH1cblxuICAgIHJldHVybiAkKHN1Y2Nlc3NpdmVFbGVtZW50cy5odG1sKCkpXG4gIH0sXG5cbiAgLyoqXG4gICAqIFxuICAgKi9cbiAgZ2V0TGV2ZWxGcm9tSGFzaDogZnVuY3Rpb24gKHRleHQpIHtcblxuICAgIGxldCBsZXZlbCA9IDBcbiAgICB0ZXh0ID0gdGV4dC5zdWJzdHJpbmcoMCwgdGV4dC5sZW5ndGggPj0gNiA/IDYgOiB0ZXh0Lmxlbmd0aClcblxuICAgIHdoaWxlICh0ZXh0Lmxlbmd0aCA+IDApIHtcblxuICAgICAgaWYgKHRleHQuc3Vic3RyaW5nKHRleHQubGVuZ3RoIC0gMSkgPT0gJyMnKVxuICAgICAgICBsZXZlbCsrXG5cbiAgICAgICAgdGV4dCA9IHRleHQuc3Vic3RyaW5nKDAsIHRleHQubGVuZ3RoIC0gMSlcbiAgICB9XG5cbiAgICByZXR1cm4gbGV2ZWxcbiAgfSxcblxuICAvKipcbiAgICogUmV0dXJuIEpRZXVyeSBvYmplY3QgdGhhdCByZXByZXNlbnQgdGhlIHNlY3Rpb25cbiAgICovXG4gIGNyZWF0ZTogZnVuY3Rpb24gKHRleHQsIGxldmVsKSB7XG5cbiAgICAvLyBUcmltIHdoaXRlIHNwYWNlcyBhbmQgYWRkIHplcm9fc3BhY2UgY2hhciBpZiBub3RoaW5nIGlzIGluc2lkZVxuICAgIGlmICh0eXBlb2YgdGV4dCAhPSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICB0ZXh0ID0gdGV4dC50cmltKClcbiAgICAgIGlmICh0ZXh0Lmxlbmd0aCA9PSAwKVxuICAgICAgICB0ZXh0ID0gXCI8YnI+XCJcbiAgICB9IGVsc2VcbiAgICAgIHRleHQgPSBcIjxicj5cIlxuXG4gICAgcmV0dXJuICQoYDxzZWN0aW9uIGlkPVwiJHt0aGlzLmdldE5leHRJZCgpfVwiPjxoJHtsZXZlbH0gZGF0YS1yYXNoLW9yaWdpbmFsLXdyYXBwZXI9XCJoMVwiPiR7dGV4dH08L2gke2xldmVsfT48L3NlY3Rpb24+YClcbiAgfSxcblxuICAvKipcbiAgICogQ2hlY2sgd2hhdCBraW5kIG9mIHNlY3Rpb24gbmVlZHMgdG8gYmUgYWRkZWQsIGFuZCBwcmVjZWVkXG4gICAqL1xuICBtYW5hZ2VTZWN0aW9uOiBmdW5jdGlvbiAoc2VsZWN0ZWRFbGVtZW50LCBuZXdTZWN0aW9uLCBsZXZlbCkge1xuXG4gICAgbGV0IGRlZXBuZXNzID0gJChzZWxlY3RlZEVsZW1lbnQpLnBhcmVudHNVbnRpbCgnYm9keScpLmxlbmd0aCAtIGxldmVsICsgMVxuXG4gICAgaWYgKGRlZXBuZXNzID49IDApIHtcblxuICAgICAgLy8gQmxvY2sgaW5zZXJ0IHNlbGVjdGlvbiBpZiBjYXJldCBpcyBpbnNpZGUgc3BlY2lhbCBzZWN0aW9uLCBhbmQgdXNlciBpcyBnb2luZyB0byBpbnNlcnQgYSBzdWIgc2VjdGlvblxuICAgICAgaWYgKChzZWxlY3RlZEVsZW1lbnQucGFyZW50cyhTUEVDSUFMX1NFQ1RJT05fU0VMRUNUT1IpLmxlbmd0aCAmJiBkZWVwbmVzcyAhPSAxKSB8fCAoc2VsZWN0ZWRFbGVtZW50LnBhcmVudHMoQUNLTk9XTEVER0VNRU5UU19TRUxFQ1RPUikubGVuZ3RoICYmXG4gICAgICAgICAgc2VsZWN0ZWRFbGVtZW50LnBhcmVudHMoQklCTElPR1JBUEhZX1NFTEVDVE9SKSAmJlxuICAgICAgICAgIHNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKEVORE5PVEVTX1NFTEVDVE9SKSkpXG4gICAgICAgIHJldHVybiBmYWxzZVxuXG4gICAgICAvLyBHZXQgZGlyZWN0IHBhcmVudCBhbmQgYW5jZXN0b3IgcmVmZXJlbmNlXG4gICAgICBsZXQgc3VjY2Vzc2l2ZUVsZW1lbnRzID0gdGhpcy5nZXRTdWNjZXNzaXZlRWxlbWVudHMoc2VsZWN0ZWRFbGVtZW50LCBkZWVwbmVzcylcblxuICAgICAgaWYgKHN1Y2Nlc3NpdmVFbGVtZW50cy5sZW5ndGgpXG4gICAgICAgIG5ld1NlY3Rpb24uYXBwZW5kKHN1Y2Nlc3NpdmVFbGVtZW50cylcblxuICAgICAgLy8gQ0FTRTogc3ViIHNlY3Rpb25cbiAgICAgIGlmIChkZWVwbmVzcyA9PSAwKVxuICAgICAgICBzZWxlY3RlZEVsZW1lbnQuYWZ0ZXIobmV3U2VjdGlvbilcblxuICAgICAgLy8gQ0FTRTogc2libGluZyBzZWN0aW9uXG4gICAgICBlbHNlIGlmIChkZWVwbmVzcyA9PSAxKVxuICAgICAgICBzZWxlY3RlZEVsZW1lbnQucGFyZW50KCdzZWN0aW9uJykuYWZ0ZXIobmV3U2VjdGlvbilcblxuICAgICAgLy8gQ0FTRTogYW5jZXN0b3Igc2VjdGlvbiBhdCBhbnkgdXBsZXZlbFxuICAgICAgZWxzZVxuICAgICAgICAkKHNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKCdzZWN0aW9uJylbZGVlcG5lc3MgLSAxXSkuYWZ0ZXIobmV3U2VjdGlvbilcblxuICAgICAgaGVhZGluZ0RpbWVuc2lvbigpXG5cbiAgICAgIHJldHVybiB0cnVlXG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIHVwZ3JhZGU6IGZ1bmN0aW9uICgpIHtcblxuICAgIGxldCBzZWxlY3RlZEVsZW1lbnQgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG5cbiAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LmlzKCc6aGVhZGVyJykpIHtcblxuICAgICAgLy8gR2V0IHRoZSByZWZlcmVuY2VzIG9mIHNlbGVjdGVkIGFuZCBwYXJlbnQgc2VjdGlvblxuICAgICAgbGV0IHNlbGVjdGVkU2VjdGlvbiA9IHNlbGVjdGVkRWxlbWVudC5wYXJlbnQoU0VDVElPTl9TRUxFQ1RPUilcbiAgICAgIGxldCBwYXJlbnRTZWN0aW9uID0gc2VsZWN0ZWRTZWN0aW9uLnBhcmVudChTRUNUSU9OX1NFTEVDVE9SKVxuXG4gICAgICAvLyBJZiB0aGVyZSBpcyBhIHBhcmVudCBzZWN0aW9uLCB0aGUgdXBncmFkZSBpcyBhbGxvd2VkXG4gICAgICBpZiAocGFyZW50U2VjdGlvbi5sZW5ndGgpIHtcblxuICAgICAgICAvLyBFdmVyeXRoaW5nIGluIGhlcmUsIGlzIGFuIGF0b21pYyB1bmRvIGxldmVsXG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgIC8vIFNhdmUgdGhlIHNlY3Rpb24gYW5kIGRldGFjaFxuICAgICAgICAgIGxldCBib2R5U2VjdGlvbiA9ICQoc2VsZWN0ZWRTZWN0aW9uWzBdLm91dGVySFRNTClcbiAgICAgICAgICBzZWxlY3RlZFNlY3Rpb24uZGV0YWNoKClcblxuICAgICAgICAgIC8vIFVwZGF0ZSBkaW1lbnNpb24gYW5kIG1vdmUgdGhlIHNlY3Rpb24gb3V0XG4gICAgICAgICAgcGFyZW50U2VjdGlvbi5hZnRlcihib2R5U2VjdGlvbilcblxuICAgICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuICAgICAgICAgIGhlYWRpbmdEaW1lbnNpb24oKVxuICAgICAgICB9KVxuICAgICAgfVxuXG4gICAgICAvLyBOb3RpZnkgZXJyb3JcbiAgICAgIGVsc2VcbiAgICAgICAgbm90aWZ5KEhFQURJTkdfVFJBU0ZPUk1BVElPTl9GT1JCSURERU4sICdlcnJvcicsIDIwMDApXG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGRvd25ncmFkZTogZnVuY3Rpb24gKCkge1xuXG4gICAgbGV0IHNlbGVjdGVkRWxlbWVudCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcblxuICAgIGlmIChzZWxlY3RlZEVsZW1lbnQuaXMoJ2gxLGgyLGgzLGg0LGg1LGg2JykpIHtcbiAgICAgIC8vIEdldCB0aGUgcmVmZXJlbmNlcyBvZiBzZWxlY3RlZCBhbmQgc2libGluZyBzZWN0aW9uXG4gICAgICBsZXQgc2VsZWN0ZWRTZWN0aW9uID0gc2VsZWN0ZWRFbGVtZW50LnBhcmVudChTRUNUSU9OX1NFTEVDVE9SKVxuICAgICAgbGV0IHNpYmxpbmdTZWN0aW9uID0gc2VsZWN0ZWRTZWN0aW9uLnByZXYoU0VDVElPTl9TRUxFQ1RPUilcblxuICAgICAgLy8gSWYgdGhlcmUgaXMgYSBwcmV2aW91cyBzaWJsaW5nIHNlY3Rpb24gZG93bmdyYWRlIGlzIGFsbG93ZWRcbiAgICAgIGlmIChzaWJsaW5nU2VjdGlvbi5sZW5ndGgpIHtcblxuICAgICAgICAvLyBFdmVyeXRoaW5nIGluIGhlcmUsIGlzIGFuIGF0b21pYyB1bmRvIGxldmVsXG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgIC8vIFNhdmUgdGhlIHNlY3Rpb24gYW5kIGRldGFjaFxuICAgICAgICAgIGxldCBib2R5U2VjdGlvbiA9ICQoc2VsZWN0ZWRTZWN0aW9uWzBdLm91dGVySFRNTClcbiAgICAgICAgICBzZWxlY3RlZFNlY3Rpb24uZGV0YWNoKClcblxuICAgICAgICAgIC8vIFVwZGF0ZSBkaW1lbnNpb24gYW5kIG1vdmUgdGhlIHNlY3Rpb24gb3V0XG4gICAgICAgICAgc2libGluZ1NlY3Rpb24uYXBwZW5kKGJvZHlTZWN0aW9uKVxuXG4gICAgICAgICAgLy8gUmVmcmVzaCB0aW55bWNlIGNvbnRlbnQgYW5kIHNldCB0aGUgaGVhZGluZyBkaW1lbnNpb25cbiAgICAgICAgICBoZWFkaW5nRGltZW5zaW9uKClcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBOb3RpZnkgZXJyb3JcbiAgICBlbHNlXG4gICAgICBub3RpZnkoSEVBRElOR19UUkFTRk9STUFUSU9OX0ZPUkJJRERFTiwgJ2Vycm9yJywgMjAwMClcbiAgfSxcblxuICAvKipcbiAgICogXG4gICAqL1xuICBhZGRBYnN0cmFjdDogZnVuY3Rpb24gKCkge1xuXG4gICAgaWYgKCF0aW55bWNlLmFjdGl2ZUVkaXRvci4kKEFCU1RSQUNUX1NFTEVDVE9SKS5sZW5ndGgpIHtcblxuICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIC8vIFRoaXMgc2VjdGlvbiBjYW4gb25seSBiZSBwbGFjZWQgYWZ0ZXIgbm9uIGVkaXRhYmxlIGhlYWRlclxuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci4kKE5PTl9FRElUQUJMRV9IRUFERVJfU0VMRUNUT1IpLmFmdGVyKGA8c2VjdGlvbiBpZD1cImRvYy1hYnN0cmFjdFwiIHJvbGU9XCJkb2MtYWJzdHJhY3RcIj48aDE+QWJzdHJhY3Q8L2gxPjwvc2VjdGlvbj5gKVxuICAgICAgfSlcbiAgICB9XG5cbiAgICAvL21vdmUgY2FyZXQgYW5kIHNldCBmb2N1cyB0byBhY3RpdmUgYWRpdG9yICMxMDVcbiAgICBtb3ZlQ2FyZXQodGlueW1jZS5hY3RpdmVFZGl0b3IuZG9tLnNlbGVjdChgJHtBQlNUUkFDVF9TRUxFQ1RPUn0gPiBoMWApWzBdKVxuICAgIHNjcm9sbFRvKEFCU1RSQUNUX1NFTEVDVE9SKVxuICB9LFxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGFkZEFja25vd2xlZGdlbWVudHM6IGZ1bmN0aW9uICgpIHtcblxuICAgIGlmICghdGlueW1jZS5hY3RpdmVFZGl0b3IuJChBQ0tOT1dMRURHRU1FTlRTX1NFTEVDVE9SKS5sZW5ndGgpIHtcblxuICAgICAgbGV0IGFjayA9ICQoYDxzZWN0aW9uIGlkPVwiZG9jLWFja25vd2xlZGdlbWVudHNcIiByb2xlPVwiZG9jLWFja25vd2xlZGdlbWVudHNcIj48aDE+QWNrbm93bGVkZ2VtZW50czwvaDE+PC9zZWN0aW9uPmApXG5cbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAvLyBJbnNlcnQgdGhpcyBzZWN0aW9uIGFmdGVyIGxhc3Qgbm9uIHNwZWNpYWwgc2VjdGlvbiBcbiAgICAgICAgLy8gT1IgYWZ0ZXIgYWJzdHJhY3Qgc2VjdGlvbiBcbiAgICAgICAgLy8gT1IgYWZ0ZXIgbm9uIGVkaXRhYmxlIGhlYWRlclxuICAgICAgICBpZiAodGlueW1jZS5hY3RpdmVFZGl0b3IuJChNQUlOX1NFQ1RJT05fU0VMRUNUT1IpLmxlbmd0aClcbiAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci4kKE1BSU5fU0VDVElPTl9TRUxFQ1RPUikubGFzdCgpLmFmdGVyKGFjaylcblxuICAgICAgICBlbHNlIGlmICh0aW55bWNlLmFjdGl2ZUVkaXRvci4kKEFCU1RSQUNUX1NFTEVDVE9SKS5sZW5ndGgpXG4gICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IuJChBQlNUUkFDVF9TRUxFQ1RPUikuYWZ0ZXIoYWNrKVxuXG4gICAgICAgIGVsc2VcbiAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci4kKE5PTl9FRElUQUJMRV9IRUFERVJfU0VMRUNUT1IpLmFmdGVyKGFjaylcbiAgICAgIH0pXG4gICAgfVxuXG4gICAgLy9tb3ZlIGNhcmV0IGFuZCBzZXQgZm9jdXMgdG8gYWN0aXZlIGFkaXRvciAjMTA1XG4gICAgbW92ZUNhcmV0KHRpbnltY2UuYWN0aXZlRWRpdG9yLmRvbS5zZWxlY3QoYCR7QUNLTk9XTEVER0VNRU5UU19TRUxFQ1RPUn0gPiBoMWApWzBdKVxuICAgIHNjcm9sbFRvKEFDS05PV0xFREdFTUVOVFNfU0VMRUNUT1IpXG4gIH0sXG5cbiAgaGFuZGxlQWRkQmxpYmxpb2VudHJ5OiBmdW5jdGlvbiAoKSB7XG5cbiAgICAvLyBPbmx5IGlmIGJpYmxpb2dyYXBoeSBzZWN0aW9uIGRvZXNuJ3QgZXhpc3RzXG4gICAgaWYgKCF0aW55bWNlLmFjdGl2ZUVkaXRvci4kKEJJQkxJT0dSQVBIWV9TRUxFQ1RPUikubGVuZ3RoKSB7XG5cbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAvLyBBZGQgbmV3IGJpYmxpb2VudHJ5XG4gICAgICAgIHNlY3Rpb24uYWRkQmlibGlvZW50cnkoKVxuXG4gICAgICAgIC8vbW92ZSBjYXJldCBhbmQgc2V0IGZvY3VzIHRvIGFjdGl2ZSBhZGl0b3IgIzEwNVxuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2VsZWN0KHRpbnltY2UuYWN0aXZlRWRpdG9yLmRvbS5zZWxlY3QoYCR7QklCTElPRU5UUllfU0VMRUNUT1J9Omxhc3QtY2hpbGRgKVswXSwgdHJ1ZSlcbiAgICAgIH0pXG4gICAgfSBlbHNlXG4gICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2VsZWN0KHRpbnltY2UuYWN0aXZlRWRpdG9yLmRvbS5zZWxlY3QoYCR7QklCTElPR1JBUEhZX1NFTEVDVE9SfT5oMWApWzBdKVxuXG4gICAgc2Nyb2xsVG8oYCR7QklCTElPRU5UUllfU0VMRUNUT1J9Omxhc3QtY2hpbGRgKVxuICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLmZvY3VzKClcbiAgfSxcblxuICAvKipcbiAgICogVGhpcyBtZXRob2QgaXMgdGhlIG1haW4gb25lLiBJdCdzIGNhbGxlZCBiZWNhdXNlIGFsbCB0aW1lcyB0aGUgaW50ZW50IGlzIHRvIGFkZCBhIG5ldyBiaWJsaW9lbnRyeSAoc2luZ2xlIHJlZmVyZW5jZSlcbiAgICogVGhlbiBpdCBjaGVja3MgaWYgaXMgbmVjZXNzYXJ5IHRvIGFkZCB0aGUgZW50aXJlIDxzZWN0aW9uPiBvciBvbmx5IHRoZSBtaXNzaW5nIDx1bD5cbiAgICovXG4gIGFkZEJpYmxpb2VudHJ5OiBmdW5jdGlvbiAoaWQsIHRleHQsIGxpc3RJdGVtKSB7XG5cbiAgICAvLyBBZGQgYmlibGlvZ3JhcGh5IHNlY3Rpb24gaWYgbm90IGV4aXN0c1xuICAgIGlmICghdGlueW1jZS5hY3RpdmVFZGl0b3IuJChCSUJMSU9HUkFQSFlfU0VMRUNUT1IpLmxlbmd0aCkge1xuXG4gICAgICBsZXQgYmlibGlvZ3JhcGh5ID0gJChgPHNlY3Rpb24gaWQ9XCJkb2MtYmlibGlvZ3JhcGh5XCIgcm9sZT1cImRvYy1iaWJsaW9ncmFwaHlcIj48aDE+UmVmZXJlbmNlczwvaDE+PHVsPjwvdWw+PC9zZWN0aW9uPmApXG5cbiAgICAgIC8vIFRoaXMgc2VjdGlvbiBpcyBhZGRlZCBhZnRlciBhY2tub3dsZWRnZW1lbnRzIHNlY3Rpb25cbiAgICAgIC8vIE9SIGFmdGVyIGxhc3Qgbm9uIHNwZWNpYWwgc2VjdGlvblxuICAgICAgLy8gT1IgYWZ0ZXIgYWJzdHJhY3Qgc2VjdGlvblxuICAgICAgLy8gT1IgYWZ0ZXIgbm9uIGVkaXRhYmxlIGhlYWRlciBcbiAgICAgIGlmICh0aW55bWNlLmFjdGl2ZUVkaXRvci4kKEFDS05PV0xFREdFTUVOVFNfU0VMRUNUT1IpLmxlbmd0aClcbiAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IuJChBQ0tOT1dMRURHRU1FTlRTX1NFTEVDVE9SKS5hZnRlcihiaWJsaW9ncmFwaHkpXG5cbiAgICAgIGVsc2UgaWYgKHRpbnltY2UuYWN0aXZlRWRpdG9yLiQoTUFJTl9TRUNUSU9OX1NFTEVDVE9SKS5sZW5ndGgpXG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLiQoTUFJTl9TRUNUSU9OX1NFTEVDVE9SKS5sYXN0KCkuYWZ0ZXIoYmlibGlvZ3JhcGh5KVxuXG4gICAgICBlbHNlIGlmICh0aW55bWNlLmFjdGl2ZUVkaXRvci4kKEFCU1RSQUNUX1NFTEVDVE9SKS5sZW5ndGgpXG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLiQoQUJTVFJBQ1RfU0VMRUNUT1IpLmFmdGVyKGJpYmxpb2dyYXBoeSlcblxuICAgICAgZWxzZVxuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci4kKE5PTl9FRElUQUJMRV9IRUFERVJfU0VMRUNUT1IpLmFmdGVyKGJpYmxpb2dyYXBoeSlcblxuICAgIH1cblxuICAgIC8vIEFkZCB1bCBpbiBiaWJsaW9ncmFwaHkgc2VjdGlvbiBpZiBub3QgZXhpc3RzXG4gICAgaWYgKCF0aW55bWNlLmFjdGl2ZUVkaXRvci4kKEJJQkxJT0dSQVBIWV9TRUxFQ1RPUikuZmluZCgndWwnKS5sZW5ndGgpXG4gICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci4kKEJJQkxJT0dSQVBIWV9TRUxFQ1RPUikuYXBwZW5kKCc8dWw+PC91bD4nKVxuXG4gICAgLy8gSUYgaWQgYW5kIHRleHQgYXJlbid0IHBhc3NlZCBhcyBwYXJhbWV0ZXJzLCB0aGVzZSBjYW4gYmUgcmV0cmlldmVkIG9yIGluaXQgZnJvbSBoZXJlXG4gICAgaWQgPSAoaWQpID8gaWQgOiBnZXRTdWNjZXNzaXZlRWxlbWVudElkKEJJQkxJT0VOVFJZX1NFTEVDVE9SLCBCSUJMSU9FTlRSWV9TVUZGSVgpXG4gICAgdGV4dCA9IHRleHQgPyB0ZXh0IDogJzxici8+J1xuXG4gICAgbGV0IG5ld0l0ZW0gPSAkKGA8bGkgcm9sZT1cImRvYy1iaWJsaW9lbnRyeVwiIGlkPVwiJHtpZH1cIj48cD4ke3RleHR9PC9wPjwvbGk+YClcblxuICAgIC8vIEFwcGVuZCBuZXcgbGkgdG8gdWwgYXQgbGFzdCBwb3NpdGlvblxuICAgIC8vIE9SIGluc2VydCB0aGUgbmV3IGxpIHJpZ2h0IGFmdGVyIHRoZSBjdXJyZW50IG9uZVxuICAgIGlmICghbGlzdEl0ZW0pXG4gICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci4kKGAke0JJQkxJT0dSQVBIWV9TRUxFQ1RPUn0gdWxgKS5hcHBlbmQobmV3SXRlbSlcblxuICAgIGVsc2VcbiAgICAgIGxpc3RJdGVtLmFmdGVyKG5ld0l0ZW0pXG4gIH0sXG5cbiAgLyoqXG4gICAqIFxuICAgKi9cbiAgdXBkYXRlQmlibGlvZ3JhcGh5U2VjdGlvbjogZnVuY3Rpb24gKCkge1xuXG4gICAgLy8gUmVtb3ZlIGFsbCBzZWN0aW9ucyB3aXRob3V0IHAgY2hpbGRcbiAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci4kKGAke0JJQkxJT0VOVFJZX1NFTEVDVE9SfTpub3QoOmhhcyhwKSlgKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICQodGhpcykucmVtb3ZlKClcbiAgICB9KVxuICB9LFxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGFkZEVuZG5vdGU6IGZ1bmN0aW9uIChpZCkge1xuXG4gICAgLy8gQWRkIHRoZSBzZWN0aW9uIGlmIGl0IG5vdCBleGlzdHNcbiAgICBpZiAoISQoRU5ETk9URV9TRUxFQ1RPUikubGVuZ3RoKSB7XG5cbiAgICAgIGxldCBlbmRub3RlcyA9ICQoYDxzZWN0aW9uIGlkPVwiZG9jLWVuZG5vdGVzXCIgcm9sZT1cImRvYy1lbmRub3Rlc1wiPjxoMSBkYXRhLXJhc2gtb3JpZ2luYWwtY29udGVudD1cIlwiPkZvb3Rub3RlczwvaDE+PC9zZWN0aW9uPmApXG5cbiAgICAgIC8vIEluc2VydCB0aGlzIHNlY3Rpb24gYWZ0ZXIgYmlibGlvZ3JhcGh5IHNlY3Rpb25cbiAgICAgIC8vIE9SIGFmdGVyIGFja25vd2xlZGdlbWVudHMgc2VjdGlvblxuICAgICAgLy8gT1IgYWZ0ZXIgbm9uIHNwZWNpYWwgc2VjdGlvbiBzZWxlY3RvclxuICAgICAgLy8gT1IgYWZ0ZXIgYWJzdHJhY3Qgc2VjdGlvblxuICAgICAgLy8gT1IgYWZ0ZXIgbm9uIGVkaXRhYmxlIGhlYWRlciBcbiAgICAgIGlmICgkKEJJQkxJT0dSQVBIWV9TRUxFQ1RPUikubGVuZ3RoKVxuICAgICAgICAkKEJJQkxJT0dSQVBIWV9TRUxFQ1RPUikuYWZ0ZXIoZW5kbm90ZXMpXG5cbiAgICAgIGVsc2UgaWYgKCQoQUNLTk9XTEVER0VNRU5UU19TRUxFQ1RPUikubGVuZ3RoKVxuICAgICAgICAkKEFDS05PV0xFREdFTUVOVFNfU0VMRUNUT1IpLmFmdGVyKGVuZG5vdGVzKVxuXG4gICAgICBlbHNlIGlmICgkKE1BSU5fU0VDVElPTl9TRUxFQ1RPUikubGVuZ3RoKVxuICAgICAgICAkKE1BSU5fU0VDVElPTl9TRUxFQ1RPUikubGFzdCgpLmFmdGVyKGVuZG5vdGVzKVxuXG4gICAgICBlbHNlIGlmICgkKEFCU1RSQUNUX1NFTEVDVE9SKS5sZW5ndGgpXG4gICAgICAgICQoQUJTVFJBQ1RfU0VMRUNUT1IpLmFmdGVyKGVuZG5vdGVzKVxuXG4gICAgICBlbHNlXG4gICAgICAgICQoTk9OX0VESVRBQkxFX0hFQURFUl9TRUxFQ1RPUikuYWZ0ZXIoZW5kbm90ZXMpXG4gICAgfVxuXG4gICAgLy8gQ3JlYXRlIGFuZCBhcHBlbmQgdGhlIG5ldyBlbmRub3RlXG4gICAgbGV0IGVuZG5vdGUgPSAkKGA8c2VjdGlvbiByb2xlPVwiZG9jLWVuZG5vdGVcIiBpZD1cIiR7aWR9XCI+PHA+PGJyLz48L3A+PC9zZWN0aW9uPmApXG4gICAgJChFTkROT1RFU19TRUxFQ1RPUikuYXBwZW5kKGVuZG5vdGUpXG4gIH0sXG5cbiAgLyoqXG4gICAqIFxuICAgKi9cbiAgdXBkYXRlU2VjdGlvblRvb2xiYXI6IGZ1bmN0aW9uICgpIHtcblxuICAgIC8vIERyb3Bkb3duIG1lbnUgcmVmZXJlbmNlXG4gICAgbGV0IG1lbnUgPSAkKE1FTlVfU0VMRUNUT1IpXG5cbiAgICBpZiAobWVudS5sZW5ndGgpIHtcbiAgICAgIHNlY3Rpb24ucmVzdG9yZVNlY3Rpb25Ub29sYmFyKG1lbnUpXG5cbiAgICAgIC8vIFNhdmUgY3VycmVudCBzZWxlY3RlZCBlbGVtZW50XG4gICAgICBsZXQgc2VsZWN0ZWRFbGVtZW50ID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Um5nKCkuc3RhcnRDb250YWluZXIpXG5cbiAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnRbMF0ubm9kZVR5cGUgPT0gMylcbiAgICAgICAgc2VsZWN0ZWRFbGVtZW50ID0gc2VsZWN0ZWRFbGVtZW50LnBhcmVudCgpXG5cbiAgICAgIC8vIElmIGN1cnJlbnQgZWxlbWVudCBpcyBwXG4gICAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LmlzKCdwJykgfHwgc2VsZWN0ZWRFbGVtZW50LnBhcmVudCgpLmlzKCdwJykpIHtcblxuICAgICAgICAvLyBDaGVjayBpZiBjYXJldCBpcyBpbnNpZGUgc3BlY2lhbCBzZWN0aW9uXG4gICAgICAgIC8vIEluIHRoaXMgY2FzZSBlbmFibGUgb25seSBmaXJzdCBtZW51aXRlbSBpZiBjYXJldCBpcyBpbiBhYnN0cmFjdFxuICAgICAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LnBhcmVudHMoU1BFQ0lBTF9TRUNUSU9OX1NFTEVDVE9SKS5sZW5ndGgpIHtcblxuICAgICAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQucGFyZW50cyhBQlNUUkFDVF9TRUxFQ1RPUikubGVuZ3RoKVxuICAgICAgICAgICAgbWVudS5jaGlsZHJlbihgOmx0KDEpYCkucmVtb3ZlQ2xhc3MoJ21jZS1kaXNhYmxlZCcpXG5cbiAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEdldCBkZWVwbmVzcyBvZiB0aGUgc2VjdGlvblxuICAgICAgICBsZXQgZGVlcG5lc3MgPSBzZWxlY3RlZEVsZW1lbnQucGFyZW50cyhTRUNUSU9OX1NFTEVDVE9SKS5sZW5ndGggKyAxXG5cbiAgICAgICAgLy8gUmVtb3ZlIGRpc2FibGluZyBjbGFzcyBvbiBmaXJzdCB7ZGVlcG5lc3N9IG1lbnUgaXRlbXNcbiAgICAgICAgbWVudS5jaGlsZHJlbihgOmx0KCR7ZGVlcG5lc3N9KWApLnJlbW92ZUNsYXNzKCdtY2UtZGlzYWJsZWQnKVxuXG4gICAgICAgIC8vIEdldCB0aGUgc2VjdGlvbiBsaXN0IGFuZCB1cGRhdGUgdGhlIGRyb3Bkb3duIHdpdGggdGhlIHJpZ2h0IHRleHRzXG4gICAgICAgIGxldCBsaXN0ID0gc2VjdGlvbi5nZXRBbmNlc3RvclNlY3Rpb25zTGlzdChzZWxlY3RlZEVsZW1lbnQpXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDw9IGxpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBtZW51LmNoaWxkcmVuKGA6ZXEoJHtpfSlgKS5maW5kKCdzcGFuLm1jZS10ZXh0JykudGV4dChsaXN0W2ldKVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIEVuYWJsZSBvbmx5IGZvciB1cGdyYWRlL2Rvd25ncmFkZVxuICAgICAgZWxzZSBpZiAoIXNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKFNQRUNJQUxfU0VDVElPTl9TRUxFQ1RPUikubGVuZ3RoICYmIHNlbGVjdGVkRWxlbWVudC5pcygnaDEsaDIsaDMnKSkge1xuXG4gICAgICAgIC8vIEdldCB0aGUgc2VsZWN0ZWQgc2VjdGlvblxuICAgICAgICBsZXQgc2VsZWN0ZWRTZWN0aW9uID0gc2VsZWN0ZWRFbGVtZW50LnBhcmVudHMoU0VDVElPTl9TRUxFQ1RPUikuZmlyc3QoKVxuXG4gICAgICAgIC8vIEdldCB0aGUgbnVtYmVyIG9mIHRoZSBoZWFkaW5nIChlZy4gSDEgPT4gMSwgSDIgPT4gMilcbiAgICAgICAgbGV0IGluZGV4ID0gcGFyc2VJbnQoc2VsZWN0ZWRFbGVtZW50LnByb3AoJ3RhZ05hbWUnKS50b0xvd2VyQ2FzZSgpLnJlcGxhY2UoJ2gnLCAnJykpXG5cbiAgICAgICAgLy8gR2V0IHRoZSBkZWVwbmVzcyBvZiB0aGUgc2VjdGlvbiAoZWcuIDEgaWYgaXMgYSBtYWluIHNlY3Rpb24sIDIgaWYgaXMgYSBzdWJzZWN0aW9uKVxuICAgICAgICBsZXQgZGVlcG5lc3MgPSBzZWxlY3RlZEVsZW1lbnQucGFyZW50cyhTRUNUSU9OX1NFTEVDVE9SKS5sZW5ndGhcblxuICAgICAgICAvLyBHZXQgdGhlIGxpc3Qgb2YgdGV4dHMgdGhhdCBhcmUgYmVlXG4gICAgICAgIGxldCBsaXN0ID0gc2VjdGlvbi5nZXRBbmNlc3RvclNlY3Rpb25zTGlzdChzZWxlY3RlZEVsZW1lbnQpXG5cbiAgICAgICAgLy8gVGhlIHRleHQgaW5kZXggaW4gbGlzdFxuICAgICAgICBsZXQgaSA9IGRlZXBuZXNzIC0gaW5kZXhcblxuICAgICAgICAvLyBDaGVjayBpZiB0aGUgY3VycmVudCBzZWN0aW9uIGhhcyBhIHByZXZpb3VzIHNlY3Rpb24gXG4gICAgICAgIC8vIEluIHRoaXMgY2FzZSB0aGUgdXBncmFkZSBpcyBwZXJtaXR0ZWRcbiAgICAgICAgaWYgKHNlbGVjdGVkU2VjdGlvbi5wcmV2KCkuaXMoU0VDVElPTl9TRUxFQ1RPUikpIHtcblxuICAgICAgICAgIC8vIG1lbnUgaXRlbSBpbnNpZGUgdGhlIGRyb3Bkb3duXG4gICAgICAgICAgbGV0IG1lbnVJdGVtID0gbWVudS5jaGlsZHJlbihgOmVxKCR7aW5kZXh9KWApXG5cbiAgICAgICAgICBsZXQgdG1wID0gbGlzdFtpbmRleF0ucmVwbGFjZShIRUFESU5HX0JVVFRPTl9MQUJFTCwgJycpXG4gICAgICAgICAgdG1wID0gdG1wLnNwbGl0KCcuJylcbiAgICAgICAgICB0bXBbaW5kZXggLSAxXSA9IHBhcnNlSW50KHRtcFtpbmRleCAtIDFdKSAtIDFcblxuICAgICAgICAgIGxldCB0ZXh0ID0gSEVBRElOR19CVVRUT05fTEFCRUwgKyB0bXAuam9pbignLicpXG5cbiAgICAgICAgICBtZW51SXRlbS5maW5kKCdzcGFuLm1jZS10ZXh0JykudGV4dCh0ZXh0KVxuICAgICAgICAgIG1lbnVJdGVtLnJlbW92ZUNsYXNzKCdtY2UtZGlzYWJsZWQnKVxuICAgICAgICAgIG1lbnVJdGVtLmF0dHIoREFUQV9ET1dOR1JBREUsIHRydWUpXG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayBpZiB0aGUgY3VycmVudCBzZWN0aW9uIGhhcyBhIHBhcmVudFxuICAgICAgICAvLyBJbiB0aGlzIGNhc2UgdGhlIHVwZ3JhZGUgaXMgcGVybWl0dGVkXG4gICAgICAgIGlmIChzZWxlY3RlZFNlY3Rpb24ucGFyZW50KFNFQ1RJT05fU0VMRUNUT1IpLmxlbmd0aCkge1xuXG4gICAgICAgICAgaW5kZXggPSBpbmRleCAtIDJcblxuICAgICAgICAgIC8vIG1lbnUgaXRlbSBpbnNpZGUgdGhlIGRyb3Bkb3duXG4gICAgICAgICAgbGV0IG1lbnVJdGVtID0gbWVudS5jaGlsZHJlbihgOmVxKCR7aW5kZXh9KWApXG4gICAgICAgICAgbWVudUl0ZW0uZmluZCgnc3Bhbi5tY2UtdGV4dCcpLnRleHQobGlzdFtpbmRleF0pXG4gICAgICAgICAgbWVudUl0ZW0ucmVtb3ZlQ2xhc3MoJ21jZS1kaXNhYmxlZCcpXG4gICAgICAgICAgbWVudUl0ZW0uYXR0cihEQVRBX1VQR1JBREUsIHRydWUpXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gRGlzYWJsZSBpbiBhbnkgb3RoZXIgY2FzZXNcbiAgICAgIGVsc2VcbiAgICAgICAgbWVudS5jaGlsZHJlbignOmd0KDEwKScpLmFkZENsYXNzKCdtY2UtZGlzYWJsZWQnKVxuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogXG4gICAqL1xuICBnZXRBbmNlc3RvclNlY3Rpb25zTGlzdDogZnVuY3Rpb24gKHNlbGVjdGVkRWxlbWVudCkge1xuXG4gICAgbGV0IHByZUhlYWRlcnMgPSBbXVxuICAgIGxldCBsaXN0ID0gW11cbiAgICBsZXQgcGFyZW50U2VjdGlvbnMgPSBzZWxlY3RlZEVsZW1lbnQucGFyZW50cygnc2VjdGlvbicpXG5cbiAgICAvLyBTYXZlIGluZGV4IG9mIGFsbCBwYXJlbnQgc2VjdGlvbnNcbiAgICBmb3IgKGxldCBpID0gcGFyZW50U2VjdGlvbnMubGVuZ3RoOyBpID4gMDsgaS0tKSB7XG4gICAgICBsZXQgZWxlbSA9ICQocGFyZW50U2VjdGlvbnNbaSAtIDFdKVxuICAgICAgbGV0IGluZGV4ID0gZWxlbS5wYXJlbnQoKS5jaGlsZHJlbihTRUNUSU9OX1NFTEVDVE9SKS5pbmRleChlbGVtKSArIDFcbiAgICAgIHByZUhlYWRlcnMucHVzaChpbmRleClcbiAgICB9XG5cbiAgICAvLyBVcGRhdGUgdGV4dCBvZiBhbGwgbWVudSBpdGVtXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPD0gcHJlSGVhZGVycy5sZW5ndGg7IGkrKykge1xuXG4gICAgICBsZXQgdGV4dCA9IEhFQURJTkdfQlVUVE9OX0xBQkVMXG5cbiAgICAgIC8vIFVwZGF0ZSB0ZXh0IGJhc2VkIG9uIHNlY3Rpb24gc3RydWN0dXJlXG4gICAgICBpZiAoaSAhPSBwcmVIZWFkZXJzLmxlbmd0aCkge1xuICAgICAgICBmb3IgKGxldCB4ID0gMDsgeCA8PSBpOyB4KyspXG4gICAgICAgICAgdGV4dCArPSBgJHtwcmVIZWFkZXJzW3hdICsgKHggPT0gaSA/IDEgOiAwKX0uYFxuICAgICAgfVxuXG4gICAgICAvLyBJbiB0aGlzIGNhc2UgcmFqZSBjaGFuZ2VzIHRleHQgb2YgbmV4dCBzdWIgaGVhZGluZ1xuICAgICAgZWxzZSB7XG4gICAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgaTsgeCsrKVxuICAgICAgICAgIHRleHQgKz0gYCR7cHJlSGVhZGVyc1t4XX0uYFxuXG4gICAgICAgIHRleHQgKz0gJzEuJ1xuICAgICAgfVxuXG4gICAgICBsaXN0LnB1c2godGV4dClcbiAgICB9XG5cbiAgICByZXR1cm4gbGlzdFxuICB9LFxuXG4gIC8qKlxuICAgKiBSZXN0b3JlIG5vcm1hbCB0ZXh0IGluIHNlY3Rpb24gdG9vbGJhciBhbmQgZGlzYWJsZSBhbGxcbiAgICovXG4gIHJlc3RvcmVTZWN0aW9uVG9vbGJhcjogZnVuY3Rpb24gKG1lbnUpIHtcblxuICAgIGxldCBjbnQgPSAxXG5cbiAgICBtZW51LmNoaWxkcmVuKCc6bHQoNiknKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgIGxldCB0ZXh0ID0gSEVBRElOR19CVVRUT05fTEFCRUxcblxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjbnQ7IGkrKylcbiAgICAgICAgdGV4dCArPSBgMS5gXG5cbiAgICAgIC8vIFJlbW92ZSBkYXRhIGVsZW1lbnRzXG4gICAgICAkKHRoaXMpLnJlbW92ZUF0dHIoREFUQV9VUEdSQURFKVxuICAgICAgJCh0aGlzKS5yZW1vdmVBdHRyKERBVEFfRE9XTkdSQURFKVxuXG4gICAgICAkKHRoaXMpLmZpbmQoJ3NwYW4ubWNlLXRleHQnKS50ZXh0KHRleHQpXG4gICAgICAkKHRoaXMpLmFkZENsYXNzKCdtY2UtZGlzYWJsZWQnKVxuXG4gICAgICBjbnQrK1xuICAgIH0pXG5cbiAgICAvLyBFbmFibGUgdXBncmFkZS9kb3duZ3JhZGUgbGFzdCB0aHJlZSBtZW51IGl0ZW1zXG4gICAgbWVudS5jaGlsZHJlbignOmd0KDEwKScpLnJlbW92ZUNsYXNzKCdtY2UtZGlzYWJsZWQnKVxuICB9LFxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIG1hbmFnZURlbGV0ZTogZnVuY3Rpb24gKCkge1xuXG4gICAgbGV0IHNlbGVjdGVkQ29udGVudCA9IHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRDb250ZW50KClcblxuICAgIC8vIElmIHRoZSBzZWxlY3RlZCBjb250ZW50IGhhcyBIVE1MIGluc2lkZVxuICAgIGlmIChzZWxlY3RlZENvbnRlbnQuaW5kZXhPZignPCcpID4gLTEpIHtcblxuICAgICAgc2VsZWN0ZWRDb250ZW50ID0gJChzZWxlY3RlZENvbnRlbnQpXG4gICAgICBsZXQgaGFzU2VjdGlvbiA9IGZhbHNlXG4gICAgICAvLyBDaGVjayBpZiBvbmUgb2YgdGhlIHNlbGVjdGVkIGVsZW1lbnQgaXMgYSBzZWN0aW9uXG4gICAgICBzZWxlY3RlZENvbnRlbnQuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICgkKHRoaXMpLmlzKFNFQ1RJT05fU0VMRUNUT1IpKVxuICAgICAgICAgIHJldHVybiBoYXNTZWN0aW9uID0gdHJ1ZVxuICAgICAgfSlcblxuICAgICAgLy8gSWYgdGhlIHNlbGVjdGVkIGNvbnRlbnQgaGFzIGEgc2VjdGlvbiBpbnNpZGUsIHRoZW4gbWFuYWdlIGRlbGV0ZVxuICAgICAgaWYgKGhhc1NlY3Rpb24pIHtcblxuICAgICAgICBsZXQgcmFuZ2UgPSB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Um5nKClcbiAgICAgICAgbGV0IHN0YXJ0Tm9kZSA9ICQocmFuZ2Uuc3RhcnRDb250YWluZXIpLnBhcmVudCgpXG4gICAgICAgIGxldCBlbmROb2RlID0gJChyYW5nZS5lbmRDb250YWluZXIpLnBhcmVudCgpXG4gICAgICAgIGxldCBjb21tb25BbmNlc3RvckNvbnRhaW5lciA9ICQocmFuZ2UuY29tbW9uQW5jZXN0b3JDb250YWluZXIpXG5cbiAgICAgICAgLy8gRGVlcG5lc3MgaXMgcmVsYXRpdmUgdG8gdGhlIGNvbW1vbiBhbmNlc3RvciBjb250YWluZXIgb2YgdGhlIHJhbmdlIHN0YXJ0Q29udGFpbmVyIGFuZCBlbmRcbiAgICAgICAgbGV0IGRlZXBuZXNzID0gZW5kTm9kZS5wYXJlbnQoJ3NlY3Rpb24nKS5wYXJlbnRzVW50aWwoY29tbW9uQW5jZXN0b3JDb250YWluZXIpLmxlbmd0aCArIDFcbiAgICAgICAgbGV0IGN1cnJlbnRFbGVtZW50ID0gZW5kTm9kZVxuICAgICAgICBsZXQgdG9Nb3ZlRWxlbWVudHMgPSBbXVxuXG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgIC8vIEdldCBhbmQgZGV0YWNoIGFsbCBuZXh0X2VuZFxuICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDw9IGRlZXBuZXNzOyBpKyspIHtcbiAgICAgICAgICAgIGN1cnJlbnRFbGVtZW50Lm5leHRBbGwoJ3NlY3Rpb24scCxmaWd1cmUscHJlLHVsLG9sLGJsb2NrcXVvdGUnKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgdG9Nb3ZlRWxlbWVudHMucHVzaCgkKHRoaXMpKVxuXG4gICAgICAgICAgICAgICQodGhpcykuZGV0YWNoKClcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICBjdXJyZW50RWxlbWVudCA9IGN1cnJlbnRFbGVtZW50LnBhcmVudCgpXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gRXhlY3V0ZSBkZWxldGVcbiAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5leGVjQ29tbWFuZChERUxFVEVfQ01EKVxuXG4gICAgICAgICAgLy8gRGV0YWNoIGFsbCBuZXh0X2JlZ2luXG4gICAgICAgICAgc3RhcnROb2RlLm5leHRBbGwoKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICQodGhpcykuZGV0YWNoKClcbiAgICAgICAgICB9KVxuXG4gICAgICAgICAgLy8gQXBwZW5kIGFsbCBuZXh0X2VuZCB0byBzdGFydG5vZGUgcGFyZW50XG4gICAgICAgICAgdG9Nb3ZlRWxlbWVudHMuZm9yRWFjaChmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgICAgICAgICAgc3RhcnROb2RlLnBhcmVudCgnc2VjdGlvbicpLmFwcGVuZChlbGVtZW50KVxuICAgICAgICAgIH0pXG5cbiAgICAgICAgICAvLyBSZWZyZXNoIGhlYWRpbmdzXG4gICAgICAgICAgaGVhZGluZ0RpbWVuc2lvbigpXG5cbiAgICAgICAgICAvLyBVcGRhdGUgcmVmZXJlbmNlcyBpZiBuZWVkZWRcbiAgICAgICAgICB1cGRhdGVSZWZlcmVuY2VzKClcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIFxuICAgKi9cbiAgZGVsZXRlU3BlY2lhbFNlY3Rpb246IGZ1bmN0aW9uIChzZWxlY3RlZEVsZW1lbnQpIHtcblxuICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgLy8gUmVtb3ZlIHRoZSBzZWN0aW9uIGFuZCB1cGRhdGUgXG4gICAgICBzZWxlY3RlZEVsZW1lbnQucGFyZW50KFNQRUNJQUxfU0VDVElPTl9TRUxFQ1RPUikucmVtb3ZlKClcblxuICAgICAgLy8gVXBkYXRlIHJlZmVyZW5jZXNcbiAgICAgIHVwZGF0ZVJlZmVyZW5jZXMoKVxuXG4gICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcbiAgICB9KVxuICB9LFxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGN1cnNvckluU2VjdGlvbjogZnVuY3Rpb24gKHNlbGVjdGlvbikge1xuXG4gICAgcmV0dXJuICQoc2VsZWN0aW9uLmdldE5vZGUoKSkuaXMoU0VDVElPTl9TRUxFQ1RPUikgfHwgQm9vbGVhbigkKHNlbGVjdGlvbi5nZXROb2RlKCkpLnBhcmVudHMoU0VDVElPTl9TRUxFQ1RPUikubGVuZ3RoKVxuICB9LFxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGN1cnNvckluU3BlY2lhbFNlY3Rpb246IGZ1bmN0aW9uIChzZWxlY3Rpb24pIHtcblxuICAgIHJldHVybiAkKHNlbGVjdGlvbi5nZXROb2RlKCkpLmlzKFNQRUNJQUxfU0VDVElPTl9TRUxFQ1RPUikgfHxcbiAgICAgIEJvb2xlYW4oJChzZWxlY3Rpb24uZ2V0Um5nKCkuc3RhcnRDb250YWluZXIpLnBhcmVudHMoU1BFQ0lBTF9TRUNUSU9OX1NFTEVDVE9SKS5sZW5ndGgpIHx8XG4gICAgICBCb29sZWFuKCQoc2VsZWN0aW9uLmdldFJuZygpLmVuZENvbnRhaW5lcikucGFyZW50cyhTUEVDSUFMX1NFQ1RJT05fU0VMRUNUT1IpLmxlbmd0aClcbiAgfVxufSIsInRpbnltY2UuUGx1Z2luTWFuYWdlci5hZGQoJ3JhamVfY3Jvc3NyZWYnLCBmdW5jdGlvbiAoZWRpdG9yLCB1cmwpIHtcblxuICAvLyBBZGQgYSBidXR0b24gdGhhdCBoYW5kbGUgdGhlIGlubGluZSBlbGVtZW50XG4gIGVkaXRvci5hZGRCdXR0b24oJ3JhamVfY3Jvc3NyZWYnLCB7XG4gICAgdGl0bGU6ICdyYWplX2Nyb3NzcmVmJyxcbiAgICBpY29uOiAnaWNvbi1hbmNob3InLFxuICAgIHRvb2x0aXA6ICdDcm9zcy1yZWZlcmVuY2UnLFxuICAgIGRpc2FibGVkU3RhdGVTZWxlY3RvcjogYCR7RElTQUJMRV9TRUxFQ1RPUl9JTkxJTkV9LDpoZWFkZXJgLFxuXG4gICAgLy8gQnV0dG9uIGJlaGF2aW91clxuICAgIG9uY2xpY2s6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG5cbiAgICAgIGxldCByZWZlcmVuY2VhYmxlTGlzdCA9IHtcbiAgICAgICAgc2VjdGlvbnM6IGNyb3NzcmVmLmdldEFsbFJlZmVyZW5jZWFibGVTZWN0aW9ucygpLFxuICAgICAgICB0YWJsZXM6IGNyb3NzcmVmLmdldEFsbFJlZmVyZW5jZWFibGVUYWJsZXMoKSxcbiAgICAgICAgZmlndXJlczogY3Jvc3NyZWYuZ2V0QWxsUmVmZXJlbmNlYWJsZUZpZ3VyZXMoKSxcbiAgICAgICAgbGlzdGluZ3M6IGNyb3NzcmVmLmdldEFsbFJlZmVyZW5jZWFibGVMaXN0aW5ncygpLFxuICAgICAgICBmb3JtdWxhczogY3Jvc3NyZWYuZ2V0QWxsUmVmZXJlbmNlYWJsZUZvcm11bGFzKCksXG4gICAgICAgIHJlZmVyZW5jZXM6IGNyb3NzcmVmLmdldEFsbFJlZmVyZW5jZWFibGVSZWZlcmVuY2VzKClcbiAgICAgIH1cblxuICAgICAgZWRpdG9yLndpbmRvd01hbmFnZXIub3Blbih7XG4gICAgICAgICAgdGl0bGU6ICdDcm9zcy1yZWZlcmVuY2UgZWRpdG9yJyxcbiAgICAgICAgICB1cmw6ICdqcy9yYWplLWNvcmUvcGx1Z2luL3JhamVfY3Jvc3NyZWYuaHRtbCcsXG4gICAgICAgICAgd2lkdGg6IDUwMCxcbiAgICAgICAgICBoZWlnaHQ6IDgwMCxcbiAgICAgICAgICBvbkNsb3NlOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogXG4gICAgICAgICAgICAgKiBUaGlzIGJlaGF2aW91ciBpcyBjYWxsZWQgd2hlbiB1c2VyIHByZXNzIFwiQUREIE5FVyBSRUZFUkVOQ0VcIiBcbiAgICAgICAgICAgICAqIGJ1dHRvbiBmcm9tIHRoZSBtb2RhbFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBpZiAodGlueW1jZS5hY3RpdmVFZGl0b3IuY3JlYXRlTmV3UmVmZXJlbmNlKSB7XG5cbiAgICAgICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgICAgICAgLy8gR2V0IHN1Y2Nlc3NpdmUgYmlibGlvZW50cnkgaWRcbiAgICAgICAgICAgICAgICBsZXQgaWQgPSBnZXRTdWNjZXNzaXZlRWxlbWVudElkKEJJQkxJT0VOVFJZX1NFTEVDVE9SLCBCSUJMSU9FTlRSWV9TVUZGSVgpXG5cbiAgICAgICAgICAgICAgICAvLyBDcmVhdGUgdGhlIHJlZmVyZW5jZSB0aGF0IHBvaW50cyB0byB0aGUgbmV4dCBpZFxuICAgICAgICAgICAgICAgIGNyb3NzcmVmLmFkZChpZClcblxuICAgICAgICAgICAgICAgIC8vIEFkZCB0aGUgbmV4dCBiaWJsaW9lbnRyeVxuICAgICAgICAgICAgICAgIHNlY3Rpb24uYWRkQmlibGlvZW50cnkoaWQpXG5cbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgdGhlIHJlZmVyZW5jZVxuICAgICAgICAgICAgICAgIGNyb3NzcmVmLnVwZGF0ZSgpXG5cbiAgICAgICAgICAgICAgICAvLyBNb3ZlIGNhcmV0IHRvIHN0YXJ0IG9mIHRoZSBuZXcgYmlibGlvZW50cnkgZWxlbWVudFxuICAgICAgICAgICAgICAgIC8vIElzc3VlICMxMDUgRmlyZWZveCArIENocm9taXVtXG4gICAgICAgICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLnNldEN1cnNvckxvY2F0aW9uKCQodGlueW1jZS5hY3RpdmVFZGl0b3IuZG9tLmdldChpZCkpLmZpbmQoJ3AnKVswXSwgZmFsc2UpXG4gICAgICAgICAgICAgICAgc2Nyb2xsVG8oYCR7QklCTElPRU5UUllfU0VMRUNUT1J9IyR7aWR9YClcbiAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgICAvLyBTZXQgdmFyaWFibGUgbnVsbCBmb3Igc3VjY2Vzc2l2ZSB1c2FnZXNcbiAgICAgICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IuY3JlYXRlTmV3UmVmZXJlbmNlID0gbnVsbFxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFRoaXMgaXMgY2FsbGVkIGlmIGEgbm9ybWFsIHJlZmVyZW5jZSBpcyBzZWxlY3RlZCBmcm9tIG1vZGFsXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGVsc2UgaWYgKHRpbnltY2UuYWN0aXZlRWRpdG9yLnJlZmVyZW5jZSkge1xuXG4gICAgICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgICAgICAgIC8vIENyZWF0ZSB0aGUgZW1wdHkgYW5jaG9yIGFuZCB1cGRhdGUgaXRzIGNvbnRlbnRcbiAgICAgICAgICAgICAgICBjcm9zc3JlZi5hZGQodGlueW1jZS5hY3RpdmVFZGl0b3IucmVmZXJlbmNlKVxuICAgICAgICAgICAgICAgIGNyb3NzcmVmLnVwZGF0ZSgpXG5cbiAgICAgICAgICAgICAgICBsZXQgc2VsZWN0ZWROb2RlID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuXG4gICAgICAgICAgICAgICAgLy8gVGhpcyBzZWxlY3QgdGhlIGxhc3QgZWxlbWVudCAobGFzdCBieSBvcmRlcikgYW5kIGNvbGxhcHNlIHRoZSBzZWxlY3Rpb24gYWZ0ZXIgdGhlIG5vZGVcbiAgICAgICAgICAgICAgICAvLyAjMTA1IEZpcmVmb3ggKyBDaHJvbWl1bVxuICAgICAgICAgICAgICAgIC8vdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLnNldEN1cnNvckxvY2F0aW9uKCQodGlueW1jZS5hY3RpdmVFZGl0b3IuZG9tLnNlbGVjdChgYVtocmVmPVwiIyR7dGlueW1jZS5hY3RpdmVFZGl0b3IucmVmZXJlbmNlfVwiXTpsYXN0LWNoaWxkYCkpWzBdLCBmYWxzZSlcbiAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgICAvLyBTZXQgdmFyaWFibGUgbnVsbCBmb3Igc3VjY2Vzc2l2ZSB1c2FnZXNcbiAgICAgICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IucmVmZXJlbmNlID0gbnVsbFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICAvLyBMaXN0IG9mIGFsbCByZWZlcmVuY2VhYmxlIGVsZW1lbnRzXG4gICAgICAgIHJlZmVyZW5jZWFibGVMaXN0KVxuICAgIH1cbiAgfSlcblxuICBjcm9zc3JlZiA9IHtcbiAgICBnZXRBbGxSZWZlcmVuY2VhYmxlU2VjdGlvbnM6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgbGV0IHNlY3Rpb25zID0gW11cblxuICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IuJCgnc2VjdGlvbicpLmVhY2goZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIGxldCBsZXZlbCA9ICcnXG5cbiAgICAgICAgaWYgKCEkKHRoaXMpLmlzKEVORE5PVEVfU0VMRUNUT1IpKSB7XG5cbiAgICAgICAgICAvLyBTZWN0aW9ucyB3aXRob3V0IHJvbGUgaGF2ZSA6YWZ0ZXJcbiAgICAgICAgICBpZiAoISQodGhpcykuYXR0cigncm9sZScpKSB7XG5cbiAgICAgICAgICAgIC8vIFNhdmUgaXRzIGRlZXBuZXNzXG4gICAgICAgICAgICBsZXQgcGFyZW50U2VjdGlvbnMgPSAkKHRoaXMpLnBhcmVudHNVbnRpbCgnYm9keScpXG5cbiAgICAgICAgICAgIGlmIChwYXJlbnRTZWN0aW9ucy5sZW5ndGgpIHtcblxuICAgICAgICAgICAgICAvLyBJdGVyYXRlIGl0cyBwYXJlbnRzIGJhY2t3YXJkcyAoaGlnZXIgZmlyc3QpXG4gICAgICAgICAgICAgIGZvciAobGV0IGkgPSBwYXJlbnRTZWN0aW9ucy5sZW5ndGg7IGktLTsgaSA+IDApIHtcbiAgICAgICAgICAgICAgICBsZXQgc2VjdGlvbiA9ICQocGFyZW50U2VjdGlvbnNbaV0pXG4gICAgICAgICAgICAgICAgbGV2ZWwgKz0gYCR7c2VjdGlvbi5wYXJlbnQoKS5jaGlsZHJlbihTRUNUSU9OX1NFTEVDVE9SKS5pbmRleChzZWN0aW9uKSsxfS5gXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQ3VycmVudCBpbmRleFxuICAgICAgICAgICAgbGV2ZWwgKz0gYCR7JCh0aGlzKS5wYXJlbnQoKS5jaGlsZHJlbihTRUNUSU9OX1NFTEVDVE9SKS5pbmRleCgkKHRoaXMpKSsxfS5gXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgc2VjdGlvbnMucHVzaCh7XG4gICAgICAgICAgICByZWZlcmVuY2U6ICQodGhpcykuYXR0cignaWQnKSxcbiAgICAgICAgICAgIHRleHQ6ICQodGhpcykuZmluZCgnOmhlYWRlcicpLmZpcnN0KCkudGV4dCgpLFxuICAgICAgICAgICAgbGV2ZWw6IGxldmVsXG4gICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgICAgfSlcblxuICAgICAgcmV0dXJuIHNlY3Rpb25zXG4gICAgfSxcblxuICAgIGdldEFsbFJlZmVyZW5jZWFibGVUYWJsZXM6IGZ1bmN0aW9uICgpIHtcbiAgICAgIGxldCB0YWJsZXMgPSBbXVxuXG4gICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci4kKCdmaWd1cmU6aGFzKHRhYmxlKScpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICB0YWJsZXMucHVzaCh7XG4gICAgICAgICAgcmVmZXJlbmNlOiAkKHRoaXMpLmF0dHIoJ2lkJyksXG4gICAgICAgICAgdGV4dDogJCh0aGlzKS5maW5kKCdmaWdjYXB0aW9uJykudGV4dCgpXG4gICAgICAgIH0pXG4gICAgICB9KVxuXG4gICAgICByZXR1cm4gdGFibGVzXG4gICAgfSxcblxuICAgIGdldEFsbFJlZmVyZW5jZWFibGVMaXN0aW5nczogZnVuY3Rpb24gKCkge1xuICAgICAgbGV0IGxpc3RpbmdzID0gW11cblxuICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IuJCgnZmlndXJlOmhhcyhwcmU6aGFzKGNvZGUpKScpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICBsaXN0aW5ncy5wdXNoKHtcbiAgICAgICAgICByZWZlcmVuY2U6ICQodGhpcykuYXR0cignaWQnKSxcbiAgICAgICAgICB0ZXh0OiAkKHRoaXMpLmZpbmQoJ2ZpZ2NhcHRpb24nKS50ZXh0KClcbiAgICAgICAgfSlcbiAgICAgIH0pXG5cbiAgICAgIHJldHVybiBsaXN0aW5nc1xuICAgIH0sXG5cbiAgICBnZXRBbGxSZWZlcmVuY2VhYmxlRmlndXJlczogZnVuY3Rpb24gKCkge1xuICAgICAgbGV0IGZpZ3VyZXMgPSBbXVxuXG4gICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci4kKEZJR1VSRV9JTUFHRV9TRUxFQ1RPUikuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIGZpZ3VyZXMucHVzaCh7XG4gICAgICAgICAgcmVmZXJlbmNlOiAkKHRoaXMpLmF0dHIoJ2lkJyksXG4gICAgICAgICAgdGV4dDogJCh0aGlzKS5maW5kKCdmaWdjYXB0aW9uJykudGV4dCgpXG4gICAgICAgIH0pXG4gICAgICB9KVxuXG4gICAgICByZXR1cm4gZmlndXJlc1xuICAgIH0sXG5cbiAgICBnZXRBbGxSZWZlcmVuY2VhYmxlRm9ybXVsYXM6IGZ1bmN0aW9uICgpIHtcbiAgICAgIGxldCBmb3JtdWxhcyA9IFtdXG5cbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLiQoZm9ybXVsYWJveF9zZWxlY3RvcikuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIGZvcm11bGFzLnB1c2goe1xuICAgICAgICAgIHJlZmVyZW5jZTogJCh0aGlzKS5wYXJlbnRzKEZJR1VSRV9TRUxFQ1RPUikuYXR0cignaWQnKSxcbiAgICAgICAgICB0ZXh0OiBgRm9ybXVsYSAkeyQodGhpcykucGFyZW50cyhGSUdVUkVfU0VMRUNUT1IpLmZpbmQoJ3NwYW4uY2dlbicpLnRleHQoKX1gXG4gICAgICAgIH0pXG4gICAgICB9KVxuXG4gICAgICByZXR1cm4gZm9ybXVsYXNcbiAgICB9LFxuXG4gICAgZ2V0QWxsUmVmZXJlbmNlYWJsZVJlZmVyZW5jZXM6IGZ1bmN0aW9uICgpIHtcbiAgICAgIGxldCByZWZlcmVuY2VzID0gW11cbiAgICAgIFxuICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IuJCgnc2VjdGlvbltyb2xlPWRvYy1iaWJsaW9ncmFwaHldIGxpJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJlZmVyZW5jZXMucHVzaCh7XG4gICAgICAgICAgcmVmZXJlbmNlOiAkKHRoaXMpLmF0dHIoJ2lkJyksXG4gICAgICAgICAgdGV4dDogJCh0aGlzKS50ZXh0KCksXG4gICAgICAgICAgbGV2ZWw6ICQodGhpcykuaW5kZXgoKSArIDFcbiAgICAgICAgfSlcbiAgICAgIH0pXG5cbiAgICAgIHJldHVybiByZWZlcmVuY2VzXG4gICAgfSxcblxuICAgIGFkZDogZnVuY3Rpb24gKHJlZmVyZW5jZSkge1xuXG4gICAgICAvLyBDcmVhdGUgdGhlIGVtcHR5IHJlZmVyZW5jZSB3aXRoIGEgd2hpdGVzcGFjZSBhdCB0aGUgZW5kXG4gICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2V0Q29udGVudChgPGEgY29udGVudGVkaXRhYmxlPVwiZmFsc2VcIiBocmVmPVwiIyR7cmVmZXJlbmNlfVwiPiZuYnNwOzwvYT4mbmJzcDtgKVxuICAgICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG4gICAgfSxcblxuICAgIHVwZGF0ZTogZnVuY3Rpb24gKCkge1xuXG4gICAgICAvLyBVcGRhdGUgdGhlIHJlZmVyZW5jZSAoaW4gc2F2ZWQgY29udGVudClcbiAgICAgIHJlZmVyZW5jZXMoKVxuXG4gICAgICAvLyBQcmV2ZW50IGFkZGluZyBvZiBuZXN0ZWQgYSBhcyBmb290bm90ZXNcbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLiQoJ2E+c3VwPmEnKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgJCh0aGlzKS5wYXJlbnQoKS5odG1sKCQodGhpcykudGV4dCgpKVxuICAgICAgfSlcbiAgICB9XG4gIH1cbn0pXG5cbnRpbnltY2UuUGx1Z2luTWFuYWdlci5hZGQoJ3JhamVfZm9vdG5vdGVzJywgZnVuY3Rpb24gKGVkaXRvciwgdXJsKSB7XG5cbiAgZWRpdG9yLmFkZEJ1dHRvbigncmFqZV9mb290bm90ZXMnLCB7XG4gICAgdGl0bGU6ICdyYWplX2Zvb3Rub3RlcycsXG4gICAgaWNvbjogJ2ljb24tZm9vdG5vdGVzJyxcbiAgICB0b29sdGlwOiAnRm9vdG5vdGUnLFxuICAgIGRpc2FibGVkU3RhdGVTZWxlY3RvcjogYCR7RElTQUJMRV9TRUxFQ1RPUl9JTkxJTkV9LDpoZWFkZXJgLFxuXG4gICAgLy8gQnV0dG9uIGJlaGF2aW91clxuICAgIG9uY2xpY2s6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIC8vIEdldCBzdWNjZXNzaXZlIGJpYmxpb2VudHJ5IGlkXG4gICAgICAgIGxldCByZWZlcmVuY2UgPSBnZXRTdWNjZXNzaXZlRWxlbWVudElkKEVORE5PVEVfU0VMRUNUT1IsIEVORE5PVEVfU1VGRklYKVxuXG4gICAgICAgIC8vIENyZWF0ZSB0aGUgcmVmZXJlbmNlIHRoYXQgcG9pbnRzIHRvIHRoZSBuZXh0IGlkXG4gICAgICAgIGNyb3NzcmVmLmFkZChyZWZlcmVuY2UpXG5cbiAgICAgICAgLy8gQWRkIHRoZSBuZXh0IGJpYmxpb2VudHJ5XG4gICAgICAgIHNlY3Rpb24uYWRkRW5kbm90ZShyZWZlcmVuY2UpXG5cbiAgICAgICAgLy8gVXBkYXRlIHRoZSByZWZlcmVuY2VcbiAgICAgICAgY3Jvc3NyZWYudXBkYXRlKClcblxuICAgICAgICAvLyBNb3ZlIGNhcmV0IGF0IHRoZSBlbmQgb2YgcCBpbiBsYXN0IGluc2VydGVkIGVuZG5vdGVcbiAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLnNldEN1cnNvckxvY2F0aW9uKHRpbnltY2UuYWN0aXZlRWRpdG9yLmRvbS5zZWxlY3QoYCR7RU5ETk9URV9TRUxFQ1RPUn0jJHtyZWZlcmVuY2V9PnBgKVswXSwgMSlcbiAgICAgIH0pXG4gICAgfVxuICB9KVxufSlcblxuZnVuY3Rpb24gcmVmZXJlbmNlcygpIHtcblxuICB0aW55bWNlLnRyaWdnZXJTYXZlKClcblxuICAvKiBSZWZlcmVuY2VzICovXG4gIHRpbnltY2UuYWN0aXZlRWRpdG9yLiQoXCJhW2hyZWZdXCIpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgIGlmICgkLnRyaW0oJCh0aGlzKS50ZXh0KCkpID09ICcnKSB7XG4gICAgICB2YXIgY3VyX2lkID0gJCh0aGlzKS5hdHRyKFwiaHJlZlwiKTtcbiAgICAgIG9yaWdpbmFsX2NvbnRlbnQgPSAkKHRoaXMpLmh0bWwoKVxuICAgICAgb3JpZ2luYWxfcmVmZXJlbmNlID0gY3VyX2lkXG4gICAgICByZWZlcmVuY2VkX2VsZW1lbnQgPSAkKGN1cl9pZCk7XG5cbiAgICAgIGlmIChyZWZlcmVuY2VkX2VsZW1lbnQubGVuZ3RoID4gMCkge1xuICAgICAgICByZWZlcmVuY2VkX2VsZW1lbnRfZmlndXJlID0gcmVmZXJlbmNlZF9lbGVtZW50LmZpbmQoXG4gICAgICAgICAgZmlndXJlYm94X3NlbGVjdG9yX2ltZyArIFwiLFwiICsgZmlndXJlYm94X3NlbGVjdG9yX3N2Zyk7XG4gICAgICAgIHJlZmVyZW5jZWRfZWxlbWVudF90YWJsZSA9IHJlZmVyZW5jZWRfZWxlbWVudC5maW5kKHRhYmxlYm94X3NlbGVjdG9yX3RhYmxlKTtcbiAgICAgICAgcmVmZXJlbmNlZF9lbGVtZW50X2Zvcm11bGEgPSByZWZlcmVuY2VkX2VsZW1lbnQuZmluZChcbiAgICAgICAgICBmb3JtdWxhYm94X3NlbGVjdG9yX2ltZyArIFwiLFwiICsgZm9ybXVsYWJveF9zZWxlY3Rvcl9zcGFuICsgXCIsXCIgKyBmb3JtdWxhYm94X3NlbGVjdG9yX21hdGggKyBcIixcIiArIGZvcm11bGFib3hfc2VsZWN0b3Jfc3ZnKTtcbiAgICAgICAgcmVmZXJlbmNlZF9lbGVtZW50X2xpc3RpbmcgPSByZWZlcmVuY2VkX2VsZW1lbnQuZmluZChsaXN0aW5nYm94X3NlbGVjdG9yX3ByZSk7XG4gICAgICAgIC8qIFNwZWNpYWwgc2VjdGlvbnMgKi9cbiAgICAgICAgaWYgKFxuICAgICAgICAgICQoXCJzZWN0aW9uW3JvbGU9ZG9jLWFic3RyYWN0XVwiICsgY3VyX2lkKS5sZW5ndGggPiAwIHx8XG4gICAgICAgICAgJChcInNlY3Rpb25bcm9sZT1kb2MtYmlibGlvZ3JhcGh5XVwiICsgY3VyX2lkKS5sZW5ndGggPiAwIHx8XG4gICAgICAgICAgJChcInNlY3Rpb25bcm9sZT1kb2MtZW5kbm90ZXNdXCIgKyBjdXJfaWQgKyBcIiwgc2VjdGlvbltyb2xlPWRvYy1mb290bm90ZXNdXCIgKyBjdXJfaWQpLmxlbmd0aCA+IDAgfHxcbiAgICAgICAgICAkKFwic2VjdGlvbltyb2xlPWRvYy1hY2tub3dsZWRnZW1lbnRzXVwiICsgY3VyX2lkKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgJCh0aGlzKS5odG1sKFwiPHNwYW4gY2xhc3M9XFxcImNnZW5cXFwiIGNvbnRlbnRlZGl0YWJsZT1cXFwiZmFsc2VcXFwiICBkYXRhLXJhc2gtb3JpZ2luYWwtY29udGVudD1cXFwiXCIgKyBvcmlnaW5hbF9jb250ZW50ICtcbiAgICAgICAgICAgIFwiXFxcIj5TZWN0aW9uIDxxPlwiICsgJChjdXJfaWQgKyBcIiA+IGgxXCIpLnRleHQoKSArIFwiPC9xPjwvc3Bhbj5cIik7XG4gICAgICAgICAgLyogQmlibGlvZ3JhcGhpYyByZWZlcmVuY2VzICovXG4gICAgICAgIH0gZWxzZSBpZiAoJChjdXJfaWQpLnBhcmVudHMoXCJzZWN0aW9uW3JvbGU9ZG9jLWJpYmxpb2dyYXBoeV1cIikubGVuZ3RoID4gMCkge1xuICAgICAgICAgIHZhciBjdXJfY291bnQgPSAkKGN1cl9pZCkucHJldkFsbChcImxpXCIpLmxlbmd0aCArIDE7XG4gICAgICAgICAgJCh0aGlzKS5odG1sKFwiPHNwYW4gY2xhc3M9XFxcImNnZW5cXFwiIGNvbnRlbnRlZGl0YWJsZT1cXFwiZmFsc2VcXFwiIGRhdGEtcmFzaC1vcmlnaW5hbC1jb250ZW50PVxcXCJcIiArIG9yaWdpbmFsX2NvbnRlbnQgK1xuICAgICAgICAgICAgXCJcXFwiIHRpdGxlPVxcXCJCaWJsaW9ncmFwaGljIHJlZmVyZW5jZSBcIiArIGN1cl9jb3VudCArIFwiOiBcIiArXG4gICAgICAgICAgICAkKGN1cl9pZCkudGV4dCgpLnJlcGxhY2UoL1xccysvZywgXCIgXCIpLnRyaW0oKSArIFwiXFxcIj5bXCIgKyBjdXJfY291bnQgKyBcIl08L3NwYW4+XCIpO1xuICAgICAgICAgIC8qIEZvb3Rub3RlIHJlZmVyZW5jZXMgKGRvYy1mb290bm90ZXMgYW5kIGRvYy1mb290bm90ZSBpbmNsdWRlZCBmb3IgZWFzaW5nIGJhY2sgY29tcGF0aWJpbGl0eSkgKi9cbiAgICAgICAgfSBlbHNlIGlmICgkKGN1cl9pZCkucGFyZW50cyhcInNlY3Rpb25bcm9sZT1kb2MtZW5kbm90ZXNdLCBzZWN0aW9uW3JvbGU9ZG9jLWZvb3Rub3Rlc11cIikubGVuZ3RoID4gMCkge1xuICAgICAgICAgIHZhciBjdXJfY29udGVudHMgPSAkKHRoaXMpLnBhcmVudCgpLmNvbnRlbnRzKCk7XG4gICAgICAgICAgdmFyIGN1cl9pbmRleCA9IGN1cl9jb250ZW50cy5pbmRleCgkKHRoaXMpKTtcbiAgICAgICAgICB2YXIgcHJldl90bXAgPSBudWxsO1xuICAgICAgICAgIHdoaWxlIChjdXJfaW5kZXggPiAwICYmICFwcmV2X3RtcCkge1xuICAgICAgICAgICAgY3VyX3ByZXYgPSBjdXJfY29udGVudHNbY3VyX2luZGV4IC0gMV07XG4gICAgICAgICAgICBpZiAoY3VyX3ByZXYubm9kZVR5cGUgIT0gMyB8fCAkKGN1cl9wcmV2KS50ZXh0KCkucmVwbGFjZSgvIC9nLCAnJykgIT0gJycpIHtcbiAgICAgICAgICAgICAgcHJldl90bXAgPSBjdXJfcHJldjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGN1cl9pbmRleC0tO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgcHJldl9lbCA9ICQocHJldl90bXApO1xuICAgICAgICAgIHZhciBjdXJyZW50X2lkID0gJCh0aGlzKS5hdHRyKFwiaHJlZlwiKTtcbiAgICAgICAgICB2YXIgZm9vdG5vdGVfZWxlbWVudCA9ICQoY3VycmVudF9pZCk7XG4gICAgICAgICAgaWYgKGZvb3Rub3RlX2VsZW1lbnQubGVuZ3RoID4gMCAmJlxuICAgICAgICAgICAgZm9vdG5vdGVfZWxlbWVudC5wYXJlbnQoXCJzZWN0aW9uW3JvbGU9ZG9jLWVuZG5vdGVzXSwgc2VjdGlvbltyb2xlPWRvYy1mb290bm90ZXNdXCIpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHZhciBjb3VudCA9ICQoY3VycmVudF9pZCkucHJldkFsbChcInNlY3Rpb25cIikubGVuZ3RoICsgMTtcbiAgICAgICAgICAgIGlmIChwcmV2X2VsLmZpbmQoXCJzdXBcIikuaGFzQ2xhc3MoXCJmblwiKSkge1xuICAgICAgICAgICAgICAkKHRoaXMpLmJlZm9yZShcIjxzdXAgY2xhc3M9XFxcImNnZW5cXFwiIGNvbnRlbnRlZGl0YWJsZT1cXFwiZmFsc2VcXFwiIGRhdGEtcmFzaC1vcmlnaW5hbC1jb250ZW50PVxcXCJcXFwiPiw8L3N1cD5cIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvKiBTVEFSVCBSZW1vdmVkIDxhPiBmcm9tIDxzdXA+ICovXG4gICAgICAgICAgICAkKHRoaXMpLmh0bWwoXCI8c3VwIGNsYXNzPVxcXCJmbiBjZ2VuXFxcIiBjb250ZW50ZWRpdGFibGU9XFxcImZhbHNlXFxcIiBkYXRhLXJhc2gtb3JpZ2luYWwtY29udGVudD1cXFwiXCIgKyBvcmlnaW5hbF9jb250ZW50ICsgXCJcXFwiXCIgK1xuICAgICAgICAgICAgICBcIm5hbWU9XFxcImZuX3BvaW50ZXJfXCIgKyBjdXJyZW50X2lkLnJlcGxhY2UoXCIjXCIsIFwiXCIpICtcbiAgICAgICAgICAgICAgXCJcXFwiIHRpdGxlPVxcXCJGb290bm90ZSBcIiArIGNvdW50ICsgXCI6IFwiICtcbiAgICAgICAgICAgICAgJChjdXJyZW50X2lkKS50ZXh0KCkucmVwbGFjZSgvXFxzKy9nLCBcIiBcIikudHJpbSgpICsgXCJcXFwiPlwiICsgY291bnQgKyBcIjwvc3VwPlwiKTtcbiAgICAgICAgICAgIC8qIEVORCBSZW1vdmVkIDxhPiBmcm9tIDxzdXA+ICovXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICQodGhpcykuaHRtbChcIjxzcGFuIGNsYXNzPVxcXCJlcnJvciBjZ2VuXFxcIiBjb250ZW50ZWRpdGFibGU9XFxcImZhbHNlXFxcIiBkYXRhLXJhc2gtb3JpZ2luYWwtY29udGVudD1cXFwiXCIgKyBvcmlnaW5hbF9jb250ZW50ICtcbiAgICAgICAgICAgICAgXCJcXFwiPkVSUjogZm9vdG5vdGUgJ1wiICsgY3VycmVudF9pZC5yZXBsYWNlKFwiI1wiLCBcIlwiKSArIFwiJyBkb2VzIG5vdCBleGlzdDwvc3Bhbj5cIik7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8qIENvbW1vbiBzZWN0aW9ucyAqL1xuICAgICAgICB9IGVsc2UgaWYgKCQoXCJzZWN0aW9uXCIgKyBjdXJfaWQpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICB2YXIgY3VyX2NvdW50ID0gJChjdXJfaWQpLmZpbmRIaWVyYXJjaGljYWxOdW1iZXIoXG4gICAgICAgICAgICBcInNlY3Rpb246bm90KFtyb2xlPWRvYy1hYnN0cmFjdF0pOm5vdChbcm9sZT1kb2MtYmlibGlvZ3JhcGh5XSk6XCIgK1xuICAgICAgICAgICAgXCJub3QoW3JvbGU9ZG9jLWVuZG5vdGVzXSk6bm90KFtyb2xlPWRvYy1mb290bm90ZXNdKTpub3QoW3JvbGU9ZG9jLWFja25vd2xlZGdlbWVudHNdKVwiKTtcbiAgICAgICAgICBpZiAoY3VyX2NvdW50ICE9IG51bGwgJiYgY3VyX2NvdW50ICE9IFwiXCIpIHtcbiAgICAgICAgICAgICQodGhpcykuaHRtbChcIjxzcGFuIGNsYXNzPVxcXCJjZ2VuXFxcIiBjb250ZW50ZWRpdGFibGU9XFxcImZhbHNlXFxcIiBkYXRhLXJhc2gtb3JpZ2luYWwtY29udGVudD1cXFwiXCIgKyBvcmlnaW5hbF9jb250ZW50ICtcbiAgICAgICAgICAgICAgXCJcXFwiPlNlY3Rpb24gXCIgKyBjdXJfY291bnQgKyBcIjwvc3Bhbj5cIik7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8qIFJlZmVyZW5jZSB0byBmaWd1cmUgYm94ZXMgKi9cbiAgICAgICAgfSBlbHNlIGlmIChyZWZlcmVuY2VkX2VsZW1lbnRfZmlndXJlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICB2YXIgY3VyX2NvdW50ID0gcmVmZXJlbmNlZF9lbGVtZW50X2ZpZ3VyZS5maW5kTnVtYmVyKGZpZ3VyZWJveF9zZWxlY3Rvcik7XG4gICAgICAgICAgaWYgKGN1cl9jb3VudCAhPSAwKSB7XG4gICAgICAgICAgICAkKHRoaXMpLmh0bWwoXCI8c3BhbiBjbGFzcz1cXFwiY2dlblxcXCIgY29udGVudGVkaXRhYmxlPVxcXCJmYWxzZVxcXCIgZGF0YS1yYXNoLW9yaWdpbmFsLWNvbnRlbnQ9XFxcIlwiICsgb3JpZ2luYWxfY29udGVudCArXG4gICAgICAgICAgICAgIFwiXFxcIj5GaWd1cmUgXCIgKyBjdXJfY291bnQgKyBcIjwvc3Bhbj5cIik7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8qIFJlZmVyZW5jZSB0byB0YWJsZSBib3hlcyAqL1xuICAgICAgICB9IGVsc2UgaWYgKHJlZmVyZW5jZWRfZWxlbWVudF90YWJsZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgdmFyIGN1cl9jb3VudCA9IHJlZmVyZW5jZWRfZWxlbWVudF90YWJsZS5maW5kTnVtYmVyKHRhYmxlYm94X3NlbGVjdG9yKTtcbiAgICAgICAgICBpZiAoY3VyX2NvdW50ICE9IDApIHtcbiAgICAgICAgICAgICQodGhpcykuaHRtbChcIjxzcGFuIGNsYXNzPVxcXCJjZ2VuXFxcIiBjb250ZW50ZWRpdGFibGU9XFxcImZhbHNlXFxcIiBkYXRhLXJhc2gtb3JpZ2luYWwtY29udGVudD1cXFwiXCIgKyBvcmlnaW5hbF9jb250ZW50ICtcbiAgICAgICAgICAgICAgXCJcXFwiPlRhYmxlIFwiICsgY3VyX2NvdW50ICsgXCI8L3NwYW4+XCIpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvKiBSZWZlcmVuY2UgdG8gZm9ybXVsYSBib3hlcyAqL1xuICAgICAgICB9IGVsc2UgaWYgKHJlZmVyZW5jZWRfZWxlbWVudF9mb3JtdWxhLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICB2YXIgY3VyX2NvdW50ID0gcmVmZXJlbmNlZF9lbGVtZW50X2Zvcm11bGEuZmluZE51bWJlcihmb3JtdWxhYm94X3NlbGVjdG9yKTtcbiAgICAgICAgICBpZiAoY3VyX2NvdW50ICE9IDApIHtcbiAgICAgICAgICAgICQodGhpcykuaHRtbChcIjxzcGFuIGNsYXNzPVxcXCJjZ2VuXFxcIiBjb250ZW50ZWRpdGFibGU9XFxcImZhbHNlXFxcIiBkYXRhLXJhc2gtb3JpZ2luYWwtY29udGVudD1cXFwiXCIgKyBvcmlnaW5hbF9jb250ZW50ICtcbiAgICAgICAgICAgICAgXCJcXFwiPkZvcm11bGEgXCIgKyBjdXJfY291bnQgKyBcIjwvc3Bhbj5cIik7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8qIFJlZmVyZW5jZSB0byBsaXN0aW5nIGJveGVzICovXG4gICAgICAgIH0gZWxzZSBpZiAocmVmZXJlbmNlZF9lbGVtZW50X2xpc3RpbmcubGVuZ3RoID4gMCkge1xuICAgICAgICAgIHZhciBjdXJfY291bnQgPSByZWZlcmVuY2VkX2VsZW1lbnRfbGlzdGluZy5maW5kTnVtYmVyKGxpc3Rpbmdib3hfc2VsZWN0b3IpO1xuICAgICAgICAgIGlmIChjdXJfY291bnQgIT0gMCkge1xuICAgICAgICAgICAgJCh0aGlzKS5odG1sKFwiPHNwYW4gY2xhc3M9XFxcImNnZW5cXFwiIGNvbnRlbnRlZGl0YWJsZT1cXFwiZmFsc2VcXFwiIGRhdGEtcmFzaC1vcmlnaW5hbC1jb250ZW50PVxcXCJcIiArIG9yaWdpbmFsX2NvbnRlbnQgK1xuICAgICAgICAgICAgICBcIlxcXCI+TGlzdGluZyBcIiArIGN1cl9jb3VudCArIFwiPC9zcGFuPlwiKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgJCh0aGlzKS5odG1sKFwiPHNwYW4gY2xhc3M9XFxcImVycm9yIGNnZW5cXFwiIGNvbnRlbnRlZGl0YWJsZT1cXFwiZmFsc2VcXFwiIGRhdGEtcmFzaC1vcmlnaW5hbC1jb250ZW50PVxcXCJcIiArIG9yaWdpbmFsX2NvbnRlbnQgK1xuICAgICAgICAgICAgXCJcXFwiPkVSUjogcmVmZXJlbmNlZCBlbGVtZW50ICdcIiArIGN1cl9pZC5yZXBsYWNlKFwiI1wiLCBcIlwiKSArXG4gICAgICAgICAgICBcIicgaGFzIG5vdCB0aGUgY29ycmVjdCB0eXBlIChpdCBzaG91bGQgYmUgZWl0aGVyIGEgZmlndXJlLCBhIHRhYmxlLCBhIGZvcm11bGEsIGEgbGlzdGluZywgb3IgYSBzZWN0aW9uKTwvc3Bhbj5cIik7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICQodGhpcykucmVwbGFjZVdpdGgoXCI8c3BhbiBjbGFzcz1cXFwiZXJyb3IgY2dlblxcXCIgY29udGVudGVkaXRhYmxlPVxcXCJmYWxzZVxcXCIgZGF0YS1yYXNoLW9yaWdpbmFsLWNvbnRlbnQ9XFxcIlwiICsgb3JpZ2luYWxfY29udGVudCArXG4gICAgICAgICAgXCJcXFwiPkVSUjogcmVmZXJlbmNlZCBlbGVtZW50ICdcIiArIGN1cl9pZC5yZXBsYWNlKFwiI1wiLCBcIlwiKSArIFwiJyBkb2VzIG5vdCBleGlzdDwvc3Bhbj5cIik7XG4gICAgICB9XG4gICAgfVxuICB9KTtcbiAgLyogL0VORCBSZWZlcmVuY2VzICovXG59XG5cbmZ1bmN0aW9uIHVwZGF0ZVJlZmVyZW5jZXMoKSB7XG5cbiAgaWYgKHRpbnltY2UuYWN0aXZlRWRpdG9yLiQoJ3NwYW4uY2dlbltkYXRhLXJhc2gtb3JpZ2luYWwtY29udGVudF0sc3VwLmNnZW4uZm4nKS5sZW5ndGgpIHtcblxuICAgIC8vIFJlc3RvcmUgYWxsIHNhdmVkIGNvbnRlbnRcbiAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci4kKCdzcGFuLmNnZW5bZGF0YS1yYXNoLW9yaWdpbmFsLWNvbnRlbnRdLHN1cC5jZ2VuLmZuJykuZWFjaChmdW5jdGlvbiAoKSB7XG5cbiAgICAgIC8vIFNhdmUgb3JpZ2luYWwgY29udGVudCBhbmQgcmVmZXJlbmNlXG4gICAgICBsZXQgb3JpZ2luYWxfY29udGVudCA9ICQodGhpcykuYXR0cignZGF0YS1yYXNoLW9yaWdpbmFsLWNvbnRlbnQnKVxuICAgICAgbGV0IG9yaWdpbmFsX3JlZmVyZW5jZSA9ICQodGhpcykucGFyZW50KCdhJykuYXR0cignaHJlZicpXG5cbiAgICAgICQodGhpcykucGFyZW50KCdhJykucmVwbGFjZVdpdGgoYDxhIGNvbnRlbnRlZGl0YWJsZT1cImZhbHNlXCIgaHJlZj1cIiR7b3JpZ2luYWxfcmVmZXJlbmNlfVwiPiR7b3JpZ2luYWxfY29udGVudH08L2E+YClcbiAgICB9KVxuICAgIFxuICAgIHJlZmVyZW5jZXMoKVxuICB9XG59IiwiLyoqXG4gKiBUaGlzIHNjcmlwdCBjb250YWlucyBhbGwgZmlndXJlIGJveCBhdmFpbGFibGUgd2l0aCBSQVNILlxuICogXG4gKiBwbHVnaW5zOlxuICogIHJhamVfdGFibGVcbiAqICByYWplX2ZpZ3VyZVxuICogIHJhamVfZm9ybXVsYVxuICogIHJhamVfbGlzdGluZ1xuICovXG5sZXQgcmVtb3ZlX2xpc3RpbmcgPSAwXG5cbi8qKlxuICogXG4gKiBAcGFyYW0geyp9IGZvcm11bGFWYWx1ZSBcbiAqIEBwYXJhbSB7Kn0gY2FsbGJhY2sgXG4gKi9cbmZ1bmN0aW9uIG9wZW5JbmxpbmVGb3JtdWxhRWRpdG9yKGZvcm11bGFWYWx1ZSkge1xuICB0aW55bWNlLmFjdGl2ZUVkaXRvci53aW5kb3dNYW5hZ2VyLm9wZW4oe1xuICAgICAgdGl0bGU6ICdNYXRoIGZvcm11bGEgZWRpdG9yJyxcbiAgICAgIHVybDogJ2pzL3JhamUtY29yZS9wbHVnaW4vcmFqZV9mb3JtdWxhLmh0bWwnLFxuICAgICAgd2lkdGg6IDgwMCxcbiAgICAgIGhlaWdodDogNTAwLFxuICAgICAgb25DbG9zZTogZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIGxldCBvdXRwdXQgPSB0aW55bWNlLmFjdGl2ZUVkaXRvci5mb3JtdWxhX291dHB1dFxuXG4gICAgICAgIC8vIElmIGF0IGxlYXN0IGZvcm11bGEgaXMgd3JpdHRlblxuICAgICAgICBpZiAob3V0cHV0ICE9IG51bGwpIHtcblxuICAgICAgICAgIC8vIElmIGhhcyBpZCwgUkFKRSBtdXN0IHVwZGF0ZSBpdFxuICAgICAgICAgIGlmIChvdXRwdXQuZm9ybXVsYV9pZClcbiAgICAgICAgICAgIGlubGluZV9mb3JtdWxhLnVwZGF0ZShvdXRwdXQuZm9ybXVsYV9zdmcsIG91dHB1dC5mb3JtdWxhX2lkKVxuXG4gICAgICAgICAgLy8gT3IgYWRkIGl0IG5vcm1hbGx5XG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgaW5saW5lX2Zvcm11bGEuYWRkKG91dHB1dC5mb3JtdWxhX3N2ZylcblxuICAgICAgICAgIC8vIFNldCBmb3JtdWxhIG51bGxcbiAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5mb3JtdWxhX291dHB1dCA9IG51bGxcbiAgICAgICAgfVxuXG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLndpbmRvd01hbmFnZXIuY2xvc2UoKVxuICAgICAgfVxuICAgIH0sXG4gICAgZm9ybXVsYVZhbHVlXG4gIClcbn1cblxuLyoqXG4gKiBcbiAqIEBwYXJhbSB7Kn0gZm9ybXVsYVZhbHVlIFxuICogQHBhcmFtIHsqfSBjYWxsYmFjayBcbiAqL1xuZnVuY3Rpb24gb3BlbkZvcm11bGFFZGl0b3IoZm9ybXVsYVZhbHVlKSB7XG4gIHRpbnltY2UuYWN0aXZlRWRpdG9yLndpbmRvd01hbmFnZXIub3Blbih7XG4gICAgICB0aXRsZTogJ01hdGggZm9ybXVsYSBlZGl0b3InLFxuICAgICAgdXJsOiAnanMvcmFqZS1jb3JlL3BsdWdpbi9yYWplX2Zvcm11bGEuaHRtbCcsXG4gICAgICB3aWR0aDogODAwLFxuICAgICAgaGVpZ2h0OiA1MDAsXG4gICAgICBvbkNsb3NlOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgbGV0IG91dHB1dCA9IHRpbnltY2UuYWN0aXZlRWRpdG9yLmZvcm11bGFfb3V0cHV0XG5cbiAgICAgICAgLy8gSWYgYXQgbGVhc3QgZm9ybXVsYSBpcyB3cml0dGVuXG4gICAgICAgIGlmIChvdXRwdXQgIT0gbnVsbCkge1xuXG4gICAgICAgICAgLy8gSWYgaGFzIGlkLCBSQUpFIG11c3QgdXBkYXRlIGl0XG4gICAgICAgICAgaWYgKG91dHB1dC5mb3JtdWxhX2lkKVxuICAgICAgICAgICAgZm9ybXVsYS51cGRhdGUob3V0cHV0LmZvcm11bGFfc3ZnLCBvdXRwdXQuZm9ybXVsYV9pZClcblxuICAgICAgICAgIC8vIE9yIGFkZCBpdCBub3JtYWxseVxuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIGZvcm11bGEuYWRkKG91dHB1dC5mb3JtdWxhX3N2ZylcblxuICAgICAgICAgIC8vIFNldCBmb3JtdWxhIG51bGxcbiAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5mb3JtdWxhX291dHB1dCA9IG51bGxcbiAgICAgICAgfVxuXG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLndpbmRvd01hbmFnZXIuY2xvc2UoKVxuICAgICAgfVxuICAgIH0sXG4gICAgZm9ybXVsYVZhbHVlXG4gIClcbn1cblxuLyoqXG4gKiBSYWplX3RhYmxlXG4gKi9cbnRpbnltY2UuUGx1Z2luTWFuYWdlci5hZGQoJ3JhamVfdGFibGUnLCBmdW5jdGlvbiAoZWRpdG9yKSB7XG5cbiAgLy8gQWRkIGEgYnV0dG9uIHRoYXQgaGFuZGxlIHRoZSBpbmxpbmUgZWxlbWVudFxuICBlZGl0b3IuYWRkQnV0dG9uKCdyYWplX3RhYmxlJywge1xuICAgIHRpdGxlOiAncmFqZV90YWJsZScsXG4gICAgaWNvbjogJ2ljb24tdGFibGUnLFxuICAgIHRvb2x0aXA6ICdUYWJsZScsXG4gICAgZGlzYWJsZWRTdGF0ZVNlbGVjdG9yOiBESVNBQkxFX1NFTEVDVE9SX0ZJR1VSRVMsXG5cbiAgICAvLyBCdXR0b24gYmVoYXZpb3VyXG4gICAgb25jbGljazogZnVuY3Rpb24gKCkge1xuXG4gICAgICAvLyBPbiBjbGljayBhIGRpYWxvZyBpcyBvcGVuZWRcbiAgICAgIGVkaXRvci53aW5kb3dNYW5hZ2VyLm9wZW4oe1xuICAgICAgICB0aXRsZTogJ1NlbGVjdCBUYWJsZSBzaXplJyxcbiAgICAgICAgYm9keTogW3tcbiAgICAgICAgICB0eXBlOiAndGV4dGJveCcsXG4gICAgICAgICAgbmFtZTogJ3dpZHRoJyxcbiAgICAgICAgICBsYWJlbDogJ0NvbHVtbnMnXG4gICAgICAgIH0sIHtcbiAgICAgICAgICB0eXBlOiAndGV4dGJveCcsXG4gICAgICAgICAgbmFtZTogJ2hlaWd0aCcsXG4gICAgICAgICAgbGFiZWw6ICdSb3dzJ1xuICAgICAgICB9XSxcbiAgICAgICAgb25TdWJtaXQ6IGZ1bmN0aW9uIChlKSB7XG5cbiAgICAgICAgICAvLyBHZXQgd2lkdGggYW5kIGhlaWd0aFxuICAgICAgICAgIHRhYmxlLmFkZChlLmRhdGEud2lkdGgsIGUuZGF0YS5oZWlndGgpXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfVxuICB9KVxuXG4gIC8vIEJlY2F1c2Ugc29tZSBiZWhhdmlvdXJzIGFyZW4ndCBhY2NlcHRlZCwgUkFKRSBtdXN0IGNoZWNrIHNlbGVjdGlvbiBhbmQgYWNjZXB0IGJhY2tzcGFjZSwgY2FuYyBhbmQgZW50ZXIgcHJlc3NcbiAgZWRpdG9yLm9uKCdrZXlEb3duJywgZnVuY3Rpb24gKGUpIHtcblxuICAgIC8vIFRPRE8gaWYgaW5zaWRlIHRhYmxlXG5cbiAgICAvLyBrZXlDb2RlIDggaXMgYmFja3NwYWNlLCA0NiBpcyBjYW5jXG4gICAgaWYgKGUua2V5Q29kZSA9PSA4KVxuICAgICAgcmV0dXJuIGhhbmRsZUZpZ3VyZURlbGV0ZSh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24pXG5cbiAgICBpZiAoZS5rZXlDb2RlID09IDQ2KVxuICAgICAgcmV0dXJuIGhhbmRsZUZpZ3VyZUNhbmModGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uKVxuXG4gICAgLy8gSGFuZGxlIGVudGVyIGtleSBpbiBmaWdjYXB0aW9uXG4gICAgaWYgKGUua2V5Q29kZSA9PSAxMylcbiAgICAgIHJldHVybiBoYW5kbGVGaWd1cmVFbnRlcih0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24pXG5cbiAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpXG4gIH0pXG5cbiAgLy8gSGFuZGxlIHN0cmFuZ2Ugc3RydWN0dXJhbCBtb2RpZmljYXRpb24gZW1wdHkgZmlndXJlcyBvciB3aXRoIGNhcHRpb24gYXMgZmlyc3QgY2hpbGRcbiAgZWRpdG9yLm9uKCdub2RlQ2hhbmdlJywgZnVuY3Rpb24gKCkge1xuICAgIGhhbmRsZUZpZ3VyZUNoYW5nZSh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24pXG4gIH0pXG5cbiAgdGFibGUgPSB7XG5cbiAgICAvKipcbiAgICAgKiBBZGQgdGhlIG5ldyB0YWJsZSAod2l0aCBnaXZlbiBzaXplKSBhdCB0aGUgY2FyZXQgcG9zaXRpb25cbiAgICAgKi9cbiAgICBhZGQ6IGZ1bmN0aW9uICh3aWR0aCwgaGVpZ3RoKSB7XG5cbiAgICAgIC8vIEdldCB0aGUgcmVmZXJlbmNlIG9mIHRoZSBjdXJyZW50IHNlbGVjdGVkIGVsZW1lbnRcbiAgICAgIGxldCBzZWxlY3RlZEVsZW1lbnQgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG5cbiAgICAgIC8vIEdldCB0aGUgcmVmZXJlbmNlIG9mIHRoZSBuZXcgY3JlYXRlZCB0YWJsZVxuICAgICAgbGV0IG5ld1RhYmxlID0gdGhpcy5jcmVhdGUod2lkdGgsIGhlaWd0aCwgZ2V0U3VjY2Vzc2l2ZUVsZW1lbnRJZChGSUdVUkVfVEFCTEVfU0VMRUNUT1IsIFRBQkxFX1NVRkZJWCkpXG5cbiAgICAgIC8vIEJlZ2luIGF0b21pYyBVTkRPIGxldmVsIFxuICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIC8vIENoZWNrIGlmIHRoZSBzZWxlY3RlZCBlbGVtZW50IGlzIG5vdCBlbXB0eSwgYW5kIGFkZCB0YWJsZSBhZnRlclxuICAgICAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LnRleHQoKS50cmltKCkubGVuZ3RoICE9IDApIHtcblxuICAgICAgICAgIC8vIElmIHNlbGVjdGlvbiBpcyBhdCBzdGFydCBvZiB0aGUgc2VsZWN0ZWQgZWxlbWVudFxuICAgICAgICAgIGlmICh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Um5nKCkuc3RhcnRPZmZzZXQgPT0gMClcbiAgICAgICAgICAgIHNlbGVjdGVkRWxlbWVudC5iZWZvcmUobmV3VGFibGUpXG5cbiAgICAgICAgICBlbHNlXG4gICAgICAgICAgICBzZWxlY3RlZEVsZW1lbnQuYWZ0ZXIobmV3VGFibGUpXG4gICAgICAgIH1cblxuICAgICAgICAvLyBJZiBzZWxlY3RlZCBlbGVtZW50IGlzIGVtcHR5LCByZXBsYWNlIGl0IHdpdGggdGhlIG5ldyB0YWJsZVxuICAgICAgICBlbHNlXG4gICAgICAgICAgc2VsZWN0ZWRFbGVtZW50LnJlcGxhY2VXaXRoKG5ld1RhYmxlKVxuXG4gICAgICAgIC8vIFVwZGF0ZSBhbGwgY2FwdGlvbnMgd2l0aCBSQVNIIGZ1bmN0aW9uXG4gICAgICAgIGNhcHRpb25zKClcblxuICAgICAgICAvLyBVcGRhdGUgYWxsIGNyb3NzLXJlZlxuICAgICAgICB1cGRhdGVSZWZlcmVuY2VzKClcblxuICAgICAgICAvLyBTYXZlIHVwZGF0ZXMgXG4gICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuICAgICAgfSlcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIHRoZSBuZXcgdGFibGUgdXNpbmcgcGFzc2VkIHdpZHRoIGFuZCBoZWlnaHRcbiAgICAgKi9cbiAgICBjcmVhdGU6IGZ1bmN0aW9uICh3aWR0aCwgaGVpZ2h0LCBpZCkge1xuXG4gICAgICAvLyBJZiB3aWR0aCBhbmQgaGVpZ3RoIGFyZSBwb3NpdGl2ZVxuICAgICAgdHJ5IHtcbiAgICAgICAgaWYgKHdpZHRoID4gMCAmJiBoZWlnaHQgPiAwKSB7XG5cbiAgICAgICAgICAvLyBDcmVhdGUgZmlndXJlIGFuZCB0YWJsZVxuICAgICAgICAgIGxldCBmaWd1cmUgPSAkKGA8ZmlndXJlIGlkPVwiJHtpZH1cIj48L2ZpZ3VyZT5gKVxuICAgICAgICAgIGxldCB0YWJsZSA9ICQoYDx0YWJsZT48L3RhYmxlPmApXG5cbiAgICAgICAgICAvLyBQb3B1bGF0ZSB3aXRoIHdpZHRoICYgaGVpZ3RoXG4gICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPD0gaGVpZ2h0OyBpKyspIHtcblxuICAgICAgICAgICAgbGV0IHJvdyA9ICQoYDx0cj48L3RyPmApXG4gICAgICAgICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHdpZHRoOyB4KyspIHtcblxuICAgICAgICAgICAgICBpZiAoaSA9PSAwKVxuICAgICAgICAgICAgICAgIHJvdy5hcHBlbmQoYDx0aD5IZWFkaW5nIGNlbGwgJHt4KzF9PC90aD5gKVxuXG4gICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICByb3cuYXBwZW5kKGA8dGQ+PHA+RGF0YSBjZWxsICR7eCsxfTwvcD48L3RkPmApXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRhYmxlLmFwcGVuZChyb3cpXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgZmlndXJlLmFwcGVuZCh0YWJsZSlcbiAgICAgICAgICBmaWd1cmUuYXBwZW5kKGA8ZmlnY2FwdGlvbj5DYXB0aW9uLjwvZmlnY2FwdGlvbj5gKVxuXG4gICAgICAgICAgcmV0dXJuIGZpZ3VyZVxuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlKSB7fVxuICAgIH1cbiAgfVxufSlcblxuLyoqXG4gKiBSYWplX2ZpZ3VyZVxuICovXG50aW55bWNlLlBsdWdpbk1hbmFnZXIuYWRkKCdyYWplX2ltYWdlJywgZnVuY3Rpb24gKGVkaXRvciwgdXJsKSB7XG5cbiAgLy8gQWRkIGEgYnV0dG9uIHRoYXQgaGFuZGxlIHRoZSBpbmxpbmUgZWxlbWVudFxuICBlZGl0b3IuYWRkQnV0dG9uKCdyYWplX2ltYWdlJywge1xuICAgIHRpdGxlOiAncmFqZV9pbWFnZScsXG4gICAgaWNvbjogJ2ljb24taW1hZ2UnLFxuICAgIHRvb2x0aXA6ICdJbWFnZSBibG9jaycsXG4gICAgZGlzYWJsZWRTdGF0ZVNlbGVjdG9yOiBESVNBQkxFX1NFTEVDVE9SX0ZJR1VSRVMsXG5cbiAgICAvLyBCdXR0b24gYmVoYXZpb3VyXG4gICAgb25jbGljazogZnVuY3Rpb24gKCkge1xuXG4gICAgICBsZXQgZmlsZW5hbWUgPSBzZWxlY3RJbWFnZSgpXG5cbiAgICAgIGlmIChmaWxlbmFtZSAhPSBudWxsKVxuICAgICAgICBpbWFnZS5hZGQoZmlsZW5hbWUsIGZpbGVuYW1lKVxuICAgIH1cbiAgfSlcblxuICAvLyBCZWNhdXNlIHNvbWUgYmVoYXZpb3VycyBhcmVuJ3QgYWNjZXB0ZWQsIFJBSkUgbXVzdCBjaGVjayBzZWxlY3Rpb24gYW5kIGFjY2VwdCBiYWNrc3BhY2UsIGNhbmMgYW5kIGVudGVyIHByZXNzXG4gIGVkaXRvci5vbigna2V5RG93bicsIGZ1bmN0aW9uIChlKSB7XG5cblxuICAgIC8vIGtleUNvZGUgOCBpcyBiYWNrc3BhY2VcbiAgICBpZiAoZS5rZXlDb2RlID09IDgpXG4gICAgICByZXR1cm4gaGFuZGxlRmlndXJlRGVsZXRlKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbilcblxuICAgIGlmIChlLmtleUNvZGUgPT0gNDYpXG4gICAgICByZXR1cm4gaGFuZGxlRmlndXJlQ2FuYyh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24pXG5cbiAgICAvLyBIYW5kbGUgZW50ZXIga2V5IGluIGZpZ2NhcHRpb25cbiAgICBpZiAoZS5rZXlDb2RlID09IDEzKVxuICAgICAgcmV0dXJuIGhhbmRsZUZpZ3VyZUVudGVyKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbilcblxuICB9KVxuXG4gIGltYWdlID0ge1xuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgYWRkOiBmdW5jdGlvbiAodXJsLCBhbHQpIHtcblxuICAgICAgLy8gR2V0IHRoZSByZWZlcmVjZSBvZiB0aGUgc2VsZWN0ZWQgZWxlbWVudFxuICAgICAgbGV0IHNlbGVjdGVkRWxlbWVudCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcbiAgICAgIGxldCBuZXdGaWd1cmUgPSB0aGlzLmNyZWF0ZSh1cmwsIGFsdCwgZ2V0U3VjY2Vzc2l2ZUVsZW1lbnRJZChGSUdVUkVfSU1BR0VfU0VMRUNUT1IsIElNQUdFX1NVRkZJWCkpXG5cbiAgICAgIC8vIEJlZ2luIGF0b21pYyBVTkRPIGxldmVsIFxuICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIC8vIENoZWNrIGlmIHRoZSBzZWxlY3RlZCBlbGVtZW50IGlzIG5vdCBlbXB0eSwgYW5kIGFkZCB0YWJsZSBhZnRlclxuICAgICAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LnRleHQoKS50cmltKCkubGVuZ3RoICE9IDApIHtcblxuICAgICAgICAgIC8vIElmIHNlbGVjdGlvbiBpcyBhdCBzdGFydCBvZiB0aGUgc2VsZWN0ZWQgZWxlbWVudFxuICAgICAgICAgIGlmICh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Um5nKCkuc3RhcnRPZmZzZXQgPT0gMClcbiAgICAgICAgICAgIHNlbGVjdGVkRWxlbWVudC5iZWZvcmUobmV3RmlndXJlKVxuXG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgc2VsZWN0ZWRFbGVtZW50LmFmdGVyKG5ld0ZpZ3VyZSlcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIElmIHNlbGVjdGVkIGVsZW1lbnQgaXMgZW1wdHksIHJlcGxhY2UgaXQgd2l0aCB0aGUgbmV3IHRhYmxlXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBzZWxlY3RlZEVsZW1lbnQucmVwbGFjZVdpdGgobmV3RmlndXJlKVxuXG4gICAgICAgIC8vIFVwZGF0ZSBhbGwgY2FwdGlvbnMgd2l0aCBSQVNIIGZ1bmN0aW9uXG4gICAgICAgIGNhcHRpb25zKClcblxuICAgICAgICAvLyBVcGRhdGUgYWxsIGNyb3NzLXJlZlxuICAgICAgICB1cGRhdGVSZWZlcmVuY2VzKClcblxuICAgICAgICAvLyBTYXZlIHVwZGF0ZXMgXG4gICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuICAgICAgfSlcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgY3JlYXRlOiBmdW5jdGlvbiAodXJsLCBhbHQsIGlkKSB7XG4gICAgICByZXR1cm4gJChgPGZpZ3VyZSBpZD1cIiR7aWR9XCI+PHA+PGltZyBzcmM9XCIke3VybH1cIiAke2FsdD8nYWx0PVwiJythbHQrJ1wiJzonJ30gLz48L3A+PGZpZ2NhcHRpb24+Q2FwdGlvbi48L2ZpZ2NhcHRpb24+PC9maWd1cmU+YClcbiAgICB9XG4gIH1cbn0pXG5cbi8qKlxuICogUmFqZV9mb3JtdWxhXG4gKi9cbnRpbnltY2UuUGx1Z2luTWFuYWdlci5hZGQoJ3JhamVfZm9ybXVsYScsIGZ1bmN0aW9uIChlZGl0b3IsIHVybCkge1xuXG4gIC8vIEFkZCBhIGJ1dHRvbiB0aGF0IGhhbmRsZSB0aGUgaW5saW5lIGVsZW1lbnRcbiAgZWRpdG9yLmFkZEJ1dHRvbigncmFqZV9mb3JtdWxhJywge1xuICAgIHRpdGxlOiAncmFqZV9mb3JtdWxhJyxcbiAgICBpY29uOiAnaWNvbi1mb3JtdWxhJyxcbiAgICB0b29sdGlwOiAnRm9ybXVsYScsXG4gICAgZGlzYWJsZWRTdGF0ZVNlbGVjdG9yOiBESVNBQkxFX1NFTEVDVE9SX0ZJR1VSRVMsXG5cbiAgICAvLyBCdXR0b24gYmVoYXZpb3VyXG4gICAgb25jbGljazogZnVuY3Rpb24gKCkge1xuICAgICAgb3BlbkZvcm11bGFFZGl0b3IoKVxuICAgIH1cbiAgfSlcblxuICAvLyBCZWNhdXNlIHNvbWUgYmVoYXZpb3VycyBhcmVuJ3QgYWNjZXB0ZWQsIFJBSkUgbXVzdCBjaGVjayBzZWxlY3Rpb24gYW5kIGFjY2VwdCBiYWNrc3BhY2UsIGNhbmMgYW5kIGVudGVyIHByZXNzXG4gIGVkaXRvci5vbigna2V5RG93bicsIGZ1bmN0aW9uIChlKSB7XG5cbiAgICBsZXQgc2VsZWN0ZWRFbGVtZW50ID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuXG4gICAgaWYgKGZvcm11bGEuY3Vyc29ySW5Gb3JtdWxhKHNlbGVjdGVkRWxlbWVudCkpIHtcblxuICAgICAgLy8ga2V5Q29kZSA4IGlzIGJhY2tzcGFjZVxuICAgICAgaWYgKGUua2V5Q29kZSA9PSA4KSB7XG4gICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKClcbiAgICAgICAgcmV0dXJuIGhhbmRsZUZpZ3VyZURlbGV0ZSh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24pXG4gICAgICB9XG5cbiAgICAgIGlmIChlLmtleUNvZGUgPT0gNDYpIHtcbiAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKVxuICAgICAgICByZXR1cm4gaGFuZGxlRmlndXJlQ2FuYyh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24pXG4gICAgICB9XG5cbiAgICAgIC8vIEhhbmRsZSBlbnRlciBrZXkgaW4gZmlnY2FwdGlvblxuICAgICAgaWYgKGUua2V5Q29kZSA9PSAxMykge1xuICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpXG4gICAgICAgIHJldHVybiBoYW5kbGVGaWd1cmVFbnRlcih0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24pXG4gICAgICB9XG5cbiAgICAgIC8vIEJsb2NrIHByaW50YWJsZSBjaGFycyBpbiBwXG4gICAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LmlzKCdwJykgJiYgY2hlY2tJZlByaW50YWJsZUNoYXIoZS5rZXlDb2RlKSkge1xuICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpXG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgfVxuICAgIH1cbiAgfSlcblxuICBlZGl0b3Iub24oJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcbiAgICBsZXQgc2VsZWN0ZWRFbGVtZW50ID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuXG4gICAgLy8gT3BlbiBmb3JtdWxhIGVkaXRvciBjbGlja2luZyBvbiBtYXRoIGZvcm11bGFzXG4gICAgLy8gT05seSBpZiB0aGUgY3VycmVudCBlbGVtZW50IHRoZSBzcGFuIHdpdGggY29udGVudGVkaXRhYmxlPVwiZmFsc2VcIlxuICAgIGlmIChzZWxlY3RlZEVsZW1lbnQuaXMoJ3NwYW5bY29udGVudGVkaXRhYmxlPWZhbHNlXScpICYmIGZvcm11bGEuY3Vyc29ySW5Gb3JtdWxhKHNlbGVjdGVkRWxlbWVudCkpIHtcblxuICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKVxuXG4gICAgICBsZXQgZmlndXJlID0gc2VsZWN0ZWRFbGVtZW50XG5cbiAgICAgIGlmICghc2VsZWN0ZWRFbGVtZW50LmlzKEZJR1VSRV9GT1JNVUxBX1NFTEVDVE9SKSlcbiAgICAgICAgZmlndXJlID0gc2VsZWN0ZWRFbGVtZW50LnBhcmVudHMoRklHVVJFX0ZPUk1VTEFfU0VMRUNUT1IpXG5cbiAgICAgIG9wZW5Gb3JtdWxhRWRpdG9yKHtcbiAgICAgICAgZm9ybXVsYV92YWw6IGZpZ3VyZS5maW5kKCdzdmdbZGF0YS1tYXRoLW9yaWdpbmFsLWlucHV0XScpLmF0dHIoJ2RhdGEtbWF0aC1vcmlnaW5hbC1pbnB1dCcpLFxuICAgICAgICBmb3JtdWxhX2lkOiBmaWd1cmUuYXR0cignaWQnKVxuICAgICAgfSlcbiAgICB9XG4gIH0pXG5cbiAgZm9ybXVsYSA9IHtcbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBhZGQ6IGZ1bmN0aW9uIChmb3JtdWxhX3N2Zykge1xuXG4gICAgICBsZXQgc2VsZWN0ZWRFbGVtZW50ID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuICAgICAgbGV0IGlkID0gZ2V0U3VjY2Vzc2l2ZUVsZW1lbnRJZChGSUdVUkVfRk9STVVMQV9TRUxFQ1RPUiwgRk9STVVMQV9TVUZGSVgpXG4gICAgICBsZXQgbmV3Rm9ybXVsYSA9IHRoaXMuY3JlYXRlKGZvcm11bGFfc3ZnLCBpZClcblxuICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIC8vIENoZWNrIGlmIHRoZSBzZWxlY3RlZCBlbGVtZW50IGlzIG5vdCBlbXB0eSwgYW5kIGFkZCB0aGUgbmV3IGZvcm11bGEgcmlnaHQgYWZ0ZXJcbiAgICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC50ZXh0KCkudHJpbSgpLmxlbmd0aCAhPSAwKVxuICAgICAgICAgIHNlbGVjdGVkRWxlbWVudC5hZnRlcihuZXdGb3JtdWxhKVxuXG4gICAgICAgIC8vIElmIHNlbGVjdGVkIGVsZW1lbnQgaXMgZW1wdHksIHJlcGxhY2UgaXQgd2l0aCB0aGUgbmV3IGZvcm11bGFcbiAgICAgICAgZWxzZVxuICAgICAgICAgIHNlbGVjdGVkRWxlbWVudC5yZXBsYWNlV2l0aChuZXdGb3JtdWxhKVxuXG4gICAgICAgIC8vIFNhdmUgdXBkYXRlcyBcbiAgICAgICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG4gICAgICAgIGNhcHRpb25zKClcblxuICAgICAgICBuZXdGb3JtdWxhID0gJChgIyR7aWR9YClcblxuICAgICAgICBmb3JtdWxhLnVwZGF0ZVN0cnVjdHVyZShuZXdGb3JtdWxhKVxuXG4gICAgICAgIC8vIEFkZCBhIG5ldyBlbXB0eSBwIGFmdGVyIHRoZSBmb3JtdWxhXG4gICAgICAgIGlmICghbmV3Rm9ybXVsYS5uZXh0KCkubGVuZ3RoKVxuICAgICAgICAgIG5ld0Zvcm11bGEuYWZ0ZXIoJzxwPjxici8+PC9wPicpXG5cbiAgICAgICAgLy8gVXBkYXRlIGFsbCBjcm9zcy1yZWZcbiAgICAgICAgdXBkYXRlUmVmZXJlbmNlcygpXG5cbiAgICAgICAgLy8gVXBkYXRlIFJlbmRlcmVkIFJBU0hcbiAgICAgICAgLy91cGRhdGVJZnJhbWVGcm9tU2F2ZWRDb250ZW50KClcblxuICAgICAgICAvLyBNb3ZlIHRoZSBjYXJldCBhdCB0aGUgc3RhcnQgb2YgdGhlIG5leHQgZWxlbWVudFxuICAgICAgICBtb3ZlQ2FyZXQodGlueW1jZS5hY3RpdmVFZGl0b3IuZG9tLmdldE5leHQodGlueW1jZS5hY3RpdmVFZGl0b3IuZG9tLmdldChpZCksICcqJyksIHRydWUpXG4gICAgICB9KVxuXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIHVwZGF0ZTogZnVuY3Rpb24gKGZvcm11bGFfc3ZnLCBmb3JtdWxhX2lkKSB7XG5cbiAgICAgIGxldCBzZWxlY3RlZEZpZ3VyZSA9ICQoYCMke2Zvcm11bGFfaWR9YClcblxuICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIHNlbGVjdGVkRmlndXJlLmZpbmQoJ3N2ZycpLnJlcGxhY2VXaXRoKGZvcm11bGFfc3ZnKVxuICAgICAgICAvL3VwZGF0ZUlmcmFtZUZyb21TYXZlZENvbnRlbnQoKVxuICAgICAgfSlcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgY3JlYXRlOiBmdW5jdGlvbiAoZm9ybXVsYV9zdmcsIGlkKSB7XG4gICAgICByZXR1cm4gYDxmaWd1cmUgaWQ9XCIke2lkfVwiPjxwPjxzcGFuPiR7Zm9ybXVsYV9zdmdbMF0ub3V0ZXJIVE1MfTwvc3Bhbj48L3A+PC9maWd1cmU+YFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBjdXJzb3JJbkZvcm11bGE6IGZ1bmN0aW9uIChzZWxlY3RlZEVsZW1lbnQpIHtcblxuICAgICAgcmV0dXJuIChcblxuICAgICAgICAvLyBJZiB0aGUgc2VsZWN0ZWQgZWxlbWVudCBpcyB0aGUgZm9ybXVsYSBmaWd1cmVcbiAgICAgICAgKHNlbGVjdGVkRWxlbWVudC5pcyhGSUdVUkVfRk9STVVMQV9TRUxFQ1RPUikpIHx8XG5cbiAgICAgICAgLy8gSWYgdGhlIHNlbGVjdGVkIGVsZW1lbnQgaXMgaW5zaWRlIHRoZSBmb3JtdWxhIGZpZ3VyZVxuICAgICAgICBzZWxlY3RlZEVsZW1lbnQucGFyZW50cyhGSUdVUkVfRk9STVVMQV9TRUxFQ1RPUikubGVuZ3RoKSA9PSAxID8gdHJ1ZSA6IGZhbHNlXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIHVwZGF0ZVN0cnVjdHVyZTogZnVuY3Rpb24gKGZvcm11bGEpIHtcblxuICAgICAgLy8gQWRkIGEgbm90IGVkaXRhYmxlIHNwYW5cbiAgICAgIGxldCBwYXJhZ3JhcGggPSBmb3JtdWxhLmNoaWxkcmVuKCdwJylcbiAgICAgIGxldCBwYXJhZ3JhcGhDb250ZW50ID0gcGFyYWdyYXBoLmh0bWwoKVxuICAgICAgcGFyYWdyYXBoLmh0bWwoYDxzcGFuIGNvbnRlbnRlZGl0YWJsZT1cImZhbHNlXCI+JHtwYXJhZ3JhcGhDb250ZW50fTwvc3Bhbj5gKVxuICAgIH1cbiAgfVxufSlcblxuLyoqXG4gKiBSYWplX2xpc3RpbmdcbiAqL1xudGlueW1jZS5QbHVnaW5NYW5hZ2VyLmFkZCgncmFqZV9saXN0aW5nJywgZnVuY3Rpb24gKGVkaXRvciwgdXJsKSB7XG5cbiAgLy8gQWRkIGEgYnV0dG9uIHRoYXQgaGFuZGxlIHRoZSBpbmxpbmUgZWxlbWVudFxuICBlZGl0b3IuYWRkQnV0dG9uKCdyYWplX2xpc3RpbmcnLCB7XG4gICAgdGl0bGU6ICdyYWplX2xpc3RpbmcnLFxuICAgIGljb246ICdpY29uLWxpc3RpbmcnLFxuICAgIHRvb2x0aXA6ICdMaXN0aW5nJyxcbiAgICBkaXNhYmxlZFN0YXRlU2VsZWN0b3I6IERJU0FCTEVfU0VMRUNUT1JfRklHVVJFUyxcblxuICAgIC8vIEJ1dHRvbiBiZWhhdmlvdXJcbiAgICBvbmNsaWNrOiBmdW5jdGlvbiAoKSB7XG4gICAgICBsaXN0aW5nLmFkZCgpXG4gICAgfVxuICB9KVxuXG5cblxuICAvLyBCZWNhdXNlIHNvbWUgYmVoYXZpb3VycyBhcmVuJ3QgYWNjZXB0ZWQsIFJBSkUgbXVzdCBjaGVjayBzZWxlY3Rpb24gYW5kIGFjY2VwdCBiYWNrc3BhY2UsIGNhbmMgYW5kIGVudGVyIHByZXNzXG4gIGVkaXRvci5vbigna2V5RG93bicsIGZ1bmN0aW9uIChlKSB7XG5cbiAgICAvLyBOT1RFOiB0aGlzIGJlaHZhaW91ciBpcyB0aGUgc2FtZSBmb3IgY29kZWJsb2NrIFxuICAgIGxldCBzZWxlY3RlZEVsZW1lbnQgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG4gICAgaWYgKHNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKCdwcmU6aGFzKGNvZGUpJykubGVuZ3RoKSB7XG5cblxuICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC5pcygnY29kZScpKSB7XG5cblxuICAgICAgICAvLyBFTlRFUlxuICAgICAgICBpZiAoZS5rZXlDb2RlID09IDEzKSB7XG4gICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgICAgcmV0dXJuIGxpc3Rpbmcuc2V0Q29udGVudChgXFxuYClcbiAgICAgICAgfVxuXG4gICAgICAgIC8vVEFCXG4gICAgICAgIGlmIChlLmtleUNvZGUgPT0gOSkge1xuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgICAgIHJldHVybiBsaXN0aW5nLnNldENvbnRlbnQoYFxcdGApXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKGUua2V5Q29kZSA9PSAxMylcbiAgICAgICAgcmV0dXJuIGhhbmRsZUZpZ3VyZUVudGVyKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbilcblxuICAgICAgLy8ga2V5Q29kZSA4IGlzIGJhY2tzcGFjZVxuICAgICAgaWYgKGUua2V5Q29kZSA9PSA4KVxuICAgICAgICByZXR1cm4gaGFuZGxlRmlndXJlRGVsZXRlKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbilcblxuICAgICAgLypcbiAgICAgICAgLy8ga2V5Q29kZSA4IGlzIGJhY2tzcGFjZVxuICAgICAgICBpZiAoZS5rZXlDb2RlID09IDgpXG4gICAgICAgICAgcmV0dXJuIGhhbmRsZUZpZ3VyZURlbGV0ZSh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24pXG5cbiAgICAgICAgaWYgKGUua2V5Q29kZSA9PSA0NilcbiAgICAgICAgICByZXR1cm4gaGFuZGxlRmlndXJlQ2FuYyh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24pXG5cbiAgICAgICAgLy8gSGFuZGxlIGVudGVyIGtleSBpbiBmaWdjYXB0aW9uXG4gICAgICAgIGlmIChlLmtleUNvZGUgPT0gMTMpXG4gICAgICAgICAgcmV0dXJuIGhhbmRsZUZpZ3VyZUVudGVyKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbilcbiAgICAgICAgKi9cbiAgICB9XG4gICAgLypcbiAgICBpZiAoZS5rZXlDb2RlID09IDkpIHtcbiAgICAgIGlmICh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uaXNDb2xsYXBzZWQoKSAmJiAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpLnBhcmVudHMoYGNvZGUsJHtGSUdVUkVfU0VMRUNUT1J9YCkubGVuZ3RoKSB7XG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZXRDb250ZW50KCdcXHQnKVxuICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoZS5rZXlDb2RlID09IDM3KSB7XG4gICAgICBsZXQgcmFuZ2UgPSB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Um5nKClcbiAgICAgIGxldCBzdGFydE5vZGUgPSAkKHJhbmdlLnN0YXJ0Q29udGFpbmVyKVxuICAgICAgaWYgKHN0YXJ0Tm9kZS5wYXJlbnQoKS5pcygnY29kZScpICYmIChzdGFydE5vZGUucGFyZW50KCkuY29udGVudHMoKS5pbmRleChzdGFydE5vZGUpID09IDAgJiYgcmFuZ2Uuc3RhcnRPZmZzZXQgPT0gMSkpIHtcbiAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLnNldEN1cnNvckxvY2F0aW9uKHN0YXJ0Tm9kZS5wYXJlbnRzKEZJR1VSRV9TRUxFQ1RPUikucHJldigncCw6aGVhZGVyJylbMF0sIDEpXG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgfVxuICAgIH0qL1xuICB9KVxuXG4gIGxpc3RpbmcgPSB7XG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgYWRkOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgIGxldCBzZWxlY3RlZEVsZW1lbnQgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG4gICAgICBsZXQgbmV3TGlzdGluZyA9IHRoaXMuY3JlYXRlKGdldFN1Y2Nlc3NpdmVFbGVtZW50SWQoRklHVVJFX0xJU1RJTkdfU0VMRUNUT1IsIExJU1RJTkdfU1VGRklYKSlcblxuICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIC8vIENoZWNrIGlmIHRoZSBzZWxlY3RlZCBwYXJhZ3JhcGggaXMgbm90IGVtcHR5LCBhZGQgdGhlIG5ldyBsaXN0aW5nIHJpZ2h0IGJlbG93XG4gICAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQudGV4dCgpLnRyaW0oKS5sZW5ndGggIT0gMClcbiAgICAgICAgICBzZWxlY3RlZEVsZW1lbnQuYWZ0ZXIobmV3TGlzdGluZylcblxuICAgICAgICAvLyBJZiBzZWxlY3RlZCBwYXJhZ3JhcGggaXMgZW1wdHksIHJlcGxhY2UgaXQgd2l0aCB0aGUgbmV3IHRhYmxlXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBzZWxlY3RlZEVsZW1lbnQucmVwbGFjZVdpdGgobmV3TGlzdGluZylcblxuXG4gICAgICAgIC8vIFVwZGF0ZSBhbGwgY2FwdGlvbnMgd2l0aCBSQVNIIGZ1bmN0aW9uXG4gICAgICAgIGNhcHRpb25zKClcblxuICAgICAgICAvLyBNb3ZlIHRoZSBjYXJldFxuICAgICAgICBzZWxlY3RSYW5nZShuZXdMaXN0aW5nLmZpbmQoJ2NvZGUnKVswXSwgMClcblxuICAgICAgICAvLyBVcGRhdGUgYWxsIGNyb3NzLXJlZlxuICAgICAgICB1cGRhdGVSZWZlcmVuY2VzKClcblxuICAgICAgICAvLyBTYXZlIHVwZGF0ZXMgXG4gICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuICAgICAgfSlcblxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBjcmVhdGU6IGZ1bmN0aW9uIChpZCkge1xuICAgICAgcmV0dXJuICQoYDxmaWd1cmUgaWQ9XCIke2lkfVwiPjxwcmU+PGNvZGU+JHtaRVJPX1NQQUNFfTwvY29kZT48L3ByZT48ZmlnY2FwdGlvbj5DYXB0aW9uLjwvZmlnY2FwdGlvbj48L2ZpZ3VyZT5gKVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBzZXRDb250ZW50OiBmdW5jdGlvbiAoY2hhcikge1xuICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLnNldENvbnRlbnQoY2hhcilcbiAgICB9XG4gIH1cbn0pXG5cblxuLyoqXG4gKiBcbiAqL1xudGlueW1jZS5QbHVnaW5NYW5hZ2VyLmFkZCgncmFqZV9pbmxpbmVfZm9ybXVsYScsIGZ1bmN0aW9uIChlZGl0b3IsIHVybCkge1xuXG4gIGVkaXRvci5hZGRCdXR0b24oJ3JhamVfaW5saW5lX2Zvcm11bGEnLCB7XG4gICAgaWNvbjogJ2ljb24taW5saW5lLWZvcm11bGEnLFxuICAgIHRvb2x0aXA6ICdJbmxpbmUgZm9ybXVsYScsXG4gICAgZGlzYWJsZWRTdGF0ZVNlbGVjdG9yOiBgJHtESVNBQkxFX1NFTEVDVE9SX0lOTElORX0sOmhlYWRlcmAsXG5cbiAgICAvLyBCdXR0b24gYmVoYXZpb3VyXG4gICAgb25jbGljazogZnVuY3Rpb24gKCkge1xuICAgICAgb3BlbklubGluZUZvcm11bGFFZGl0b3IoKVxuICAgIH1cbiAgfSlcblxuICBlZGl0b3Iub24oJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcbiAgICBsZXQgc2VsZWN0ZWRFbGVtZW50ID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuXG4gICAgLy8gT3BlbiBmb3JtdWxhIGVkaXRvciBjbGlja2luZyBvbiBtYXRoIGZvcm11bGFzXG4gICAgaWYgKHNlbGVjdGVkRWxlbWVudC5jaGlsZHJlbignc3ZnW3JvbGU9bWF0aF0nKS5sZW5ndGgpIHtcblxuICAgICAgb3BlbklubGluZUZvcm11bGFFZGl0b3Ioe1xuICAgICAgICBmb3JtdWxhX3ZhbDogc2VsZWN0ZWRFbGVtZW50LmNoaWxkcmVuKCdzdmdbcm9sZT1tYXRoXScpLmF0dHIoJ2RhdGEtbWF0aC1vcmlnaW5hbC1pbnB1dCcpLFxuICAgICAgICBmb3JtdWxhX2lkOiBzZWxlY3RlZEVsZW1lbnQuYXR0cignaWQnKVxuICAgICAgfSlcbiAgICB9XG4gIH0pXG5cbiAgaW5saW5lX2Zvcm11bGEgPSB7XG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgYWRkOiBmdW5jdGlvbiAoZm9ybXVsYV9zdmcpIHtcblxuICAgICAgbGV0IHNlbGVjdGVkRWxlbWVudCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcbiAgICAgIGxldCBuZXdGb3JtdWxhID0gdGhpcy5jcmVhdGUoZm9ybXVsYV9zdmcsIGdldFN1Y2Nlc3NpdmVFbGVtZW50SWQoRklHVVJFX0ZPUk1VTEFfU0VMRUNUT1IsIEZPUk1VTEFfU1VGRklYKSlcblxuICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZXRDb250ZW50KG5ld0Zvcm11bGEpXG5cbiAgICAgICAgLy8gU2F2ZSB1cGRhdGVzIFxuICAgICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcblxuICAgICAgICBjYXB0aW9ucygpXG5cbiAgICAgICAgLy8gVXBkYXRlIGFsbCBjcm9zcy1yZWZcbiAgICAgICAgdXBkYXRlUmVmZXJlbmNlcygpXG5cbiAgICAgICAgLy8gVXBkYXRlIFJlbmRlcmVkIFJBU0hcbiAgICAgICAgLy91cGRhdGVJZnJhbWVGcm9tU2F2ZWRDb250ZW50KClcbiAgICAgIH0pXG5cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgdXBkYXRlOiBmdW5jdGlvbiAoZm9ybXVsYV9zdmcsIGZvcm11bGFfaWQpIHtcblxuICAgICAgbGV0IHNlbGVjdGVkRmlndXJlID0gJChgIyR7Zm9ybXVsYV9pZH1gKVxuXG4gICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgc2VsZWN0ZWRGaWd1cmUuZmluZCgnc3ZnJykucmVwbGFjZVdpdGgoZm9ybXVsYV9zdmcpXG4gICAgICAgIC8vdXBkYXRlSWZyYW1lRnJvbVNhdmVkQ29udGVudCgpXG4gICAgICB9KVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBjcmVhdGU6IGZ1bmN0aW9uIChmb3JtdWxhX3N2ZywgaWQpIHtcbiAgICAgIHJldHVybiBgPHNwYW4gaWQ9XCIke2lkfVwiIGNvbnRlbnRlZGl0YWJsZT1cImZhbHNlXCI+JHtmb3JtdWxhX3N2Z1swXS5vdXRlckhUTUx9PC9zcGFuPmBcbiAgICB9XG4gIH1cbn0pXG5cbi8qKlxuICogUmFqZSBjb2RlYmxvY2tcbiAqL1xudGlueW1jZS5QbHVnaW5NYW5hZ2VyLmFkZCgncmFqZV9jb2RlYmxvY2snLCBmdW5jdGlvbiAoZWRpdG9yLCB1cmwpIHtcblxuICAvLyBBZGQgYSBidXR0b24gdGhhdCBoYW5kbGUgdGhlIGlubGluZSBlbGVtZW50XG4gIGVkaXRvci5hZGRCdXR0b24oJ3JhamVfY29kZWJsb2NrJywge1xuICAgIHRpdGxlOiAncmFqZV9jb2RlYmxvY2snLFxuICAgIGljb246ICdpY29uLWJsb2NrLWNvZGUnLFxuICAgIHRvb2x0aXA6ICdCbG9jayBjb2RlJyxcbiAgICBkaXNhYmxlZFN0YXRlU2VsZWN0b3I6IGAke0RJU0FCTEVfU0VMRUNUT1JfRklHVVJFU30sY29kZSxwcmVgLFxuXG4gICAgLy8gQnV0dG9uIGJlaGF2aW91clxuICAgIG9uY2xpY2s6IGZ1bmN0aW9uICgpIHtcbiAgICAgIGJsb2NrY29kZS5hZGQoKVxuICAgIH1cbiAgfSlcblxuICBibG9ja2NvZGUgPSB7XG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgYWRkOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgIGxldCBzZWxlY3RlZEVsZW1lbnQgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG4gICAgICBsZXQgYmxvY2tDb2RlID0gdGhpcy5jcmVhdGUoZ2V0U3VjY2Vzc2l2ZUVsZW1lbnRJZChGSUdVUkVfTElTVElOR19TRUxFQ1RPUiwgTElTVElOR19TVUZGSVgpKVxuXG4gICAgICBpZiAoIXNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKCdwcmUsY29kZScpLmxlbmd0aCkge1xuXG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgIC8vIENoZWNrIGlmIHRoZSBzZWxlY3RlZCBwYXJhZ3JhcGggaXMgbm90IGVtcHR5LCBhZGQgdGhlIG5ldyBsaXN0aW5nIHJpZ2h0IGJlbG93XG4gICAgICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC50ZXh0KCkudHJpbSgpLmxlbmd0aCAhPSAwKVxuICAgICAgICAgICAgc2VsZWN0ZWRFbGVtZW50LmFmdGVyKGJsb2NrQ29kZSlcblxuICAgICAgICAgIC8vIElmIHNlbGVjdGVkIHBhcmFncmFwaCBpcyBlbXB0eSwgcmVwbGFjZSBpdCB3aXRoIHRoZSBuZXcgdGFibGVcbiAgICAgICAgICBlbHNlXG4gICAgICAgICAgICBzZWxlY3RlZEVsZW1lbnQucmVwbGFjZVdpdGgoYmxvY2tDb2RlKVxuXG4gICAgICAgICAgLy8gVXBkYXRlIGFsbCBjYXB0aW9ucyB3aXRoIFJBU0ggZnVuY3Rpb25cbiAgICAgICAgICBjYXB0aW9ucygpXG5cbiAgICAgICAgICAvLyBNb3ZlIHRoZSBjYXJldFxuICAgICAgICAgIHNlbGVjdFJhbmdlKGJsb2NrQ29kZS5maW5kKCdjb2RlJylbMF0sIDApXG5cbiAgICAgICAgICAvLyBTYXZlIHVwZGF0ZXMgXG4gICAgICAgICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIGNyZWF0ZTogZnVuY3Rpb24gKGlkKSB7XG4gICAgICByZXR1cm4gJChgPHByZT48Y29kZT4ke1pFUk9fU1BBQ0V9PC9jb2RlPjwvcHJlPmApXG4gICAgfVxuICB9XG59KVxuXG4vKipcbiAqIFJhamUgcXVvdGVibG9ja1xuICovXG50aW55bWNlLlBsdWdpbk1hbmFnZXIuYWRkKCdyYWplX3F1b3RlYmxvY2snLCBmdW5jdGlvbiAoZWRpdG9yLCB1cmwpIHtcblxuICAvLyBBZGQgYSBidXR0b24gdGhhdCBoYW5kbGUgdGhlIGlubGluZSBlbGVtZW50XG4gIGVkaXRvci5hZGRCdXR0b24oJ3JhamVfcXVvdGVibG9jaycsIHtcbiAgICB0aXRsZTogJ3JhamVfcXVvdGVibG9jaycsXG4gICAgaWNvbjogJ2ljb24tYmxvY2stcXVvdGUnLFxuICAgIHRvb2x0aXA6ICdCbG9jayBxdW90ZScsXG4gICAgZGlzYWJsZWRTdGF0ZVNlbGVjdG9yOiBgJHtESVNBQkxFX1NFTEVDVE9SX0ZJR1VSRVN9LGJsb2NrcXVvdGVgLFxuXG4gICAgLy8gQnV0dG9uIGJlaGF2aW91clxuICAgIG9uY2xpY2s6IGZ1bmN0aW9uICgpIHtcbiAgICAgIGJsb2NrcXVvdGUuYWRkKClcbiAgICB9XG4gIH0pXG5cbiAgZWRpdG9yLm9uKCdrZXlEb3duJywgZnVuY3Rpb24gKGUpIHtcblxuXG4gICAgbGV0IHNlbGVjdGVkRWxlbWVudCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcbiAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LmlzKCdwJykgJiYgc2VsZWN0ZWRFbGVtZW50LnBhcmVudCgpLmlzKCdibG9ja3F1b3RlJykpIHtcblxuICAgICAgLy9FTlRFUlxuICAgICAgaWYgKGUua2V5Q29kZSA9PSAxMykge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcblxuICAgICAgICAvLyBFeGl0IGZyb20gdGhlIGJsb2NrcXVvdGUgaWYgdGhlIGN1cnJlbnQgcCBpcyBlbXB0eVxuICAgICAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LnRleHQoKS50cmltKCkubGVuZ3RoID09IDApXG4gICAgICAgICAgcmV0dXJuIGJsb2NrcXVvdGUuZXhpdCgpXG5cbiAgICAgICAgYmxvY2txdW90ZS5hZGRQYXJhZ3JhcGgoKVxuICAgICAgfVxuICAgIH1cbiAgfSlcblxuICBibG9ja3F1b3RlID0ge1xuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIGFkZDogZnVuY3Rpb24gKCkge1xuXG4gICAgICBsZXQgc2VsZWN0ZWRFbGVtZW50ID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuICAgICAgbGV0IGJsb2NrUXVvdGUgPSB0aGlzLmNyZWF0ZShnZXRTdWNjZXNzaXZlRWxlbWVudElkKEZJR1VSRV9MSVNUSU5HX1NFTEVDVE9SLCBMSVNUSU5HX1NVRkZJWCkpXG5cbiAgICAgIGlmICghc2VsZWN0ZWRFbGVtZW50LnBhcmVudHMoJ3ByZSxjb2RlJykubGVuZ3RoKSB7XG5cbiAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIHNlbGVjdGVkIHBhcmFncmFwaCBpcyBub3QgZW1wdHksIGFkZCB0aGUgbmV3IGxpc3RpbmcgcmlnaHQgYmVsb3dcbiAgICAgICAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LnRleHQoKS50cmltKCkubGVuZ3RoICE9IDApXG4gICAgICAgICAgICBzZWxlY3RlZEVsZW1lbnQuYWZ0ZXIoYmxvY2tRdW90ZSlcblxuICAgICAgICAgIC8vIElmIHNlbGVjdGVkIHBhcmFncmFwaCBpcyBlbXB0eSwgcmVwbGFjZSBpdCB3aXRoIHRoZSBuZXcgdGFibGVcbiAgICAgICAgICBlbHNlXG4gICAgICAgICAgICBzZWxlY3RlZEVsZW1lbnQucmVwbGFjZVdpdGgoYmxvY2tRdW90ZSlcblxuICAgICAgICAgIC8vIFVwZGF0ZSBhbGwgY2FwdGlvbnMgd2l0aCBSQVNIIGZ1bmN0aW9uXG4gICAgICAgICAgY2FwdGlvbnMoKVxuXG4gICAgICAgICAgLy8gTW92ZSB0aGUgY2FyZXRcbiAgICAgICAgICBtb3ZlQ2FyZXQoYmxvY2tRdW90ZVswXSlcblxuICAgICAgICAgIC8vIFNhdmUgdXBkYXRlcyBcbiAgICAgICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgY3JlYXRlOiBmdW5jdGlvbiAoaWQpIHtcbiAgICAgIHJldHVybiAkKGA8YmxvY2txdW90ZT48cD4ke1pFUk9fU1BBQ0V9PC9wPjwvYmxvY2txdW90ZT5gKVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBnZXRMYXN0Tm90RW1wdHlOb2RlOiBmdW5jdGlvbiAobm9kZXMpIHtcblxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBub2Rlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoKG5vZGVzW2ldLm5vZGVUeXBlID09IDMgfHwgbm9kZXNbaV0udGFnTmFtZSA9PSAnYnInKSAmJiAhbm9kZXNbaV0ubGVuZ3RoKVxuICAgICAgICAgIG5vZGVzLnNwbGljZShpLCAxKVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gbm9kZXNbbm9kZXMubGVuZ3RoIC0gMV1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgYWRkUGFyYWdyYXBoOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgIGNvbnN0IEJSID0gJzxicj4nXG5cbiAgICAgIC8vIEdldCB0aGUgcmVmZXJlbmNlcyBvZiB0aGUgZXhpc3RpbmcgZWxlbWVudFxuICAgICAgbGV0IHBhcmFncmFwaCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcblxuICAgICAgLy8gUGxhY2Vob2xkZXIgdGV4dCBvZiB0aGUgbmV3IGxpXG4gICAgICBsZXQgdGV4dCA9IEJSXG4gICAgICBsZXQgdGV4dE5vZGVzID0gcGFyYWdyYXBoLmNvbnRlbnRzKClcblxuICAgICAgLy8gSWYgdGhlcmUgaXMganVzdCBvbmUgbm9kZSB3cmFwcGVkIGluc2lkZSB0aGUgcGFyYWdyYXBoXG4gICAgICBpZiAodGV4dE5vZGVzLmxlbmd0aCA9PSAxKSB7XG5cbiAgICAgICAgLy8gR2V0IHRoZSBzdGFydCBvZmZzZXQgYW5kIHRleHQgb2YgdGhlIGN1cnJlbnQgbGlcbiAgICAgICAgbGV0IHN0YXJ0T2Zmc2V0ID0gdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldFJuZygpLnN0YXJ0T2Zmc2V0XG4gICAgICAgIGxldCB3aG9sZVRleHQgPSBwYXJhZ3JhcGgudGV4dCgpXG5cbiAgICAgICAgLy8gSWYgdGhlIGN1cnNvciBpc24ndCBhdCB0aGUgZW5kIGJ1dCBpdCdzIGluIHRoZSBtaWRkbGVcbiAgICAgICAgLy8gR2V0IHRoZSByZW1haW5pbmcgdGV4dCBmcm9tIHRoZSBjdXJzb3IgdG8gdGhlIGVuZFxuICAgICAgICBpZiAoc3RhcnRPZmZzZXQgIT0gd2hvbGVUZXh0Lmxlbmd0aClcbiAgICAgICAgICB0ZXh0ID0gd2hvbGVUZXh0LnN1YnN0cmluZyhzdGFydE9mZnNldCwgd2hvbGVUZXh0Lmxlbmd0aClcblxuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICAvLyBVcGRhdGUgdGhlIHRleHQgb2YgdGhlIGN1cnJlbnQgbGlcbiAgICAgICAgICBwYXJhZ3JhcGgudGV4dCh3aG9sZVRleHQuc3Vic3RyaW5nKDAsIHN0YXJ0T2Zmc2V0KSlcblxuICAgICAgICAgIGlmICghcGFyYWdyYXBoLnRleHQoKS5sZW5ndGgpXG4gICAgICAgICAgICBwYXJhZ3JhcGguaHRtbChCUilcblxuICAgICAgICAgIC8vIENyZWF0ZSBhbmQgYWRkIHRoZSBuZXcgbGlcbiAgICAgICAgICBsZXQgbmV3UGFyYWdyYXBoID0gJChgPHA+JHt0ZXh0fTwvcD5gKVxuICAgICAgICAgIHBhcmFncmFwaC5hZnRlcihuZXdQYXJhZ3JhcGgpXG5cbiAgICAgICAgICAvLyBNb3ZlIHRoZSBjYXJldCB0byB0aGUgbmV3IGxpXG4gICAgICAgICAgbW92ZUNhcmV0KG5ld1BhcmFncmFwaFswXSwgdHJ1ZSlcblxuICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgY29udGVudFxuICAgICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuICAgICAgICB9KVxuICAgICAgfVxuXG4gICAgICAvLyBJbnN0ZWFkIGlmIHRoZXJlIGFyZSBtdWx0aXBsZSBub2RlcyBpbnNpZGUgdGhlIHBhcmFncmFwaFxuICAgICAgZWxzZSB7XG5cbiAgICAgICAgLy8gSXN0YW50aWF0ZSB0aGUgcmFuZ2UgdG8gYmUgc2VsZWN0ZWRcbiAgICAgICAgbGV0IHJhbmdlID0gZG9jdW1lbnQuY3JlYXRlUmFuZ2UoKVxuXG4gICAgICAgIC8vIFN0YXJ0IHRoZSByYW5nZSBmcm9tIHRoZSBzZWxlY3RlZCBub2RlIGFuZCBvZmZzZXQgYW5kIGVuZHMgaXQgYXQgdGhlIGVuZCBvZiB0aGUgbGFzdCBub2RlXG4gICAgICAgIHJhbmdlLnNldFN0YXJ0KHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRSbmcoKS5zdGFydENvbnRhaW5lciwgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldFJuZygpLnN0YXJ0T2Zmc2V0KVxuICAgICAgICByYW5nZS5zZXRFbmQodGhpcy5nZXRMYXN0Tm90RW1wdHlOb2RlKHRleHROb2RlcyksIDEpXG5cbiAgICAgICAgLy8gU2VsZWN0IHRoZSByYW5nZVxuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2V0Um5nKHJhbmdlKVxuXG4gICAgICAgIC8vIFNhdmUgdGhlIGh0bWwgY29udGVudFxuICAgICAgICB3aG9sZVRleHQgPSB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Q29udGVudCgpXG5cbiAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgcGFyYWdyYXBoLmh0bWwocGFyYWdyYXBoLmh0bWwoKS5yZXBsYWNlKHdob2xlVGV4dCwgJycpKVxuXG4gICAgICAgICAgaWYgKCFwYXJhZ3JhcGgudGV4dCgpLmxlbmd0aClcbiAgICAgICAgICAgIHBhcmFncmFwaC5odG1sKEJSKVxuXG4gICAgICAgICAgLy8gQ3JlYXRlIGFuZCBhZGQgdGhlIG5ldyBsaVxuICAgICAgICAgIGxldCBuZXdQYXJhZ3JhcGggPSAkKGA8cD4ke3dob2xlVGV4dH08L3A+YClcbiAgICAgICAgICBwYXJhZ3JhcGguYWZ0ZXIobmV3UGFyYWdyYXBoKVxuXG4gICAgICAgICAgLy8gTW92ZSB0aGUgY2FyZXQgdG8gdGhlIG5ldyBsaVxuICAgICAgICAgIG1vdmVDYXJldChuZXdQYXJhZ3JhcGhbMF0sIHRydWUpXG5cbiAgICAgICAgICAvLyBVcGRhdGUgdGhlIGNvbnRlbnRcbiAgICAgICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgZXhpdDogZnVuY3Rpb24gKCkge1xuICAgICAgbGV0IHBhcmFncmFwaCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcbiAgICAgIGxldCBibG9ja3F1b3RlID0gcGFyYWdyYXBoLnBhcmVudCgpXG5cbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICBwYXJhZ3JhcGgucmVtb3ZlKClcblxuICAgICAgICBpZiAoIWJsb2NrcXVvdGUubmV4dCgpLmxlbmd0aCkge1xuICAgICAgICAgIGJsb2NrcXVvdGUuYWZ0ZXIoJChgPHA+PGJyLz48L3A+YCkpXG4gICAgICAgIH1cblxuICAgICAgICBtb3ZlQ2FyZXQoYmxvY2txdW90ZS5uZXh0KClbMF0pXG5cbiAgICAgIH0pXG4gICAgfVxuICB9XG59KVxuXG4vKipcbiAqIFVwZGF0ZSB0YWJsZSBjYXB0aW9ucyB3aXRoIGEgUkFTSCBmdW5jaW9uIFxuICovXG5mdW5jdGlvbiBjYXB0aW9ucygpIHtcblxuICAvKiBDYXB0aW9ucyAqL1xuICB0aW55bWNlLmFjdGl2ZUVkaXRvci4kKGZpZ3VyZWJveF9zZWxlY3RvcikuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGN1cl9jYXB0aW9uID0gJCh0aGlzKS5wYXJlbnRzKFwiZmlndXJlXCIpLmZpbmQoXCJmaWdjYXB0aW9uXCIpO1xuICAgIHZhciBjdXJfbnVtYmVyID0gJCh0aGlzKS5maW5kTnVtYmVyUmFqZShmaWd1cmVib3hfc2VsZWN0b3IpO1xuICAgIGN1cl9jYXB0aW9uLmZpbmQoJ3N0cm9uZycpLnJlbW92ZSgpO1xuICAgIGN1cl9jYXB0aW9uLmh0bWwoXCI8c3Ryb25nIGNsYXNzPVxcXCJjZ2VuXFxcIiBkYXRhLXJhc2gtb3JpZ2luYWwtY29udGVudD1cXFwiXFxcIiBjb250ZW50ZWRpdGFibGU9XFxcImZhbHNlXFxcIj5GaWd1cmUgXCIgKyBjdXJfbnVtYmVyICtcbiAgICAgIFwiLiA8L3N0cm9uZz5cIiArIGN1cl9jYXB0aW9uLmh0bWwoKSk7XG4gIH0pO1xuICB0aW55bWNlLmFjdGl2ZUVkaXRvci4kKHRhYmxlYm94X3NlbGVjdG9yKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY3VyX2NhcHRpb24gPSAkKHRoaXMpLnBhcmVudHMoXCJmaWd1cmVcIikuZmluZChcImZpZ2NhcHRpb25cIik7XG4gICAgdmFyIGN1cl9udW1iZXIgPSAkKHRoaXMpLmZpbmROdW1iZXJSYWplKHRhYmxlYm94X3NlbGVjdG9yKTtcbiAgICBjdXJfY2FwdGlvbi5maW5kKCdzdHJvbmcnKS5yZW1vdmUoKTtcbiAgICBjdXJfY2FwdGlvbi5odG1sKFwiPHN0cm9uZyBjbGFzcz1cXFwiY2dlblxcXCIgZGF0YS1yYXNoLW9yaWdpbmFsLWNvbnRlbnQ9XFxcIlxcXCIgY29udGVudGVkaXRhYmxlPVxcXCJmYWxzZVxcXCIgPlRhYmxlIFwiICsgY3VyX251bWJlciArXG4gICAgICBcIi4gPC9zdHJvbmc+XCIgKyBjdXJfY2FwdGlvbi5odG1sKCkpO1xuICB9KTtcbiAgdGlueW1jZS5hY3RpdmVFZGl0b3IuJChmb3JtdWxhYm94X3NlbGVjdG9yKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY3VyX2NhcHRpb24gPSAkKHRoaXMpLnBhcmVudHMoXCJmaWd1cmVcIikuZmluZChcInBcIik7XG4gICAgdmFyIGN1cl9udW1iZXIgPSAkKHRoaXMpLmZpbmROdW1iZXJSYWplKGZvcm11bGFib3hfc2VsZWN0b3IpO1xuXG4gICAgaWYgKGN1cl9jYXB0aW9uLmZpbmQoJ3NwYW4uY2dlbicpLmxlbmd0aCkge1xuICAgICAgY3VyX2NhcHRpb24uZmluZCgnc3Bhbi5jZ2VuJykucmVtb3ZlKCk7XG4gICAgICBjdXJfY2FwdGlvbi5maW5kKCdzcGFuW2NvbnRlbnRlZGl0YWJsZV0nKS5hcHBlbmQoXCI8c3BhbiBjbGFzcz1cXFwiY2dlblxcXCIgZGF0YS1yYXNoLW9yaWdpbmFsLWNvbnRlbnQ9XFxcIlxcXCIgPiAoXCIgKyBjdXJfbnVtYmVyICsgXCIpPC9zcGFuPlwiKVxuICAgIH0gZWxzZVxuICAgICAgY3VyX2NhcHRpb24uaHRtbChjdXJfY2FwdGlvbi5odG1sKCkgKyBcIjxzcGFuIGNsYXNzPVxcXCJjZ2VuXFxcIiBkYXRhLXJhc2gtb3JpZ2luYWwtY29udGVudD1cXFwiXFxcIiA+IChcIiArXG4gICAgICAgIGN1cl9udW1iZXIgKyBcIik8L3NwYW4+XCIpO1xuICB9KTtcbiAgdGlueW1jZS5hY3RpdmVFZGl0b3IuJChsaXN0aW5nYm94X3NlbGVjdG9yKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY3VyX2NhcHRpb24gPSAkKHRoaXMpLnBhcmVudHMoXCJmaWd1cmVcIikuZmluZChcImZpZ2NhcHRpb25cIik7XG4gICAgdmFyIGN1cl9udW1iZXIgPSAkKHRoaXMpLmZpbmROdW1iZXJSYWplKGxpc3Rpbmdib3hfc2VsZWN0b3IpO1xuICAgIGN1cl9jYXB0aW9uLmZpbmQoJ3N0cm9uZycpLnJlbW92ZSgpO1xuICAgIGN1cl9jYXB0aW9uLmh0bWwoXCI8c3Ryb25nIGNsYXNzPVxcXCJjZ2VuXFxcIiBkYXRhLXJhc2gtb3JpZ2luYWwtY29udGVudD1cXFwiXFxcIiBjb250ZW50ZWRpdGFibGU9XFxcImZhbHNlXFxcIj5MaXN0aW5nIFwiICsgY3VyX251bWJlciArXG4gICAgICBcIi4gPC9zdHJvbmc+XCIgKyBjdXJfY2FwdGlvbi5odG1sKCkpO1xuICB9KTtcbiAgLyogL0VORCBDYXB0aW9ucyAqL1xufVxuXG4vKipcbiAqIFxuICogQHBhcmFtIHsqfSBzZWwgPT4gdGlueW1jZSBzZWxlY3Rpb25cbiAqIFxuICogTWFpbmx5IGl0IGNoZWNrcyB3aGVyZSBzZWxlY3Rpb24gc3RhcnRzIGFuZCBlbmRzIHRvIGJsb2NrIHVuYWxsb3dlZCBkZWxldGlvblxuICogSW4gc2FtZSBmaWd1cmUgYXJlbid0IGJsb2NrZWQsIHVubGVzcyBzZWxlY3Rpb24gc3RhcnQgT1IgZW5kIGluc2lkZSBmaWdjYXB0aW9uIChub3QgYm90aClcbiAqL1xuZnVuY3Rpb24gaGFuZGxlRmlndXJlRGVsZXRlKHNlbCkge1xuXG4gIHRyeSB7XG5cbiAgICAvLyBHZXQgcmVmZXJlbmNlIG9mIHN0YXJ0IGFuZCBlbmQgbm9kZVxuICAgIGxldCBzdGFydE5vZGUgPSAkKHNlbC5nZXRSbmcoKS5zdGFydENvbnRhaW5lcilcbiAgICBsZXQgc3RhcnROb2RlUGFyZW50ID0gc3RhcnROb2RlLnBhcmVudHMoRklHVVJFX1NFTEVDVE9SKVxuXG4gICAgbGV0IGVuZE5vZGUgPSAkKHNlbC5nZXRSbmcoKS5lbmRDb250YWluZXIpXG4gICAgbGV0IGVuZE5vZGVQYXJlbnQgPSBlbmROb2RlLnBhcmVudHMoRklHVVJFX1NFTEVDVE9SKVxuXG4gICAgLy8gSWYgYXQgbGVhc3Qgc2VsZWN0aW9uIHN0YXJ0IG9yIGVuZCBpcyBpbnNpZGUgdGhlIGZpZ3VyZVxuICAgIGlmIChzdGFydE5vZGVQYXJlbnQubGVuZ3RoIHx8IGVuZE5vZGVQYXJlbnQubGVuZ3RoKSB7XG5cbiAgICAgIC8vIElmIHNlbGVjdGlvbiB3cmFwcyBlbnRpcmVseSBhIGZpZ3VyZSBmcm9tIHRoZSBzdGFydCBvZiBmaXJzdCBlbGVtZW50ICh0aCBpbiB0YWJsZSkgYW5kIHNlbGVjdGlvbiBlbmRzXG4gICAgICBpZiAoZW5kTm9kZS5wYXJlbnRzKCdmaWdjYXB0aW9uJykubGVuZ3RoKSB7XG5cbiAgICAgICAgbGV0IGNvbnRlbnRzID0gZW5kTm9kZS5wYXJlbnQoKS5jb250ZW50cygpXG4gICAgICAgIGlmIChzdGFydE5vZGUuaXMoRklHVVJFX1NFTEVDVE9SKSAmJiBjb250ZW50cy5pbmRleChlbmROb2RlKSA9PSBjb250ZW50cy5sZW5ndGggLSAxICYmIHNlbC5nZXRSbmcoKS5lbmRPZmZzZXQgPT0gZW5kTm9kZS50ZXh0KCkubGVuZ3RoKSB7XG4gICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgICAvLyBNb3ZlIGN1cnNvciBhdCB0aGUgcHJldmlvdXMgZWxlbWVudCBhbmQgcmVtb3ZlIGZpZ3VyZVxuICAgICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IuZm9jdXMoKVxuICAgICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLnNldEN1cnNvckxvY2F0aW9uKHN0YXJ0Tm9kZS5wcmV2KClbMF0sIDEpXG4gICAgICAgICAgICBzdGFydE5vZGUucmVtb3ZlKClcblxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBJZiBzZWxlY3Rpb24gZG9lc24ndCBzdGFydCBhbmQgZW5kIGluIHRoZSBzYW1lIGZpZ3VyZSwgYnV0IG9uZSBiZWV0d2VuIHN0YXJ0IG9yIGVuZCBpcyBpbnNpZGUgdGhlIGZpZ2NhcHRpb24sIG11c3QgYmxvY2tcbiAgICAgIGlmIChzdGFydE5vZGUucGFyZW50cygnZmlnY2FwdGlvbicpLmxlbmd0aCAhPSBlbmROb2RlLnBhcmVudHMoJ2ZpZ2NhcHRpb24nKS5sZW5ndGggJiYgKHN0YXJ0Tm9kZS5wYXJlbnRzKCdmaWdjYXB0aW9uJykubGVuZ3RoIHx8IGVuZE5vZGUucGFyZW50cygnZmlnY2FwdGlvbicpLmxlbmd0aCkpXG4gICAgICAgIHJldHVybiBmYWxzZVxuXG4gICAgICAvLyBJZiB0aGUgZmlndXJlIGlzIG5vdCB0aGUgc2FtZSwgbXVzdCBibG9ja1xuICAgICAgLy8gQmVjYXVzZSBhIHNlbGVjdGlvbiBjYW4gc3RhcnQgaW4gZmlndXJlWCBhbmQgZW5kIGluIGZpZ3VyZVlcbiAgICAgIGlmICgoc3RhcnROb2RlUGFyZW50LmF0dHIoJ2lkJykgIT0gZW5kTm9kZVBhcmVudC5hdHRyKCdpZCcpKSlcbiAgICAgICAgcmV0dXJuIGZhbHNlXG5cbiAgICAgIC8vIElmIGN1cnNvciBpcyBhdCBzdGFydCBvZiBjb2RlIHByZXZlbnRcbiAgICAgIGlmIChzdGFydE5vZGUucGFyZW50cyhGSUdVUkVfU0VMRUNUT1IpLmZpbmQoJ3ByZScpLmxlbmd0aCkge1xuXG4gICAgICAgIC8vIElmIGF0IHRoZSBzdGFydCBvZiBwcmU+Y29kZSwgcHJlc3NpbmcgMnRpbWVzIGJhY2tzcGFjZSB3aWxsIHJlbW92ZSBldmVyeXRoaW5nIFxuICAgICAgICBpZiAoc3RhcnROb2RlLnBhcmVudCgpLmlzKCdjb2RlJykgJiYgKHN0YXJ0Tm9kZS5wYXJlbnQoKS5jb250ZW50cygpLmluZGV4KHN0YXJ0Tm9kZSkgPT0gMCAmJiBzZWwuZ2V0Um5nKCkuc3RhcnRPZmZzZXQgPT0gMSkpIHtcbiAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzdGFydE5vZGUucGFyZW50cyhGSUdVUkVfU0VMRUNUT1IpLnJlbW92ZSgpXG4gICAgICAgICAgfSlcbiAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgICAgfVxuXG5cbiAgICAgICAgaWYgKHN0YXJ0Tm9kZS5wYXJlbnQoKS5pcygncHJlJykgJiYgc2VsLmdldFJuZygpLnN0YXJ0T2Zmc2V0ID09IDApXG4gICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWVcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiBmYWxzZVxuICB9XG59XG5cbi8qKlxuICogXG4gKiBAcGFyYW0geyp9IHNlbCBcbiAqL1xuZnVuY3Rpb24gaGFuZGxlRmlndXJlQ2FuYyhzZWwpIHtcblxuICAvLyBHZXQgcmVmZXJlbmNlIG9mIHN0YXJ0IGFuZCBlbmQgbm9kZVxuICBsZXQgc3RhcnROb2RlID0gJChzZWwuZ2V0Um5nKCkuc3RhcnRDb250YWluZXIpXG4gIGxldCBzdGFydE5vZGVQYXJlbnQgPSBzdGFydE5vZGUucGFyZW50cyhGSUdVUkVfU0VMRUNUT1IpXG5cbiAgbGV0IGVuZE5vZGUgPSAkKHNlbC5nZXRSbmcoKS5lbmRDb250YWluZXIpXG4gIGxldCBlbmROb2RlUGFyZW50ID0gZW5kTm9kZS5wYXJlbnRzKEZJR1VSRV9TRUxFQ1RPUilcblxuICAvLyBJZiBhdCBsZWFzdCBzZWxlY3Rpb24gc3RhcnQgb3IgZW5kIGlzIGluc2lkZSB0aGUgZmlndXJlXG4gIGlmIChzdGFydE5vZGVQYXJlbnQubGVuZ3RoIHx8IGVuZE5vZGVQYXJlbnQubGVuZ3RoKSB7XG5cbiAgICAvLyBJZiBzZWxlY3Rpb24gZG9lc24ndCBzdGFydCBhbmQgZW5kIGluIHRoZSBzYW1lIGZpZ3VyZSwgYnV0IG9uZSBiZWV0d2VuIHN0YXJ0IG9yIGVuZCBpcyBpbnNpZGUgdGhlIGZpZ2NhcHRpb24sIG11c3QgYmxvY2tcbiAgICBpZiAoc3RhcnROb2RlLnBhcmVudHMoJ2ZpZ2NhcHRpb24nKS5sZW5ndGggIT0gZW5kTm9kZS5wYXJlbnRzKCdmaWdjYXB0aW9uJykubGVuZ3RoICYmIChzdGFydE5vZGUucGFyZW50cygnZmlnY2FwdGlvbicpLmxlbmd0aCB8fCBlbmROb2RlLnBhcmVudHMoJ2ZpZ2NhcHRpb24nKS5sZW5ndGgpKVxuICAgICAgcmV0dXJuIGZhbHNlXG5cbiAgICAvLyBJZiB0aGUgZmlndXJlIGlzIG5vdCB0aGUgc2FtZSwgbXVzdCBibG9ja1xuICAgIC8vIEJlY2F1c2UgYSBzZWxlY3Rpb24gY2FuIHN0YXJ0IGluIGZpZ3VyZVggYW5kIGVuZCBpbiBmaWd1cmVZXG4gICAgaWYgKChzdGFydE5vZGVQYXJlbnQuYXR0cignaWQnKSAhPSBlbmROb2RlUGFyZW50LmF0dHIoJ2lkJykpKVxuICAgICAgcmV0dXJuIGZhbHNlXG5cbiAgfVxuXG4gIC8vIFRoaXMgYWxnb3JpdGhtIGRvZXNuJ3Qgd29yayBpZiBjYXJldCBpcyBpbiBlbXB0eSB0ZXh0IGVsZW1lbnRcblxuICAvLyBDdXJyZW50IGVsZW1lbnQgY2FuIGJlIG9yIHRleHQgb3IgcFxuICBsZXQgcGFyYWdyYXBoID0gc3RhcnROb2RlLmlzKCdwJykgPyBzdGFydE5vZGUgOiBzdGFydE5vZGUucGFyZW50cygncCcpLmZpcnN0KClcbiAgLy8gU2F2ZSBhbGwgY2hsZHJlbiBub2RlcyAodGV4dCBpbmNsdWRlZClcbiAgbGV0IHBhcmFncmFwaENvbnRlbnQgPSBwYXJhZ3JhcGguY29udGVudHMoKVxuXG4gIC8vIElmIG5leHQgdGhlcmUgaXMgYSBmaWd1cmVcbiAgaWYgKHBhcmFncmFwaC5uZXh0KCkuaXMoRklHVVJFX1NFTEVDVE9SKSkge1xuXG4gICAgaWYgKGVuZE5vZGVbMF0ubm9kZVR5cGUgPT0gMykge1xuXG4gICAgICAvLyBJZiB0aGUgZW5kIG5vZGUgaXMgYSB0ZXh0IGluc2lkZSBhIHN0cm9uZywgaXRzIGluZGV4IHdpbGwgYmUgLTEuXG4gICAgICAvLyBJbiB0aGlzIGNhc2UgdGhlIGVkaXRvciBtdXN0IGl0ZXJhdGUgdW50aWwgaXQgZmFjZSBhIGlubGluZSBlbGVtZW50XG4gICAgICBpZiAocGFyYWdyYXBoQ29udGVudC5pbmRleChlbmROb2RlKSA9PSAtMSkgLy8mJiBwYXJhZ3JhcGgucGFyZW50cyhTRUNUSU9OX1NFTEVDVE9SKS5sZW5ndGgpXG4gICAgICAgIGVuZE5vZGUgPSBlbmROb2RlLnBhcmVudCgpXG5cbiAgICAgIC8vIElmIGluZGV4IG9mIHRoZSBpbmxpbmUgZWxlbWVudCBpcyBlcXVhbCBvZiBjaGlsZHJlbiBub2RlIGxlbmd0aFxuICAgICAgLy8gQU5EIHRoZSBjdXJzb3IgaXMgYXQgdGhlIGxhc3QgcG9zaXRpb25cbiAgICAgIC8vIFJlbW92ZSB0aGUgbmV4dCBmaWd1cmUgaW4gb25lIHVuZG8gbGV2ZWxcbiAgICAgIGlmIChwYXJhZ3JhcGhDb250ZW50LmluZGV4KGVuZE5vZGUpICsgMSA9PSBwYXJhZ3JhcGhDb250ZW50Lmxlbmd0aCAmJiBwYXJhZ3JhcGhDb250ZW50Lmxhc3QoKS50ZXh0KCkubGVuZ3RoID09IHNlbC5nZXRSbmcoKS5lbmRPZmZzZXQpIHtcbiAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHBhcmFncmFwaC5uZXh0KCkucmVtb3ZlKClcbiAgICAgICAgfSlcbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRydWVcbn1cblxuLyoqXG4gKiBcbiAqIEBwYXJhbSB7Kn0gc2VsID0+IHRpbnltY2Ugc2VsZWN0aW9uXG4gKiBcbiAqIEFkZCBhIHBhcmFncmFwaCBhZnRlciB0aGUgZmlndXJlXG4gKi9cbmZ1bmN0aW9uIGhhbmRsZUZpZ3VyZUVudGVyKHNlbCkge1xuXG4gIGxldCBzZWxlY3RlZEVsZW1lbnQgPSAkKHNlbC5nZXROb2RlKCkpXG4gIGlmIChzZWxlY3RlZEVsZW1lbnQuaXMoJ2ZpZ2NhcHRpb24nKSB8fCAoc2VsZWN0ZWRFbGVtZW50LnBhcmVudHMoRklHVVJFX1NFTEVDVE9SKS5sZW5ndGggJiYgc2VsZWN0ZWRFbGVtZW50LmlzKCdwJykpKSB7XG5cbiAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgIC8vYWRkIGEgbmV3IHBhcmFncmFwaCBhZnRlciB0aGUgZmlndXJlXG4gICAgICBzZWxlY3RlZEVsZW1lbnQucGFyZW50KEZJR1VSRV9TRUxFQ1RPUikuYWZ0ZXIoJzxwPjxici8+PC9wPicpXG5cbiAgICAgIC8vbW92ZSBjYXJldCBhdCB0aGUgc3RhcnQgb2YgbmV3IHBcbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZXRDdXJzb3JMb2NhdGlvbihzZWxlY3RlZEVsZW1lbnQucGFyZW50KEZJR1VSRV9TRUxFQ1RPUilbMF0ubmV4dFNpYmxpbmcsIDApXG4gICAgfSlcbiAgICByZXR1cm4gZmFsc2VcbiAgfSBlbHNlIGlmIChzZWxlY3RlZEVsZW1lbnQuaXMoJ3RoJykpXG4gICAgcmV0dXJuIGZhbHNlXG4gIHJldHVybiB0cnVlXG59XG5cbi8qKlxuICogXG4gKiBAcGFyYW0geyp9IHNlbCA9PiB0aW55bWNlIHNlbGVjdGlvblxuICovXG5mdW5jdGlvbiBoYW5kbGVGaWd1cmVDaGFuZ2UoKSB7XG5cbiAgLy8gSWYgcmFzaC1nZW5lcmF0ZWQgc2VjdGlvbiBpcyBkZWxldGUsIHJlLWFkZCBpdFxuICBpZiAoJCgnZmlnY2FwdGlvbjpub3QoOmhhcyhzdHJvbmcpKScpLmxlbmd0aCkge1xuICAgIGNhcHRpb25zKClcbiAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcbiAgfVxufSIsIi8qKlxuICogcmFqZV9pbmxpbmVfY29kZSBwbHVnaW4gUkFKRVxuICovXG5cbi8qKlxuICogXG4gKi9cbmxldCBpbmxpbmUgPSB7XG5cbiAgLyoqXG4gICAqIFxuICAgKi9cbiAgaGFuZGxlOiBmdW5jdGlvbiAodHlwZSkge1xuICAgIGxldCBzZWxlY3RlZEVsZW1lbnQgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG5cbiAgICAvLyBJZiB0aGVyZSBpc24ndCBhbnkgaW5saW5lIGNvZGVcbiAgICBpZiAoIXNlbGVjdGVkRWxlbWVudC5pcyh0eXBlKSAmJiAhc2VsZWN0ZWRFbGVtZW50LnBhcmVudHModHlwZSkubGVuZ3RoKSB7XG5cbiAgICAgIGxldCB0ZXh0ID0gWkVST19TUEFDRVxuXG4gICAgICAvLyBDaGVjayBpZiB0aGUgc2VsZWN0aW9uIHN0YXJ0cyBhbmQgZW5kcyBpbiB0aGUgc2FtZSBwYXJhZ3JhcGhcbiAgICAgIGlmICghdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmlzQ29sbGFwc2VkKCkpIHtcblxuICAgICAgICBsZXQgc3RhcnROb2RlID0gdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldFN0YXJ0KClcbiAgICAgICAgbGV0IGVuZE5vZGUgPSB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0RW5kKClcblxuICAgICAgICAvLyBOb3RpZnkgdGhlIGVycm9yIGFuZCBleGl0XG4gICAgICAgIGlmIChzdGFydE5vZGUgIT0gZW5kTm9kZSkge1xuICAgICAgICAgIG5vdGlmeShJTkxJTkVfRVJST1JTLCAnZXJyb3InLCAzMDAwKVxuICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2F2ZSB0aGUgc2VsZWN0ZWQgY29udGVudCBhcyB0ZXh0XG4gICAgICAgIHRleHQgKz0gdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldENvbnRlbnQoKVxuICAgICAgfVxuXG4gICAgICAvLyBVcGRhdGUgdGhlIGN1cnJlbnQgc2VsZWN0aW9uIHdpdGggY29kZSBlbGVtZW50XG4gICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgLy8gR2V0IHRoZSBpbmRleCBvZiB0aGUgY3VycmVudCBzZWxlY3RlZCBub2RlXG4gICAgICAgIGxldCBwcmV2aW91c05vZGVJbmRleCA9IHNlbGVjdGVkRWxlbWVudC5jb250ZW50cygpLmluZGV4KCQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldFJuZygpLnN0YXJ0Q29udGFpbmVyKSlcblxuICAgICAgICAvLyBBZGQgY29kZSBlbGVtZW50XG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZXRDb250ZW50KGA8JHt0eXBlfT4ke3RleHR9PC8ke3R5cGV9PiR7KHR5cGUgPT0gJ3EnID8gWkVST19TUEFDRSA6ICcnKX1gKVxuICAgICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcblxuICAgICAgICAvLyBNb3ZlIGNhcmV0IGF0IHRoZSBlbmQgb2YgdGhlIHN1Y2Nlc3NpdmUgbm9kZSBvZiBwcmV2aW91cyBzZWxlY3RlZCBub2RlXG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZXRDdXJzb3JMb2NhdGlvbihzZWxlY3RlZEVsZW1lbnQuY29udGVudHMoKVtwcmV2aW91c05vZGVJbmRleCArIDFdLCAxKVxuICAgICAgfSlcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIFxuICAgKi9cbiAgZXhpdDogZnVuY3Rpb24gKCkge1xuICAgIC8vIEdldCB0aGUgY3VycmVudCBub2RlIGluZGV4LCByZWxhdGl2ZSB0byBpdHMgcGFyZW50XG4gICAgbGV0IHNlbGVjdGVkRWxlbWVudCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcbiAgICBsZXQgcGFyZW50Q29udGVudCA9IHNlbGVjdGVkRWxlbWVudC5wYXJlbnQoKS5jb250ZW50cygpXG4gICAgbGV0IGluZGV4ID0gcGFyZW50Q29udGVudC5pbmRleChzZWxlY3RlZEVsZW1lbnQpXG5cbiAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgIC8vIENoZWNrIGlmIHRoZSBjdXJyZW50IG5vZGUgaGFzIGEgdGV4dCBhZnRlclxuICAgICAgaWYgKHR5cGVvZiBwYXJlbnRDb250ZW50W2luZGV4ICsgMV0gIT0gJ3VuZGVmaW5lZCcgJiYgJChwYXJlbnRDb250ZW50W2luZGV4ICsgMV0pLmlzKCd0ZXh0JykpIHtcbiAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLnNldEN1cnNvckxvY2F0aW9uKHBhcmVudENvbnRlbnRbaW5kZXggKyAxXSwgMClcbiAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLnNldENvbnRlbnQoWkVST19TUEFDRSlcbiAgICAgIH1cblxuICAgICAgLy8gSWYgdGhlIG5vZGUgaGFzbid0IHRleHQgYWZ0ZXIsIHJhamUgaGFzIHRvIGFkZCBpdFxuICAgICAgZWxzZSB7XG4gICAgICAgIHNlbGVjdGVkRWxlbWVudC5hZnRlcihaRVJPX1NQQUNFKVxuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2V0Q3Vyc29yTG9jYXRpb24ocGFyZW50Q29udGVudFtpbmRleCArIDFdLCAwKVxuICAgICAgfVxuICAgIH0pXG4gIH0sXG5cbiAgLyoqXG4gICAqIFxuICAgKi9cbiAgcmVwbGFjZVRleHQ6IGZ1bmN0aW9uIChjaGFyKSB7XG5cbiAgICBsZXQgc2VsZWN0ZWRFbGVtZW50ID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgLy8gU2V0IHRoZSBuZXcgY2hhciBhbmQgb3ZlcndyaXRlIGN1cnJlbnQgdGV4dFxuICAgICAgc2VsZWN0ZWRFbGVtZW50Lmh0bWwoY2hhcilcblxuICAgICAgLy8gTW92ZSB0aGUgY2FyZXQgYXQgdGhlIGVuZCBvZiBjdXJyZW50IHRleHRcbiAgICAgIGxldCBjb250ZW50ID0gc2VsZWN0ZWRFbGVtZW50LmNvbnRlbnRzKClcbiAgICAgIG1vdmVDYXJldChjb250ZW50W2NvbnRlbnQubGVuZ3RoIC0gMV0pXG4gICAgfSlcbiAgfVxufVxuXG4vKipcbiAqIFxuICovXG50aW55bWNlLlBsdWdpbk1hbmFnZXIuYWRkKCdyYWplX2lubGluZUNvZGUnLCBmdW5jdGlvbiAoZWRpdG9yLCB1cmwpIHtcblxuICBjb25zdCBDT0RFID0gJ2NvZGUnXG5cbiAgLy8gQWRkIGEgYnV0dG9uIHRoYXQgb3BlbnMgYSB3aW5kb3dcbiAgZWRpdG9yLmFkZEJ1dHRvbigncmFqZV9pbmxpbmVDb2RlJywge1xuICAgIHRpdGxlOiAnaW5saW5lX2NvZGUnLFxuICAgIGljb246ICdpY29uLWlubGluZS1jb2RlJyxcbiAgICB0b29sdGlwOiAnSW5saW5lIGNvZGUnLFxuICAgIGRpc2FibGVkU3RhdGVTZWxlY3RvcjogRElTQUJMRV9TRUxFQ1RPUl9JTkxJTkUsXG5cbiAgICAvLyBCdXR0b24gYmVoYXZpb3VyXG4gICAgb25jbGljazogZnVuY3Rpb24gKCkge1xuICAgICAgaW5saW5lLmhhbmRsZShDT0RFKVxuICAgIH1cbiAgfSlcblxuICBlZGl0b3Iub24oJ2tleURvd24nLCBmdW5jdGlvbiAoZSkge1xuXG5cbiAgICAvLyBDaGVjayBpZiB0aGUgc2VsZWN0ZWQgZWxlbWVudCBpcyBhIENPREUgdGhhdCBpc24ndCBpbnNpZGUgYSBGSUdVUkUgb3IgUFJFXG4gICAgbGV0IHNlbGVjdGVkRWxlbWVudCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcbiAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LmlzKCdjb2RlJykgJiYgIXNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKEZJR1VSRV9TRUxFQ1RPUikubGVuZ3RoICYmICFzZWxlY3RlZEVsZW1lbnQucGFyZW50cygncHJlJykubGVuZ3RoKSB7XG5cbiAgICAgIC8vIENoZWNrIGlmIEVOVEVSIGlzIHByZXNzZWRcbiAgICAgIGlmIChlLmtleUNvZGUgPT0gMTMpIHtcblxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKVxuICAgICAgICBpbmxpbmUuZXhpdCgpXG4gICAgICB9XG5cbiAgICAgIC8vQ2hlY2sgaWYgYSBQUklOVEFCTEUgQ0hBUiBpcyBwcmVzc2VkXG4gICAgICBpZiAoY2hlY2tJZlByaW50YWJsZUNoYXIoZS5rZXlDb2RlKSkge1xuXG4gICAgICAgIC8vIElmIHRoZSBmaXJzdCBjaGFyIGlzIFpFUk9fU1BBQ0UgYW5kIHRoZSBjb2RlIGhhcyBubyBjaGFyXG4gICAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQudGV4dCgpLmxlbmd0aCA9PSAyICYmIGAmIyR7c2VsZWN0ZWRFbGVtZW50LnRleHQoKS5jaGFyQ29kZUF0KDApfTtgID09IFpFUk9fU1BBQ0UpIHtcblxuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKClcbiAgICAgICAgICBpbmxpbmUucmVwbGFjZVRleHQoZS5rZXkpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH0pXG59KVxuXG4vKipcbiAqICBJbmxpbmUgcXVvdGUgcGx1Z2luIFJBSkVcbiAqL1xudGlueW1jZS5QbHVnaW5NYW5hZ2VyLmFkZCgncmFqZV9pbmxpbmVRdW90ZScsIGZ1bmN0aW9uIChlZGl0b3IsIHVybCkge1xuXG4gIGNvbnN0IFEgPSAncSdcblxuICAvLyBBZGQgYSBidXR0b24gdGhhdCBoYW5kbGUgdGhlIGlubGluZSBlbGVtZW50XG4gIGVkaXRvci5hZGRCdXR0b24oJ3JhamVfaW5saW5lUXVvdGUnLCB7XG4gICAgdGl0bGU6ICdpbmxpbmVfcXVvdGUnLFxuICAgIGljb246ICdpY29uLWlubGluZS1xdW90ZScsXG4gICAgdG9vbHRpcDogJ0lubGluZSBxdW90ZScsXG4gICAgZGlzYWJsZWRTdGF0ZVNlbGVjdG9yOiBESVNBQkxFX1NFTEVDVE9SX0lOTElORSxcblxuICAgIC8vIEJ1dHRvbiBiZWhhdmlvdXJcbiAgICBvbmNsaWNrOiBmdW5jdGlvbiAoKSB7XG4gICAgICBpbmxpbmUuaGFuZGxlKCdxJylcbiAgICB9XG4gIH0pXG5cbiAgZWRpdG9yLm9uKCdrZXlEb3duJywgZnVuY3Rpb24gKGUpIHtcblxuICAgIC8vIENoZWNrIGlmIHRoZSBzZWxlY3RlZCBlbGVtZW50IGlzIGEgQ09ERSB0aGF0IGlzbid0IGluc2lkZSBhIEZJR1VSRSBvciBQUkVcbiAgICBsZXQgc2VsZWN0ZWRFbGVtZW50ID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuICAgIGlmIChzZWxlY3RlZEVsZW1lbnQuaXMoJ3EnKSkge1xuXG4gICAgICAvLyBDaGVjayBpZiBFTlRFUiBpcyBwcmVzc2VkXG4gICAgICBpZiAoZS5rZXlDb2RlID09IDEzKSB7XG5cbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKClcbiAgICAgICAgaW5saW5lLmV4aXQoKVxuICAgICAgfVxuXG4gICAgICAvLyBDaGVjayBpZiBhIFBSSU5UQUJMRSBDSEFSIGlzIHByZXNzZWRcbiAgICAgIGlmIChjaGVja0lmUHJpbnRhYmxlQ2hhcihlLmtleUNvZGUpKSB7XG5cbiAgICAgICAgLy8gSWYgdGhlIGZpcnN0IGNoYXIgaXMgWkVST19TUEFDRSBhbmQgdGhlIGNvZGUgaGFzIG5vIGNoYXJcbiAgICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC50ZXh0KCkubGVuZ3RoID09IDEgJiYgYCYjJHtzZWxlY3RlZEVsZW1lbnQudGV4dCgpLmNoYXJDb2RlQXQoMCl9O2AgPT0gWkVST19TUEFDRSkge1xuXG4gICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKVxuICAgICAgICAgIGlubGluZS5yZXBsYWNlVGV4dChlLmtleSlcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfSlcbn0pXG5cbi8qKlxuICogXG4gKi9cbnRpbnltY2UuUGx1Z2luTWFuYWdlci5hZGQoJ3JhamVfZXh0ZXJuYWxMaW5rJywgZnVuY3Rpb24gKGVkaXRvciwgdXJsKSB7XG5cbiAgZWRpdG9yLmFkZEJ1dHRvbigncmFqZV9leHRlcm5hbExpbmsnLCB7XG4gICAgdGl0bGU6ICdleHRlcm5hbF9saW5rJyxcbiAgICBpY29uOiAnaWNvbi1leHRlcm5hbC1saW5rJyxcbiAgICB0b29sdGlwOiAnRXh0ZXJuYWwgbGluaycsXG4gICAgZGlzYWJsZWRTdGF0ZVNlbGVjdG9yOiBESVNBQkxFX1NFTEVDVE9SX0lOTElORSxcblxuICAgIC8vIEJ1dHRvbiBiZWhhdmlvdXJcbiAgICBvbmNsaWNrOiBmdW5jdGlvbiAoKSB7fVxuICB9KVxuXG5cbiAgbGV0IGxpbmsgPSB7XG4gICAgYWRkOiBmdW5jdGlvbiAoKSB7XG5cbiAgICB9XG4gIH1cbn0pXG5cbi8qKlxuICogXG4gKi9cbnRpbnltY2UuUGx1Z2luTWFuYWdlci5hZGQoJ3JhamVfaW5saW5lRmlndXJlJywgZnVuY3Rpb24gKGVkaXRvciwgdXJsKSB7XG4gIGVkaXRvci5hZGRCdXR0b24oJ3JhamVfaW5saW5lRmlndXJlJywge1xuICAgIHRleHQ6ICdpbmxpbmVfZmlndXJlJyxcbiAgICB0b29sdGlwOiAnSW5saW5lIHF1b3RlJyxcbiAgICBkaXNhYmxlZFN0YXRlU2VsZWN0b3I6IERJU0FCTEVfU0VMRUNUT1JfSU5MSU5FLFxuXG4gICAgLy8gQnV0dG9uIGJlaGF2aW91clxuICAgIG9uY2xpY2s6IGZ1bmN0aW9uICgpIHt9XG4gIH0pXG59KSIsInRpbnltY2UuUGx1Z2luTWFuYWdlci5hZGQoJ3JhamVfbGlzdHMnLCBmdW5jdGlvbiAoZWRpdG9yLCB1cmwpIHtcblxuICBjb25zdCBPTCA9ICdvbCdcbiAgY29uc3QgVUwgPSAndWwnXG5cbiAgZWRpdG9yLmFkZEJ1dHRvbigncmFqZV9vbCcsIHtcbiAgICB0aXRsZTogJ3JhamVfb2wnLFxuICAgIGljb246ICdpY29uLW9sJyxcbiAgICB0b29sdGlwOiAnT3JkZXJlZCBsaXN0JyxcbiAgICBkaXNhYmxlZFN0YXRlU2VsZWN0b3I6IERJU0FCTEVfU0VMRUNUT1JfRklHVVJFUyxcblxuICAgIC8vIEJ1dHRvbiBiZWhhdmlvdXJcbiAgICBvbmNsaWNrOiBmdW5jdGlvbiAoKSB7XG4gICAgICBsaXN0LmFkZChPTClcbiAgICB9XG4gIH0pXG5cbiAgZWRpdG9yLmFkZEJ1dHRvbigncmFqZV91bCcsIHtcbiAgICB0aXRsZTogJ3JhamVfdWwnLFxuICAgIGljb246ICdpY29uLXVsJyxcbiAgICB0b29sdGlwOiAnVW5vcmRlcmVkIGxpc3QnLFxuICAgIGRpc2FibGVkU3RhdGVTZWxlY3RvcjogRElTQUJMRV9TRUxFQ1RPUl9GSUdVUkVTLFxuXG4gICAgLy8gQnV0dG9uIGJlaGF2aW91clxuICAgIG9uY2xpY2s6IGZ1bmN0aW9uICgpIHtcbiAgICAgIGxpc3QuYWRkKFVMKVxuICAgIH1cbiAgfSlcblxuICAvKipcbiAgICogXG4gICAqL1xuICBlZGl0b3Iub24oJ2tleURvd24nLCBmdW5jdGlvbiAoZSkge1xuXG5cbiAgICAvLyBDaGVjayBpZiB0aGUgc2VsZWN0ZWQgZWxlbWVudCBpcyBhIFAgaW5zaWRlIGEgbGlzdCAoT0wsIFVMKVxuICAgIGxldCBzZWxlY3RlZEVsZW1lbnQgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG4gICAgaWYgKHNlbGVjdGVkRWxlbWVudC5pcygncCcpICYmIChzZWxlY3RlZEVsZW1lbnQucGFyZW50cygndWwnKS5sZW5ndGggfHwgc2VsZWN0ZWRFbGVtZW50LnBhcmVudHMoJ2xpJykubGVuZ3RoKSkge1xuXG5cbiAgICAgIC8qKlxuICAgICAgICogQ2hlY2sgaWYgQ01EK0VOVEVSIG9yIENUUkwrRU5URVIgYXJlIHByZXNzZWRcbiAgICAgICAqL1xuICAgICAgaWYgKChlLm1ldGFLZXkgfHwgZS5jdHJsS2V5KSAmJiBlLmtleUNvZGUgPT0gMTMpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgIGxpc3QuYWRkUGFyYWdyYXBoKClcbiAgICAgIH1cblxuICAgICAgLyoqXG4gICAgICAgKiBDaGVjayBpZiBTSElGVCtUQUIgaXMgcHJlc3NlZFxuICAgICAgICovXG4gICAgICBlbHNlIGlmIChlLnNoaWZ0S2V5ICYmIGUua2V5Q29kZSA9PSA5KSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgICBsaXN0LmRlTmVzdCgpXG4gICAgICB9XG5cbiAgICAgIC8qKlxuICAgICAgICogQ2hlY2sgaWYgRU5URVIgaXMgcHJlc3NlZFxuICAgICAgICovXG4gICAgICBlbHNlIGlmIChlLmtleUNvZGUgPT0gMTMpIHtcblxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcblxuICAgICAgICAvLyBDaGVjayBpZiB0aGUgc2VsZWN0aW9uIGlzIGNvbGxhcHNlZFxuICAgICAgICBpZiAodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmlzQ29sbGFwc2VkKCkpIHtcblxuICAgICAgICAgIGlmICghc2VsZWN0ZWRFbGVtZW50LnRleHQoKS50cmltKCkubGVuZ3RoKSB7XG5cbiAgICAgICAgICAgIC8vIERlIG5lc3RcbiAgICAgICAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQucGFyZW50cygndWwsb2wnKS5sZW5ndGggPiAxKVxuICAgICAgICAgICAgICBsaXN0LmRlTmVzdCgpXG5cbiAgICAgICAgICAgIC8vIFJlbW92ZSB0aGUgZW1wdHkgTElcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgbGlzdC5yZW1vdmVMaXN0SXRlbSgpXG5cbiAgICAgICAgICB9IGVsc2VcbiAgICAgICAgICAgIGxpc3QuYWRkTGlzdEl0ZW0oKVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8qKlxuICAgICAgICogQ2hlY2sgaWYgVEFCIGlzIHByZXNzZWRcbiAgICAgICAqL1xuICAgICAgZWxzZSBpZiAoZS5rZXlDb2RlID09IDkpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgIGxpc3QubmVzdCgpXG4gICAgICB9XG4gICAgfVxuICB9KVxuXG5cbiAgLyoqXG4gICAqIFxuICAgKi9cbiAgbGV0IGxpc3QgPSB7XG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBhZGQ6IGZ1bmN0aW9uICh0eXBlKSB7XG5cbiAgICAgIC8vIEdldCB0aGUgY3VycmVudCBlbGVtZW50IFxuICAgICAgbGV0IHNlbGVjdGVkRWxlbWVudCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcbiAgICAgIGxldCB0ZXh0ID0gJzxicj4nXG5cbiAgICAgIC8vIElmIHRoZSBjdXJyZW50IGVsZW1lbnQgaGFzIHRleHQsIHNhdmUgaXRcbiAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQudGV4dCgpLnRyaW0oKS5sZW5ndGggPiAwKVxuICAgICAgICB0ZXh0ID0gc2VsZWN0ZWRFbGVtZW50LnRleHQoKS50cmltKClcblxuICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIGxldCBuZXdMaXN0ID0gJChgPCR7dHlwZX0+PGxpPjxwPiR7dGV4dH08L3A+PC9saT48LyR7dHlwZX0+YClcblxuICAgICAgICAvLyBBZGQgdGhlIG5ldyBlbGVtZW50XG4gICAgICAgIHNlbGVjdGVkRWxlbWVudC5yZXBsYWNlV2l0aChuZXdMaXN0KVxuXG4gICAgICAgIC8vIFNhdmUgY2hhbmdlc1xuICAgICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcblxuICAgICAgICAvLyBNb3ZlIHRoZSBjdXJzb3JcbiAgICAgICAgbW92ZUNhcmV0KG5ld0xpc3QuZmluZCgncCcpWzBdLCBmYWxzZSlcbiAgICAgIH0pXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIGFkZExpc3RJdGVtOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgIGNvbnN0IEJSID0gJzxicj4nXG5cbiAgICAgIC8vIEdldCB0aGUgcmVmZXJlbmNlcyBvZiB0aGUgZXhpc3RpbmcgZWxlbWVudFxuICAgICAgbGV0IHAgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG4gICAgICBsZXQgbGlzdEl0ZW0gPSBwLnBhcmVudCgnbGknKVxuXG4gICAgICAvLyBQbGFjZWhvbGRlciB0ZXh0IG9mIHRoZSBuZXcgbGlcbiAgICAgIGxldCBuZXdUZXh0ID0gQlJcbiAgICAgIGxldCBub2RlcyA9IHAuY29udGVudHMoKVxuXG4gICAgICAvLyBJZiB0aGVyZSBpcyBqdXN0IG9uZSBub2RlIHdyYXBwZWQgaW5zaWRlIHRoZSBwYXJhZ3JhcGhcbiAgICAgIGlmIChub2Rlcy5sZW5ndGggPT0gMSkge1xuXG4gICAgICAgIC8vIEdldCB0aGUgc3RhcnQgb2Zmc2V0IGFuZCB0ZXh0IG9mIHRoZSBjdXJyZW50IGxpXG4gICAgICAgIGxldCBzdGFydE9mZnNldCA9IHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRSbmcoKS5zdGFydE9mZnNldFxuICAgICAgICBsZXQgcFRleHQgPSBwLnRleHQoKVxuXG4gICAgICAgIC8vIElmIHRoZSBjdXJzb3IgaXNuJ3QgYXQgdGhlIGVuZFxuICAgICAgICBpZiAoc3RhcnRPZmZzZXQgIT0gcFRleHQubGVuZ3RoKSB7XG5cbiAgICAgICAgICAvLyBHZXQgdGhlIHJlbWFpbmluZyB0ZXh0XG4gICAgICAgICAgbmV3VGV4dCA9IHBUZXh0LnN1YnN0cmluZyhzdGFydE9mZnNldCwgcFRleHQubGVuZ3RoKVxuICAgICAgICB9XG5cbiAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgLy8gVXBkYXRlIHRoZSB0ZXh0IG9mIHRoZSBjdXJyZW50IGxpXG4gICAgICAgICAgcC50ZXh0KHBUZXh0LnN1YnN0cmluZygwLCBzdGFydE9mZnNldCkpXG5cbiAgICAgICAgICBpZiAoIXAudGV4dCgpLmxlbmd0aClcbiAgICAgICAgICAgIHAuaHRtbChCUilcblxuICAgICAgICAgIC8vIENyZWF0ZSBhbmQgYWRkIHRoZSBuZXcgbGlcbiAgICAgICAgICBsZXQgbmV3TGlzdEl0ZW0gPSAkKGA8bGk+PHA+JHtuZXdUZXh0fTwvcD48L2xpPmApXG4gICAgICAgICAgbGlzdEl0ZW0uYWZ0ZXIobmV3TGlzdEl0ZW0pXG5cbiAgICAgICAgICAvLyBNb3ZlIHRoZSBjYXJldCB0byB0aGUgbmV3IGxpXG4gICAgICAgICAgbW92ZUNhcmV0KG5ld0xpc3RJdGVtWzBdLCB0cnVlKVxuXG4gICAgICAgICAgLy8gVXBkYXRlIHRoZSBjb250ZW50XG4gICAgICAgICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG4gICAgICAgIH0pXG4gICAgICB9XG5cbiAgICAgIC8vIEluc3RlYWQgaWYgdGhlcmUgYXJlIG11bHRpcGxlIG5vZGVzIGluc2lkZSB0aGUgcGFyYWdyYXBoXG4gICAgICBlbHNlIHtcblxuICAgICAgICAvLyBJc3RhbnRpYXRlIHRoZSByYW5nZSB0byBiZSBzZWxlY3RlZFxuICAgICAgICBsZXQgcmFuZ2UgPSBkb2N1bWVudC5jcmVhdGVSYW5nZSgpXG5cbiAgICAgICAgLy8gU3RhcnQgdGhlIHJhbmdlIGZyb20gdGhlIHNlbGVjdGVkIG5vZGUgYW5kIG9mZnNldCBhbmQgZW5kcyBpdCBhdCB0aGUgZW5kIG9mIHRoZSBsYXN0IG5vZGVcbiAgICAgICAgcmFuZ2Uuc2V0U3RhcnQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldFJuZygpLnN0YXJ0Q29udGFpbmVyLCB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Um5nKCkuc3RhcnRPZmZzZXQpXG4gICAgICAgIHJhbmdlLnNldEVuZCh0aGlzLmdldExhc3ROb3RFbXB0eU5vZGUobm9kZXMpLCAxKVxuXG4gICAgICAgIC8vIFNlbGVjdCB0aGUgcmFuZ2VcbiAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLnNldFJuZyhyYW5nZSlcblxuICAgICAgICAvLyBTYXZlIHRoZSBodG1sIGNvbnRlbnRcbiAgICAgICAgbmV3VGV4dCA9IHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRDb250ZW50KClcblxuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICBwLmh0bWwocC5odG1sKCkucmVwbGFjZShuZXdUZXh0LCAnJykpXG5cbiAgICAgICAgICBpZiAoIXAudGV4dCgpLmxlbmd0aClcbiAgICAgICAgICAgIHAuaHRtbChCUilcblxuICAgICAgICAgIC8vIENyZWF0ZSBhbmQgYWRkIHRoZSBuZXcgbGlcbiAgICAgICAgICBsZXQgbmV3TGlzdEl0ZW0gPSAkKGA8bGk+PHA+JHtuZXdUZXh0fTwvcD48L2xpPmApXG4gICAgICAgICAgbGlzdEl0ZW0uYWZ0ZXIobmV3TGlzdEl0ZW0pXG5cbiAgICAgICAgICAvLyBNb3ZlIHRoZSBjYXJldCB0byB0aGUgbmV3IGxpXG4gICAgICAgICAgbW92ZUNhcmV0KG5ld0xpc3RJdGVtWzBdLCB0cnVlKVxuXG4gICAgICAgICAgLy8gVXBkYXRlIHRoZSBjb250ZW50XG4gICAgICAgICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIGdldExhc3ROb3RFbXB0eU5vZGU6IGZ1bmN0aW9uIChub2Rlcykge1xuXG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG5vZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChub2Rlc1tpXS5ub2RlVHlwZSA9PSAzICYmICFub2Rlc1tpXS5sZW5ndGgpXG4gICAgICAgICAgbm9kZXMuc3BsaWNlKGksIDEpXG4gICAgICB9XG5cbiAgICAgIHJldHVybiBub2Rlc1tub2Rlcy5sZW5ndGggLSAxXVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICByZW1vdmVMaXN0SXRlbTogZnVuY3Rpb24gKCkge1xuXG4gICAgICAvLyBHZXQgdGhlIHNlbGVjdGVkIGxpc3RJdGVtXG4gICAgICBsZXQgbGlzdEl0ZW0gPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpLnBhcmVudCgnbGknKVxuXG4gICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgLy8gQWRkIGEgZW1wdHkgcGFyYWdyYXBoIGFmdGVyIHRoZSBsaXN0XG4gICAgICAgIGxldCBuZXdQID0gJCgnPHA+PGJyPjwvcD4nKVxuICAgICAgICBsaXN0SXRlbS5wYXJlbnQoKS5hZnRlcihuZXdQKVxuXG4gICAgICAgIC8vIENoZWNrIGlmIHRoZSBsaXN0IGhhcyBleGFjdGx5IG9uZSBjaGlsZCByZW1vdmUgdGhlIGxpc3RcbiAgICAgICAgaWYgKGxpc3RJdGVtLnBhcmVudCgpLmNoaWxkcmVuKCdsaScpLmxlbmd0aCA9PSAxKSB7XG4gICAgICAgICAgbGV0IGxpc3QgPSBsaXN0SXRlbS5wYXJlbnQoKVxuICAgICAgICAgIGxpc3QucmVtb3ZlKClcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIElmIHRoZSBsaXN0IGhhcyBtb3JlIGNoaWxkcmVuIHJlbW92ZSB0aGUgc2VsZWN0ZWQgY2hpbGRcbiAgICAgICAgZWxzZVxuICAgICAgICAgIGxpc3RJdGVtLnJlbW92ZSgpXG5cbiAgICAgICAgbW92ZUNhcmV0KG5ld1BbMF0pXG5cbiAgICAgICAgLy8gVXBkYXRlIHRoZSBjb250ZW50XG4gICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuICAgICAgfSlcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgbmVzdDogZnVuY3Rpb24gKCkge1xuXG4gICAgICBsZXQgcCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcbiAgICAgIGxldCBsaXN0SXRlbSA9IHAucGFyZW50KCdsaScpXG5cbiAgICAgIC8vIENoZWNrIGlmIHRoZSBjdXJyZW50IGxpIGhhcyBhdCBsZWFzdCBvbmUgcHJldmlvdXMgZWxlbWVudFxuICAgICAgaWYgKGxpc3RJdGVtLnByZXZBbGwoKS5sZW5ndGggPiAwKSB7XG5cbiAgICAgICAgLy8gQ3JlYXRlIHRoZSBuZXcgbGlzdFxuICAgICAgICBsZXQgdGV4dCA9ICc8YnI+J1xuXG4gICAgICAgIGlmIChwLnRleHQoKS50cmltKCkubGVuZ3RoKVxuICAgICAgICAgIHRleHQgPSBwLnRleHQoKS50cmltKClcblxuICAgICAgICAvLyBHZXQgdHlwZSBvZiB0aGUgcGFyZW50IGxpc3RcbiAgICAgICAgbGV0IHR5cGUgPSBsaXN0SXRlbS5wYXJlbnQoKVswXS50YWdOYW1lLnRvTG93ZXJDYXNlKClcblxuICAgICAgICAvLyBDcmVhdGUgdGhlIG5ldyBuZXN0ZWQgbGlzdFxuICAgICAgICBsZXQgbmV3TGlzdEl0ZW0gPSAkKGxpc3RJdGVtWzBdLm91dGVySFRNTClcblxuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICAvLyBJZiB0aGUgcHJldmlvdXMgZWxlbWVudCBoYXMgYSBsaXN0XG4gICAgICAgICAgaWYgKGxpc3RJdGVtLnByZXYoKS5maW5kKCd1bCxvbCcpLmxlbmd0aClcbiAgICAgICAgICAgIGxpc3RJdGVtLnByZXYoKS5maW5kKCd1bCxvbCcpLmFwcGVuZChuZXdMaXN0SXRlbSlcblxuICAgICAgICAgIC8vIEFkZCB0aGUgbmV3IGxpc3QgaW5zaWRlIHRoZSBwcmV2aW91cyBsaVxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgbmV3TGlzdEl0ZW0gPSAkKGA8JHt0eXBlfT4ke25ld0xpc3RJdGVtWzBdLm91dGVySFRNTH08LyR7dHlwZX0+YClcbiAgICAgICAgICAgIGxpc3RJdGVtLnByZXYoKS5hcHBlbmQobmV3TGlzdEl0ZW0pXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgbGlzdEl0ZW0ucmVtb3ZlKClcblxuICAgICAgICAgIC8vIE1vdmUgdGhlIGNhcmV0IGF0IHRoZSBlbmQgb2YgdGhlIG5ldyBwIFxuICAgICAgICAgIG1vdmVDYXJldChuZXdMaXN0SXRlbS5maW5kKCdwJylbMF0pXG5cbiAgICAgICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgZGVOZXN0OiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgIGxldCBsaXN0SXRlbSA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSkucGFyZW50KCdsaScpXG4gICAgICBsZXQgbGlzdCA9IGxpc3RJdGVtLnBhcmVudCgpXG5cbiAgICAgIC8vIENoZWNrIGlmIHRoZSBjdXJyZW50IGxpc3QgaGFzIGF0IGxlYXN0IGFub3RoZXIgbGlzdCBhcyBwYXJlbnRcbiAgICAgIGlmIChsaXN0SXRlbS5wYXJlbnRzKCd1bCxvbCcpLmxlbmd0aCA+IDEpIHtcblxuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICAvLyBHZXQgYWxsIGxpOiBjdXJyZW50IGFuZCBpZiB0aGVyZSBhcmUgc3VjY2Vzc2l2ZVxuICAgICAgICAgIGxldCBuZXh0TGkgPSBbbGlzdEl0ZW1dXG4gICAgICAgICAgaWYgKGxpc3RJdGVtLm5leHRBbGwoKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBsaXN0SXRlbS5uZXh0QWxsKCkuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgIG5leHRMaS5wdXNoKCQodGhpcykpXG4gICAgICAgICAgICB9KVxuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIE1vdmUgYWxsIGxpIG91dCBmcm9tIHRoZSBuZXN0ZWQgbGlzdFxuICAgICAgICAgIGZvciAobGV0IGkgPSBuZXh0TGkubGVuZ3RoIC0gMTsgaSA+IC0xOyBpLS0pIHtcbiAgICAgICAgICAgIG5leHRMaVtpXS5yZW1vdmUoKVxuICAgICAgICAgICAgbGlzdC5wYXJlbnQoKS5hZnRlcihuZXh0TGlbaV0pXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gSWYgZW1wdHkgcmVtb3ZlIHRoZSBsaXN0XG4gICAgICAgICAgaWYgKCFsaXN0LmNoaWxkcmVuKCdsaScpLmxlbmd0aClcbiAgICAgICAgICAgIGxpc3QucmVtb3ZlKClcblxuICAgICAgICAgIC8vIE1vdmUgdGhlIGNhcmV0IGF0IHRoZSBlbmRcbiAgICAgICAgICBtb3ZlQ2FyZXQobGlzdEl0ZW0uZmluZCgncCcpWzBdKVxuICAgICAgICB9KVxuICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBhZGRQYXJhZ3JhcGg6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgLy8gR2V0IHJlZmVyZW5jZXMgb2YgY3VycmVudCBwXG4gICAgICBsZXQgcCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcbiAgICAgIGxldCBzdGFydE9mZnNldCA9IHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRSbmcoKS5zdGFydE9mZnNldFxuICAgICAgbGV0IHBUZXh0ID0gcC50ZXh0KCkudHJpbSgpXG5cbiAgICAgIGxldCB0ZXh0ID0gJzxicj4nXG5cbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAvLyBJZiB0aGUgRU5URVIgYnJlYWtzIHBcbiAgICAgICAgaWYgKHN0YXJ0T2Zmc2V0ICE9IHBUZXh0Lmxlbmd0aCkge1xuXG4gICAgICAgICAgLy8gVXBkYXRlIHRoZSB0ZXh0IG9mIHRoZSBjdXJyZW50IGxpXG4gICAgICAgICAgcC50ZXh0KHBUZXh0LnN1YnN0cmluZygwLCBzdGFydE9mZnNldCkpXG5cbiAgICAgICAgICAvLyBHZXQgdGhlIHJlbWFpbmluZyB0ZXh0XG4gICAgICAgICAgdGV4dCA9IHBUZXh0LnN1YnN0cmluZyhzdGFydE9mZnNldCwgcFRleHQubGVuZ3RoKVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ3JlYXRlIGFuZCBhZGQgdGhlIGVsZW1lbnRcbiAgICAgICAgbGV0IG5ld1AgPSAkKGA8cD4ke3RleHR9PC9wPmApXG4gICAgICAgIHAuYWZ0ZXIobmV3UClcblxuICAgICAgICBtb3ZlQ2FyZXQobmV3UFswXSwgdHJ1ZSlcbiAgICAgIH0pXG4gICAgfVxuICB9XG59KSIsIi8qKlxuICogXG4gKi9cblxuZnVuY3Rpb24gb3Blbk1ldGFkYXRhRGlhbG9nKCkge1xuICB0aW55bWNlLmFjdGl2ZUVkaXRvci53aW5kb3dNYW5hZ2VyLm9wZW4oe1xuICAgIHRpdGxlOiAnRWRpdCBtZXRhZGF0YScsXG4gICAgdXJsOiAnanMvcmFqZS1jb3JlL3BsdWdpbi9yYWplX21ldGFkYXRhLmh0bWwnLFxuICAgIHdpZHRoOiA5NTAsXG4gICAgaGVpZ2h0OiA4MDAsXG4gICAgb25DbG9zZTogZnVuY3Rpb24gKCkge1xuXG4gICAgICBpZiAodGlueW1jZS5hY3RpdmVFZGl0b3IudXBkYXRlZF9tZXRhZGF0YSAhPSBudWxsKSB7XG5cbiAgICAgICAgbWV0YWRhdGEudXBkYXRlKHRpbnltY2UuYWN0aXZlRWRpdG9yLnVwZGF0ZWRfbWV0YWRhdGEpXG5cbiAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudXBkYXRlZF9tZXRhZGF0YSA9PSBudWxsXG4gICAgICB9XG5cbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLndpbmRvd01hbmFnZXIuY2xvc2UoKVxuICAgIH1cbiAgfSwgbWV0YWRhdGEuZ2V0QWxsTWV0YWRhdGEoKSlcbn1cblxudGlueW1jZS5QbHVnaW5NYW5hZ2VyLmFkZCgncmFqZV9tZXRhZGF0YScsIGZ1bmN0aW9uIChlZGl0b3IsIHVybCkge1xuXG4gIC8vIEFkZCBhIGJ1dHRvbiB0aGF0IGhhbmRsZSB0aGUgaW5saW5lIGVsZW1lbnRcbiAgZWRpdG9yLmFkZEJ1dHRvbigncmFqZV9tZXRhZGF0YScsIHtcbiAgICB0ZXh0OiAnTWV0YWRhdGEnLFxuICAgIGljb246IGZhbHNlLFxuICAgIHRvb2x0aXA6ICdFZGl0IG1ldGFkYXRhJyxcblxuICAgIC8vIEJ1dHRvbiBiZWhhdmlvdXJcbiAgICBvbmNsaWNrOiBmdW5jdGlvbiAoKSB7XG4gICAgICBvcGVuTWV0YWRhdGFEaWFsb2coKVxuICAgIH1cbiAgfSlcblxuICBlZGl0b3Iub24oJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcbiAgICBpZiAoJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKS5pcyhIRUFERVJfU0VMRUNUT1IpKVxuICAgICAgb3Blbk1ldGFkYXRhRGlhbG9nKClcbiAgfSlcblxuICBtZXRhZGF0YSA9IHtcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIGdldEFsbE1ldGFkYXRhOiBmdW5jdGlvbiAoKSB7XG4gICAgICBsZXQgaGVhZGVyID0gJChIRUFERVJfU0VMRUNUT1IpXG4gICAgICBsZXQgc3VidGl0bGUgPSBoZWFkZXIuZmluZCgnaDEudGl0bGUgPiBzbWFsbCcpLnRleHQoKVxuICAgICAgbGV0IGRhdGEgPSB7XG4gICAgICAgIHN1YnRpdGxlOiBzdWJ0aXRsZSxcbiAgICAgICAgdGl0bGU6IGhlYWRlci5maW5kKCdoMS50aXRsZScpLnRleHQoKS5yZXBsYWNlKHN1YnRpdGxlLCAnJyksXG4gICAgICAgIGF1dGhvcnM6IG1ldGFkYXRhLmdldEF1dGhvcnMoaGVhZGVyKSxcbiAgICAgICAgY2F0ZWdvcmllczogbWV0YWRhdGEuZ2V0Q2F0ZWdvcmllcyhoZWFkZXIpLFxuICAgICAgICBrZXl3b3JkczogbWV0YWRhdGEuZ2V0S2V5d29yZHMoaGVhZGVyKVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gZGF0YVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBnZXRBdXRob3JzOiBmdW5jdGlvbiAoaGVhZGVyKSB7XG4gICAgICBsZXQgYXV0aG9ycyA9IFtdXG5cbiAgICAgIGhlYWRlci5maW5kKCdhZGRyZXNzLmxlYWQuYXV0aG9ycycpLmVhY2goZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIC8vIEdldCBhbGwgYWZmaWxpYXRpb25zXG4gICAgICAgIGxldCBhZmZpbGlhdGlvbnMgPSBbXVxuICAgICAgICAkKHRoaXMpLmZpbmQoJ3NwYW4nKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBhZmZpbGlhdGlvbnMucHVzaCgkKHRoaXMpLnRleHQoKSlcbiAgICAgICAgfSlcblxuICAgICAgICAvLyBwdXNoIHNpbmdsZSBhdXRob3JcbiAgICAgICAgYXV0aG9ycy5wdXNoKHtcbiAgICAgICAgICBuYW1lOiAkKHRoaXMpLmNoaWxkcmVuKCdzdHJvbmcuYXV0aG9yX25hbWUnKS50ZXh0KCksXG4gICAgICAgICAgZW1haWw6ICQodGhpcykuZmluZCgnY29kZS5lbWFpbCA+IGEnKS50ZXh0KCksXG4gICAgICAgICAgYWZmaWxpYXRpb25zOiBhZmZpbGlhdGlvbnNcbiAgICAgICAgfSlcbiAgICAgIH0pXG5cbiAgICAgIHJldHVybiBhdXRob3JzXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIGdldENhdGVnb3JpZXM6IGZ1bmN0aW9uIChoZWFkZXIpIHtcbiAgICAgIGxldCBjYXRlZ29yaWVzID0gW11cblxuICAgICAgaGVhZGVyLmZpbmQoJ3AuYWNtX3N1YmplY3RfY2F0ZWdvcmllcyA+IGNvZGUnKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY2F0ZWdvcmllcy5wdXNoKCQodGhpcykudGV4dCgpKVxuICAgICAgfSlcblxuICAgICAgcmV0dXJuIGNhdGVnb3JpZXNcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgZ2V0S2V5d29yZHM6IGZ1bmN0aW9uIChoZWFkZXIpIHtcbiAgICAgIGxldCBrZXl3b3JkcyA9IFtdXG5cbiAgICAgIGhlYWRlci5maW5kKCd1bC5saXN0LWlubGluZSA+IGxpID4gY29kZScpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICBrZXl3b3Jkcy5wdXNoKCQodGhpcykudGV4dCgpKVxuICAgICAgfSlcblxuICAgICAgcmV0dXJuIGtleXdvcmRzXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIHVwZGF0ZTogZnVuY3Rpb24gKHVwZGF0ZWRNZXRhZGF0YSkge1xuXG4gICAgICAkKCdoZWFkIG1ldGFbcHJvcGVydHldLCBoZWFkIGxpbmtbcHJvcGVydHldLCBoZWFkIG1ldGFbbmFtZV0nKS5yZW1vdmUoKVxuXG4gICAgICBsZXQgY3VycmVudE1ldGFkYXRhID0gbWV0YWRhdGEuZ2V0QWxsTWV0YWRhdGEoKVxuXG4gICAgICAvLyBVcGRhdGUgdGl0bGUgYW5kIHN1YnRpdGxlXG4gICAgICBpZiAodXBkYXRlZE1ldGFkYXRhLnRpdGxlICE9IGN1cnJlbnRNZXRhZGF0YS50aXRsZSB8fCB1cGRhdGVkTWV0YWRhdGEuc3VidGl0bGUgIT0gY3VycmVudE1ldGFkYXRhLnN1YnRpdGxlKSB7XG4gICAgICAgIGxldCB0ZXh0ID0gdXBkYXRlZE1ldGFkYXRhLnRpdGxlXG5cbiAgICAgICAgaWYgKHVwZGF0ZWRNZXRhZGF0YS5zdWJ0aXRsZS50cmltKCkubGVuZ3RoKVxuICAgICAgICAgIHRleHQgKz0gYCAtLSAke3VwZGF0ZWRNZXRhZGF0YS5zdWJ0aXRsZX1gXG5cbiAgICAgICAgJCgndGl0bGUnKS50ZXh0KHRleHQpXG4gICAgICB9XG5cbiAgICAgIGxldCBhZmZpbGlhdGlvbnNDYWNoZSA9IFtdXG5cbiAgICAgIHVwZGF0ZWRNZXRhZGF0YS5hdXRob3JzLmZvckVhY2goZnVuY3Rpb24gKGF1dGhvcikge1xuXG4gICAgICAgICQoJ2hlYWQnKS5hcHBlbmQoYDxtZXRhIGFib3V0PVwibWFpbHRvOiR7YXV0aG9yLmVtYWlsfVwiIHR5cGVvZj1cInNjaGVtYTpQZXJzb25cIiBwcm9wZXJ0eT1cInNjaGVtYTpuYW1lXCIgbmFtZT1cImRjLmNyZWF0b3JcIiBjb250ZW50PVwiJHthdXRob3IubmFtZX1cIj5gKVxuICAgICAgICAkKCdoZWFkJykuYXBwZW5kKGA8bWV0YSBhYm91dD1cIm1haWx0bzoke2F1dGhvci5lbWFpbH1cIiBwcm9wZXJ0eT1cInNjaGVtYTplbWFpbFwiIGNvbnRlbnQ9XCIke2F1dGhvci5lbWFpbH1cIj5gKVxuXG4gICAgICAgIGF1dGhvci5hZmZpbGlhdGlvbnMuZm9yRWFjaChmdW5jdGlvbiAoYWZmaWxpYXRpb24pIHtcblxuICAgICAgICAgIC8vIExvb2sgdXAgZm9yIGFscmVhZHkgZXhpc3RpbmcgYWZmaWxpYXRpb25cbiAgICAgICAgICBsZXQgdG9BZGQgPSB0cnVlXG4gICAgICAgICAgbGV0IGlkXG5cbiAgICAgICAgICBhZmZpbGlhdGlvbnNDYWNoZS5mb3JFYWNoKGZ1bmN0aW9uIChhZmZpbGlhdGlvbkNhY2hlKSB7XG4gICAgICAgICAgICBpZiAoYWZmaWxpYXRpb25DYWNoZS5jb250ZW50ID09IGFmZmlsaWF0aW9uKSB7XG4gICAgICAgICAgICAgIHRvQWRkID0gZmFsc2VcbiAgICAgICAgICAgICAgaWQgPSBhZmZpbGlhdGlvbkNhY2hlLmlkXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSlcblxuICAgICAgICAgIC8vIElmIHRoZXJlIGlzIG5vIGV4aXN0aW5nIGFmZmlsaWF0aW9uLCBhZGQgaXRcbiAgICAgICAgICBpZiAodG9BZGQpIHtcbiAgICAgICAgICAgIGxldCBnZW5lcmF0ZWRJZCA9IGAjYWZmaWxpYXRpb25fJHthZmZpbGlhdGlvbnNDYWNoZS5sZW5ndGgrMX1gXG4gICAgICAgICAgICBhZmZpbGlhdGlvbnNDYWNoZS5wdXNoKHtcbiAgICAgICAgICAgICAgaWQ6IGdlbmVyYXRlZElkLFxuICAgICAgICAgICAgICBjb250ZW50OiBhZmZpbGlhdGlvblxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIGlkID0gZ2VuZXJhdGVkSWRcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAkKCdoZWFkJykuYXBwZW5kKGA8bGluayBhYm91dD1cIm1haWx0bzoke2F1dGhvci5lbWFpbH1cIiBwcm9wZXJ0eT1cInNjaGVtYTphZmZpbGlhdGlvblwiIGhyZWY9XCIke2lkfVwiPmApXG4gICAgICAgIH0pXG4gICAgICB9KVxuXG4gICAgICBhZmZpbGlhdGlvbnNDYWNoZS5mb3JFYWNoKGZ1bmN0aW9uIChhZmZpbGlhdGlvbkNhY2hlKSB7XG4gICAgICAgICQoJ2hlYWQnKS5hcHBlbmQoYDxtZXRhIGFib3V0PVwiJHthZmZpbGlhdGlvbkNhY2hlLmlkfVwiIHR5cGVvZj1cInNjaGVtYTpPcmdhbml6YXRpb25cIiBwcm9wZXJ0eT1cInNjaGVtYTpuYW1lXCIgY29udGVudD1cIiR7YWZmaWxpYXRpb25DYWNoZS5jb250ZW50fVwiPmApXG4gICAgICB9KVxuXG4gICAgICB1cGRhdGVkTWV0YWRhdGEuY2F0ZWdvcmllcy5mb3JFYWNoKGZ1bmN0aW9uKGNhdGVnb3J5KXtcbiAgICAgICAgJCgnaGVhZCcpLmFwcGVuZChgPG1ldGEgbmFtZT1cImRjdGVybXMuc3ViamVjdFwiIGNvbnRlbnQ9XCIke2NhdGVnb3J5fVwiLz5gKVxuICAgICAgfSlcblxuICAgICAgdXBkYXRlZE1ldGFkYXRhLmtleXdvcmRzLmZvckVhY2goZnVuY3Rpb24oa2V5d29yZCl7XG4gICAgICAgICQoJ2hlYWQnKS5hcHBlbmQoYDxtZXRhIHByb3BlcnR5PVwicHJpc206a2V5d29yZFwiIGNvbnRlbnQ9XCIke2tleXdvcmR9XCIvPmApXG4gICAgICB9KVxuXG4gICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci4kKCdib2R5JykuYWRkSGVhZGVySFRNTCgpXG4gICAgICBzZXROb25FZGl0YWJsZUhlYWRlcigpXG5cbiAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuICAgIH1cbiAgfVxuXG59KSIsInRpbnltY2UuUGx1Z2luTWFuYWdlci5hZGQoJ3JhamVfc2F2ZScsIGZ1bmN0aW9uIChlZGl0b3IsIHVybCkge1xuXG4gIHNhdmVNYW5hZ2VyID0ge1xuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgaW5pdFNhdmU6IGZ1bmN0aW9uICgpIHtcbiAgICAgIC8vIFJldHVybiB0aGUgbWVzc2FnZSBmb3IgdGhlIGJhY2tlbmRcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHRpdGxlOiBzYXZlTWFuYWdlci5nZXRUaXRsZSgpLFxuICAgICAgICBkb2N1bWVudDogc2F2ZU1hbmFnZXIuZ2V0RGVyYXNoZWRBcnRpY2xlKClcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgc2F2ZUFzOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgIC8vIFNlbmQgbWVzc2FnZSB0byB0aGUgYmFja2VuZFxuICAgICAgc2F2ZUFzQXJ0aWNsZShzYXZlTWFuYWdlci5pbml0U2F2ZSgpKVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBzYXZlOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgIC8vIFNlbmQgbWVzc2FnZSB0byB0aGUgYmFja2VuZFxuICAgICAgc2F2ZUFydGljbGUoc2F2ZU1hbmFnZXIuaW5pdFNhdmUoKSlcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0dXJuIHRoZSBSQVNIIGFydGljbGUgcmVuZGVyZWQgKHdpdGhvdXQgdGlueW1jZSlcbiAgICAgKi9cbiAgICBnZXREZXJhc2hlZEFydGljbGU6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG5cbiAgICAgIC8vIFNhdmUgaHRtbCByZWZlcmVuY2VzXG4gICAgICBsZXQgYXJ0aWNsZSA9ICQoJ2h0bWwnKS5jbG9uZSgpXG4gICAgICBsZXQgdGlueW1jZVNhdmVkQ29udGVudCA9IGFydGljbGUuZmluZCgnI3JhamVfcm9vdCcpXG5cbiAgICAgIGFydGljbGUucmVtb3ZlQXR0cignY2xhc3MnKVxuXG4gICAgICAvL3JlcGxhY2UgYm9keSB3aXRoIHRoZSByaWdodCBvbmUgKHRoaXMgYWN0aW9uIHJlbW92ZSB0aW55bWNlKVxuICAgICAgYXJ0aWNsZS5maW5kKCdib2R5JykuaHRtbCh0aW55bWNlU2F2ZWRDb250ZW50Lmh0bWwoKSlcbiAgICAgIGFydGljbGUuZmluZCgnYm9keScpLnJlbW92ZUF0dHIoJ3N0eWxlJylcbiAgICAgIGFydGljbGUuZmluZCgnYm9keScpLnJlbW92ZUF0dHIoJ2NsYXNzJylcblxuICAgICAgLy9yZW1vdmUgYWxsIHN0eWxlIGFuZCBsaW5rIHVuLW5lZWRlZCBmcm9tIHRoZSBoZWFkXG4gICAgICBhcnRpY2xlLmZpbmQoJ2hlYWQnKS5jaGlsZHJlbignc3R5bGVbdHlwZT1cInRleHQvY3NzXCJdJykucmVtb3ZlKClcbiAgICAgIGFydGljbGUuZmluZCgnaGVhZCcpLmNoaWxkcmVuKCdsaW5rW2lkXScpLnJlbW92ZSgpXG5cbiAgICAgIC8vIElmIHRoZSBwbHVnaW4gcmFqZV9hbm5vdGF0aW9ucyBpcyBhZGRlZCB0byB0aW55bWNlIFxuICAgICAgaWYgKHR5cGVvZiB0aW55bWNlLmFjdGl2ZUVkaXRvci5wbHVnaW5zLnJhamVfYW5ub3RhdGlvbnMgIT0gdW5kZWZpbmVkKVxuICAgICAgICBhcnRpY2xlID0gdXBkYXRlQW5ub3RhdGlvbnNPblNhdmUoYXJ0aWNsZSlcblxuICAgICAgLy8gRXhlY3V0ZSBkZXJhc2ggKHJlcGxhY2UgYWxsIGNnZW4gZWxlbWVudHMgd2l0aCBpdHMgb3JpZ2luYWwgY29udGVudClcbiAgICAgIGFydGljbGUuZmluZCgnKltkYXRhLXJhc2gtb3JpZ2luYWwtY29udGVudF0nKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbGV0IG9yaWdpbmFsQ29udGVudCA9ICQodGhpcykuYXR0cignZGF0YS1yYXNoLW9yaWdpbmFsLWNvbnRlbnQnKVxuICAgICAgICAkKHRoaXMpLnJlcGxhY2VXaXRoKG9yaWdpbmFsQ29udGVudClcbiAgICAgIH0pXG5cbiAgICAgIGFydGljbGUuZmluZCgnKltkYXRhLXJhc2gtb3JpZ2luYWwtcGFyZW50LWNvbnRlbnRdJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIGxldCBvcmlnaW5hbENvbnRlbnQgPSAkKHRoaXMpLmF0dHIoJ2RhdGEtcmFzaC1vcmlnaW5hbC1wYXJlbnQtY29udGVudCcpXG4gICAgICAgICQodGhpcykucGFyZW50KCkucmVwbGFjZVdpdGgob3JpZ2luYWxDb250ZW50KVxuICAgICAgfSlcblxuICAgICAgLy8gRXhlY3V0ZSBkZXJhc2ggY2hhbmdpbmcgdGhlIHdyYXBwZXJcbiAgICAgIGFydGljbGUuZmluZCgnKltkYXRhLXJhc2gtb3JpZ2luYWwtd3JhcHBlcl0nKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbGV0IGNvbnRlbnQgPSAkKHRoaXMpLmh0bWwoKVxuICAgICAgICBsZXQgd3JhcHBlciA9ICQodGhpcykuYXR0cignZGF0YS1yYXNoLW9yaWdpbmFsLXdyYXBwZXInKVxuICAgICAgICAkKHRoaXMpLnJlcGxhY2VXaXRoKGA8JHt3cmFwcGVyfT4ke2NvbnRlbnR9PC8ke3dyYXBwZXJ9PmApXG4gICAgICB9KVxuXG4gICAgICAvLyBSZW1vdmUgdGFyZ2V0IGZyb20gVGlueU1DRSBsaW5rXG4gICAgICBhcnRpY2xlLmZpbmQoJ2FbdGFyZ2V0XScpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICAkKHRoaXMpLnJlbW92ZUF0dHIoJ3RhcmdldCcpXG4gICAgICB9KVxuXG4gICAgICAvLyBSZW1vdmUgY29udGVudGVkaXRhYmxlIGZyb20gVGlueU1DRSBsaW5rXG4gICAgICBhcnRpY2xlLmZpbmQoJ2FbY29udGVudGVkaXRhYmxlXScpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICAkKHRoaXMpLnJlbW92ZUF0dHIoJ2NvbnRlbnRlZGl0YWJsZScpXG4gICAgICB9KVxuXG4gICAgICAvLyBSZW1vdmUgbm90IGFsbG93ZWQgc3BhbiBlbG1lbnRzIGluc2lkZSB0aGUgZm9ybXVsYSwgaW5saW5lX2Zvcm11bGFcbiAgICAgIGFydGljbGUuZmluZChgJHtGSUdVUkVfRk9STVVMQV9TRUxFQ1RPUn0sJHtJTkxJTkVfRk9STVVMQV9TRUxFQ1RPUn1gKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgJCh0aGlzKS5jaGlsZHJlbigncCcpLmh0bWwoJCh0aGlzKS5maW5kKCdzcGFuW2NvbnRlbnRlZGl0YWJsZV0nKS5odG1sKCkpXG4gICAgICB9KVxuXG4gICAgICBhcnRpY2xlLmZpbmQoYCR7RklHVVJFX0ZPUk1VTEFfU0VMRUNUT1J9LCR7SU5MSU5FX0ZPUk1VTEFfU0VMRUNUT1J9YCkuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIGxldCBzdmcgPSAkKHRoaXMpLmZpbmQoJ3N2Z1tkYXRhLW1hdGhtbF0nKVxuICAgICAgICBpZiAoc3ZnLmxlbmd0aCkge1xuXG4gICAgICAgICAgJCh0aGlzKS5hdHRyKERBVEFfTUFUSF9PUklHSU5BTF9JTlBVVCwgc3ZnLmF0dHIoREFUQV9NQVRIX09SSUdJTkFMX0lOUFVUKSlcbiAgICAgICAgICAkKHRoaXMpLmNoaWxkcmVuKCdwJykuaHRtbChzdmcuYXR0cignZGF0YS1tYXRobWwnKSlcbiAgICAgICAgfVxuICAgICAgfSlcblxuICAgICAgLy8gUmVwbGFjZSB0Ym9keSB3aXRoIGl0cyBjb250ZW50ICNcbiAgICAgIGFydGljbGUuZmluZCgndGJvZHknKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgJCh0aGlzKS5yZXBsYWNlV2l0aCgkKHRoaXMpLmh0bWwoKSlcbiAgICAgIH0pXG5cbiAgICAgIHJldHVybiBgPCFET0NUWVBFIGh0bWw+JHtuZXcgWE1MU2VyaWFsaXplcigpLnNlcmlhbGl6ZVRvU3RyaW5nKGFydGljbGVbMF0pfWBcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0dXJuIHRoZSB0aXRsZSBcbiAgICAgKi9cbiAgICBnZXRUaXRsZTogZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuICQoJ3RpdGxlJykudGV4dCgpXG4gICAgfSxcblxuICB9XG59KSIsImNvbnN0IG5vdF9hbm5vdGFibGVfZWxlbWVudHMgPSBgJHtOT05fRURJVEFCTEVfSEVBREVSX1NFTEVDVE9SfSwke1NJREVCQVJfQU5OT1RBVElPTn0sJHtJTkxJTkVfRk9STVVMQV9TRUxFQ1RPUn1gXG5jb25zdCBhbm5vdGF0b3JQb3B1cFNlbGVjdG9yID0gJyNhbm5vdGF0b3JQb3B1cCdcbmNvbnN0IGFubm90YXRvckZvcm1Qb3B1cFNlbGVjdG9yID0gJyNhbm5vdGF0b3JGb3JtUG9wdXAnXG5jb25zdCBhbm5vdGF0aW9uV3JhcHBlciA9ICdzcGFuW2RhdGEtcmFzaC1hbm5vdGF0aW9uLXR5cGVdJ1xuXG5jb25zdCBjb21tZW50aW5nID0gJ2NvbW1lbnRpbmcnXG5cbnRpbnltY2UuUGx1Z2luTWFuYWdlci5hZGQoJ3JhamVfYW5ub3RhdGlvbnMnLCBmdW5jdGlvbiAoZWRpdG9yKSB7XG5cblxuICBlZGl0b3Iub24oJ2NsaWNrJywgZSA9PiB7XG5cbiAgICBsZXQgY2xpY2tlZEVsZW1lbnQgPSAkKGUuc3JjRWxlbWVudClcblxuICAgIC8vIENsb3NlIGFubm90YXRvckZvcm1Qb3B1cCBpZiB0aGUgdXNlciBjbGljayBzb21ld2hlcmUgZWxzZVxuICAgIGlmICgkKGFubm90YXRvckZvcm1Qb3B1cFNlbGVjdG9yKS5pcygnOnZpc2libGUnKSAmJiAoIWNsaWNrZWRFbGVtZW50LmlzKGFubm90YXRvckZvcm1Qb3B1cFNlbGVjdG9yKSB8fCAhY2xpY2tlZEVsZW1lbnQucGFyZW50cyhhbm5vdGF0b3JGb3JtUG9wdXBTZWxlY3RvcikubGVuZ3RoKSlcbiAgICAgIGhpZGVBbm5vdGF0aW9uRm9ybVBvcHVwKClcbiAgfSlcblxuICBlZGl0b3Iub24oJ01vdXNlVXAnLCBlID0+IHtcblxuICAgIGhpZGVBbm5vdGF0aW9uUG9wdXAoKVxuXG4gICAgLy8gSWYgdGhlIHNlbGVjdGlvbiBpcyBub3QgY29sbGFwc2VkIGFuZCB0aGUgZWxlbWVudCBzZWxlY3RlZCBpcyBhbiBcImFubm90YWJsZSBlbGVtZW50XCJcbiAgICBpZiAoIXRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5pc0NvbGxhcHNlZCgpICYmICEkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpLmlzKG5vdF9hbm5vdGFibGVfZWxlbWVudHMpKVxuICAgICAgaGFuZGxlQW5ub3RhdGlvbihlKVxuICB9KVxuXG4gIGVkaXRvci5vbignaW5pdCcsICgpID0+IHtcblxuICAgIC8vIFRoaXMgaXMgbmVlZGVkIGJlY2F1c2UgdGlueW1jZSBjaGFuZ2VzIFwiYXBwbGljYXRpb25cIiBpbiBcIm1jZS1hcHBsaWNhdGlvblwiXG4gICAgZWRpdG9yLiQoJ3NjcmlwdFt0eXBlPVwibWNlLWFwcGxpY2F0aW9uL2xkK2pzb25cIl0nKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICQodGhpcykuYXR0cigndHlwZScsICdhcHBsaWNhdGlvbi9sZCtqc29uJylcbiAgICB9KVxuXG4gICAgQW5ub3RhdGlvbkNvbnRleHQucmVuZGVyKClcblxuICAgIGVkaXRvci4kKHRvZ2dsZV9hbm5vdGF0aW9uX3NlbGVjdG9yKS5vbignY2xpY2snLCBmdW5jdGlvbiAoKSB7XG4gICAgICBBbm5vdGF0aW9uQ29udGV4dC50b2dnbGVBbm5vdGF0aW9uKClcbiAgICB9KVxuXG4gICAgZWRpdG9yLiQodG9nZ2xlX3NpZGViYXJfc2VsZWN0b3IpLm9uKCdjbGljaycsIGZ1bmN0aW9uICgpIHtcbiAgICAgIEFubm90YXRpb25Db250ZXh0LnRvZ2dsZUFubm90YXRpb25Ub29sYmFyKClcbiAgICB9KVxuICB9KVxuXG4gIGVkaXRvci5vbigna2V5RG93bicsIGZ1bmN0aW9uIChlKSB7XG5cbiAgICBsZXQgZm9jdXNFbGVtZW50ID0gZWRpdG9yLiQoZWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG5cbiAgICBpZiAoZm9jdXNFbGVtZW50LmlzKCdzcGFuW2RhdGEtcmFzaC1hbm5vdGF0aW9uLXR5cGU9XCJ3cmFwXCJdJykpIHtcblxuICAgICAgaWYgKGUua2V5Q29kZSA9PSAxMykge1xuXG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgICBpbmxpbmUuZXhpdCgpXG4gICAgICB9XG4gICAgfVxuICB9KVxuXG4gIGVkaXRvci5vbignRXhlY0NvbW1hbmQnLCBmdW5jdGlvbiAoZSkge1xuXG4gICAgaWYgKGUuY29tbWFuZCA9PSBVTkRPX0NNRCB8fCBlLmNvbW1hbmQgPT0gUkVET19DTUQpIHtcblxuICAgICAgZWRpdG9yLiQodG9nZ2xlX2Fubm90YXRpb25fc2VsZWN0b3IpLm9uKCdjbGljaycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgQW5ub3RhdGlvbkNvbnRleHQudG9nZ2xlQW5ub3RhdGlvbigpXG4gICAgICB9KVxuXG4gICAgICBlZGl0b3IuJCh0b2dnbGVfc2lkZWJhcl9zZWxlY3Rvcikub24oJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBBbm5vdGF0aW9uQ29udGV4dC50b2dnbGVBbm5vdGF0aW9uVG9vbGJhcigpXG4gICAgICB9KVxuXG4gICAgICBBTk5PVEFUSU9OUy5mb3JFYWNoKGFubm90YXRpb24gPT4gYW5ub3RhdGlvbi5zZXRFdmVudHMoKSlcbiAgICB9XG4gIH0pXG59KVxuXG4vKipcbiAqIFxuICovXG5oYW5kbGVBbm5vdGF0aW9uID0gZSA9PiB7XG5cbiAgLy8gU2hvdyB0aGUgcG9wdXBcbiAgc2hvd0Fubm90YXRpb25Qb3B1cChlLmNsaWVudFgsIGUuY2xpZW50WSlcbn1cblxuLyoqXG4gKiBcbiAqL1xuY3JlYXRlQW5ub3RhdGlvbkNvbW1lbnRpbmcgPSB0ZXh0ID0+IHtcblxuICBjb25zdCBjcmVhdG9yID0gaXBjUmVuZGVyZXIuc2VuZFN5bmMoJ2dldFNldHRpbmdzJykudXNlcm5hbWVcblxuICBjb25zdCBzZWxlY3Rpb24gPSB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb25cblxuICBjb25zdCByYW5nZSA9IHNlbGVjdGlvbi5nZXRSbmcoKVxuXG4gIGNvbnN0IHJhbmdlU3RhcnRPZmZzZXQgPSByYW5nZS5zdGFydE9mZnNldFxuICBjb25zdCByYW5nZUVuZE9mZnNldCA9IHJhbmdlLmVuZE9mZnNldFxuXG4gIGNvbnN0IG5leHRJZCA9IEFubm90YXRpb25Db250ZXh0LmdldE5leHRBbm5vdGF0aW9uSWQoKVxuXG4gIGNvbnN0IHN0YXJ0Q3NzU2VsZWN0b3IgPSBBbm5vdGF0aW9uQ29udGV4dC5nZXRDc3NTZWxlY3RvcigkKHNlbGVjdGlvbi5nZXRTdGFydCgpKSlcbiAgY29uc3Qgc3RhcnRPZmZzZXQgPSBBbm5vdGF0aW9uQ29udGV4dC5nZXRPZmZzZXQocmFuZ2Uuc3RhcnRDb250YWluZXIsIHJhbmdlU3RhcnRPZmZzZXQsIHN0YXJ0Q3NzU2VsZWN0b3IpXG5cbiAgY29uc3QgZW5kQ3NzU2VsZWN0b3IgPSBBbm5vdGF0aW9uQ29udGV4dC5nZXRDc3NTZWxlY3RvcigkKHNlbGVjdGlvbi5nZXRFbmQoKSkpXG4gIGNvbnN0IGVuZE9mZnNldCA9IEFubm90YXRpb25Db250ZXh0LmdldE9mZnNldChyYW5nZS5lbmRDb250YWluZXIsIHJhbmdlRW5kT2Zmc2V0LCBlbmRDc3NTZWxlY3RvcilcblxuICBjb25zdCBkYXRhID0ge1xuICAgIFwiaWRcIjogbmV4dElkLFxuICAgIFwiQGNvbnRlbnh0XCI6IFwiaHR0cDovL3d3dy53My5vcmcvbnMvYW5uby5qc29ubGRcIixcbiAgICBcImNyZWF0ZWRcIjogRGF0ZS5ub3coKSArICgtKG5ldyBEYXRlKCkuZ2V0VGltZXpvbmVPZmZzZXQoKSAqIDYwMDAwKSksXG4gICAgXCJib2R5VmFsdWVcIjogdGV4dCxcbiAgICBcImNyZWF0b3JcIjogY3JlYXRvcixcbiAgICBcIk1vdGl2YXRpb25cIjogY29tbWVudGluZyxcbiAgICBcInRhcmdldFwiOiB7XG4gICAgICBcInNlbGVjdG9yXCI6IHtcbiAgICAgICAgXCJzdGFydFNlbGVjdG9yXCI6IHtcbiAgICAgICAgICBcIkB0eXBlXCI6IFwiQ3NzU2VsZWN0b3JcIixcbiAgICAgICAgICBcIkB2YWx1ZVwiOiBzdGFydENzc1NlbGVjdG9yXG4gICAgICAgIH0sXG4gICAgICAgIFwiZW5kU2VsZWN0b3JcIjoge1xuICAgICAgICAgIFwiQHR5cGVcIjogXCJDc3NTZWxlY3RvclwiLFxuICAgICAgICAgIFwiQHZhbHVlXCI6IGVuZENzc1NlbGVjdG9yXG4gICAgICAgIH0sXG4gICAgICAgIFwic3RhcnRcIjoge1xuICAgICAgICAgIFwiQHR5cGVcIjogXCJEYXRhUG9zaXRpb25TZWxlY3RvclwiLFxuICAgICAgICAgIFwiQHZhbHVlXCI6IHN0YXJ0T2Zmc2V0XG4gICAgICAgIH0sXG4gICAgICAgIFwiZW5kXCI6IHtcbiAgICAgICAgICBcIkB0eXBlXCI6IFwiRGF0YVBvc2l0aW9uU2VsZWN0b3JcIixcbiAgICAgICAgICBcIkB2YWx1ZVwiOiBlbmRPZmZzZXRcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLiQoJ2JvZHknKS5hcHBlbmQoYDxzY3JpcHQgaWQ9XCIke25leHRJZH1cIiB0eXBlPVwiYXBwbGljYXRpb24vbGQranNvblwiPiR7SlNPTi5zdHJpbmdpZnkoZGF0YSwgbnVsbCwgMikgfTwvc2NyaXB0PmApXG4gICAgQW5ub3RhdGlvbkNvbnRleHQuY2xlYXJBbm5vdGF0aW9ucygpXG4gICAgQW5ub3RhdGlvbkNvbnRleHQucmVuZGVyKClcbiAgfSlcbn1cblxuLyoqXG4gKiBcbiAqL1xuY3JlYXRlQW5ub3RhdGlvblJlcGx5aW5nID0gKHRleHQsIHRhcmdldElkKSA9PiB7XG5cbiAgY29uc3QgY3JlYXRvciA9IGlwY1JlbmRlcmVyLnNlbmRTeW5jKCdnZXRTZXR0aW5ncycpLnVzZXJuYW1lXG4gIGNvbnN0IG5leHRJZCA9IEFubm90YXRpb25Db250ZXh0LmdldE5leHRBbm5vdGF0aW9uSWQoKVxuXG4gIGNvbnN0IGRhdGEgPSB7XG4gICAgXCJpZFwiOiBuZXh0SWQsXG4gICAgXCJAY29udGVueHRcIjogXCJodHRwOi8vd3d3LnczLm9yZy9ucy9hbm5vLmpzb25sZFwiLFxuICAgIFwiY3JlYXRlZFwiOiBEYXRlLm5vdygpICsgKC0obmV3IERhdGUoKS5nZXRUaW1lem9uZU9mZnNldCgpICogNjAwMDApKSxcbiAgICBcImJvZHlWYWx1ZVwiOiB0ZXh0LFxuICAgIFwiY3JlYXRvclwiOiBjcmVhdG9yLFxuICAgIFwiTW90aXZhdGlvblwiOiByZXBseWluZyxcbiAgICBcInRhcmdldFwiOiB0YXJnZXRJZFxuICB9XG5cbiAgLy8gQWRkIHRoZSBuZXcgYW5ub3RhdGlvbiB3aXRob3V0IGNsZWFyaW5nIGV2ZXJ5dGhpbmdcbiAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgdGlueW1jZS5hY3RpdmVFZGl0b3IuJCgnYm9keScpLmFwcGVuZChgPHNjcmlwdCBpZD1cIiR7bmV4dElkfVwiIHR5cGU9XCJhcHBsaWNhdGlvbi9sZCtqc29uXCI+JHtKU09OLnN0cmluZ2lmeShkYXRhLCBudWxsLCAyKSB9PC9zY3JpcHQ+YClcbiAgICBBbm5vdGF0aW9uQ29udGV4dC5yZW5kZXJTaW5nbGUobmV4dElkLCBkYXRhKVxuICB9KVxufVxuXG4vKipcbiAqIFxuICovXG5zaG93QW5ub3RhdGlvblBvcHVwID0gKHgsIHkpID0+IHtcblxuICBsZXQgYW5ub3RhdG9yUG9wdXAgPSAkKGBcbiAgICA8ZGl2IGlkPSdhbm5vdGF0b3JQb3B1cCc+XG4gICAgICA8ZGl2IGNsYXNzPVwiYW5ub3RhdG9yUG9wdXBfYXJyb3dcIj48L2Rpdj5cbiAgICAgIDxzcGFuIGNsYXNzPVwiZ2x5cGhpY29uIGdseXBoaWNvbi1wZW5jaWxcIiBhcmlhLWhpZGRlbj1cInRydWVcIj48L3NwYW4+XG4gICAgPC9kaXY+YClcblxuICBhbm5vdGF0b3JQb3B1cC5jc3Moe1xuICAgIHRvcDogeSAtIDIwLFxuICAgIGxlZnQ6IHggLSAxOC41XG4gIH0pXG5cbiAgYW5ub3RhdG9yUG9wdXAub24oJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xuICAgIHNob3dBbm5vdGF0aW9uRm9ybVBvcHVwKClcbiAgfSlcblxuICBhbm5vdGF0b3JQb3B1cC5hcHBlbmRUbygnYm9keScpXG59XG5cbi8qKlxuICogXG4gKi9cbnNob3dBbm5vdGF0aW9uRm9ybVBvcHVwID0gKCkgPT4ge1xuXG4gIGxldCBhbm5vdGF0b3JGb3JtUG9wdXAgPSAkKGBcbiAgICA8ZGl2IGlkPVwiYW5ub3RhdG9yRm9ybVBvcHVwXCI+XG4gICAgICA8dGV4dGFyZWEgY2xhc3M9XCJmb3JtLWNvbnRyb2xcIiByb3dzPVwiM1wiPjwvdGV4dGFyZWE+XG4gICAgICA8ZGl2IGNsYXNzPVwiYW5ub3RhdG9yRm9ybVBvcHVwX2Zvb3RlclwiPlxuICAgICAgICA8YSBpZD1cImFubm90YXRvckZvcm1Qb3B1cF9zYXZlXCIgY2xhc3M9XCJidG4gYnRuLXN1Y2Nlc3MgYnRuLXhzXCI+QW5ub3RhdGU8L2E+XG4gICAgICA8L2Rpdj5cbiAgICA8L2Rpdj5cbiAgYClcblxuICBhbm5vdGF0b3JGb3JtUG9wdXAuYXBwZW5kVG8oJ2JvZHknKVxuXG4gIGFubm90YXRvckZvcm1Qb3B1cC5jc3Moe1xuICAgIHRvcDogJChhbm5vdGF0b3JQb3B1cFNlbGVjdG9yKS5vZmZzZXQoKS50b3AgLSBhbm5vdGF0b3JGb3JtUG9wdXAuaGVpZ2h0KCkgLyAyIC0gMjAsXG4gICAgbGVmdDogJChhbm5vdGF0b3JQb3B1cFNlbGVjdG9yKS5vZmZzZXQoKS5sZWZ0XG4gIH0pXG5cbiAgJChgJHthbm5vdGF0b3JGb3JtUG9wdXBTZWxlY3Rvcn0gYS5idG4tc3VjY2Vzc2ApLm9uKCdjbGljaycsIGZ1bmN0aW9uICgpIHtcblxuICAgIGNyZWF0ZUFubm90YXRpb25Db21tZW50aW5nKCQoYCR7YW5ub3RhdG9yRm9ybVBvcHVwU2VsZWN0b3J9PnRleHRhcmVhYCkudmFsKCksIGNvbW1lbnRpbmcpXG4gICAgaGlkZUFubm90YXRpb25Gb3JtUG9wdXAoKVxuICB9KVxuXG4gIC8vIEhpZGUgdGhlIGxhc3QgYW5ub3RhdGlvbiBwb3B1cFxuICBoaWRlQW5ub3RhdGlvblBvcHVwKClcblxuICAkKGAke2Fubm90YXRvckZvcm1Qb3B1cFNlbGVjdG9yfT50ZXh0YXJlYWApLmZvY3VzKClcblxufVxuXG4vKipcbiAqIFxuICovXG5oaWRlQW5ub3RhdGlvbkZvcm1Qb3B1cCA9ICgpID0+IHtcbiAgJChhbm5vdGF0b3JGb3JtUG9wdXBTZWxlY3RvcikucmVtb3ZlKClcbn1cblxuLyoqXG4gKiBcbiAqL1xuaGlkZUFubm90YXRpb25Qb3B1cCA9ICgpID0+IHtcbiAgJChhbm5vdGF0b3JQb3B1cFNlbGVjdG9yKS5yZW1vdmUoKVxufVxuXG4vKipcbiAqIFxuICovXG51cGRhdGVBbm5vdGF0aW9uc09uU2F2ZSA9IGFydGljbGUgPT4ge1xuXG4gIC8qKlxuICAgKiBcbiAgICogQHBhcmFtIHtKUXVlcnkgb2JqZWN0fSBub2RlIFxuICAgKiBAcGFyYW0ge0ludGVnZXJ9IG9mZnNldCBvcHRpb25hbCwgaXQncyBuZWVkZWQgZm9yIHRoZSBlbmRpbmcgb2Zmc2V0XG4gICAqL1xuICBjb25zdCBnZXRPZmZzZXQgPSAobm9kZSwgb2Zmc2V0ID0gMCkgPT4ge1xuXG4gICAgbm9kZSA9IG5vZGVbMF0ucHJldmlvdXNTaWJsaW5nXG5cbiAgICB3aGlsZSAobm9kZSAhPSBudWxsKSB7XG5cbiAgICAgIGlmIChub2RlLm5vZGVUeXBlID09IDMpXG4gICAgICAgIG9mZnNldCArPSBub2RlLmxlbmd0aFxuICAgICAgZWxzZVxuICAgICAgICBvZmZzZXQgKz0gbm9kZS5pbm5lclRleHQubGVuZ3RoXG5cbiAgICAgIG5vZGUgPSBub2RlLnByZXZpb3VzU2libGluZ1xuICAgIH1cblxuICAgIHJldHVybiBvZmZzZXRcbiAgfVxuXG4gIC8vIEdldCBhbGwgYW5ub3RhdGlvbiBzY3JpcHRzXG4gIGFydGljbGUuZmluZCgnc2NyaXB0W3R5cGU9XCJhcHBsaWNhdGlvbi9sZCtqc29uXCJdJykuZWFjaChmdW5jdGlvbiAoKSB7XG5cbiAgICAvL1RPRE8gdXBkYXRlIGFsc28gdGhlIE1hcCgpXG4gICAgbGV0IGpzb24gPSBKU09OLnBhcnNlKCQodGhpcykuaHRtbCgpKVxuXG4gICAgaWYgKGpzb24uTW90aXZhdGlvbiA9PSBjb21tZW50aW5nKSB7XG5cbiAgICAgIC8vIEdldCBhbm5vdGF0aW9uXG4gICAgICBsZXQgYW5ub3RhdGlvbiA9IEFOTk9UQVRJT05TLmdldChqc29uLmlkKVxuXG4gICAgICAvLyBHZXQgdGhlIGxpc3Qgb2YgaGlnaGxpZ2h0ZWQgYW5ub3RhdGlvbnNcbiAgICAgIGNvbnN0IGZpcnN0ID0gdGlueW1jZS5hY3RpdmVFZGl0b3IuJChhbm5vdGF0aW9uLm5vdGVfc2VsZWN0b3IpLmZpcnN0KClcbiAgICAgIGNvbnN0IGxhc3QgPSB0aW55bWNlLmFjdGl2ZUVkaXRvci4kKGFubm90YXRpb24ubm90ZV9zZWxlY3RvcikubGFzdCgpXG5cbiAgICAgIC8vIFVwZGF0ZSBib3RoIHN0YXJ0IGFuZCBlbmQgb2Zmc2V0cywgdGhlIGVuZGluZyBvZmZzZXQgaGFzIGFsc28gdGhlIGN1cnJudCBsZW5ndGhcbiAgICAgIGpzb24udGFyZ2V0LnNlbGVjdG9yLnN0YXJ0WydAdmFsdWUnXSA9IGdldE9mZnNldChmaXJzdClcbiAgICAgIGpzb24udGFyZ2V0LnNlbGVjdG9yLmVuZFsnQHZhbHVlJ10gPSBnZXRPZmZzZXQobGFzdCwgbGFzdC50ZXh0KCkubGVuZ3RoKVxuXG4gICAgICAvLyBVcGRhdGUgYm90aCBzdGFydCBhbmQgZW5kIHNlbGVjdG9ycyB3aXRoIHRoZSByaWdodCB4cGF0aFxuICAgICAganNvbi50YXJnZXQuc2VsZWN0b3Iuc3RhcnRTZWxlY3RvclsnQHZhbHVlJ10gPSBBbm5vdGF0aW9uQ29udGV4dC5nZXRDc3NTZWxlY3RvcihmaXJzdClcbiAgICAgIGpzb24udGFyZ2V0LnNlbGVjdG9yLmVuZFNlbGVjdG9yWydAdmFsdWUnXSA9IEFubm90YXRpb25Db250ZXh0LmdldENzc1NlbGVjdG9yKGxhc3QpXG5cbiAgICAgICQodGhpcykuaHRtbChKU09OLnN0cmluZ2lmeShqc29uLCBudWxsLCAyKSlcbiAgICB9XG4gIH0pXG5cbiAgLy8gQ2hhbmdlIGRhdGEtcmFzaC1vcmlnaW5hbFstcGFyZW50XS1jb250ZW50XG4gIGNvbnN0IGNvbnRlbnQgPSAnZGF0YS1yYXNoLW9yaWdpbmFsLWNvbnRlbnQnXG4gIGNvbnN0IHBhcmVudCA9ICdkYXRhLXJhc2gtb3JpZ2luYWwtcGFyZW50LWNvbnRlbnQnXG4gIGxldCBhdHRyaWJ1dGVcblxuICBhcnRpY2xlLmZpbmQoYW5ub3RhdGlvbldyYXBwZXIpLmVhY2goZnVuY3Rpb24gKCkge1xuXG4gICAgaWYgKCQodGhpcykuYXR0cihjb250ZW50KSlcbiAgICAgIGF0dHJpYnV0ZSA9IGNvbnRlbnRcblxuICAgIGlmICgkKHRoaXMpLmF0dHIocGFyZW50KSlcbiAgICAgIGF0dHJpYnV0ZSA9IHBhcmVudFxuXG4gICAgJCh0aGlzKS5hdHRyKGF0dHJpYnV0ZSwgJCh0aGlzKS5odG1sKCkpXG4gIH0pXG5cbiAgcmV0dXJuIGFydGljbGVcbn0iXX0=

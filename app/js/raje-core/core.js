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

          // 
          setNonEditableHeader()

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
  function notify(text, type = 'info', timeout = 3000) {

    if (tinymce.activeEditor.notificationManager.getNotifications().length)
      top.tinymce.activeEditor.notificationManager.close()

    tinymce.activeEditor.notificationManager.open({
      text: text,
      type: type,
      timeout: timeout
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

    tinymce.activeEditor.$(HEADER_SELECTOR).addClass('mceNonEditable')
    tinymce.activeEditor.$(SIDEBAR_ANNOTATION).addClass('mceNonEditable')

    tinymce.activeEditor.$(HEADER_SELECTOR).attr('contenteditable', false)
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

const annotation_wrapper_selector = 'span[data-rash-annotation-type]'
const semantic_annotation_selector = 'script[type="application/ld+json"]'
const mce_semantic_annotation_selector = 'script[type="mce-application/ld+json"]'


//#endregion

const NON_EDITABLE_HEADER_SELECTOR = 'header.page-header.container.cgen'
const BIBLIOENTRY_SUFFIX = 'biblioentry_'
const ENDNOTE_SUFFIX = 'endnote_'


const ABSTRACT_SELECTOR = 'section[role=doc-abstract]'
const ACKNOWLEDGEMENTS_SELECTOR = 'section[role=doc-acknowledgements]'



const MENU_SELECTOR = 'div[id^=mceu_][id$=-body][role=menu]'

const DATA_UPGRADE = 'data-upgrade'
const DATA_DOWNGRADE = 'data-downgrade'

// Inline Errors
const INLINE_ERRORS = 'Error, Inline elements can be ONLY created inside the same paragraph'

// Annotation selected image error
const ANNOTATION_ERROR_IMAGE_SELECTED = 'Ehm, do you really want to annotate figures? :('



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

  editor.on('click', function () {
    if ($(tinymce.activeEditor.selection.getNode()).is(HEADER_SELECTOR))
      openMetadataDialog()
  })

  metadata = {

    /**
     * 
     */
    getAllMetadata: function () {

      // Get header from iframe only the first one
      let header = tinymce.activeEditor.$(HEADER_SELECTOR).first()

      // Get all metadata
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

      // Remove all meta and links corresponding to metadata in head
      $('head meta[property], head link[property], head meta[name]').remove()

      // Get all current metadata
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

      metadata.addHeaderHTML()
      setNonEditableHeader()

      tinymce.triggerSave()
    },

    /**
     * 
     */
    addHeaderHTML: function () {

      /* Reset header */
      tinymce.activeEditor.$('header').remove()
      tinymce.activeEditor.$('p.keywords').remove()
  
      /* Header title */
      var header = tinymce.activeEditor.$('<header class="page-header container cgen" data-rash-original-content=""></header>')
      tinymce.activeEditor.$(SIDEBAR_ANNOTATION).after(header)

      var title_string = ''
      var title_split = $('head title').html().split(" -- ")
      if (title_split.length == 1) {
        title_string = title_split[0]
      } else {
        title_string = `${title_split[0]}<br /><small>${title_split[1]}</small>`
      }
  
      header.append(`<h1 class="title">${title_string}</h1>`)
      /* /END Header title */
  
      /* Header author */
      var list_of_authors = []
      $('head meta[name="dc.creator"]').each(function () {
        var current_value = $(this).attr('name')
        var current_id = $(this).attr('about')
        var current_name = $(this).attr('content')
        var current_email = $(`head meta[about='${current_id}'][property='schema:email']`).attr('content')
        var current_affiliations = []
        $(`head link[about='${current_id}'][property='schema:affiliation']`).each(function () {
          var cur_affiliation_id = $(this).attr('href')
          current_affiliations.push($(`head meta[about='${cur_affiliation_id}'][property='schema:name']`).attr('content'))
        })
  
        list_of_authors.push({
          "name": current_name,
          "email": current_email,
          "affiliation": current_affiliations
        })
      })
  
      for (var i = 0; i < list_of_authors.length; i++) {
        var author = list_of_authors[i]
        var author_element = $(`<address class="lead authors"></address>`)
        if (author['name'] != null) {
          var name_element_string = `<strong class="author_name">${author.name}</strong> `
          if (author['email'] != null) {
            name_element_string += `<code class="email"><a href="mailto:${author.email}">${author.email}</a></code>`
          }
          author_element.append(name_element_string)
        }
  
        for (var j = 0; j < author.affiliation.length; j++) {
          author_element.append(`<br /><span class="affiliation\">${author.affiliation[j].replace(/\s+/g, " ").replace(/, ?/g, ", ").trim()}</span>`)
        }
        if (i == 0) {
          author_element.insertAfter(tinymce.activeEditor.$("header h1"))
        } else {
          author_element.insertAfter(tinymce.activeEditor.$("header address:last-of-type"))
        }
      }
      /* /END Header author */
  
      /* ACM subjects */
      var categories = $("meta[name='dcterms.subject']")
      if (categories.length > 0) {
        var list_of_categories = $(`<p class="acm_subject_categories"><strong>ACM Subject Categories</strong></p>`)
        categories.each(function () {
          list_of_categories.append(`<br /><code>${$(this).attr("content").split(",").join(", ")}</code>`)
        })
        list_of_categories.appendTo(header)
      }
      /* /END ACM subjects */
  
      /* Keywords */
      var keywords = $('meta[property="prism:keyword"]')
      if (keywords.length > 0) {
        var list_of_keywords = $('<ul class="list-inline"></ul>')
        keywords.each(function () {
          list_of_keywords.append(`<li><code>${$(this).attr("content")}</code></li>`)
        })
        $('<p class="keywords"><strong>Keywords</strong></p>').append(list_of_keywords).appendTo(header)
      }
      /* /END Keywords */
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
    editor.$(mce_semantic_annotation_selector).each(function () {
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

    // Update sidebar height
    if (editor.$(SIDEBAR_ANNOTATION)[0].clientHeight < editor.$('html')[0].offsetHeight)
      editor.$(SIDEBAR_ANNOTATION).css('height', editor.$('html')[0].offsetHeight)

    // Hide annotation popup
    hideAnnotationPopup()

    /**
     * Fires if BACKSPACE or CANC are pressed
     */
    if (e.keyCode == 8 || e.keyCode == 46) {

      if (editor.selection.getContent().indexOf('data-rash-annotation-type') != -1) {

        //TODO use a function
        editor.execCommand(DELETE_CMD)
        e.preventDefault()

        ANNOTATIONS.forEach(annotation => {

          // Remove the script of the annotation
          if (editor.$(annotation.note_selector).length == 0)
            editor.undoManager.transact(function () {
              editor.$(`${semantic_annotation_selector}[id=${annotation.id}]`).remove()
              annotation.remove()
              ANNOTATIONS.delete(annotation.id)
            })
        })
      }
    }

    if (focusElement.is(annotation_wrapper_selector)) {

      /**
       * Fires if BACKSPACE or CANC are pressed
       */
      if (e.keyCode == 13) {

        e.preventDefault()
        inline.exit()
      }

      //TODO check when the entire selection is removed
      /**
       * Fires if BACKSPACE or CANC are pressed
       */
      if (e.keyCode == 8 || e.keyCode == 46) {

        //TODO use a function
        editor.execCommand(DELETE_CMD)
        e.preventDefault()

        ANNOTATIONS.forEach(annotation => {

          // Remove the script of the annotation
          if (editor.$(annotation.note_selector).length == 0)
            editor.undoManager.transact(function () {
              editor.$(`${semantic_annotation_selector}[id=${annotation.id}]`).remove()
              annotation.remove()
              ANNOTATIONS.delete(annotation.id)
            })
        })
      }
    }
  })

  editor.on('keyPress', function () {

    hideAnnotationPopup()
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

  if (tinymce.activeEditor.selection.getContent().indexOf('img') > 0 || tinymce.activeEditor.selection.getContent().indexOf('figure') > 0)
    global.selectionError = ANNOTATION_ERROR_IMAGE_SELECTED

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

  if (global.selectionError) {
    global.selectionError = null
    tinymce.activeEditor.selection.collapse()
    tinymce.activeEditor.focus()
    hideAnnotationPopup()
    return notify(ANNOTATION_ERROR_IMAGE_SELECTED, 'error', 5000)
  }


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

  article.find(annotation_wrapper_selector).each(function () {

    if ($(this).attr(content))
      attribute = content

    if ($(this).attr(parent))
      attribute = parent

    $(this).attr(attribute, $(this).html())
  })

  return article
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluaXQuanMiLCIwX3JhamVfY29uc3RhbnRzLmpzIiwiMV9yYWplX3NlY3Rpb24uanMiLCIyX3JhamVfY3Jvc3NyZWYuanMiLCIzX3JhamVfZmlndXJlcy5qcyIsIjRfcmFqZV9pbmxpbmVzLmpzIiwiNV9yYWplX2xpc3RzLmpzIiwiNl9yYWplX21ldGFkYXRhLmpzIiwiN19yYWplX3NhdmUuanMiLCI4X3JhamVfYW5ub3RhdGlvbnMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNsckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM5RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzU5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM3WEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzluQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3JPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNoWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3hSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3JIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJjb3JlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBcbiAqIEluaXRpbGl6ZSBUaW55TUNFIGVkaXRvciB3aXRoIGFsbCByZXF1aXJlZCBvcHRpb25zXG4gKi9cblxuLy8gSW52aXNpYmxlIHNwYWNlIGNvbnN0YW50c1xuY29uc3QgWkVST19TUEFDRSA9ICcmIzgyMDM7J1xuY29uc3QgUkFKRV9TRUxFQ1RPUiA9ICdib2R5I3RpbnltY2UnXG5cbi8vIFNlbGVjdG9yIGNvbnN0YW50cyAodG8gbW92ZSBpbnNpZGUgYSBuZXcgY29uc3QgZmlsZSlcbmNvbnN0IEhFQURFUl9TRUxFQ1RPUiA9ICdoZWFkZXIucGFnZS1oZWFkZXIuY29udGFpbmVyLmNnZW4nXG5jb25zdCBGSVJTVF9IRUFESU5HID0gYCR7UkFKRV9TRUxFQ1RPUn0+c2VjdGlvbjpmaXJzdD5oMTpmaXJzdGBcblxuY29uc3QgREFUQV9NQVRIX09SSUdJTkFMX0lOUFVUID0gJ2RhdGEtbWF0aC1vcmlnaW5hbC1pbnB1dCdcbmNvbnN0IFRJTllNQ0VfVE9PTEJBUl9IRUlHVEggPSA3NlxuXG5sZXQgaXBjUmVuZGVyZXIsIHdlYkZyYW1lXG5cbmlmIChoYXNCYWNrZW5kKSB7XG5cbiAgaXBjUmVuZGVyZXIgPSByZXF1aXJlKCdlbGVjdHJvbicpLmlwY1JlbmRlcmVyXG4gIHdlYkZyYW1lID0gcmVxdWlyZSgnZWxlY3Ryb24nKS53ZWJGcmFtZVxuXG4gIC8qKlxuICAgKiBJbml0aWxpc2UgVGlueU1DRSBcbiAgICovXG4gICQoZG9jdW1lbnQpLnJlYWR5KGZ1bmN0aW9uICgpIHtcblxuICAgIC8vIE92ZXJyaWRlIHRoZSBtYXJnaW4gYm90dG9uIGdpdmVuIGJ5IFJBU0ggZm9yIHRoZSBmb290ZXJcbiAgICAkKCdib2R5JykuY3NzKHtcbiAgICAgICdtYXJnaW4tYm90dG9tJzogMFxuICAgIH0pXG5cbiAgICAvL2hpZGUgZm9vdGVyXG4gICAgJCgnZm9vdGVyLmZvb3RlcicpLnJlbW92ZSgpXG5cbiAgICAvL2F0dGFjaCB3aG9sZSBib2R5IGluc2lkZSBhIHBsYWNlaG9sZGVyIGRpdlxuICAgICQoJ2JvZHknKS5odG1sKGA8ZGl2IGlkPVwicmFqZV9yb290XCI+JHskKCdib2R5JykuaHRtbCgpfTwvZGl2PmApXG4gICAgXG4gICAgLy9cbiAgICBtYXRobWwyc3ZnQWxsRm9ybXVsYXMoKVxuXG4gICAgdGlueW1jZS5pbml0KHtcblxuICAgICAgLy8gU2VsZWN0IHRoZSBlbGVtZW50IHRvIHdyYXBcbiAgICAgIHNlbGVjdG9yOiAnI3JhamVfcm9vdCcsXG5cbiAgICAgIC8vIFNldCB3aW5kb3cgc2l6ZVxuICAgICAgaGVpZ2h0OiB3aW5kb3cuaW5uZXJIZWlnaHQgLSBUSU5ZTUNFX1RPT0xCQVJfSEVJR1RILFxuXG4gICAgICAvLyBTZXQgdGhlIHN0eWxlcyBvZiB0aGUgY29udGVudCB3cmFwcGVkIGluc2lkZSB0aGUgZWxlbWVudFxuICAgICAgY29udGVudF9jc3M6IFsnY3NzL2Jvb3RzdHJhcC5taW4uY3NzJywgJ2Nzcy9yYXNoLmNzcycsICdjc3MvcmFqZS1jb3JlLmNzcyddLFxuXG4gICAgICAvLyBTZXQgcGx1Z2lucyBbdGFibGUgaW1hZ2UgbGluayBjb2Rlc2FtcGxlXVxuICAgICAgcGx1Z2luczogXCJzZWFyY2hyZXBsYWNlIHJhamVfaW5saW5lRmlndXJlIGZ1bGxzY3JlZW4gcmFqZV9leHRlcm5hbExpbmsgcmFqZV9pbmxpbmVDb2RlIHJhamVfaW5saW5lUXVvdGUgcmFqZV9zZWN0aW9uICBub25lZGl0YWJsZSByYWplX2ltYWdlIHJhamVfcXVvdGVibG9jayByYWplX2NvZGVibG9jayByYWplX3RhYmxlIHJhamVfbGlzdGluZyByYWplX2lubGluZV9mb3JtdWxhIHJhamVfZm9ybXVsYSByYWplX2Nyb3NzcmVmIHJhamVfZm9vdG5vdGVzIHJhamVfbWV0YWRhdGEgcmFqZV9saXN0cyByYWplX3NhdmUgcmFqZV9hbm5vdGF0aW9ucyBzcGVsbGNoZWNrZXIgcGFzdGUgdGFibGUgbGlua1wiLFxuXG4gICAgICAvLyBSZW1vdmUgbWVudWJhclxuICAgICAgbWVudWJhcjogZmFsc2UsXG5cbiAgICAgIC8vIEN1c3RvbSB0b29sYmFyXG4gICAgICB0b29sYmFyOiAndW5kbyByZWRvIGJvbGQgaXRhbGljIGxpbmsgc3VwZXJzY3JpcHQgc3Vic2NyaXB0IHJhamVfaW5saW5lQ29kZSByYWplX2lubGluZVF1b3RlIHJhamVfaW5saW5lX2Zvcm11bGEgcmFqZV9jcm9zc3JlZiByYWplX2Zvb3Rub3RlcyB8IHJhamVfb2wgcmFqZV91bCByYWplX2NvZGVibG9jayByYWplX3F1b3RlYmxvY2sgcmFqZV90YWJsZSByYWplX2ltYWdlIHJhamVfbGlzdGluZyByYWplX2Zvcm11bGEgfCBzZWFyY2hyZXBsYWNlIHNwZWxsY2hlY2tlciB8IHJhamVfc2VjdGlvbiByYWplX21ldGFkYXRhIHJhamVfc2F2ZScsXG5cbiAgICAgIHNwZWxsY2hlY2tlcl9jYWxsYmFjazogZnVuY3Rpb24gKG1ldGhvZCwgdGV4dCwgc3VjY2VzcywgZmFpbHVyZSkge1xuICAgICAgICB0aW55bWNlLnV0aWwuSlNPTlJlcXVlc3Quc2VuZFJQQyh7XG4gICAgICAgICAgdXJsOiBcInNwZWxsY2hlY2tlci5waHBcIixcbiAgICAgICAgICBtZXRob2Q6IFwic3BlbGxjaGVja1wiLFxuICAgICAgICAgIHBhcmFtczoge1xuICAgICAgICAgICAgbGFuZzogdGhpcy5nZXRMYW5ndWFnZSgpLFxuICAgICAgICAgICAgd29yZHM6IHRleHQubWF0Y2godGhpcy5nZXRXb3JkQ2hhclBhdHRlcm4oKSlcbiAgICAgICAgICB9LFxuICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgIHN1Y2Nlc3MocmVzdWx0KTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIGVycm9yOiBmdW5jdGlvbiAoZXJyb3IsIHhocikge1xuICAgICAgICAgICAgZmFpbHVyZShcIlNwZWxsY2hlY2sgZXJyb3I6IFwiICsgZXJyb3IpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9LFxuXG4gICAgICBzcGVsbGNoZWNrZXJfbGFuZ3VhZ2VzOiAnJyxcblxuICAgICAgLy8gU2V0IGRlZmF1bHQgdGFyZ2V0XG4gICAgICBkZWZhdWx0X2xpbmtfdGFyZ2V0OiBcIl9ibGFua1wiLFxuXG4gICAgICAvLyBQcmVwZW5kIHByb3RvY29sIGlmIHRoZSBsaW5rIHN0YXJ0cyB3aXRoIHd3d1xuICAgICAgbGlua19hc3N1bWVfZXh0ZXJuYWxfdGFyZ2V0czogdHJ1ZSxcblxuICAgICAgLy8gSGlkZSB0YXJnZXQgbGlzdFxuICAgICAgdGFyZ2V0X2xpc3Q6IGZhbHNlLFxuXG4gICAgICAvLyBIaWRlIHRpdGxlXG4gICAgICBsaW5rX3RpdGxlOiBmYWxzZSxcblxuICAgICAgLy8gUmVtb3ZlIFwicG93ZXJlZCBieSB0aW55bWNlXCJcbiAgICAgIGJyYW5kaW5nOiBmYWxzZSxcblxuICAgICAgLy8gUHJldmVudCBhdXRvIGJyIG9uIGVsZW1lbnQgaW5zZXJ0XG4gICAgICBhcHBseV9zb3VyY2VfZm9ybWF0dGluZzogZmFsc2UsXG5cbiAgICAgIC8vIFByZXZlbnQgbm9uIGVkaXRhYmxlIG9iamVjdCByZXNpemVcbiAgICAgIG9iamVjdF9yZXNpemluZzogZmFsc2UsXG5cbiAgICAgIC8vIFVwZGF0ZSB0aGUgdGFibGUgcG9wb3ZlciBsYXlvdXRcbiAgICAgIHRhYmxlX3Rvb2xiYXI6IFwidGFibGVpbnNlcnRyb3diZWZvcmUgdGFibGVpbnNlcnRyb3dhZnRlciB0YWJsZWRlbGV0ZXJvdyB8IHRhYmxlaW5zZXJ0Y29sYmVmb3JlIHRhYmxlaW5zZXJ0Y29sYWZ0ZXIgdGFibGVkZWxldGVjb2xcIixcblxuICAgICAgaW1hZ2VfYWR2dGFiOiB0cnVlLFxuXG4gICAgICBwYXN0ZV9ibG9ja19kcm9wOiB0cnVlLFxuXG4gICAgICBleHRlbmRlZF92YWxpZF9lbGVtZW50czogXCJzdmdbKl0sZGVmc1sqXSxwYXR0ZXJuWypdLGRlc2NbKl0sbWV0YWRhdGFbKl0sZ1sqXSxtYXNrWypdLHBhdGhbKl0sbGluZVsqXSxtYXJrZXJbKl0scmVjdFsqXSxjaXJjbGVbKl0sZWxsaXBzZVsqXSxwb2x5Z29uWypdLHBvbHlsaW5lWypdLGxpbmVhckdyYWRpZW50WypdLHJhZGlhbEdyYWRpZW50WypdLHN0b3BbKl0saW1hZ2VbKl0sdmlld1sqXSx0ZXh0WypdLHRleHRQYXRoWypdLHRpdGxlWypdLHRzcGFuWypdLGdseXBoWypdLHN5bWJvbFsqXSxzd2l0Y2hbKl0sdXNlWypdXCIsXG5cbiAgICAgIGZvcm11bGE6IHtcbiAgICAgICAgcGF0aDogJ25vZGVfbW9kdWxlcy90aW55bWNlLWZvcm11bGEvJ1xuICAgICAgfSxcblxuICAgICAgY2xlYW51cF9vbl9zdGFydHVwOiBmYWxzZSxcbiAgICAgIHRyaW1fc3Bhbl9lbGVtZW50czogZmFsc2UsXG4gICAgICB2ZXJpZnlfaHRtbDogZmFsc2UsXG4gICAgICBjbGVhbnVwOiBmYWxzZSxcbiAgICAgIGNvbnZlcnRfdXJsczogZmFsc2UsXG5cbiAgICAgIC8vIFNldHVwIGZ1bGwgc2NyZWVuIG9uIGluaXRcbiAgICAgIHNldHVwOiBmdW5jdGlvbiAoZWRpdG9yKSB7XG5cbiAgICAgICAgbGV0IHBhc3RlQm9va21hcmtcblxuICAgICAgICAvKipcbiAgICAgICAgICogXG4gICAgICAgICAqL1xuICAgICAgICBlZGl0b3Iub24oJ2luaXQnLCBmdW5jdGlvbiAoZSkge1xuXG4gICAgICAgICAgZWRpdG9yLmV4ZWNDb21tYW5kKCdtY2VGdWxsU2NyZWVuJylcblxuICAgICAgICAgIC8vIFxuICAgICAgICAgIHNldE5vbkVkaXRhYmxlSGVhZGVyKClcblxuICAgICAgICAgIC8vIE1vdmUgY2FyZXQgYXQgdGhlIGZpcnN0IGgxIGVsZW1lbnQgb2YgbWFpbiBzZWN0aW9uXG4gICAgICAgICAgLy8gT3IgcmlnaHQgYWZ0ZXIgaGVhZGluZ1xuICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZXRDdXJzb3JMb2NhdGlvbih0aW55bWNlLmFjdGl2ZUVkaXRvci5kb20uc2VsZWN0KEZJUlNUX0hFQURJTkcpWzBdLCAwKVxuICAgICAgICB9KVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBcbiAgICAgICAgICovXG4gICAgICAgIGVkaXRvci5vbigna2V5RG93bicsIGZ1bmN0aW9uIChlKSB7XG5cbiAgICAgICAgICAvLyBQcmV2ZW50IHNoaWZ0K2VudGVyXG4gICAgICAgICAgaWYgKGUua2V5Q29kZSA9PSAxMyAmJiBlLnNoaWZ0S2V5KVxuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG5cbiAgICAgICAgICBpZiAoZS5rZXlDb2RlID09IDg2ICYmIGUubWV0YUtleSkge1xuXG4gICAgICAgICAgICBpZiAoJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKS5pcygncHJlJykpIHtcblxuICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKVxuXG4gICAgICAgICAgICAgIHBhc3RlQm9va21hcmsgPSB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Qm9va21hcmsoKVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSlcblxuICAgICAgICAvKipcbiAgICAgICAgICogXG4gICAgICAgICAqL1xuICAgICAgICBlZGl0b3Iub24oJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcblxuICAgICAgICAgIC8vIERvbid0IGNhcHR1cmUgdGhlIGNsaWNrIG9mIHRoZSBzaWRlYmFyIGFubm90YXRpb25cbiAgICAgICAgICBpZiAoISQoZS5zcmNFbGVtZW50KS5wYXJlbnRzKFNJREVCQVJfQU5OT1RBVElPTikubGVuZ3RoKVxuXG4gICAgICAgICAgICAvLyBDYXB0dXJlIHRoZSB0cmlwbGUgY2xpY2sgZXZlbnRcbiAgICAgICAgICAgIGlmIChlLmRldGFpbCA9PSAzKSB7XG5cbiAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKClcblxuICAgICAgICAgICAgICBsZXQgd3JhcHBlciA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldFJuZygpLnN0YXJ0Q29udGFpbmVyKS5wYXJlbnRzKCdwLGZpZ2NhcHRpb24sOmhlYWRlcicpLmZpcnN0KClcbiAgICAgICAgICAgICAgbGV0IHN0YXJ0Q29udGFpbmVyID0gd3JhcHBlclswXVxuICAgICAgICAgICAgICBsZXQgZW5kQ29udGFpbmVyID0gd3JhcHBlclswXVxuICAgICAgICAgICAgICBsZXQgcmFuZ2UgPSBkb2N1bWVudC5jcmVhdGVSYW5nZSgpXG5cbiAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIHdyYXBwZXIgaGFzIG1vcmUgdGV4dCBub2RlIGluc2lkZVxuICAgICAgICAgICAgICBpZiAod3JhcHBlci5jb250ZW50cygpLmxlbmd0aCA+IDEpIHtcblxuICAgICAgICAgICAgICAgIC8vIElmIHRoZSBmaXJzdCB0ZXh0IG5vZGUgaXMgYSBub3QgZWRpdGFibGUgc3Ryb25nLCB0aGUgc2VsZWN0aW9uIG11c3Qgc3RhcnQgd2l0aCB0aGUgc2Vjb25kIGVsZW1lbnRcbiAgICAgICAgICAgICAgICBpZiAod3JhcHBlci5jb250ZW50cygpLmZpcnN0KCkuaXMoJ3N0cm9uZ1tjb250ZW50ZWRpdGFibGU9ZmFsc2VdJykpXG4gICAgICAgICAgICAgICAgICBzdGFydENvbnRhaW5lciA9IHdyYXBwZXIuY29udGVudHMoKVsxXVxuXG4gICAgICAgICAgICAgICAgLy8gSW4gdGhpcyBjYXNlIHRoZSBlbmRDb250YWluZXIgd2lsbCBiZSB0aGUgbGFzdCB0ZXh0IG5vZGVcbiAgICAgICAgICAgICAgICBlbmRDb250YWluZXIgPSB3cmFwcGVyLmNvbnRlbnRzKCkubGFzdCgpWzBdXG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICByYW5nZS5zZXRTdGFydChzdGFydENvbnRhaW5lciwgMClcblxuICAgICAgICAgICAgICBpZiAod3JhcHBlci5pcygnZmlnY2FwdGlvbicpKVxuICAgICAgICAgICAgICAgIHJhbmdlLnNldEVuZChlbmRDb250YWluZXIsIGVuZENvbnRhaW5lci5sZW5ndGgpXG5cbiAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIHJhbmdlLnNldEVuZChlbmRDb250YWluZXIsIDEpXG5cbiAgICAgICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLnNldFJuZyhyYW5nZSlcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9KVxuXG4gICAgICAgIC8vIFByZXZlbnQgc3BhbiBcbiAgICAgICAgZWRpdG9yLm9uKCdub2RlQ2hhbmdlJywgZnVuY3Rpb24gKGUpIHtcblxuICAgICAgICAgIGxldCBzZWxlY3RlZEVsZW1lbnQgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG5cbiAgICAgICAgICAvLyBNb3ZlIGNhcmV0IHRvIGZpcnN0IGhlYWRpbmcgaWYgaXMgYWZ0ZXIgb3IgYmVmb3JlIG5vdCBlZGl0YWJsZSBoZWFkZXJcbiAgICAgICAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LmlzKCdwJykgJiYgKHNlbGVjdGVkRWxlbWVudC5uZXh0KCkuaXMoSEVBREVSX1NFTEVDVE9SKSB8fCAoc2VsZWN0ZWRFbGVtZW50LnByZXYoKS5pcyhIRUFERVJfU0VMRUNUT1IpICYmIHRpbnltY2UuYWN0aXZlRWRpdG9yLmRvbS5zZWxlY3QoRklSU1RfSEVBRElORykubGVuZ3RoKSkpXG4gICAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2V0Q3Vyc29yTG9jYXRpb24odGlueW1jZS5hY3RpdmVFZGl0b3IuZG9tLnNlbGVjdChGSVJTVF9IRUFESU5HKVswXSwgMClcblxuICAgICAgICAgIC8vIElmIHRoZSBjdXJyZW50IGVsZW1lbnQgaXNuJ3QgaW5zaWRlIGhlYWRlciwgb25seSBpbiBzZWN0aW9uIHRoaXMgaXMgcGVybWl0dGVkXG4gICAgICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKCdzZWN0aW9uJykubGVuZ3RoKSB7XG5cbiAgICAgICAgICAgIC8qXG4gICAgICAgICAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LmlzKCdzcGFuI19tY2VfY2FyZXRbZGF0YS1tY2UtYm9ndXNdJykgfHwgc2VsZWN0ZWRFbGVtZW50LnBhcmVudCgpLmlzKCdzcGFuI19tY2VfY2FyZXRbZGF0YS1tY2UtYm9ndXNdJykpIHtcblxuICAgICAgICAgICAgICAvLyBSZW1vdmUgc3BhbiBub3JtYWxseSBjcmVhdGVkIHdpdGggYm9sZFxuICAgICAgICAgICAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LnBhcmVudCgpLmlzKCdzcGFuI19tY2VfY2FyZXRbZGF0YS1tY2UtYm9ndXNdJykpXG4gICAgICAgICAgICAgICAgc2VsZWN0ZWRFbGVtZW50ID0gc2VsZWN0ZWRFbGVtZW50LnBhcmVudCgpXG5cbiAgICAgICAgICAgICAgbGV0IGJtID0gdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldEJvb2ttYXJrKClcbiAgICAgICAgICAgICAgc2VsZWN0ZWRFbGVtZW50LnJlcGxhY2VXaXRoKHNlbGVjdGVkRWxlbWVudC5odG1sKCkpXG4gICAgICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5tb3ZlVG9Cb29rbWFyayhibSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICovXG4gICAgICAgICAgfVxuICAgICAgICAgIHVwZGF0ZURvY3VtZW50U3RhdGUoKVxuICAgICAgICB9KVxuXG4gICAgICAgIC8vIFVwZGF0ZSBzYXZlZCBjb250ZW50IG9uIHVuZG8gYW5kIHJlZG8gZXZlbnRzXG4gICAgICAgIGVkaXRvci5vbignVW5kbycsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG4gICAgICAgIH0pXG5cbiAgICAgICAgZWRpdG9yLm9uKCdSZWRvJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcbiAgICAgICAgfSlcblxuICAgICAgICBlZGl0b3Iub24oJ1Bhc3RlJywgZnVuY3Rpb24gKGUpIHtcblxuICAgICAgICAgIGxldCB0YXJnZXQgPSAkKGUudGFyZ2V0KVxuXG4gICAgICAgICAgLy8gSWYgdGhlIHBhc3RlIGV2ZW50IGlzIGNhbGxlZCBpbnNpZGUgYSBsaXN0aW5nXG4gICAgICAgICAgaWYgKHBhc3RlQm9va21hcmsgJiYgdGFyZ2V0LnBhcmVudHMoJ2ZpZ3VyZTpoYXMocHJlOmhhcyhjb2RlKSknKS5sZW5ndGgpIHtcblxuICAgICAgICAgICAgbGV0IGRhdGEgPSBlLmNsaXBib2FyZERhdGEuZ2V0RGF0YSgnVGV4dCcpXG5cbiAgICAgICAgICAgIC8vIFJlc3RvcmUgdGhlIHNlbGVjdGlvbiBzYXZlZCBvbiBjbWQrdlxuICAgICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLm1vdmVUb0Jvb2ttYXJrKHBhc3RlQm9va21hcmspXG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgY29udGVudFxuICAgICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLnNldENvbnRlbnQoZS5jbGlwYm9hcmREYXRhLmdldERhdGEoJ1RleHQnKSlcblxuICAgICAgICAgICAgcGFzdGVCb29rbWFyayA9IG51bGxcbiAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICB9LFxuICAgIH0pXG4gIH0pXG5cbiAgLyoqXG4gICAqIE9wZW4gYW5kIGNsb3NlIHRoZSBoZWFkaW5ncyBkcm9wZG93blxuICAgKi9cbiAgJCh3aW5kb3cpLmxvYWQoZnVuY3Rpb24gKCkge1xuXG4gICAgLy8gT3BlbiBhbmQgY2xvc2UgbWVudSBoZWFkaW5ncyBOw6RpdmUgd2F5XG4gICAgJChgZGl2W2FyaWEtbGFiZWw9J2hlYWRpbmcnXWApLmZpbmQoJ2J1dHRvbicpLnRyaWdnZXIoJ2NsaWNrJylcbiAgICAkKGBkaXZbYXJpYS1sYWJlbD0naGVhZGluZyddYCkuZmluZCgnYnV0dG9uJykudHJpZ2dlcignY2xpY2snKVxuICB9KVxuXG4gIC8qKlxuICAgKiBBY2NlcHQgYSBqcyBvYmplY3QgdGhhdCBleGlzdHMgaW4gZnJhbWVcbiAgICogQHBhcmFtIHsqfSBlbGVtZW50IFxuICAgKi9cbiAgZnVuY3Rpb24gbW92ZUNhcmV0KGVsZW1lbnQsIHRvU3RhcnQpIHtcbiAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2VsZWN0KGVsZW1lbnQsIHRydWUpXG4gICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmNvbGxhcHNlKHRvU3RhcnQpXG5cbiAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5mb2N1cygpXG4gIH1cblxuICAvKipcbiAgICogXG4gICAqL1xuICBmdW5jdGlvbiBzZWxlY3RSYW5nZShzdGFydENvbnRhaW5lciwgc3RhcnRPZmZzZXQsIGVuZENvbnRhaW5lciwgZW5kT2Zmc2V0KSB7XG5cbiAgICBsZXQgcmFuZ2UgPSBkb2N1bWVudC5jcmVhdGVSYW5nZSgpXG4gICAgcmFuZ2Uuc2V0U3RhcnQoc3RhcnRDb250YWluZXIsIHN0YXJ0T2Zmc2V0KVxuXG4gICAgLy8gSWYgdGhlc2UgcHJvcGVydGllcyBhcmUgbm90IGluIHRoZSBzaWduYXR1cmUgdXNlIHRoZSBzdGFydFxuICAgIGlmICghZW5kQ29udGFpbmVyICYmICFlbmRPZmZzZXQpIHtcbiAgICAgIGVuZENvbnRhaW5lciA9IHN0YXJ0Q29udGFpbmVyXG4gICAgICBlbmRPZmZzZXQgPSBzdGFydE9mZnNldFxuICAgIH1cblxuICAgIHJhbmdlLnNldEVuZChlbmRDb250YWluZXIsIGVuZE9mZnNldClcbiAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2V0Um5nKHJhbmdlKVxuICB9XG5cbiAgLyoqXG4gICAqIFxuICAgKiBAcGFyYW0geyp9IGVsZW1lbnQgXG4gICAqL1xuICBmdW5jdGlvbiBtb3ZlQ3Vyc29yVG9FbmQoZWxlbWVudCkge1xuXG4gICAgbGV0IGhlYWRpbmcgPSBlbGVtZW50XG4gICAgbGV0IG9mZnNldCA9IDBcblxuICAgIGlmIChoZWFkaW5nLmNvbnRlbnRzKCkubGVuZ3RoKSB7XG5cbiAgICAgIGhlYWRpbmcgPSBoZWFkaW5nLmNvbnRlbnRzKCkubGFzdCgpXG5cbiAgICAgIC8vIElmIHRoZSBsYXN0IG5vZGUgaXMgYSBzdHJvbmcsZW0scSBldGMuIHdlIGhhdmUgdG8gdGFrZSBpdHMgdGV4dCBcbiAgICAgIGlmIChoZWFkaW5nWzBdLm5vZGVUeXBlICE9IDMpXG4gICAgICAgIGhlYWRpbmcgPSBoZWFkaW5nLmNvbnRlbnRzKCkubGFzdCgpXG5cbiAgICAgIG9mZnNldCA9IGhlYWRpbmdbMF0ud2hvbGVUZXh0Lmxlbmd0aFxuICAgIH1cblxuICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLmZvY3VzKClcbiAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2V0Q3Vyc29yTG9jYXRpb24oaGVhZGluZ1swXSwgb2Zmc2V0KVxuICB9XG5cbiAgLyoqXG4gICAqIFxuICAgKiBAcGFyYW0geyp9IGVsZW1lbnQgXG4gICAqL1xuICBmdW5jdGlvbiBtb3ZlQ3Vyc29yVG9TdGFydChlbGVtZW50KSB7XG5cbiAgICBsZXQgaGVhZGluZyA9IGVsZW1lbnRcbiAgICBsZXQgb2Zmc2V0ID0gMFxuXG4gICAgdGlueW1jZS5hY3RpdmVFZGl0b3IuZm9jdXMoKVxuICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZXRDdXJzb3JMb2NhdGlvbihoZWFkaW5nWzBdLCBvZmZzZXQpXG4gIH1cblxuXG4gIC8qKlxuICAgKiBDcmVhdGUgY3VzdG9tIGludG8gbm90aWZpY2F0aW9uXG4gICAqIEBwYXJhbSB7Kn0gdGV4dCBcbiAgICogQHBhcmFtIHsqfSB0aW1lb3V0IFxuICAgKi9cbiAgZnVuY3Rpb24gbm90aWZ5KHRleHQsIHR5cGUgPSAnaW5mbycsIHRpbWVvdXQgPSAzMDAwKSB7XG5cbiAgICBpZiAodGlueW1jZS5hY3RpdmVFZGl0b3Iubm90aWZpY2F0aW9uTWFuYWdlci5nZXROb3RpZmljYXRpb25zKCkubGVuZ3RoKVxuICAgICAgdG9wLnRpbnltY2UuYWN0aXZlRWRpdG9yLm5vdGlmaWNhdGlvbk1hbmFnZXIuY2xvc2UoKVxuXG4gICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iubm90aWZpY2F0aW9uTWFuYWdlci5vcGVuKHtcbiAgICAgIHRleHQ6IHRleHQsXG4gICAgICB0eXBlOiB0eXBlLFxuICAgICAgdGltZW91dDogdGltZW91dFxuICAgIH0pXG4gIH1cblxuICAvKipcbiAgICogXG4gICAqIEBwYXJhbSB7Kn0gZWxlbWVudFNlbGVjdG9yIFxuICAgKi9cbiAgZnVuY3Rpb24gc2Nyb2xsVG8oZWxlbWVudFNlbGVjdG9yKSB7XG4gICAgdGlueW1jZS5hY3RpdmVFZGl0b3IuJChlbGVtZW50U2VsZWN0b3IpWzBdLnNjcm9sbEludG9WaWV3KCk7XG4gIH1cblxuICAvKipcbiAgICogXG4gICAqL1xuICBmdW5jdGlvbiBnZXRTdWNjZXNzaXZlRWxlbWVudElkKGVsZW1lbnRTZWxlY3RvciwgU1VGRklYKSB7XG5cbiAgICBsZXQgbGFzdElkID0gMFxuXG4gICAgdGlueW1jZS5hY3RpdmVFZGl0b3IuJChlbGVtZW50U2VsZWN0b3IpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgbGV0IGN1cnJlbnRJZCA9IHBhcnNlSW50KCQodGhpcykuYXR0cignaWQnKS5yZXBsYWNlKFNVRkZJWCwgJycpKVxuICAgICAgbGFzdElkID0gY3VycmVudElkID4gbGFzdElkID8gY3VycmVudElkIDogbGFzdElkXG4gICAgfSlcblxuICAgIHJldHVybiBgJHtTVUZGSVh9JHtsYXN0SWQrMX1gXG4gIH1cblxuICAvKipcbiAgICogXG4gICAqL1xuICBmdW5jdGlvbiBoZWFkaW5nRGltZW5zaW9uKCkge1xuICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLiQoJ2gxLGgyLGgzLGg0LGg1LGg2JykuZWFjaChmdW5jdGlvbiAoKSB7XG5cbiAgICAgIGlmICghJCh0aGlzKS5wYXJlbnRzKEhFQURFUl9TRUxFQ1RPUikubGVuZ3RoICYmICEkKHRoaXMpLnBhcmVudHMoU1BFQ0lBTF9TRUNUSU9OX1NFTEVDVE9SKS5sZW5ndGgpIHtcbiAgICAgICAgdmFyIGNvdW50ZXIgPSAwO1xuICAgICAgICAkKHRoaXMpLnBhcmVudHMoXCJzZWN0aW9uXCIpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGlmICgkKHRoaXMpLmNoaWxkcmVuKFwiaDEsaDIsaDMsaDQsaDUsaDZcIikubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY291bnRlcisrO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgICQodGhpcykucmVwbGFjZVdpdGgoXCI8aFwiICsgY291bnRlciArIFwiIGRhdGEtcmFzaC1vcmlnaW5hbC13cmFwcGVyPVxcXCJoMVxcXCIgPlwiICsgJCh0aGlzKS5odG1sKCkgKyBcIjwvaFwiICsgY291bnRlciArIFwiPlwiKVxuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFxuICAgKi9cbiAgZnVuY3Rpb24gY2hlY2tJZlByaW50YWJsZUNoYXIoa2V5Y29kZSkge1xuXG4gICAgcmV0dXJuIChrZXljb2RlID4gNDcgJiYga2V5Y29kZSA8IDU4KSB8fCAvLyBudW1iZXIga2V5c1xuICAgICAgKGtleWNvZGUgPT0gMzIgfHwga2V5Y29kZSA9PSAxMykgfHwgLy8gc3BhY2ViYXIgJiByZXR1cm4ga2V5KHMpIChpZiB5b3Ugd2FudCB0byBhbGxvdyBjYXJyaWFnZSByZXR1cm5zKVxuICAgICAgKGtleWNvZGUgPiA2NCAmJiBrZXljb2RlIDwgOTEpIHx8IC8vIGxldHRlciBrZXlzXG4gICAgICAoa2V5Y29kZSA+IDk1ICYmIGtleWNvZGUgPCAxMTIpIHx8IC8vIG51bXBhZCBrZXlzXG4gICAgICAoa2V5Y29kZSA+IDE4NSAmJiBrZXljb2RlIDwgMTkzKSB8fCAvLyA7PSwtLi9gIChpbiBvcmRlcilcbiAgICAgIChrZXljb2RlID4gMjE4ICYmIGtleWNvZGUgPCAyMjMpOyAvLyBbXFxdJyAoaW4gb3JkZXIpXG4gIH1cblxuICAvKipcbiAgICogXG4gICAqL1xuICBmdW5jdGlvbiBjaGVja0lmU3BlY2lhbENoYXIoa2V5Y29kZSkge1xuXG4gICAgcmV0dXJuIChrZXljb2RlID4gNDcgJiYga2V5Y29kZSA8IDU4KSB8fCAvLyBudW1iZXIga2V5c1xuICAgICAgKGtleWNvZGUgPiA5NSAmJiBrZXljb2RlIDwgMTEyKSB8fCAvLyBudW1wYWQga2V5c1xuICAgICAgKGtleWNvZGUgPiAxODUgJiYga2V5Y29kZSA8IDE5MykgfHwgLy8gOz0sLS4vYCAoaW4gb3JkZXIpXG4gICAgICAoa2V5Y29kZSA+IDIxOCAmJiBrZXljb2RlIDwgMjIzKVxuICB9XG5cbiAgLyoqXG4gICAqIFxuICAgKi9cbiAgZnVuY3Rpb24gbWFya1RpbnlNQ0UoKSB7XG4gICAgJCgnZGl2W2lkXj1tY2V1X10nKS5hdHRyKCdkYXRhLXJhc2gtb3JpZ2luYWwtY29udGVudCcsICcnKVxuICB9XG5cbiAgLyoqXG4gICAqIFxuICAgKi9cbiAgZnVuY3Rpb24gc2V0Tm9uRWRpdGFibGVIZWFkZXIoKSB7XG5cbiAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci4kKEhFQURFUl9TRUxFQ1RPUikuYWRkQ2xhc3MoJ21jZU5vbkVkaXRhYmxlJylcbiAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci4kKFNJREVCQVJfQU5OT1RBVElPTikuYWRkQ2xhc3MoJ21jZU5vbkVkaXRhYmxlJylcblxuICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLiQoSEVBREVSX1NFTEVDVE9SKS5hdHRyKCdjb250ZW50ZWRpdGFibGUnLCBmYWxzZSlcbiAgfVxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGZ1bmN0aW9uIGNoZWNrSWZBcHAoKSB7XG4gICAgcmV0dXJuIGlwY1JlbmRlcmVyLnNlbmRTeW5jKCdpc0FwcFN5bmMnKVxuICB9XG5cbiAgLyoqXG4gICAqIFxuICAgKi9cbiAgZnVuY3Rpb24gc2VsZWN0SW1hZ2UoKSB7XG4gICAgcmV0dXJuIGlwY1JlbmRlcmVyLnNlbmRTeW5jKCdzZWxlY3RJbWFnZVN5bmMnKVxuICB9XG5cbiAgLyoqXG4gICAqIFNlbmQgYSBtZXNzYWdlIHRvIHRoZSBiYWNrZW5kLCBub3RpZnkgdGhlIHN0cnVjdHVyYWwgY2hhbmdlXG4gICAqIFxuICAgKiBJZiB0aGUgZG9jdW1lbnQgaXMgZHJhZnQgc3RhdGUgPSB0cnVlXG4gICAqIElmIHRoZSBkb2N1bWVudCBpcyBzYXZlZCBzdGF0ZSA9IGZhbHNlXG4gICAqL1xuICBmdW5jdGlvbiB1cGRhdGVEb2N1bWVudFN0YXRlKCkge1xuXG4gICAgLy8gR2V0IHRoZSBJZnJhbWUgY29udGVudCBub3QgaW4geG1sIFxuICAgIGxldCBKcXVlcnlJZnJhbWUgPSAkKGA8ZGl2PiR7dGlueW1jZS5hY3RpdmVFZGl0b3IuZ2V0Q29udGVudCgpfTwvZGl2PmApXG4gICAgbGV0IEpxdWVyeVNhdmVkQ29udGVudCA9ICQoYCNyYWplX3Jvb3RgKVxuXG4gICAgLy8gVHJ1ZSBpZiB0aGV5J3JlIGRpZmZlcmVudCwgRmFsc2UgaXMgdGhleSdyZSBlcXVhbFxuICAgIGlwY1JlbmRlcmVyLnNlbmQoJ3VwZGF0ZURvY3VtZW50U3RhdGUnLCBKcXVlcnlJZnJhbWUuaHRtbCgpICE9IEpxdWVyeVNhdmVkQ29udGVudC5odG1sKCkpXG4gIH1cblxuICAvKipcbiAgICogXG4gICAqL1xuICBmdW5jdGlvbiBzYXZlQXNBcnRpY2xlKG9wdGlvbnMpIHtcbiAgICByZXR1cm4gaXBjUmVuZGVyZXIuc2VuZCgnc2F2ZUFzQXJ0aWNsZScsIG9wdGlvbnMpXG4gIH1cblxuICAvKipcbiAgICogXG4gICAqL1xuICBmdW5jdGlvbiBzYXZlQXJ0aWNsZShvcHRpb25zKSB7XG4gICAgcmV0dXJuIGlwY1JlbmRlcmVyLnNlbmQoJ3NhdmVBcnRpY2xlJywgb3B0aW9ucylcbiAgfVxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGZ1bmN0aW9uIG1hdGhtbDJzdmdBbGxGb3JtdWxhcygpIHtcblxuICAgIC8vIEZvciBlYWNoIGZpZ3VyZSBmb3JtdWxhXG4gICAgJCgnZmlndXJlW2lkXj1cImZvcm11bGFfXCJdJykuZWFjaChmdW5jdGlvbiAoKSB7XG5cbiAgICAgIC8vIEdldCB0aGUgaWRcbiAgICAgIGxldCBpZCA9ICQodGhpcykuYXR0cignaWQnKVxuICAgICAgbGV0IGFzY2lpTWF0aCA9ICQodGhpcykuYXR0cihEQVRBX01BVEhfT1JJR0lOQUxfSU5QVVQpXG4gICAgICAkKHRoaXMpLnJlbW92ZUF0dHIoREFUQV9NQVRIX09SSUdJTkFMX0lOUFVUKVxuXG4gICAgICBNYXRoSmF4Lkh1Yi5RdWV1ZShcblxuICAgICAgICAvLyBQcm9jZXNzIHRoZSBmb3JtdWxhIGJ5IGlkXG4gICAgICAgIFtcIlR5cGVzZXRcIiwgTWF0aEpheC5IdWIsIGlkXSxcbiAgICAgICAgZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgLy8gR2V0IHRoZSBlbGVtZW50LCBzdmcgYW5kIG1hdGhtbCBjb250ZW50XG4gICAgICAgICAgbGV0IGZpZ3VyZUZvcm11bGEgPSAkKGAjJHtpZH1gKVxuICAgICAgICAgIGxldCBzdmdDb250ZW50ID0gZmlndXJlRm9ybXVsYS5maW5kKCdzdmcnKVxuICAgICAgICAgIGxldCBtbWxDb250ZW50ID0gZmlndXJlRm9ybXVsYS5maW5kKCdzY3JpcHRbdHlwZT1cIm1hdGgvbW1sXCJdJykuaHRtbCgpXG5cbiAgICAgICAgICAvLyBBZGQgdGhlIHJvbGVcbiAgICAgICAgICBzdmdDb250ZW50LmF0dHIoJ3JvbGUnLCAnbWF0aCcpXG4gICAgICAgICAgc3ZnQ29udGVudC5hdHRyKCdkYXRhLW1hdGhtbCcsIG1tbENvbnRlbnQpXG5cbiAgICAgICAgICAvLyBBZGQgdGhlIGFzY2lpbWF0aCBpbnB1dCBpZiBleGlzdHNcbiAgICAgICAgICBpZiAodHlwZW9mIGFzY2lpTWF0aCAhPSAndW5kZWZpbmVkJylcbiAgICAgICAgICAgIHN2Z0NvbnRlbnQuYXR0cihEQVRBX01BVEhfT1JJR0lOQUxfSU5QVVQsIGFzY2lpTWF0aClcblxuICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgZmlndXJlIGNvbnRlbnQgYW5kIGl0cyBjYXB0aW9uXG4gICAgICAgICAgZmlndXJlRm9ybXVsYS5odG1sKGA8cD48c3Bhbj4ke3N2Z0NvbnRlbnRbMF0ub3V0ZXJIVE1MfTwvc3Bhbj48L3A+YClcbiAgICAgICAgICBjYXB0aW9ucygpXG5cbiAgICAgICAgICBmb3JtdWxhLnVwZGF0ZVN0cnVjdHVyZShmaWd1cmVGb3JtdWxhKVxuXG4gICAgICAgICAgLy8gVXBkYXRlIHRoZSBjb250ZW50IGFuZCBjbGVhciB0aGUgd2hvbGUgdW5kbyBsZXZlbHMgc2V0XG4gICAgICAgICAgLy91cGRhdGVJZnJhbWVGcm9tU2F2ZWRDb250ZW50KClcbiAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci5jbGVhcigpXG4gICAgICAgIH1cbiAgICAgIClcbiAgICB9KVxuICB9XG5cbiAgLyoqICovXG4gIHNlbGVjdGlvbkNvbnRlbnQgPSB7XG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBjb250YWluc0JpYmxpb2dyYXBoeTogZnVuY3Rpb24gKHNlbGVjdGlvbikge1xuXG4gICAgICBsZXQgcm5nID0gc2VsZWN0aW9uLmdldFJuZygpXG5cbiAgICAgIC8vIFNhdmUgdGhlIHN0YXJ0aW5nIGVsZW1lbnRcbiAgICAgIGxldCBzdGFydCA9IHJuZy5zdGFydENvbnRhaW5lclxuICAgICAgbGV0IHN0YXJ0Tm9kZSA9ICQoc3RhcnQubm9kZVR5cGUgPT0gMyA/IHN0YXJ0LnBhcmVudE5vZGUgOiBzdGFydClcblxuICAgICAgLy8gU2F2ZSB0aGUgZW5kaW5nIGVsZW1lbnRcbiAgICAgIGxldCBlbmQgPSBybmcuZW5kQ29udGFpbmVyXG4gICAgICBsZXQgZW5kTm9kZSA9ICQoZW5kLm5vZGVUeXBlID09IDMgPyBlbmQucGFyZW50Tm9kZSA6IGVuZClcblxuICAgICAgLy8gQ29udHJvbHMgaWYgdGhlIHNlbGVjdGlvbiBoYXMgdGhlIGJpYmxpb2dyYXBoeSBpbnNpZGVcbiAgICAgIHJldHVybiAoJChybmcuY29tbW9uQW5jZXN0b3JDb250YWluZXIpLmZpbmQoQklCTElPR1JBUEhZX1NFTEVDVE9SKS5sZW5ndGggJiZcbiAgICAgICAgICAoIXN0YXJ0Tm9kZS5pcyhgJHtCSUJMSU9HUkFQSFlfU0VMRUNUT1J9ID4gaDFgKSB8fFxuICAgICAgICAgICAgIWVuZE5vZGUuaXMoYCR7QklCTElPR1JBUEhZX1NFTEVDVE9SfSA+IGgxYCkpKSB8fFxuXG4gICAgICAgIC8vIE9yIGlmIHRoZSBzZWxlY3Rpb24gaXMgdGhlIGJpYmxpb2dyYXBoeVxuICAgICAgICAoJChybmcuY29tbW9uQW5jZXN0b3JDb250YWluZXIpLmlzKEJJQkxJT0dSQVBIWV9TRUxFQ1RPUikgJiZcbiAgICAgICAgICAoc3RhcnROb2RlLmlzKCdoMScpICYmIHJuZy5zdGFydE9mZnNldCA9PSAwKSAmJlxuICAgICAgICAgIChlbmROb2RlLmlzKCdwJykgJiYgcm5nLmVuZE9mZnNldCA9PSBlbmQubGVuZ3RoKSlcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgaXNBdEJlZ2lubmluZ09mRW1wdHlCaWJsaW9lbnRyeTogZnVuY3Rpb24gKHNlbGVjdGlvbikge1xuXG4gICAgICBsZXQgcm5nID0gc2VsZWN0aW9uLmdldFJuZygpXG5cbiAgICAgIC8vIFNhdmUgdGhlIHN0YXJ0aW5nIGVsZW1lbnRcbiAgICAgIGxldCBzdGFydCA9IHJuZy5zdGFydENvbnRhaW5lclxuICAgICAgbGV0IHN0YXJ0Tm9kZSA9ICQoc3RhcnQubm9kZVR5cGUgPT0gMyA/IHN0YXJ0LnBhcmVudE5vZGUgOiBzdGFydClcblxuICAgICAgLy8gU2F2ZSB0aGUgZW5kaW5nIGVsZW1lbnRcbiAgICAgIGxldCBlbmQgPSBybmcuZW5kQ29udGFpbmVyXG4gICAgICBsZXQgZW5kTm9kZSA9ICQoZW5kLm5vZGVUeXBlID09IDMgPyBlbmQucGFyZW50Tm9kZSA6IGVuZClcblxuICAgICAgcmV0dXJuIChybmcuY29tbW9uQW5jZXN0b3JDb250YWluZXIubm9kZVR5cGUgPT0gMyB8fCAkKHJuZy5jb21tb25BbmNlc3RvckNvbnRhaW5lcikuaXMoYCR7QklCTElPRU5UUllfU0VMRUNUT1J9ID4gcGApKSAmJlxuICAgICAgICAoc3RhcnROb2RlLmlzKGVuZE5vZGUpICYmIHN0YXJ0Tm9kZS5pcyhgJHtCSUJMSU9FTlRSWV9TRUxFQ1RPUn0gPiBwYCkpICYmXG4gICAgICAgIChybmcuc3RhcnRPZmZzZXQgPT0gcm5nLmVuZE9mZnNldCAmJiBybmcuc3RhcnRPZmZzZXQgPT0gMClcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgaXNBdEJlZ2lubmluZ09mRW1wdHlFbmRub3RlOiBmdW5jdGlvbiAoc2VsZWN0aW9uKSB7XG5cbiAgICAgIGxldCBybmcgPSBzZWxlY3Rpb24uZ2V0Um5nKClcblxuICAgICAgLy8gU2F2ZSB0aGUgc3RhcnRpbmcgZWxlbWVudFxuICAgICAgbGV0IHN0YXJ0ID0gcm5nLnN0YXJ0Q29udGFpbmVyXG4gICAgICBsZXQgc3RhcnROb2RlID0gJChzdGFydC5ub2RlVHlwZSA9PSAzID8gc3RhcnQucGFyZW50Tm9kZSA6IHN0YXJ0KVxuXG4gICAgICAvLyBTYXZlIHRoZSBlbmRpbmcgZWxlbWVudFxuICAgICAgbGV0IGVuZCA9IHJuZy5lbmRDb250YWluZXJcbiAgICAgIGxldCBlbmROb2RlID0gJChlbmQubm9kZVR5cGUgPT0gMyA/IGVuZC5wYXJlbnROb2RlIDogZW5kKVxuXG4gICAgICByZXR1cm4gKCQocm5nLmNvbW1vbkFuY2VzdG9yQ29udGFpbmVyKS5wYXJlbnQoKS5pcyhFTkROT1RFX1NFTEVDVE9SKSAmJiBzdGFydE5vZGUuaXMoZW5kTm9kZSkgJiYgc3RhcnROb2RlLmlzKGAke0VORE5PVEVfU0VMRUNUT1J9ID4gcDpmaXJzdC1jaGlsZGApKSAmJlxuICAgICAgICAoKHJuZy5zdGFydE9mZnNldCA9PSBybmcuZW5kT2Zmc2V0ICYmIHJuZy5zdGFydE9mZnNldCA9PSAwKSB8fCAoL1xccnxcXG4vLmV4ZWMoc3RhcnQuaW5uZXJUZXh0KSAhPSBudWxsKSlcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgY29udGFpbnNCaWJsaW9lbnRyaWVzOiBmdW5jdGlvbiAoc2VsZWN0aW9uKSB7XG5cbiAgICAgIGxldCBybmcgPSBzZWxlY3Rpb24uZ2V0Um5nKClcblxuICAgICAgLy8gU2F2ZSB0aGUgc3RhcnRpbmcgZWxlbWVudFxuICAgICAgbGV0IHN0YXJ0ID0gcm5nLnN0YXJ0Q29udGFpbmVyXG4gICAgICBsZXQgc3RhcnROb2RlID0gJChzdGFydC5ub2RlVHlwZSA9PSAzID8gc3RhcnQucGFyZW50Tm9kZSA6IHN0YXJ0KVxuXG4gICAgICAvLyBTYXZlIHRoZSBlbmRpbmcgZWxlbWVudFxuICAgICAgbGV0IGVuZCA9IHJuZy5lbmRDb250YWluZXJcbiAgICAgIGxldCBlbmROb2RlID0gJChlbmQubm9kZVR5cGUgPT0gMyA/IGVuZC5wYXJlbnROb2RlIDogZW5kKVxuXG4gICAgICAvLyBDaGVjayBpZiB0aGUgc2VsZWN0aW9uIGNvbnRhaW5zIG1vcmUgdGhhbiBvbmUgYmlibGlvZW50cnlcbiAgICAgIHJldHVybiAoJChybmcuY29tbW9uQW5jZXN0b3JDb250YWluZXIpLmlzKGAke0JJQkxJT0dSQVBIWV9TRUxFQ1RPUn0gPiB1bGApIHx8ICQocm5nLmNvbW1vbkFuY2VzdG9yQ29udGFpbmVyKS5pcyhCSUJMSU9HUkFQSFlfU0VMRUNUT1IpKSAmJlxuICAgICAgICAoQm9vbGVhbihzdGFydE5vZGUucGFyZW50KEJJQkxJT0VOVFJZX1NFTEVDVE9SKS5sZW5ndGgpIHx8IHN0YXJ0Tm9kZS5pcygnaDEnKSkgJiZcbiAgICAgICAgQm9vbGVhbihlbmROb2RlLnBhcmVudHMoQklCTElPRU5UUllfU0VMRUNUT1IpLmxlbmd0aClcbiAgICB9LFxuICB9XG5cbiAgLyoqXG4gICAqIFN0YXJ0IHRoZSBzYXZlIGFzIHByb2Nlc3MgZ2V0dGluZyB0aGUgZGF0YSBhbmQgc2VuZGluZyBpdFxuICAgKiB0byB0aGUgbWFpbiBwcm9jZXNzXG4gICAqL1xuICBpcGNSZW5kZXJlci5vbignZXhlY3V0ZVNhdmVBcycsIChldmVudCwgZGF0YSkgPT4ge1xuICAgIHNhdmVNYW5hZ2VyLnNhdmVBcygpXG4gIH0pXG5cbiAgLyoqXG4gICAqIFN0YXJ0IHRoZSBzYXZlIHByb2Nlc3MgZ2V0dGluZyB0aGUgZGF0YSBhbmQgc2VuZGluZyBpdFxuICAgKiB0byB0aGUgbWFpbiBwcm9jZXNzXG4gICAqL1xuICBpcGNSZW5kZXJlci5vbignZXhlY3V0ZVNhdmUnLCAoZXZlbnQsIGRhdGEpID0+IHtcbiAgICBzYXZlTWFuYWdlci5zYXZlKClcbiAgfSlcblxuICAvKipcbiAgICogXG4gICAqL1xuICBpcGNSZW5kZXJlci5vbignbm90aWZ5JywgKGV2ZW50LCBkYXRhKSA9PiB7XG4gICAgbm90aWZ5KGRhdGEudGV4dCwgZGF0YS50eXBlLCBkYXRhLnRpbWVvdXQpXG4gIH0pXG5cbiAgLyoqXG4gICAqIFxuICAgKi9cbiAgaXBjUmVuZGVyZXIub24oJ3VwZGF0ZUNvbnRlbnQnLCAoZXZlbnQsIGRhdGEpID0+IHtcbiAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcbiAgfSlcblxuICBjdXJzb3IgPSB7XG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBpc0luc2lkZUhlYWRpbmc6IGZ1bmN0aW9uIChzZWxlY3Rpb24pIHtcblxuICAgICAgbGV0IHJuZyA9IHNlbGVjdGlvbi5nZXRSbmcoKVxuXG4gICAgICAvLyBTYXZlIHRoZSBzdGFydGluZyBlbGVtZW50XG4gICAgICBsZXQgc3RhcnQgPSBybmcuc3RhcnRDb250YWluZXJcbiAgICAgIGxldCBzdGFydE5vZGUgPSAkKHN0YXJ0Lm5vZGVUeXBlID09IDMgPyBzdGFydC5wYXJlbnROb2RlIDogc3RhcnQpXG5cbiAgICAgIC8vIFNhdmUgdGhlIGVuZGluZyBlbGVtZW50XG4gICAgICBsZXQgZW5kID0gcm5nLmVuZENvbnRhaW5lclxuICAgICAgbGV0IGVuZE5vZGUgPSAkKGVuZC5ub2RlVHlwZSA9PSAzID8gZW5kLnBhcmVudE5vZGUgOiBlbmQpXG5cbiAgICAgIC8vIENoZWNrIGlmIHRoZSBzZWxlY3Rpb24gY29udGFpbnMgbW9yZSB0aGFuIG9uZSBiaWJsaW9lbnRyeVxuICAgICAgcmV0dXJuICQocm5nLmNvbW1vbkFuY2VzdG9yQ29udGFpbmVyKS5pcygnOmhlYWRlcicpICYmXG4gICAgICAgICQocm5nLmNvbW1vbkFuY2VzdG9yQ29udGFpbmVyKS50ZXh0KCkudHJpbSgpLmxlbmd0aCAhPSBybmcuc3RhcnRPZmZzZXRcbiAgICB9LFxuXG4gICAgaXNJbnNpZGVUYWJsZTogZnVuY3Rpb24gKHNlbGVjdGlvbikge1xuXG4gICAgICBsZXQgcm5nID0gc2VsZWN0aW9uLmdldFJuZygpXG5cbiAgICAgIC8vIFNhdmUgdGhlIHN0YXJ0aW5nIGVsZW1lbnRcbiAgICAgIGxldCBzdGFydCA9IHJuZy5zdGFydENvbnRhaW5lclxuICAgICAgbGV0IHN0YXJ0Tm9kZSA9ICQoc3RhcnQubm9kZVR5cGUgPT0gMyA/IHN0YXJ0LnBhcmVudE5vZGUgOiBzdGFydClcblxuICAgICAgLy8gU2F2ZSB0aGUgZW5kaW5nIGVsZW1lbnRcbiAgICAgIGxldCBlbmQgPSBybmcuZW5kQ29udGFpbmVyXG4gICAgICBsZXQgZW5kTm9kZSA9ICQoZW5kLm5vZGVUeXBlID09IDMgPyBlbmQucGFyZW50Tm9kZSA6IGVuZClcblxuICAgICAgLy8gQ2hlY2sgaWYgdGhlIHNlbGVjdGlvbiBjb250YWlucyBtb3JlIHRoYW4gb25lIGJpYmxpb2VudHJ5XG4gICAgICByZXR1cm4gKCQocm5nLmNvbW1vbkFuY2VzdG9yQ29udGFpbmVyKS5pcyhGSUdVUkVfVEFCTEVfU0VMRUNUT1IpIHx8ICQocm5nLmNvbW1vbkFuY2VzdG9yQ29udGFpbmVyKS5wYXJlbnRzKEZJR1VSRV9UQUJMRV9TRUxFQ1RPUikubGVuZ3RoKSAmJlxuICAgICAgICAkKHJuZy5jb21tb25BbmNlc3RvckNvbnRhaW5lcikudGV4dCgpLnRyaW0oKS5sZW5ndGggIT0gcm5nLnN0YXJ0T2Zmc2V0XG4gICAgfVxuICB9XG59IiwiLy8jcmVnaW9uIDFfcmFqZV9zZWN0aW9uLmpzIENvbnN0YW50c1xuXG4vLyBUZXh0IG9mIGJ1dHRvbiBsYWJlbHNcbmNvbnN0IEhFQURJTkdfQlVUVE9OX0xBQkVMID0gJ0hlYWRpbmcgJ1xuY29uc3QgU1BFQ0lBTF9CVVRUT05fTEFCRUwgPSAnU3BlY2lhbCdcbmNvbnN0IEFCU1RSQUNUX0JVVFRPTl9MQUJFTCA9ICdBYnN0cmFjdCdcbmNvbnN0IEFDS05PV0xFREdFTUVOVFNfQlVUVE9OX0xBQkVMID0gJ0Fja25vd2xlZGdlbWVudHMnXG5jb25zdCBSRUZFUkVOQ0VTX0JVVFRPTl9MQUJFTCA9ICdSZWZlcmVuY2VzJ1xuY29uc3QgSEVBRElOR1NfQlVUVE9OTElTVF9MQUJFTCA9ICdIZWFkaW5ncydcblxuLy8gTWVzc2FnZSB0ZXh0XG5jb25zdCBIRUFESU5HX1RSQVNGT1JNQVRJT05fRk9SQklEREVOID0gJ0Vycm9yLCB5b3UgY2Fubm90IHRyYW5zZm9ybSB0aGUgY3VycmVudCBoZWFkZXIgaW4gdGhpcyB3YXkhJ1xuXG4vLyBTZWN0aW9uIHNlbGVjdG9yXG5jb25zdCBNQUlOX1NFQ1RJT05fU0VMRUNUT1IgPSAnc2VjdGlvbjpub3QoW3JvbGVdKSdcbmNvbnN0IFNFQ1RJT05fU0VMRUNUT1IgPSAnc2VjdGlvbjpub3QoW3JvbGVdKSdcbmNvbnN0IFNQRUNJQUxfU0VDVElPTl9TRUxFQ1RPUiA9ICdzZWN0aW9uW3JvbGVdJ1xuY29uc3QgQklCTElPR1JBUEhZX1NFTEVDVE9SID0gJ3NlY3Rpb25bcm9sZT1kb2MtYmlibGlvZ3JhcGh5XSdcbmNvbnN0IEVORE5PVEVTX1NFTEVDVE9SID0gJ3NlY3Rpb25bcm9sZT1kb2MtZW5kbm90ZXNdJ1xuY29uc3QgRU5ETk9URV9TRUxFQ1RPUiA9ICdzZWN0aW9uW3JvbGU9ZG9jLWVuZG5vdGVdJ1xuXG4vLyBFbGVtZW50IHNlbGVjdG9yXG5jb25zdCBIMSA9ICdoMSdcbmNvbnN0IEJJQkxJT0VOVFJZX1NFTEVDVE9SID0gJ2xpW3JvbGU9ZG9jLWJpYmxpb2VudHJ5XSdcblxuXG4vLyNlbmRyZWdpb25cblxuLy8jcmVnaW9uIGNvbW1hbmRzXG5cbmNvbnN0IERFTEVURV9DTUQgPSAnRGVsZXRlJ1xuY29uc3QgVU5ET19DTUQgPSAnVW5kbydcbmNvbnN0IFJFRE9fQ01EID0gJ1JlZG8nXG5cbi8vI2VuZHJlZ2lvblxuXG4vLyNyZWdpb24gQW5ub3RhdGlvbnNcblxuY29uc3Qgc2lkZV9ub3RlX3JlcGx5X3NlbGVjdG9yID0gJy5zaWRlX25vdGVfcmVwbHknXG5jb25zdCB0b2dnbGVfYW5ub3RhdGlvbl9zZWxlY3RvciA9ICcjdG9nZ2xlQW5ub3RhdGlvbnMnXG5jb25zdCB0b2dnbGVfc2lkZWJhcl9zZWxlY3RvciA9ICcjdG9nZ2xlU2lkZWJhcidcblxuY29uc3QgYW5ub3RhdGlvbl93cmFwcGVyX3NlbGVjdG9yID0gJ3NwYW5bZGF0YS1yYXNoLWFubm90YXRpb24tdHlwZV0nXG5jb25zdCBzZW1hbnRpY19hbm5vdGF0aW9uX3NlbGVjdG9yID0gJ3NjcmlwdFt0eXBlPVwiYXBwbGljYXRpb24vbGQranNvblwiXSdcbmNvbnN0IG1jZV9zZW1hbnRpY19hbm5vdGF0aW9uX3NlbGVjdG9yID0gJ3NjcmlwdFt0eXBlPVwibWNlLWFwcGxpY2F0aW9uL2xkK2pzb25cIl0nXG5cblxuLy8jZW5kcmVnaW9uXG5cbmNvbnN0IE5PTl9FRElUQUJMRV9IRUFERVJfU0VMRUNUT1IgPSAnaGVhZGVyLnBhZ2UtaGVhZGVyLmNvbnRhaW5lci5jZ2VuJ1xuY29uc3QgQklCTElPRU5UUllfU1VGRklYID0gJ2JpYmxpb2VudHJ5XydcbmNvbnN0IEVORE5PVEVfU1VGRklYID0gJ2VuZG5vdGVfJ1xuXG5cbmNvbnN0IEFCU1RSQUNUX1NFTEVDVE9SID0gJ3NlY3Rpb25bcm9sZT1kb2MtYWJzdHJhY3RdJ1xuY29uc3QgQUNLTk9XTEVER0VNRU5UU19TRUxFQ1RPUiA9ICdzZWN0aW9uW3JvbGU9ZG9jLWFja25vd2xlZGdlbWVudHNdJ1xuXG5cblxuY29uc3QgTUVOVV9TRUxFQ1RPUiA9ICdkaXZbaWRePW1jZXVfXVtpZCQ9LWJvZHldW3JvbGU9bWVudV0nXG5cbmNvbnN0IERBVEFfVVBHUkFERSA9ICdkYXRhLXVwZ3JhZGUnXG5jb25zdCBEQVRBX0RPV05HUkFERSA9ICdkYXRhLWRvd25ncmFkZSdcblxuLy8gSW5saW5lIEVycm9yc1xuY29uc3QgSU5MSU5FX0VSUk9SUyA9ICdFcnJvciwgSW5saW5lIGVsZW1lbnRzIGNhbiBiZSBPTkxZIGNyZWF0ZWQgaW5zaWRlIHRoZSBzYW1lIHBhcmFncmFwaCdcblxuLy8gQW5ub3RhdGlvbiBzZWxlY3RlZCBpbWFnZSBlcnJvclxuY29uc3QgQU5OT1RBVElPTl9FUlJPUl9JTUFHRV9TRUxFQ1RFRCA9ICdFaG0sIGRvIHlvdSByZWFsbHkgd2FudCB0byBhbm5vdGF0ZSBmaWd1cmVzPyA6KCdcblxuXG5cbmNvbnN0IERJU0FCTEVfU0VMRUNUT1JfRklHVVJFUyA9ICdmaWd1cmUgKiwgaDEsIGgyLCBoMywgaDQsIGg1LCBoNiwnICsgQklCTElPR1JBUEhZX1NFTEVDVE9SXG5cbmNvbnN0IEZJR1VSRV9TRUxFQ1RPUiA9ICdmaWd1cmVbaWRdJ1xuXG5jb25zdCBGSUdVUkVfVEFCTEVfU0VMRUNUT1IgPSBgJHtGSUdVUkVfU0VMRUNUT1J9Omhhcyh0YWJsZSlgXG5jb25zdCBUQUJMRV9TVUZGSVggPSAndGFibGVfJ1xuXG5jb25zdCBGSUdVUkVfSU1BR0VfU0VMRUNUT1IgPSBgJHtGSUdVUkVfU0VMRUNUT1J9OmhhcyhpbWc6bm90KFtyb2xlPW1hdGhdKSlgXG5jb25zdCBJTUFHRV9TVUZGSVggPSAnaW1nXydcblxuY29uc3QgRklHVVJFX0ZPUk1VTEFfU0VMRUNUT1IgPSBgJHtGSUdVUkVfU0VMRUNUT1J9Omhhcyhzdmdbcm9sZT1tYXRoXSlgXG5jb25zdCBJTkxJTkVfRk9STVVMQV9TRUxFQ1RPUiA9IGBzcGFuOmhhcyhzdmdbcm9sZT1tYXRoXSlgXG5jb25zdCBGT1JNVUxBX1NVRkZJWCA9ICdmb3JtdWxhXydcblxuY29uc3QgRklHVVJFX0xJU1RJTkdfU0VMRUNUT1IgPSBgJHtGSUdVUkVfU0VMRUNUT1J9OmhhcyhwcmU6aGFzKGNvZGUpKWBcbmNvbnN0IExJU1RJTkdfU1VGRklYID0gJ2xpc3RpbmdfJ1xuXG5jb25zdCBESVNBQkxFX1NFTEVDVE9SX0lOTElORSA9ICd0YWJsZSwgaW1nLCBwcmUsIGNvZGUnXG5cbmNvbnN0IFNJREVCQVJfQU5OT1RBVElPTiA9ICdhc2lkZSNhbm5vdGF0aW9ucydcblxuXG4iLCIvKipcbiAqIFJBU0ggc2VjdGlvbiBwbHVnaW4gUkFKRVxuICovXG5cbnRpbnltY2UuUGx1Z2luTWFuYWdlci5hZGQoJ3JhamVfc2VjdGlvbicsIGZ1bmN0aW9uIChlZGl0b3IpIHtcblxuICAvLyBBZGQgdGhlIGJ1dHRvbiB0byBzZWxlY3QgdGhlIHNlY3Rpb25cbiAgZWRpdG9yLmFkZEJ1dHRvbigncmFqZV9zZWN0aW9uJywge1xuICAgIHR5cGU6ICdtZW51YnV0dG9uJyxcbiAgICB0ZXh0OiBIRUFESU5HU19CVVRUT05MSVNUX0xBQkVMLFxuICAgIHRpdGxlOiAnaGVhZGluZycsXG4gICAgaWNvbnM6IGZhbHNlLFxuXG4gICAgLy8gU2VjdGlvbnMgc3ViIG1lbnVcbiAgICBtZW51OiBbe1xuICAgICAgdGV4dDogYCR7SEVBRElOR19CVVRUT05fTEFCRUx9MS5gLFxuICAgICAgb25jbGljazogZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgc2VjdGlvbi5hZGRPckRvd25VcGdyYWRlKGUsIDEpXG4gICAgICB9XG4gICAgfSwge1xuICAgICAgdGV4dDogYCR7SEVBRElOR19CVVRUT05fTEFCRUx9MS4xLmAsXG4gICAgICBvbmNsaWNrOiBmdW5jdGlvbiAoZSkge1xuICAgICAgICBzZWN0aW9uLmFkZE9yRG93blVwZ3JhZGUoZSwgMilcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICB0ZXh0OiBgJHtIRUFESU5HX0JVVFRPTl9MQUJFTH0xLjEuMS5gLFxuICAgICAgb25jbGljazogZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgc2VjdGlvbi5hZGRPckRvd25VcGdyYWRlKGUsIDMpXG4gICAgICB9XG4gICAgfSwge1xuICAgICAgdGV4dDogYCR7SEVBRElOR19CVVRUT05fTEFCRUx9MS4xLjEuMS5gLFxuICAgICAgb25jbGljazogZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgc2VjdGlvbi5hZGRPckRvd25VcGdyYWRlKGUsIDQpXG4gICAgICB9XG4gICAgfSwge1xuICAgICAgdGV4dDogYCR7SEVBRElOR19CVVRUT05fTEFCRUx9MS4xLjEuMS4xLmAsXG4gICAgICBvbmNsaWNrOiBmdW5jdGlvbiAoZSkge1xuICAgICAgICBzZWN0aW9uLmFkZE9yRG93blVwZ3JhZGUoZSwgNSlcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICB0ZXh0OiBgJHtIRUFESU5HX0JVVFRPTl9MQUJFTH0xLjEuMS4xLjEuMS5gLFxuICAgICAgb25jbGljazogZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgc2VjdGlvbi5hZGRPckRvd25VcGdyYWRlKGUsIDYpXG4gICAgICB9XG4gICAgfSwge1xuICAgICAgdGV4dDogU1BFQ0lBTF9CVVRUT05fTEFCRUwsXG4gICAgICBtZW51OiBbe1xuICAgICAgICAgIHRleHQ6IEFCU1RSQUNUX0JVVFRPTl9MQUJFTCxcbiAgICAgICAgICBvbmNsaWNrOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICAgIHNlY3Rpb24uYWRkQWJzdHJhY3QoKVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIHRleHQ6IEFDS05PV0xFREdFTUVOVFNfQlVUVE9OX0xBQkVMLFxuICAgICAgICAgIG9uY2xpY2s6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlY3Rpb24uYWRkQWNrbm93bGVkZ2VtZW50cygpXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgdGV4dDogUkVGRVJFTkNFU19CVVRUT05fTEFCRUwsXG4gICAgICAgICAgb25jbGljazogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VjdGlvbi5oYW5kbGVBZGRCbGlibGlvZW50cnkoKVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgXVxuICAgIH1dXG4gIH0pXG5cbiAgZWRpdG9yLm9uKCdrZXlEb3duJywgZnVuY3Rpb24gKGUpIHtcblxuICAgIC8vIGluc3RhbmNlIG9mIHRoZSBzZWxlY3RlZCBlbGVtZW50XG4gICAgbGV0IHNlbGVjdGVkRWxlbWVudCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcbiAgICBsZXQgc2VsZWN0aW9uID0gdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uXG5cbiAgICBsZXQgc3RhcnROb2RlID0gJChzZWxlY3Rpb24uZ2V0Um5nKCkuc3RhcnRDb250YWluZXIpXG4gICAgbGV0IGVuZE5vZGUgPSAkKHNlbGVjdGlvbi5nZXRSbmcoKS5lbmRDb250YWluZXIpXG5cbiAgICAvLyBDaGVjayBpZiB0aGUgY2FyZXQgaXMgaW5zaWRlIGEgc2VjdGlvblxuICAgIGlmICgoc2VjdGlvbi5jdXJzb3JJblNlY3Rpb24oc2VsZWN0aW9uKSB8fCBzZWN0aW9uLmN1cnNvckluU3BlY2lhbFNlY3Rpb24oc2VsZWN0aW9uKSkpIHtcblxuICAgICAgLy8gQmxvY2sgc3BlY2lhbCBjaGFycyBpbiBzcGVjaWFsIGVsZW1lbnRzXG4gICAgICBpZiAoY2hlY2tJZlNwZWNpYWxDaGFyKGUua2V5Q29kZSkgJiZcbiAgICAgICAgKHN0YXJ0Tm9kZS5wYXJlbnRzKFNQRUNJQUxfU0VDVElPTl9TRUxFQ1RPUikubGVuZ3RoIHx8IGVuZE5vZGUucGFyZW50cyhTUEVDSUFMX1NFQ1RJT05fU0VMRUNUT1IpLmxlbmd0aCkgJiZcbiAgICAgICAgKHN0YXJ0Tm9kZS5wYXJlbnRzKEgxKS5sZW5ndGggPiAwIHx8IGVuZE5vZGUucGFyZW50cyhIMSkubGVuZ3RoID4gMCkpIHtcblxuICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpXG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgfVxuXG4gICAgICAvKipcbiAgICAgICAqIENoZWNrIGlmIEJBQ0tTUEFDRSBvciBDQU5DIGFyZSBwcmVzc2VkXG4gICAgICAgKi9cbiAgICAgIGlmIChlLmtleUNvZGUgPT0gOCB8fCBlLmtleUNvZGUgPT0gNDYpIHtcblxuICAgICAgICAvLyBJZiB0aGUgc2VjdGlvbiBpc24ndCBjb2xsYXBzZWRcbiAgICAgICAgaWYgKCF0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uaXNDb2xsYXBzZWQoKSkge1xuXG4gICAgICAgICAgLy8gSWYgdGhlIHNlbGVjdGlvbiBjb250YWlucyBhdCBsZWFzdCBhIGJpYmxpb2VudHJ5XG4gICAgICAgICAgaWYgKHNlbGVjdGlvbkNvbnRlbnQuY29udGFpbnNCaWJsaW9lbnRyaWVzKHNlbGVjdGlvbikpIHtcblxuICAgICAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKVxuXG4gICAgICAgICAgICAvLyBCb3RoIGRlbGV0ZSBldmVudCBhbmQgdXBkYXRlIGFyZSBzdG9yZWQgaW4gYSBzaW5nbGUgdW5kbyBsZXZlbFxuICAgICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLmV4ZWNDb21tYW5kKERFTEVURV9DTUQpXG4gICAgICAgICAgICAgIHNlY3Rpb24udXBkYXRlQmlibGlvZ3JhcGh5U2VjdGlvbigpXG4gICAgICAgICAgICAgIHVwZGF0ZVJlZmVyZW5jZXMoKVxuXG4gICAgICAgICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gSWYgdGhlIHNlbGVjdGlvbiBjb250YWlucyB0aGUgZW50aXJlIGJpYmxpb2dyYXBoeSBzZWN0aW9uXG4gICAgICAgICAgaWYgKHNlbGVjdGlvbkNvbnRlbnQuY29udGFpbnNCaWJsaW9ncmFwaHkoc2VsZWN0aW9uKSkge1xuXG4gICAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpXG5cbiAgICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgICAgICAvLyBFeGVjdXRlIG5vcm1hbCBkZWxldGVcbiAgICAgICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IuJChCSUJMSU9HUkFQSFlfU0VMRUNUT1IpLnJlbW92ZSgpXG4gICAgICAgICAgICAgIHVwZGF0ZVJlZmVyZW5jZXMoKVxuXG4gICAgICAgICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gUmVzdHJ1Y3R1cmUgdGhlIGVudGlyZSBib2R5IGlmIHRoZSBzZWN0aW9uIGlzbid0IGNvbGxhcHNlZCBhbmQgbm90IGluc2lkZSBhIHNwZWNpYWwgc2VjdGlvblxuICAgICAgICAgIGlmICghc2VjdGlvbi5jdXJzb3JJblNwZWNpYWxTZWN0aW9uKHNlbGVjdGlvbikpIHtcbiAgICAgICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKClcbiAgICAgICAgICAgIHNlY3Rpb24ubWFuYWdlRGVsZXRlKClcbiAgICAgICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gSWYgdGhlIHNlY3Rpb24gaXMgY29sbGFwc2VkXG4gICAgICAgIGlmICh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uaXNDb2xsYXBzZWQoKSkge1xuXG4gICAgICAgICAgLy8gSWYgdGhlIHNlbGVjdGlvbiBpcyBpbnNpZGUgYSBzcGVjaWFsIHNlY3Rpb25cbiAgICAgICAgICBpZiAoc2VjdGlvbi5jdXJzb3JJblNwZWNpYWxTZWN0aW9uKHNlbGVjdGlvbikpIHtcblxuICAgICAgICAgICAgLy8gUmVtb3ZlIHNwZWNpYWwgc2VjdGlvbiBpZiB0aGUgY3Vyc29yIGlzIGF0IHRoZSBiZWdpbm5pbmdcbiAgICAgICAgICAgIGlmICgoc3RhcnROb2RlLnBhcmVudHMoSDEpLmxlbmd0aCB8fCBzdGFydE5vZGUuaXMoSDEpKSAmJiB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Um5nKCkuc3RhcnRPZmZzZXQgPT0gMCkge1xuXG4gICAgICAgICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKClcbiAgICAgICAgICAgICAgc2VjdGlvbi5kZWxldGVTcGVjaWFsU2VjdGlvbihzZWxlY3RlZEVsZW1lbnQpXG4gICAgICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBpZiB0aGUgY3Vyc29yIGlzIGF0IHRoZSBiZWdpbm5pbmcgb2YgYSBlbXB0eSBwIGluc2lkZSBpdHMgYmlibGlvZW50cnksIHJlbW92ZSBpdCBhbmQgdXBkYXRlIHRoZSByZWZlcmVuY2VzXG4gICAgICAgICAgICBpZiAoc2VsZWN0aW9uQ29udGVudC5pc0F0QmVnaW5uaW5nT2ZFbXB0eUJpYmxpb2VudHJ5KHNlbGVjdGlvbikpIHtcblxuICAgICAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpXG5cbiAgICAgICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgICAgICAgLy8gRXhlY3V0ZSBub3JtYWwgZGVsZXRlXG4gICAgICAgICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IuZXhlY0NvbW1hbmQoREVMRVRFX0NNRClcbiAgICAgICAgICAgICAgICB1cGRhdGVSZWZlcmVuY2VzKClcblxuICAgICAgICAgICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBpZiB0aGUgY3Vyc29yIGlzIGF0IHRoZSBiZWdpbm5pbmcgb2YgdGhlIGZpcnN0IGVtcHR5IHAgaW5zaWRlIGEgZm9vdG5vdGUsIHJlbW92ZSBpdCBhbmQgdXBkYXRlIHRoZSByZWZlcmVuY2VzXG4gICAgICAgICAgICBpZiAoc2VsZWN0aW9uQ29udGVudC5pc0F0QmVnaW5uaW5nT2ZFbXB0eUVuZG5vdGUoc2VsZWN0aW9uKSkge1xuXG4gICAgICAgICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKClcblxuICAgICAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICAgICAgICBsZXQgZW5kbm90ZSA9IHNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKEVORE5PVEVfU0VMRUNUT1IpXG5cbiAgICAgICAgICAgICAgICAvLyBJZiB0aGUgY3VycmVudCBlbmRub3RlIGlzIHRoZSBsYXN0IG9uZSByZW1vdmUgdGhlIGVudGlyZSBmb290bm90ZXMgc2VjdGlvblxuICAgICAgICAgICAgICAgIGlmICghZW5kbm90ZS5wcmV2KEVORE5PVEVfU0VMRUNUT1IpLmxlbmd0aCAmJiAhZW5kbm90ZS5uZXh0KEVORE5PVEVfU0VMRUNUT1IpLmxlbmd0aClcbiAgICAgICAgICAgICAgICAgICQoRU5ETk9URVNfU0VMRUNUT1IpLnJlbW92ZSgpXG5cbiAgICAgICAgICAgICAgICBlbHNlIFxuICAgICAgICAgICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IuZXhlY0NvbW1hbmQoREVMRVRFX0NNRClcbiAgICAgICAgICAgICAgICBcblxuICAgICAgICAgICAgICAgIHVwZGF0ZVJlZmVyZW5jZXMoKVxuXG4gICAgICAgICAgICAgICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG4gICAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gUHJldmVudCByZW1vdmUgZnJvbSBoZWFkZXJcbiAgICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC5pcyhOT05fRURJVEFCTEVfSEVBREVSX1NFTEVDVE9SKSB8fFxuICAgICAgICAgIChzZWxlY3RlZEVsZW1lbnQuYXR0cignZGF0YS1tY2UtY2FyZXQnKSA9PSAnYWZ0ZXInICYmIHNlbGVjdGVkRWxlbWVudC5wYXJlbnQoKS5pcyhSQUpFX1NFTEVDVE9SKSkgfHxcbiAgICAgICAgICAoc2VsZWN0ZWRFbGVtZW50LmF0dHIoJ2RhdGEtbWNlLWNhcmV0JykgJiYgc2VsZWN0ZWRFbGVtZW50LnBhcmVudCgpLmlzKFJBSkVfU0VMRUNUT1IpKSA9PSAnYmVmb3JlJylcbiAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgIH1cblxuICAgICAgLyoqXG4gICAgICAgKiBDaGVjayBpZiBFTlRFUiBpcyBwcmVzc2VkXG4gICAgICAgKi9cbiAgICAgIGlmIChlLmtleUNvZGUgPT0gMTMpIHtcblxuICAgICAgICAvLyBXaGVuIGVudGVyIGlzIHByZXNzZWQgaW5zaWRlIGFuIGhlYWRlciwgbm90IGF0IHRoZSBlbmQgb2YgaXRcbiAgICAgICAgaWYgKGN1cnNvci5pc0luc2lkZUhlYWRpbmcoc2VsZWN0aW9uKSkge1xuICAgICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKClcbiAgICAgICAgICBzZWN0aW9uLmFkZFdpdGhFbnRlcigpXG4gICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgIH1cblxuICAgICAgICAvLyBJZiBzZWxlY3Rpb24gaXMgYmVmb3JlL2FmdGVyIGhlYWRlclxuICAgICAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LmlzKCdwJykpIHtcblxuICAgICAgICAgIC8vIEJsb2NrIGVudGVyIGJlZm9yZSBoZWFkZXJcbiAgICAgICAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LmF0dHIoJ2RhdGEtbWNlLWNhcmV0JykgPT0gJ2JlZm9yZScpIHtcbiAgICAgICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKClcbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICAgIH1cblxuXG4gICAgICAgICAgLy8gQWRkIG5ldyBzZWN0aW9uIGFmdGVyIGhlYWRlclxuICAgICAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQuYXR0cignZGF0YS1tY2UtY2FyZXQnKSA9PSAnYWZ0ZXInKSB7XG4gICAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpXG4gICAgICAgICAgICBzZWN0aW9uLmFkZCgxKVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gSWYgZW50ZXIgaXMgcHJlc3NlZCBpbnNpZGUgYmlibGlvZ3JhcGh5IHNlbGVjdG9yXG4gICAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQucGFyZW50cyhCSUJMSU9HUkFQSFlfU0VMRUNUT1IpLmxlbmd0aCkge1xuXG4gICAgICAgICAgbGV0IGlkID0gZ2V0U3VjY2Vzc2l2ZUVsZW1lbnRJZChCSUJMSU9FTlRSWV9TRUxFQ1RPUiwgQklCTElPRU5UUllfU1VGRklYKVxuXG4gICAgICAgICAgLy8gUHJlc3NpbmcgZW50ZXIgaW4gaDEgd2lsbCBhZGQgYSBuZXcgYmlibGlvZW50cnkgYW5kIGNhcmV0IHJlcG9zaXRpb25cbiAgICAgICAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LmlzKEgxKSkge1xuXG4gICAgICAgICAgICBzZWN0aW9uLmFkZEJpYmxpb2VudHJ5KGlkKVxuICAgICAgICAgICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gSWYgc2VsZWN0ZWQgZWxlbWVudCBpcyBpbnNpZGUgdGV4dFxuICAgICAgICAgIGVsc2UgaWYgKHNlbGVjdGVkRWxlbWVudC5pcygncCcpKVxuICAgICAgICAgICAgc2VjdGlvbi5hZGRCaWJsaW9lbnRyeShpZCwgbnVsbCwgc2VsZWN0ZWRFbGVtZW50LnBhcmVudCgnbGknKSlcblxuICAgICAgICAgIC8vIElmIHNlbGVjdGVkIGVsZW1lbnQgaXMgd2l0aG91dCB0ZXh0XG4gICAgICAgICAgZWxzZSBpZiAoc2VsZWN0ZWRFbGVtZW50LmlzKCdsaScpKVxuICAgICAgICAgICAgc2VjdGlvbi5hZGRCaWJsaW9lbnRyeShpZCwgbnVsbCwgc2VsZWN0ZWRFbGVtZW50KVxuXG4gICAgICAgICAgLy8gTW92ZSBjYXJldCAjMTA1XG4gICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLnNldEN1cnNvckxvY2F0aW9uKHRpbnltY2UuYWN0aXZlRWRpdG9yLmRvbS5zZWxlY3QoYCR7QklCTElPRU5UUllfU0VMRUNUT1J9IyR7aWR9ID4gcGApWzBdLCBmYWxzZSlcbiAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFkZGluZyBzZWN0aW9ucyB3aXRoIHNob3J0Y3V0cyAjXG4gICAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQuaXMoJ3AnKSAmJiBzZWxlY3RlZEVsZW1lbnQudGV4dCgpLnRyaW0oKS5zdWJzdHJpbmcoMCwgMSkgPT0gJyMnKSB7XG5cbiAgICAgICAgICBsZXQgbGV2ZWwgPSBzZWN0aW9uLmdldExldmVsRnJvbUhhc2goc2VsZWN0ZWRFbGVtZW50LnRleHQoKS50cmltKCkpXG4gICAgICAgICAgbGV0IGRlZXBuZXNzID0gJChzZWxlY3RlZEVsZW1lbnQpLnBhcmVudHNVbnRpbChSQUpFX1NFTEVDVE9SKS5sZW5ndGggLSBsZXZlbCArIDFcblxuICAgICAgICAgIC8vIEluc2VydCBzZWN0aW9uIG9ubHkgaWYgY2FyZXQgaXMgaW5zaWRlIGFic3RyYWN0IHNlY3Rpb24sIGFuZCB1c2VyIGlzIGdvaW5nIHRvIGluc2VydCBhIHN1YiBzZWN0aW9uXG4gICAgICAgICAgLy8gT1IgdGhlIGN1cnNvciBpc24ndCBpbnNpZGUgb3RoZXIgc3BlY2lhbCBzZWN0aW9uc1xuICAgICAgICAgIC8vIEFORCBzZWxlY3RlZEVsZW1lbnQgaXNuJ3QgaW5zaWRlIGEgZmlndXJlXG4gICAgICAgICAgaWYgKCgoc2VsZWN0ZWRFbGVtZW50LnBhcmVudHMoQUJTVFJBQ1RfU0VMRUNUT1IpLmxlbmd0aCAmJiBkZWVwbmVzcyA+IDApIHx8ICFzZWxlY3RlZEVsZW1lbnQucGFyZW50cyhTUEVDSUFMX1NFQ1RJT05fU0VMRUNUT1IpLmxlbmd0aCkgJiYgIXNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKEZJR1VSRV9TRUxFQ1RPUikubGVuZ3RoKSB7XG5cbiAgICAgICAgICAgIHNlY3Rpb24uYWRkKGxldmVsLCBzZWxlY3RlZEVsZW1lbnQudGV4dCgpLnN1YnN0cmluZyhsZXZlbCkudHJpbSgpKVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9KVxuXG4gIGVkaXRvci5vbignTm9kZUNoYW5nZScsIGZ1bmN0aW9uIChlKSB7XG4gICAgc2VjdGlvbi51cGRhdGVTZWN0aW9uVG9vbGJhcigpXG4gIH0pXG59KVxuXG5zZWN0aW9uID0ge1xuXG4gIC8qKlxuICAgKiBGdW5jdGlvbiBjYWxsZWQgd2hlbiBhIG5ldyBzZWN0aW9uIG5lZWRzIHRvIGJlIGF0dGFjaGVkLCB3aXRoIGJ1dHRvbnNcbiAgICovXG4gIGFkZDogKGxldmVsLCB0ZXh0KSA9PiB7XG5cbiAgICAvLyBTZWxlY3QgY3VycmVudCBub2RlXG4gICAgbGV0IHNlbGVjdGVkRWxlbWVudCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcblxuICAgIC8vIENyZWF0ZSB0aGUgc2VjdGlvblxuICAgIGxldCBuZXdTZWN0aW9uID0gc2VjdGlvbi5jcmVhdGUodGV4dCAhPSBudWxsID8gdGV4dCA6IHNlbGVjdGVkRWxlbWVudC5odG1sKCkudHJpbSgpLCBsZXZlbClcblxuICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgLy8gQ2hlY2sgd2hhdCBraW5kIG9mIHNlY3Rpb24gbmVlZHMgdG8gYmUgaW5zZXJ0ZWRcbiAgICAgIGlmIChzZWN0aW9uLm1hbmFnZVNlY3Rpb24oc2VsZWN0ZWRFbGVtZW50LCBuZXdTZWN0aW9uLCBsZXZlbCA/IGxldmVsIDogc2VsZWN0ZWRFbGVtZW50LnBhcmVudHNVbnRpbChSQUpFX1NFTEVDVE9SKS5sZW5ndGgpKSB7XG5cbiAgICAgICAgLy8gUmVtb3ZlIHRoZSBzZWxlY3RlZCBzZWN0aW9uXG4gICAgICAgIHNlbGVjdGVkRWxlbWVudC5yZW1vdmUoKVxuXG4gICAgICAgIC8vIElmIHRoZSBuZXcgaGVhZGluZyBoYXMgdGV4dCBub2RlcywgdGhlIG9mZnNldCB3b24ndCBiZSAwIChhcyBub3JtYWwpIGJ1dCBpbnN0ZWFkIGl0J2xsIGJlIGxlbmd0aCBvZiBub2RlIHRleHRcbiAgICAgICAgbW92ZUNhcmV0KG5ld1NlY3Rpb24uZmluZCgnOmhlYWRlcicpLmZpcnN0KClbMF0pXG5cbiAgICAgICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG4gICAgICB9XG4gICAgfSlcbiAgfSxcblxuICAvKipcbiAgICogXG4gICAqL1xuICBhZGRPckRvd25VcGdyYWRlOiAoZSwgbGV2ZWwpID0+IHtcblxuICAgIGxldCBzZWxlY3RlZE1lbnVJdGVtID0gJChlLnRhcmdldCkucGFyZW50KCcubWNlLW1lbnUtaXRlbScpXG5cbiAgICAvLyBVcGdyYWRlIHRoZSBoZWFkZXIgc2VsZWN0ZWQgZnJvbSBpZnJhbWVcbiAgICBpZiAoc2VsZWN0ZWRNZW51SXRlbS5hdHRyKERBVEFfVVBHUkFERSkpXG4gICAgICByZXR1cm4gdGhpcy51cGdyYWRlKClcblxuICAgIC8vIERvd25ncmFkZSB0aGUgaGVhZGVyIHNlbGVjdGVkIGZyb20gaWZyYW1lXG4gICAgaWYgKHNlbGVjdGVkTWVudUl0ZW0uYXR0cihEQVRBX0RPV05HUkFERSkpXG4gICAgICByZXR1cm4gdGhpcy5kb3duZ3JhZGUoKVxuXG4gICAgLy8gVHJhbnNmb3JtIHRoZSBwYXJhZ3JhcGggc2VsZWN0ZWQgZnJvbSBpZnJhbWVcbiAgICByZXR1cm4gdGhpcy5hZGQobGV2ZWwpXG4gIH0sXG5cbiAgLyoqXG4gICAqIEZ1bmN0aW9uIGNhbGxlZCB3aGVuIGEgbmV3IHNlY3Rpb24gbmVlZHMgdG8gYmUgYXR0YWNoZWQsIHdpdGggYnV0dG9uc1xuICAgKi9cbiAgYWRkV2l0aEVudGVyOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAvLyBTZWxlY3QgY3VycmVudCBub2RlXG4gICAgbGV0IHNlbGVjdGVkRWxlbWVudCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcblxuICAgIC8vIElmIHRoZSBzZWN0aW9uIGlzbid0IHNwZWNpYWxcbiAgICBpZiAoIXNlbGVjdGVkRWxlbWVudC5wYXJlbnQoKS5hdHRyKCdyb2xlJykpIHtcblxuICAgICAgbGV2ZWwgPSBzZWxlY3RlZEVsZW1lbnQucGFyZW50c1VudGlsKFJBSkVfU0VMRUNUT1IpLmxlbmd0aFxuXG4gICAgICAvLyBDcmVhdGUgdGhlIHNlY3Rpb25cbiAgICAgIGxldCBuZXdTZWN0aW9uID0gdGhpcy5jcmVhdGUoc2VsZWN0ZWRFbGVtZW50LnRleHQoKS50cmltKCkuc3Vic3RyaW5nKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRSbmcoKS5zdGFydE9mZnNldCksIGxldmVsKVxuXG4gICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgLy8gQ2hlY2sgd2hhdCBraW5kIG9mIHNlY3Rpb24gbmVlZHMgdG8gYmUgaW5zZXJ0ZWRcbiAgICAgICAgc2VjdGlvbi5tYW5hZ2VTZWN0aW9uKHNlbGVjdGVkRWxlbWVudCwgbmV3U2VjdGlvbiwgbGV2ZWwpXG5cbiAgICAgICAgLy8gUmVtb3ZlIHRoZSBzZWxlY3RlZCBzZWN0aW9uXG4gICAgICAgIHNlbGVjdGVkRWxlbWVudC5odG1sKHNlbGVjdGVkRWxlbWVudC50ZXh0KCkudHJpbSgpLnN1YnN0cmluZygwLCB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Um5nKCkuc3RhcnRPZmZzZXQpKVxuXG4gICAgICAgIG1vdmVDYXJldChuZXdTZWN0aW9uLmZpbmQoJzpoZWFkZXInKS5maXJzdCgpWzBdLCB0cnVlKVxuXG4gICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuICAgICAgfSlcbiAgICB9IGVsc2VcbiAgICAgIG5vdGlmeSgnRXJyb3IsIGhlYWRlcnMgb2Ygc3BlY2lhbCBzZWN0aW9ucyAoYWJzdHJhY3QsIGFja25vd2xlZG1lbnRzKSBjYW5ub3QgYmUgc3BsaXR0ZWQnLCAnZXJyb3InLCA0MDAwKVxuICB9LFxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIGxhc3QgaW5zZXJ0ZWQgaWRcbiAgICovXG4gIGdldE5leHRJZDogZnVuY3Rpb24gKCkge1xuICAgIGxldCBpZCA9IDBcbiAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci4kKCdzZWN0aW9uW2lkXScpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKCQodGhpcykuYXR0cignaWQnKS5pbmRleE9mKCdzZWN0aW9uJykgPiAtMSkge1xuICAgICAgICBsZXQgY3VycklkID0gcGFyc2VJbnQoJCh0aGlzKS5hdHRyKCdpZCcpLnJlcGxhY2UoJ3NlY3Rpb24nLCAnJykpXG4gICAgICAgIGlkID0gaWQgPiBjdXJySWQgPyBpZCA6IGN1cnJJZFxuICAgICAgfVxuICAgIH0pXG4gICAgcmV0dXJuIGBzZWN0aW9uJHtpZCsxfWBcbiAgfSxcblxuICAvKipcbiAgICogUmV0cmlldmUgYW5kIHRoZW4gcmVtb3ZlIGV2ZXJ5IHN1Y2Nlc3NpdmUgZWxlbWVudHMgXG4gICAqL1xuICBnZXRTdWNjZXNzaXZlRWxlbWVudHM6IGZ1bmN0aW9uIChlbGVtZW50LCBkZWVwbmVzcykge1xuXG4gICAgbGV0IHN1Y2Nlc3NpdmVFbGVtZW50cyA9ICQoJzxkaXY+PC9kaXY+JylcblxuICAgIHdoaWxlIChkZWVwbmVzcyA+PSAwKSB7XG5cbiAgICAgIGlmIChlbGVtZW50Lm5leHRBbGwoJzpub3QoLmZvb3RlciknKSkge1xuXG4gICAgICAgIC8vIElmIHRoZSBkZWVwbmVzcyBpcyAwLCBvbmx5IHBhcmFncmFwaCBhcmUgc2F2ZWQgKG5vdCBzZWN0aW9ucylcbiAgICAgICAgaWYgKGRlZXBuZXNzID09IDApIHtcbiAgICAgICAgICAvLyBTdWNjZXNzaXZlIGVsZW1lbnRzIGNhbiBiZSBwIG9yIGZpZ3VyZXNcbiAgICAgICAgICBzdWNjZXNzaXZlRWxlbWVudHMuYXBwZW5kKGVsZW1lbnQubmV4dEFsbChgcCwke0ZJR1VSRV9TRUxFQ1RPUn1gKSlcbiAgICAgICAgICBlbGVtZW50Lm5leHRBbGwoKS5yZW1vdmUoYHAsJHtGSUdVUkVfU0VMRUNUT1J9YClcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdWNjZXNzaXZlRWxlbWVudHMuYXBwZW5kKGVsZW1lbnQubmV4dEFsbCgpKVxuICAgICAgICAgIGVsZW1lbnQubmV4dEFsbCgpLnJlbW92ZSgpXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgZWxlbWVudCA9IGVsZW1lbnQucGFyZW50KCdzZWN0aW9uJylcbiAgICAgIGRlZXBuZXNzLS1cbiAgICB9XG5cbiAgICByZXR1cm4gJChzdWNjZXNzaXZlRWxlbWVudHMuaHRtbCgpKVxuICB9LFxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGdldExldmVsRnJvbUhhc2g6IGZ1bmN0aW9uICh0ZXh0KSB7XG5cbiAgICBsZXQgbGV2ZWwgPSAwXG4gICAgdGV4dCA9IHRleHQuc3Vic3RyaW5nKDAsIHRleHQubGVuZ3RoID49IDYgPyA2IDogdGV4dC5sZW5ndGgpXG5cbiAgICB3aGlsZSAodGV4dC5sZW5ndGggPiAwKSB7XG5cbiAgICAgIGlmICh0ZXh0LnN1YnN0cmluZyh0ZXh0Lmxlbmd0aCAtIDEpID09ICcjJylcbiAgICAgICAgbGV2ZWwrK1xuXG4gICAgICAgIHRleHQgPSB0ZXh0LnN1YnN0cmluZygwLCB0ZXh0Lmxlbmd0aCAtIDEpXG4gICAgfVxuXG4gICAgcmV0dXJuIGxldmVsXG4gIH0sXG5cbiAgLyoqXG4gICAqIFJldHVybiBKUWV1cnkgb2JqZWN0IHRoYXQgcmVwcmVzZW50IHRoZSBzZWN0aW9uXG4gICAqL1xuICBjcmVhdGU6IGZ1bmN0aW9uICh0ZXh0LCBsZXZlbCkge1xuXG4gICAgLy8gVHJpbSB3aGl0ZSBzcGFjZXMgYW5kIGFkZCB6ZXJvX3NwYWNlIGNoYXIgaWYgbm90aGluZyBpcyBpbnNpZGVcbiAgICBpZiAodHlwZW9mIHRleHQgIT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgdGV4dCA9IHRleHQudHJpbSgpXG4gICAgICBpZiAodGV4dC5sZW5ndGggPT0gMClcbiAgICAgICAgdGV4dCA9IFwiPGJyPlwiXG4gICAgfSBlbHNlXG4gICAgICB0ZXh0ID0gXCI8YnI+XCJcblxuICAgIHJldHVybiAkKGA8c2VjdGlvbiBpZD1cIiR7dGhpcy5nZXROZXh0SWQoKX1cIj48aCR7bGV2ZWx9IGRhdGEtcmFzaC1vcmlnaW5hbC13cmFwcGVyPVwiaDFcIj4ke3RleHR9PC9oJHtsZXZlbH0+PC9zZWN0aW9uPmApXG4gIH0sXG5cbiAgLyoqXG4gICAqIENoZWNrIHdoYXQga2luZCBvZiBzZWN0aW9uIG5lZWRzIHRvIGJlIGFkZGVkLCBhbmQgcHJlY2VlZFxuICAgKi9cbiAgbWFuYWdlU2VjdGlvbjogZnVuY3Rpb24gKHNlbGVjdGVkRWxlbWVudCwgbmV3U2VjdGlvbiwgbGV2ZWwpIHtcblxuICAgIGxldCBkZWVwbmVzcyA9ICQoc2VsZWN0ZWRFbGVtZW50KS5wYXJlbnRzVW50aWwoJ2JvZHknKS5sZW5ndGggLSBsZXZlbCArIDFcblxuICAgIGlmIChkZWVwbmVzcyA+PSAwKSB7XG5cbiAgICAgIC8vIEJsb2NrIGluc2VydCBzZWxlY3Rpb24gaWYgY2FyZXQgaXMgaW5zaWRlIHNwZWNpYWwgc2VjdGlvbiwgYW5kIHVzZXIgaXMgZ29pbmcgdG8gaW5zZXJ0IGEgc3ViIHNlY3Rpb25cbiAgICAgIGlmICgoc2VsZWN0ZWRFbGVtZW50LnBhcmVudHMoU1BFQ0lBTF9TRUNUSU9OX1NFTEVDVE9SKS5sZW5ndGggJiYgZGVlcG5lc3MgIT0gMSkgfHwgKHNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKEFDS05PV0xFREdFTUVOVFNfU0VMRUNUT1IpLmxlbmd0aCAmJlxuICAgICAgICAgIHNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKEJJQkxJT0dSQVBIWV9TRUxFQ1RPUikgJiZcbiAgICAgICAgICBzZWxlY3RlZEVsZW1lbnQucGFyZW50cyhFTkROT1RFU19TRUxFQ1RPUikpKVxuICAgICAgICByZXR1cm4gZmFsc2VcblxuICAgICAgLy8gR2V0IGRpcmVjdCBwYXJlbnQgYW5kIGFuY2VzdG9yIHJlZmVyZW5jZVxuICAgICAgbGV0IHN1Y2Nlc3NpdmVFbGVtZW50cyA9IHRoaXMuZ2V0U3VjY2Vzc2l2ZUVsZW1lbnRzKHNlbGVjdGVkRWxlbWVudCwgZGVlcG5lc3MpXG5cbiAgICAgIGlmIChzdWNjZXNzaXZlRWxlbWVudHMubGVuZ3RoKVxuICAgICAgICBuZXdTZWN0aW9uLmFwcGVuZChzdWNjZXNzaXZlRWxlbWVudHMpXG5cbiAgICAgIC8vIENBU0U6IHN1YiBzZWN0aW9uXG4gICAgICBpZiAoZGVlcG5lc3MgPT0gMClcbiAgICAgICAgc2VsZWN0ZWRFbGVtZW50LmFmdGVyKG5ld1NlY3Rpb24pXG5cbiAgICAgIC8vIENBU0U6IHNpYmxpbmcgc2VjdGlvblxuICAgICAgZWxzZSBpZiAoZGVlcG5lc3MgPT0gMSlcbiAgICAgICAgc2VsZWN0ZWRFbGVtZW50LnBhcmVudCgnc2VjdGlvbicpLmFmdGVyKG5ld1NlY3Rpb24pXG5cbiAgICAgIC8vIENBU0U6IGFuY2VzdG9yIHNlY3Rpb24gYXQgYW55IHVwbGV2ZWxcbiAgICAgIGVsc2VcbiAgICAgICAgJChzZWxlY3RlZEVsZW1lbnQucGFyZW50cygnc2VjdGlvbicpW2RlZXBuZXNzIC0gMV0pLmFmdGVyKG5ld1NlY3Rpb24pXG5cbiAgICAgIGhlYWRpbmdEaW1lbnNpb24oKVxuXG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogXG4gICAqL1xuICB1cGdyYWRlOiBmdW5jdGlvbiAoKSB7XG5cbiAgICBsZXQgc2VsZWN0ZWRFbGVtZW50ID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuXG4gICAgaWYgKHNlbGVjdGVkRWxlbWVudC5pcygnOmhlYWRlcicpKSB7XG5cbiAgICAgIC8vIEdldCB0aGUgcmVmZXJlbmNlcyBvZiBzZWxlY3RlZCBhbmQgcGFyZW50IHNlY3Rpb25cbiAgICAgIGxldCBzZWxlY3RlZFNlY3Rpb24gPSBzZWxlY3RlZEVsZW1lbnQucGFyZW50KFNFQ1RJT05fU0VMRUNUT1IpXG4gICAgICBsZXQgcGFyZW50U2VjdGlvbiA9IHNlbGVjdGVkU2VjdGlvbi5wYXJlbnQoU0VDVElPTl9TRUxFQ1RPUilcblxuICAgICAgLy8gSWYgdGhlcmUgaXMgYSBwYXJlbnQgc2VjdGlvbiwgdGhlIHVwZ3JhZGUgaXMgYWxsb3dlZFxuICAgICAgaWYgKHBhcmVudFNlY3Rpb24ubGVuZ3RoKSB7XG5cbiAgICAgICAgLy8gRXZlcnl0aGluZyBpbiBoZXJlLCBpcyBhbiBhdG9taWMgdW5kbyBsZXZlbFxuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICAvLyBTYXZlIHRoZSBzZWN0aW9uIGFuZCBkZXRhY2hcbiAgICAgICAgICBsZXQgYm9keVNlY3Rpb24gPSAkKHNlbGVjdGVkU2VjdGlvblswXS5vdXRlckhUTUwpXG4gICAgICAgICAgc2VsZWN0ZWRTZWN0aW9uLmRldGFjaCgpXG5cbiAgICAgICAgICAvLyBVcGRhdGUgZGltZW5zaW9uIGFuZCBtb3ZlIHRoZSBzZWN0aW9uIG91dFxuICAgICAgICAgIHBhcmVudFNlY3Rpb24uYWZ0ZXIoYm9keVNlY3Rpb24pXG5cbiAgICAgICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcbiAgICAgICAgICBoZWFkaW5nRGltZW5zaW9uKClcbiAgICAgICAgfSlcbiAgICAgIH1cblxuICAgICAgLy8gTm90aWZ5IGVycm9yXG4gICAgICBlbHNlXG4gICAgICAgIG5vdGlmeShIRUFESU5HX1RSQVNGT1JNQVRJT05fRk9SQklEREVOLCAnZXJyb3InLCAyMDAwKVxuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogXG4gICAqL1xuICBkb3duZ3JhZGU6IGZ1bmN0aW9uICgpIHtcblxuICAgIGxldCBzZWxlY3RlZEVsZW1lbnQgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG5cbiAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LmlzKCdoMSxoMixoMyxoNCxoNSxoNicpKSB7XG4gICAgICAvLyBHZXQgdGhlIHJlZmVyZW5jZXMgb2Ygc2VsZWN0ZWQgYW5kIHNpYmxpbmcgc2VjdGlvblxuICAgICAgbGV0IHNlbGVjdGVkU2VjdGlvbiA9IHNlbGVjdGVkRWxlbWVudC5wYXJlbnQoU0VDVElPTl9TRUxFQ1RPUilcbiAgICAgIGxldCBzaWJsaW5nU2VjdGlvbiA9IHNlbGVjdGVkU2VjdGlvbi5wcmV2KFNFQ1RJT05fU0VMRUNUT1IpXG5cbiAgICAgIC8vIElmIHRoZXJlIGlzIGEgcHJldmlvdXMgc2libGluZyBzZWN0aW9uIGRvd25ncmFkZSBpcyBhbGxvd2VkXG4gICAgICBpZiAoc2libGluZ1NlY3Rpb24ubGVuZ3RoKSB7XG5cbiAgICAgICAgLy8gRXZlcnl0aGluZyBpbiBoZXJlLCBpcyBhbiBhdG9taWMgdW5kbyBsZXZlbFxuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICAvLyBTYXZlIHRoZSBzZWN0aW9uIGFuZCBkZXRhY2hcbiAgICAgICAgICBsZXQgYm9keVNlY3Rpb24gPSAkKHNlbGVjdGVkU2VjdGlvblswXS5vdXRlckhUTUwpXG4gICAgICAgICAgc2VsZWN0ZWRTZWN0aW9uLmRldGFjaCgpXG5cbiAgICAgICAgICAvLyBVcGRhdGUgZGltZW5zaW9uIGFuZCBtb3ZlIHRoZSBzZWN0aW9uIG91dFxuICAgICAgICAgIHNpYmxpbmdTZWN0aW9uLmFwcGVuZChib2R5U2VjdGlvbilcblxuICAgICAgICAgIC8vIFJlZnJlc2ggdGlueW1jZSBjb250ZW50IGFuZCBzZXQgdGhlIGhlYWRpbmcgZGltZW5zaW9uXG4gICAgICAgICAgaGVhZGluZ0RpbWVuc2lvbigpXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gTm90aWZ5IGVycm9yXG4gICAgZWxzZVxuICAgICAgbm90aWZ5KEhFQURJTkdfVFJBU0ZPUk1BVElPTl9GT1JCSURERU4sICdlcnJvcicsIDIwMDApXG4gIH0sXG5cbiAgLyoqXG4gICAqIFxuICAgKi9cbiAgYWRkQWJzdHJhY3Q6IGZ1bmN0aW9uICgpIHtcblxuICAgIGlmICghdGlueW1jZS5hY3RpdmVFZGl0b3IuJChBQlNUUkFDVF9TRUxFQ1RPUikubGVuZ3RoKSB7XG5cbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAvLyBUaGlzIHNlY3Rpb24gY2FuIG9ubHkgYmUgcGxhY2VkIGFmdGVyIG5vbiBlZGl0YWJsZSBoZWFkZXJcbiAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IuJChOT05fRURJVEFCTEVfSEVBREVSX1NFTEVDVE9SKS5hZnRlcihgPHNlY3Rpb24gaWQ9XCJkb2MtYWJzdHJhY3RcIiByb2xlPVwiZG9jLWFic3RyYWN0XCI+PGgxPkFic3RyYWN0PC9oMT48L3NlY3Rpb24+YClcbiAgICAgIH0pXG4gICAgfVxuXG4gICAgLy9tb3ZlIGNhcmV0IGFuZCBzZXQgZm9jdXMgdG8gYWN0aXZlIGFkaXRvciAjMTA1XG4gICAgbW92ZUNhcmV0KHRpbnltY2UuYWN0aXZlRWRpdG9yLmRvbS5zZWxlY3QoYCR7QUJTVFJBQ1RfU0VMRUNUT1J9ID4gaDFgKVswXSlcbiAgICBzY3JvbGxUbyhBQlNUUkFDVF9TRUxFQ1RPUilcbiAgfSxcblxuICAvKipcbiAgICogXG4gICAqL1xuICBhZGRBY2tub3dsZWRnZW1lbnRzOiBmdW5jdGlvbiAoKSB7XG5cbiAgICBpZiAoIXRpbnltY2UuYWN0aXZlRWRpdG9yLiQoQUNLTk9XTEVER0VNRU5UU19TRUxFQ1RPUikubGVuZ3RoKSB7XG5cbiAgICAgIGxldCBhY2sgPSAkKGA8c2VjdGlvbiBpZD1cImRvYy1hY2tub3dsZWRnZW1lbnRzXCIgcm9sZT1cImRvYy1hY2tub3dsZWRnZW1lbnRzXCI+PGgxPkFja25vd2xlZGdlbWVudHM8L2gxPjwvc2VjdGlvbj5gKVxuXG4gICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgLy8gSW5zZXJ0IHRoaXMgc2VjdGlvbiBhZnRlciBsYXN0IG5vbiBzcGVjaWFsIHNlY3Rpb24gXG4gICAgICAgIC8vIE9SIGFmdGVyIGFic3RyYWN0IHNlY3Rpb24gXG4gICAgICAgIC8vIE9SIGFmdGVyIG5vbiBlZGl0YWJsZSBoZWFkZXJcbiAgICAgICAgaWYgKHRpbnltY2UuYWN0aXZlRWRpdG9yLiQoTUFJTl9TRUNUSU9OX1NFTEVDVE9SKS5sZW5ndGgpXG4gICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IuJChNQUlOX1NFQ1RJT05fU0VMRUNUT1IpLmxhc3QoKS5hZnRlcihhY2spXG5cbiAgICAgICAgZWxzZSBpZiAodGlueW1jZS5hY3RpdmVFZGl0b3IuJChBQlNUUkFDVF9TRUxFQ1RPUikubGVuZ3RoKVxuICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLiQoQUJTVFJBQ1RfU0VMRUNUT1IpLmFmdGVyKGFjaylcblxuICAgICAgICBlbHNlXG4gICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IuJChOT05fRURJVEFCTEVfSEVBREVSX1NFTEVDVE9SKS5hZnRlcihhY2spXG4gICAgICB9KVxuICAgIH1cblxuICAgIC8vbW92ZSBjYXJldCBhbmQgc2V0IGZvY3VzIHRvIGFjdGl2ZSBhZGl0b3IgIzEwNVxuICAgIG1vdmVDYXJldCh0aW55bWNlLmFjdGl2ZUVkaXRvci5kb20uc2VsZWN0KGAke0FDS05PV0xFREdFTUVOVFNfU0VMRUNUT1J9ID4gaDFgKVswXSlcbiAgICBzY3JvbGxUbyhBQ0tOT1dMRURHRU1FTlRTX1NFTEVDVE9SKVxuICB9LFxuXG4gIGhhbmRsZUFkZEJsaWJsaW9lbnRyeTogZnVuY3Rpb24gKCkge1xuXG4gICAgLy8gT25seSBpZiBiaWJsaW9ncmFwaHkgc2VjdGlvbiBkb2Vzbid0IGV4aXN0c1xuICAgIGlmICghdGlueW1jZS5hY3RpdmVFZGl0b3IuJChCSUJMSU9HUkFQSFlfU0VMRUNUT1IpLmxlbmd0aCkge1xuXG4gICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgLy8gQWRkIG5ldyBiaWJsaW9lbnRyeVxuICAgICAgICBzZWN0aW9uLmFkZEJpYmxpb2VudHJ5KClcblxuICAgICAgICAvL21vdmUgY2FyZXQgYW5kIHNldCBmb2N1cyB0byBhY3RpdmUgYWRpdG9yICMxMDVcbiAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLnNlbGVjdCh0aW55bWNlLmFjdGl2ZUVkaXRvci5kb20uc2VsZWN0KGAke0JJQkxJT0VOVFJZX1NFTEVDVE9SfTpsYXN0LWNoaWxkYClbMF0sIHRydWUpXG4gICAgICB9KVxuICAgIH0gZWxzZVxuICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLnNlbGVjdCh0aW55bWNlLmFjdGl2ZUVkaXRvci5kb20uc2VsZWN0KGAke0JJQkxJT0dSQVBIWV9TRUxFQ1RPUn0+aDFgKVswXSlcblxuICAgIHNjcm9sbFRvKGAke0JJQkxJT0VOVFJZX1NFTEVDVE9SfTpsYXN0LWNoaWxkYClcbiAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcbiAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5mb2N1cygpXG4gIH0sXG5cbiAgLyoqXG4gICAqIFRoaXMgbWV0aG9kIGlzIHRoZSBtYWluIG9uZS4gSXQncyBjYWxsZWQgYmVjYXVzZSBhbGwgdGltZXMgdGhlIGludGVudCBpcyB0byBhZGQgYSBuZXcgYmlibGlvZW50cnkgKHNpbmdsZSByZWZlcmVuY2UpXG4gICAqIFRoZW4gaXQgY2hlY2tzIGlmIGlzIG5lY2Vzc2FyeSB0byBhZGQgdGhlIGVudGlyZSA8c2VjdGlvbj4gb3Igb25seSB0aGUgbWlzc2luZyA8dWw+XG4gICAqL1xuICBhZGRCaWJsaW9lbnRyeTogZnVuY3Rpb24gKGlkLCB0ZXh0LCBsaXN0SXRlbSkge1xuXG4gICAgLy8gQWRkIGJpYmxpb2dyYXBoeSBzZWN0aW9uIGlmIG5vdCBleGlzdHNcbiAgICBpZiAoIXRpbnltY2UuYWN0aXZlRWRpdG9yLiQoQklCTElPR1JBUEhZX1NFTEVDVE9SKS5sZW5ndGgpIHtcblxuICAgICAgbGV0IGJpYmxpb2dyYXBoeSA9ICQoYDxzZWN0aW9uIGlkPVwiZG9jLWJpYmxpb2dyYXBoeVwiIHJvbGU9XCJkb2MtYmlibGlvZ3JhcGh5XCI+PGgxPlJlZmVyZW5jZXM8L2gxPjx1bD48L3VsPjwvc2VjdGlvbj5gKVxuXG4gICAgICAvLyBUaGlzIHNlY3Rpb24gaXMgYWRkZWQgYWZ0ZXIgYWNrbm93bGVkZ2VtZW50cyBzZWN0aW9uXG4gICAgICAvLyBPUiBhZnRlciBsYXN0IG5vbiBzcGVjaWFsIHNlY3Rpb25cbiAgICAgIC8vIE9SIGFmdGVyIGFic3RyYWN0IHNlY3Rpb25cbiAgICAgIC8vIE9SIGFmdGVyIG5vbiBlZGl0YWJsZSBoZWFkZXIgXG4gICAgICBpZiAodGlueW1jZS5hY3RpdmVFZGl0b3IuJChBQ0tOT1dMRURHRU1FTlRTX1NFTEVDVE9SKS5sZW5ndGgpXG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLiQoQUNLTk9XTEVER0VNRU5UU19TRUxFQ1RPUikuYWZ0ZXIoYmlibGlvZ3JhcGh5KVxuXG4gICAgICBlbHNlIGlmICh0aW55bWNlLmFjdGl2ZUVkaXRvci4kKE1BSU5fU0VDVElPTl9TRUxFQ1RPUikubGVuZ3RoKVxuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci4kKE1BSU5fU0VDVElPTl9TRUxFQ1RPUikubGFzdCgpLmFmdGVyKGJpYmxpb2dyYXBoeSlcblxuICAgICAgZWxzZSBpZiAodGlueW1jZS5hY3RpdmVFZGl0b3IuJChBQlNUUkFDVF9TRUxFQ1RPUikubGVuZ3RoKVxuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci4kKEFCU1RSQUNUX1NFTEVDVE9SKS5hZnRlcihiaWJsaW9ncmFwaHkpXG5cbiAgICAgIGVsc2VcbiAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IuJChOT05fRURJVEFCTEVfSEVBREVSX1NFTEVDVE9SKS5hZnRlcihiaWJsaW9ncmFwaHkpXG5cbiAgICB9XG5cbiAgICAvLyBBZGQgdWwgaW4gYmlibGlvZ3JhcGh5IHNlY3Rpb24gaWYgbm90IGV4aXN0c1xuICAgIGlmICghdGlueW1jZS5hY3RpdmVFZGl0b3IuJChCSUJMSU9HUkFQSFlfU0VMRUNUT1IpLmZpbmQoJ3VsJykubGVuZ3RoKVxuICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IuJChCSUJMSU9HUkFQSFlfU0VMRUNUT1IpLmFwcGVuZCgnPHVsPjwvdWw+JylcblxuICAgIC8vIElGIGlkIGFuZCB0ZXh0IGFyZW4ndCBwYXNzZWQgYXMgcGFyYW1ldGVycywgdGhlc2UgY2FuIGJlIHJldHJpZXZlZCBvciBpbml0IGZyb20gaGVyZVxuICAgIGlkID0gKGlkKSA/IGlkIDogZ2V0U3VjY2Vzc2l2ZUVsZW1lbnRJZChCSUJMSU9FTlRSWV9TRUxFQ1RPUiwgQklCTElPRU5UUllfU1VGRklYKVxuICAgIHRleHQgPSB0ZXh0ID8gdGV4dCA6ICc8YnIvPidcblxuICAgIGxldCBuZXdJdGVtID0gJChgPGxpIHJvbGU9XCJkb2MtYmlibGlvZW50cnlcIiBpZD1cIiR7aWR9XCI+PHA+JHt0ZXh0fTwvcD48L2xpPmApXG5cbiAgICAvLyBBcHBlbmQgbmV3IGxpIHRvIHVsIGF0IGxhc3QgcG9zaXRpb25cbiAgICAvLyBPUiBpbnNlcnQgdGhlIG5ldyBsaSByaWdodCBhZnRlciB0aGUgY3VycmVudCBvbmVcbiAgICBpZiAoIWxpc3RJdGVtKVxuICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IuJChgJHtCSUJMSU9HUkFQSFlfU0VMRUNUT1J9IHVsYCkuYXBwZW5kKG5ld0l0ZW0pXG5cbiAgICBlbHNlXG4gICAgICBsaXN0SXRlbS5hZnRlcihuZXdJdGVtKVxuICB9LFxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIHVwZGF0ZUJpYmxpb2dyYXBoeVNlY3Rpb246IGZ1bmN0aW9uICgpIHtcblxuICAgIC8vIFJlbW92ZSBhbGwgc2VjdGlvbnMgd2l0aG91dCBwIGNoaWxkXG4gICAgdGlueW1jZS5hY3RpdmVFZGl0b3IuJChgJHtCSUJMSU9FTlRSWV9TRUxFQ1RPUn06bm90KDpoYXMocCkpYCkuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAkKHRoaXMpLnJlbW92ZSgpXG4gICAgfSlcbiAgfSxcblxuICAvKipcbiAgICogXG4gICAqL1xuICBhZGRFbmRub3RlOiBmdW5jdGlvbiAoaWQpIHtcblxuICAgIC8vIEFkZCB0aGUgc2VjdGlvbiBpZiBpdCBub3QgZXhpc3RzXG4gICAgaWYgKCEkKEVORE5PVEVfU0VMRUNUT1IpLmxlbmd0aCkge1xuXG4gICAgICBsZXQgZW5kbm90ZXMgPSAkKGA8c2VjdGlvbiBpZD1cImRvYy1lbmRub3Rlc1wiIHJvbGU9XCJkb2MtZW5kbm90ZXNcIj48aDEgZGF0YS1yYXNoLW9yaWdpbmFsLWNvbnRlbnQ9XCJcIj5Gb290bm90ZXM8L2gxPjwvc2VjdGlvbj5gKVxuXG4gICAgICAvLyBJbnNlcnQgdGhpcyBzZWN0aW9uIGFmdGVyIGJpYmxpb2dyYXBoeSBzZWN0aW9uXG4gICAgICAvLyBPUiBhZnRlciBhY2tub3dsZWRnZW1lbnRzIHNlY3Rpb25cbiAgICAgIC8vIE9SIGFmdGVyIG5vbiBzcGVjaWFsIHNlY3Rpb24gc2VsZWN0b3JcbiAgICAgIC8vIE9SIGFmdGVyIGFic3RyYWN0IHNlY3Rpb25cbiAgICAgIC8vIE9SIGFmdGVyIG5vbiBlZGl0YWJsZSBoZWFkZXIgXG4gICAgICBpZiAoJChCSUJMSU9HUkFQSFlfU0VMRUNUT1IpLmxlbmd0aClcbiAgICAgICAgJChCSUJMSU9HUkFQSFlfU0VMRUNUT1IpLmFmdGVyKGVuZG5vdGVzKVxuXG4gICAgICBlbHNlIGlmICgkKEFDS05PV0xFREdFTUVOVFNfU0VMRUNUT1IpLmxlbmd0aClcbiAgICAgICAgJChBQ0tOT1dMRURHRU1FTlRTX1NFTEVDVE9SKS5hZnRlcihlbmRub3RlcylcblxuICAgICAgZWxzZSBpZiAoJChNQUlOX1NFQ1RJT05fU0VMRUNUT1IpLmxlbmd0aClcbiAgICAgICAgJChNQUlOX1NFQ1RJT05fU0VMRUNUT1IpLmxhc3QoKS5hZnRlcihlbmRub3RlcylcblxuICAgICAgZWxzZSBpZiAoJChBQlNUUkFDVF9TRUxFQ1RPUikubGVuZ3RoKVxuICAgICAgICAkKEFCU1RSQUNUX1NFTEVDVE9SKS5hZnRlcihlbmRub3RlcylcblxuICAgICAgZWxzZVxuICAgICAgICAkKE5PTl9FRElUQUJMRV9IRUFERVJfU0VMRUNUT1IpLmFmdGVyKGVuZG5vdGVzKVxuICAgIH1cblxuICAgIC8vIENyZWF0ZSBhbmQgYXBwZW5kIHRoZSBuZXcgZW5kbm90ZVxuICAgIGxldCBlbmRub3RlID0gJChgPHNlY3Rpb24gcm9sZT1cImRvYy1lbmRub3RlXCIgaWQ9XCIke2lkfVwiPjxwPjxici8+PC9wPjwvc2VjdGlvbj5gKVxuICAgICQoRU5ETk9URVNfU0VMRUNUT1IpLmFwcGVuZChlbmRub3RlKVxuICB9LFxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIHVwZGF0ZVNlY3Rpb25Ub29sYmFyOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAvLyBEcm9wZG93biBtZW51IHJlZmVyZW5jZVxuICAgIGxldCBtZW51ID0gJChNRU5VX1NFTEVDVE9SKVxuXG4gICAgaWYgKG1lbnUubGVuZ3RoKSB7XG4gICAgICBzZWN0aW9uLnJlc3RvcmVTZWN0aW9uVG9vbGJhcihtZW51KVxuXG4gICAgICAvLyBTYXZlIGN1cnJlbnQgc2VsZWN0ZWQgZWxlbWVudFxuICAgICAgbGV0IHNlbGVjdGVkRWxlbWVudCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldFJuZygpLnN0YXJ0Q29udGFpbmVyKVxuXG4gICAgICBpZiAoc2VsZWN0ZWRFbGVtZW50WzBdLm5vZGVUeXBlID09IDMpXG4gICAgICAgIHNlbGVjdGVkRWxlbWVudCA9IHNlbGVjdGVkRWxlbWVudC5wYXJlbnQoKVxuXG4gICAgICAvLyBJZiBjdXJyZW50IGVsZW1lbnQgaXMgcFxuICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC5pcygncCcpIHx8IHNlbGVjdGVkRWxlbWVudC5wYXJlbnQoKS5pcygncCcpKSB7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgY2FyZXQgaXMgaW5zaWRlIHNwZWNpYWwgc2VjdGlvblxuICAgICAgICAvLyBJbiB0aGlzIGNhc2UgZW5hYmxlIG9ubHkgZmlyc3QgbWVudWl0ZW0gaWYgY2FyZXQgaXMgaW4gYWJzdHJhY3RcbiAgICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKFNQRUNJQUxfU0VDVElPTl9TRUxFQ1RPUikubGVuZ3RoKSB7XG5cbiAgICAgICAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LnBhcmVudHMoQUJTVFJBQ1RfU0VMRUNUT1IpLmxlbmd0aClcbiAgICAgICAgICAgIG1lbnUuY2hpbGRyZW4oYDpsdCgxKWApLnJlbW92ZUNsYXNzKCdtY2UtZGlzYWJsZWQnKVxuXG4gICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgIH1cblxuICAgICAgICAvLyBHZXQgZGVlcG5lc3Mgb2YgdGhlIHNlY3Rpb25cbiAgICAgICAgbGV0IGRlZXBuZXNzID0gc2VsZWN0ZWRFbGVtZW50LnBhcmVudHMoU0VDVElPTl9TRUxFQ1RPUikubGVuZ3RoICsgMVxuXG4gICAgICAgIC8vIFJlbW92ZSBkaXNhYmxpbmcgY2xhc3Mgb24gZmlyc3Qge2RlZXBuZXNzfSBtZW51IGl0ZW1zXG4gICAgICAgIG1lbnUuY2hpbGRyZW4oYDpsdCgke2RlZXBuZXNzfSlgKS5yZW1vdmVDbGFzcygnbWNlLWRpc2FibGVkJylcblxuICAgICAgICAvLyBHZXQgdGhlIHNlY3Rpb24gbGlzdCBhbmQgdXBkYXRlIHRoZSBkcm9wZG93biB3aXRoIHRoZSByaWdodCB0ZXh0c1xuICAgICAgICBsZXQgbGlzdCA9IHNlY3Rpb24uZ2V0QW5jZXN0b3JTZWN0aW9uc0xpc3Qoc2VsZWN0ZWRFbGVtZW50KVxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8PSBsaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgbWVudS5jaGlsZHJlbihgOmVxKCR7aX0pYCkuZmluZCgnc3Bhbi5tY2UtdGV4dCcpLnRleHQobGlzdFtpXSlcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBFbmFibGUgb25seSBmb3IgdXBncmFkZS9kb3duZ3JhZGVcbiAgICAgIGVsc2UgaWYgKCFzZWxlY3RlZEVsZW1lbnQucGFyZW50cyhTUEVDSUFMX1NFQ1RJT05fU0VMRUNUT1IpLmxlbmd0aCAmJiBzZWxlY3RlZEVsZW1lbnQuaXMoJ2gxLGgyLGgzJykpIHtcblxuICAgICAgICAvLyBHZXQgdGhlIHNlbGVjdGVkIHNlY3Rpb25cbiAgICAgICAgbGV0IHNlbGVjdGVkU2VjdGlvbiA9IHNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKFNFQ1RJT05fU0VMRUNUT1IpLmZpcnN0KClcblxuICAgICAgICAvLyBHZXQgdGhlIG51bWJlciBvZiB0aGUgaGVhZGluZyAoZWcuIEgxID0+IDEsIEgyID0+IDIpXG4gICAgICAgIGxldCBpbmRleCA9IHBhcnNlSW50KHNlbGVjdGVkRWxlbWVudC5wcm9wKCd0YWdOYW1lJykudG9Mb3dlckNhc2UoKS5yZXBsYWNlKCdoJywgJycpKVxuXG4gICAgICAgIC8vIEdldCB0aGUgZGVlcG5lc3Mgb2YgdGhlIHNlY3Rpb24gKGVnLiAxIGlmIGlzIGEgbWFpbiBzZWN0aW9uLCAyIGlmIGlzIGEgc3Vic2VjdGlvbilcbiAgICAgICAgbGV0IGRlZXBuZXNzID0gc2VsZWN0ZWRFbGVtZW50LnBhcmVudHMoU0VDVElPTl9TRUxFQ1RPUikubGVuZ3RoXG5cbiAgICAgICAgLy8gR2V0IHRoZSBsaXN0IG9mIHRleHRzIHRoYXQgYXJlIGJlZVxuICAgICAgICBsZXQgbGlzdCA9IHNlY3Rpb24uZ2V0QW5jZXN0b3JTZWN0aW9uc0xpc3Qoc2VsZWN0ZWRFbGVtZW50KVxuXG4gICAgICAgIC8vIFRoZSB0ZXh0IGluZGV4IGluIGxpc3RcbiAgICAgICAgbGV0IGkgPSBkZWVwbmVzcyAtIGluZGV4XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIGN1cnJlbnQgc2VjdGlvbiBoYXMgYSBwcmV2aW91cyBzZWN0aW9uIFxuICAgICAgICAvLyBJbiB0aGlzIGNhc2UgdGhlIHVwZ3JhZGUgaXMgcGVybWl0dGVkXG4gICAgICAgIGlmIChzZWxlY3RlZFNlY3Rpb24ucHJldigpLmlzKFNFQ1RJT05fU0VMRUNUT1IpKSB7XG5cbiAgICAgICAgICAvLyBtZW51IGl0ZW0gaW5zaWRlIHRoZSBkcm9wZG93blxuICAgICAgICAgIGxldCBtZW51SXRlbSA9IG1lbnUuY2hpbGRyZW4oYDplcSgke2luZGV4fSlgKVxuXG4gICAgICAgICAgbGV0IHRtcCA9IGxpc3RbaW5kZXhdLnJlcGxhY2UoSEVBRElOR19CVVRUT05fTEFCRUwsICcnKVxuICAgICAgICAgIHRtcCA9IHRtcC5zcGxpdCgnLicpXG4gICAgICAgICAgdG1wW2luZGV4IC0gMV0gPSBwYXJzZUludCh0bXBbaW5kZXggLSAxXSkgLSAxXG5cbiAgICAgICAgICBsZXQgdGV4dCA9IEhFQURJTkdfQlVUVE9OX0xBQkVMICsgdG1wLmpvaW4oJy4nKVxuXG4gICAgICAgICAgbWVudUl0ZW0uZmluZCgnc3Bhbi5tY2UtdGV4dCcpLnRleHQodGV4dClcbiAgICAgICAgICBtZW51SXRlbS5yZW1vdmVDbGFzcygnbWNlLWRpc2FibGVkJylcbiAgICAgICAgICBtZW51SXRlbS5hdHRyKERBVEFfRE9XTkdSQURFLCB0cnVlKVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIGN1cnJlbnQgc2VjdGlvbiBoYXMgYSBwYXJlbnRcbiAgICAgICAgLy8gSW4gdGhpcyBjYXNlIHRoZSB1cGdyYWRlIGlzIHBlcm1pdHRlZFxuICAgICAgICBpZiAoc2VsZWN0ZWRTZWN0aW9uLnBhcmVudChTRUNUSU9OX1NFTEVDVE9SKS5sZW5ndGgpIHtcblxuICAgICAgICAgIGluZGV4ID0gaW5kZXggLSAyXG5cbiAgICAgICAgICAvLyBtZW51IGl0ZW0gaW5zaWRlIHRoZSBkcm9wZG93blxuICAgICAgICAgIGxldCBtZW51SXRlbSA9IG1lbnUuY2hpbGRyZW4oYDplcSgke2luZGV4fSlgKVxuICAgICAgICAgIG1lbnVJdGVtLmZpbmQoJ3NwYW4ubWNlLXRleHQnKS50ZXh0KGxpc3RbaW5kZXhdKVxuICAgICAgICAgIG1lbnVJdGVtLnJlbW92ZUNsYXNzKCdtY2UtZGlzYWJsZWQnKVxuICAgICAgICAgIG1lbnVJdGVtLmF0dHIoREFUQV9VUEdSQURFLCB0cnVlKVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIERpc2FibGUgaW4gYW55IG90aGVyIGNhc2VzXG4gICAgICBlbHNlXG4gICAgICAgIG1lbnUuY2hpbGRyZW4oJzpndCgxMCknKS5hZGRDbGFzcygnbWNlLWRpc2FibGVkJylcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIFxuICAgKi9cbiAgZ2V0QW5jZXN0b3JTZWN0aW9uc0xpc3Q6IGZ1bmN0aW9uIChzZWxlY3RlZEVsZW1lbnQpIHtcblxuICAgIGxldCBwcmVIZWFkZXJzID0gW11cbiAgICBsZXQgbGlzdCA9IFtdXG4gICAgbGV0IHBhcmVudFNlY3Rpb25zID0gc2VsZWN0ZWRFbGVtZW50LnBhcmVudHMoJ3NlY3Rpb24nKVxuXG4gICAgLy8gU2F2ZSBpbmRleCBvZiBhbGwgcGFyZW50IHNlY3Rpb25zXG4gICAgZm9yIChsZXQgaSA9IHBhcmVudFNlY3Rpb25zLmxlbmd0aDsgaSA+IDA7IGktLSkge1xuICAgICAgbGV0IGVsZW0gPSAkKHBhcmVudFNlY3Rpb25zW2kgLSAxXSlcbiAgICAgIGxldCBpbmRleCA9IGVsZW0ucGFyZW50KCkuY2hpbGRyZW4oU0VDVElPTl9TRUxFQ1RPUikuaW5kZXgoZWxlbSkgKyAxXG4gICAgICBwcmVIZWFkZXJzLnB1c2goaW5kZXgpXG4gICAgfVxuXG4gICAgLy8gVXBkYXRlIHRleHQgb2YgYWxsIG1lbnUgaXRlbVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDw9IHByZUhlYWRlcnMubGVuZ3RoOyBpKyspIHtcblxuICAgICAgbGV0IHRleHQgPSBIRUFESU5HX0JVVFRPTl9MQUJFTFxuXG4gICAgICAvLyBVcGRhdGUgdGV4dCBiYXNlZCBvbiBzZWN0aW9uIHN0cnVjdHVyZVxuICAgICAgaWYgKGkgIT0gcHJlSGVhZGVycy5sZW5ndGgpIHtcbiAgICAgICAgZm9yIChsZXQgeCA9IDA7IHggPD0gaTsgeCsrKVxuICAgICAgICAgIHRleHQgKz0gYCR7cHJlSGVhZGVyc1t4XSArICh4ID09IGkgPyAxIDogMCl9LmBcbiAgICAgIH1cblxuICAgICAgLy8gSW4gdGhpcyBjYXNlIHJhamUgY2hhbmdlcyB0ZXh0IG9mIG5leHQgc3ViIGhlYWRpbmdcbiAgICAgIGVsc2Uge1xuICAgICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IGk7IHgrKylcbiAgICAgICAgICB0ZXh0ICs9IGAke3ByZUhlYWRlcnNbeF19LmBcblxuICAgICAgICB0ZXh0ICs9ICcxLidcbiAgICAgIH1cblxuICAgICAgbGlzdC5wdXNoKHRleHQpXG4gICAgfVxuXG4gICAgcmV0dXJuIGxpc3RcbiAgfSxcblxuICAvKipcbiAgICogUmVzdG9yZSBub3JtYWwgdGV4dCBpbiBzZWN0aW9uIHRvb2xiYXIgYW5kIGRpc2FibGUgYWxsXG4gICAqL1xuICByZXN0b3JlU2VjdGlvblRvb2xiYXI6IGZ1bmN0aW9uIChtZW51KSB7XG5cbiAgICBsZXQgY250ID0gMVxuXG4gICAgbWVudS5jaGlsZHJlbignOmx0KDYpJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICBsZXQgdGV4dCA9IEhFQURJTkdfQlVUVE9OX0xBQkVMXG5cbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY250OyBpKyspXG4gICAgICAgIHRleHQgKz0gYDEuYFxuXG4gICAgICAvLyBSZW1vdmUgZGF0YSBlbGVtZW50c1xuICAgICAgJCh0aGlzKS5yZW1vdmVBdHRyKERBVEFfVVBHUkFERSlcbiAgICAgICQodGhpcykucmVtb3ZlQXR0cihEQVRBX0RPV05HUkFERSlcblxuICAgICAgJCh0aGlzKS5maW5kKCdzcGFuLm1jZS10ZXh0JykudGV4dCh0ZXh0KVxuICAgICAgJCh0aGlzKS5hZGRDbGFzcygnbWNlLWRpc2FibGVkJylcblxuICAgICAgY250KytcbiAgICB9KVxuXG4gICAgLy8gRW5hYmxlIHVwZ3JhZGUvZG93bmdyYWRlIGxhc3QgdGhyZWUgbWVudSBpdGVtc1xuICAgIG1lbnUuY2hpbGRyZW4oJzpndCgxMCknKS5yZW1vdmVDbGFzcygnbWNlLWRpc2FibGVkJylcbiAgfSxcblxuICAvKipcbiAgICogXG4gICAqL1xuICBtYW5hZ2VEZWxldGU6IGZ1bmN0aW9uICgpIHtcblxuICAgIGxldCBzZWxlY3RlZENvbnRlbnQgPSB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Q29udGVudCgpXG5cbiAgICAvLyBJZiB0aGUgc2VsZWN0ZWQgY29udGVudCBoYXMgSFRNTCBpbnNpZGVcbiAgICBpZiAoc2VsZWN0ZWRDb250ZW50LmluZGV4T2YoJzwnKSA+IC0xKSB7XG5cbiAgICAgIHNlbGVjdGVkQ29udGVudCA9ICQoc2VsZWN0ZWRDb250ZW50KVxuICAgICAgbGV0IGhhc1NlY3Rpb24gPSBmYWxzZVxuICAgICAgLy8gQ2hlY2sgaWYgb25lIG9mIHRoZSBzZWxlY3RlZCBlbGVtZW50IGlzIGEgc2VjdGlvblxuICAgICAgc2VsZWN0ZWRDb250ZW50LmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoJCh0aGlzKS5pcyhTRUNUSU9OX1NFTEVDVE9SKSlcbiAgICAgICAgICByZXR1cm4gaGFzU2VjdGlvbiA9IHRydWVcbiAgICAgIH0pXG5cbiAgICAgIC8vIElmIHRoZSBzZWxlY3RlZCBjb250ZW50IGhhcyBhIHNlY3Rpb24gaW5zaWRlLCB0aGVuIG1hbmFnZSBkZWxldGVcbiAgICAgIGlmIChoYXNTZWN0aW9uKSB7XG5cbiAgICAgICAgbGV0IHJhbmdlID0gdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldFJuZygpXG4gICAgICAgIGxldCBzdGFydE5vZGUgPSAkKHJhbmdlLnN0YXJ0Q29udGFpbmVyKS5wYXJlbnQoKVxuICAgICAgICBsZXQgZW5kTm9kZSA9ICQocmFuZ2UuZW5kQ29udGFpbmVyKS5wYXJlbnQoKVxuICAgICAgICBsZXQgY29tbW9uQW5jZXN0b3JDb250YWluZXIgPSAkKHJhbmdlLmNvbW1vbkFuY2VzdG9yQ29udGFpbmVyKVxuXG4gICAgICAgIC8vIERlZXBuZXNzIGlzIHJlbGF0aXZlIHRvIHRoZSBjb21tb24gYW5jZXN0b3IgY29udGFpbmVyIG9mIHRoZSByYW5nZSBzdGFydENvbnRhaW5lciBhbmQgZW5kXG4gICAgICAgIGxldCBkZWVwbmVzcyA9IGVuZE5vZGUucGFyZW50KCdzZWN0aW9uJykucGFyZW50c1VudGlsKGNvbW1vbkFuY2VzdG9yQ29udGFpbmVyKS5sZW5ndGggKyAxXG4gICAgICAgIGxldCBjdXJyZW50RWxlbWVudCA9IGVuZE5vZGVcbiAgICAgICAgbGV0IHRvTW92ZUVsZW1lbnRzID0gW11cblxuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICAvLyBHZXQgYW5kIGRldGFjaCBhbGwgbmV4dF9lbmRcbiAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8PSBkZWVwbmVzczsgaSsrKSB7XG4gICAgICAgICAgICBjdXJyZW50RWxlbWVudC5uZXh0QWxsKCdzZWN0aW9uLHAsZmlndXJlLHByZSx1bCxvbCxibG9ja3F1b3RlJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgIHRvTW92ZUVsZW1lbnRzLnB1c2goJCh0aGlzKSlcblxuICAgICAgICAgICAgICAkKHRoaXMpLmRldGFjaCgpXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgY3VycmVudEVsZW1lbnQgPSBjdXJyZW50RWxlbWVudC5wYXJlbnQoKVxuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIEV4ZWN1dGUgZGVsZXRlXG4gICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IuZXhlY0NvbW1hbmQoREVMRVRFX0NNRClcblxuICAgICAgICAgIC8vIERldGFjaCBhbGwgbmV4dF9iZWdpblxuICAgICAgICAgIHN0YXJ0Tm9kZS5uZXh0QWxsKCkuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkKHRoaXMpLmRldGFjaCgpXG4gICAgICAgICAgfSlcblxuICAgICAgICAgIC8vIEFwcGVuZCBhbGwgbmV4dF9lbmQgdG8gc3RhcnRub2RlIHBhcmVudFxuICAgICAgICAgIHRvTW92ZUVsZW1lbnRzLmZvckVhY2goZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICAgICAgICAgIHN0YXJ0Tm9kZS5wYXJlbnQoJ3NlY3Rpb24nKS5hcHBlbmQoZWxlbWVudClcbiAgICAgICAgICB9KVxuXG4gICAgICAgICAgLy8gUmVmcmVzaCBoZWFkaW5nc1xuICAgICAgICAgIGhlYWRpbmdEaW1lbnNpb24oKVxuXG4gICAgICAgICAgLy8gVXBkYXRlIHJlZmVyZW5jZXMgaWYgbmVlZGVkXG4gICAgICAgICAgdXBkYXRlUmVmZXJlbmNlcygpXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGRlbGV0ZVNwZWNpYWxTZWN0aW9uOiBmdW5jdGlvbiAoc2VsZWN0ZWRFbGVtZW50KSB7XG5cbiAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgIC8vIFJlbW92ZSB0aGUgc2VjdGlvbiBhbmQgdXBkYXRlIFxuICAgICAgc2VsZWN0ZWRFbGVtZW50LnBhcmVudChTUEVDSUFMX1NFQ1RJT05fU0VMRUNUT1IpLnJlbW92ZSgpXG5cbiAgICAgIC8vIFVwZGF0ZSByZWZlcmVuY2VzXG4gICAgICB1cGRhdGVSZWZlcmVuY2VzKClcblxuICAgICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG4gICAgfSlcbiAgfSxcblxuICAvKipcbiAgICogXG4gICAqL1xuICBjdXJzb3JJblNlY3Rpb246IGZ1bmN0aW9uIChzZWxlY3Rpb24pIHtcblxuICAgIHJldHVybiAkKHNlbGVjdGlvbi5nZXROb2RlKCkpLmlzKFNFQ1RJT05fU0VMRUNUT1IpIHx8IEJvb2xlYW4oJChzZWxlY3Rpb24uZ2V0Tm9kZSgpKS5wYXJlbnRzKFNFQ1RJT05fU0VMRUNUT1IpLmxlbmd0aClcbiAgfSxcblxuICAvKipcbiAgICogXG4gICAqL1xuICBjdXJzb3JJblNwZWNpYWxTZWN0aW9uOiBmdW5jdGlvbiAoc2VsZWN0aW9uKSB7XG5cbiAgICByZXR1cm4gJChzZWxlY3Rpb24uZ2V0Tm9kZSgpKS5pcyhTUEVDSUFMX1NFQ1RJT05fU0VMRUNUT1IpIHx8XG4gICAgICBCb29sZWFuKCQoc2VsZWN0aW9uLmdldFJuZygpLnN0YXJ0Q29udGFpbmVyKS5wYXJlbnRzKFNQRUNJQUxfU0VDVElPTl9TRUxFQ1RPUikubGVuZ3RoKSB8fFxuICAgICAgQm9vbGVhbigkKHNlbGVjdGlvbi5nZXRSbmcoKS5lbmRDb250YWluZXIpLnBhcmVudHMoU1BFQ0lBTF9TRUNUSU9OX1NFTEVDVE9SKS5sZW5ndGgpXG4gIH1cbn0iLCJ0aW55bWNlLlBsdWdpbk1hbmFnZXIuYWRkKCdyYWplX2Nyb3NzcmVmJywgZnVuY3Rpb24gKGVkaXRvciwgdXJsKSB7XG5cbiAgLy8gQWRkIGEgYnV0dG9uIHRoYXQgaGFuZGxlIHRoZSBpbmxpbmUgZWxlbWVudFxuICBlZGl0b3IuYWRkQnV0dG9uKCdyYWplX2Nyb3NzcmVmJywge1xuICAgIHRpdGxlOiAncmFqZV9jcm9zc3JlZicsXG4gICAgaWNvbjogJ2ljb24tYW5jaG9yJyxcbiAgICB0b29sdGlwOiAnQ3Jvc3MtcmVmZXJlbmNlJyxcbiAgICBkaXNhYmxlZFN0YXRlU2VsZWN0b3I6IGAke0RJU0FCTEVfU0VMRUNUT1JfSU5MSU5FfSw6aGVhZGVyYCxcblxuICAgIC8vIEJ1dHRvbiBiZWhhdmlvdXJcbiAgICBvbmNsaWNrOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuXG4gICAgICBsZXQgcmVmZXJlbmNlYWJsZUxpc3QgPSB7XG4gICAgICAgIHNlY3Rpb25zOiBjcm9zc3JlZi5nZXRBbGxSZWZlcmVuY2VhYmxlU2VjdGlvbnMoKSxcbiAgICAgICAgdGFibGVzOiBjcm9zc3JlZi5nZXRBbGxSZWZlcmVuY2VhYmxlVGFibGVzKCksXG4gICAgICAgIGZpZ3VyZXM6IGNyb3NzcmVmLmdldEFsbFJlZmVyZW5jZWFibGVGaWd1cmVzKCksXG4gICAgICAgIGxpc3RpbmdzOiBjcm9zc3JlZi5nZXRBbGxSZWZlcmVuY2VhYmxlTGlzdGluZ3MoKSxcbiAgICAgICAgZm9ybXVsYXM6IGNyb3NzcmVmLmdldEFsbFJlZmVyZW5jZWFibGVGb3JtdWxhcygpLFxuICAgICAgICByZWZlcmVuY2VzOiBjcm9zc3JlZi5nZXRBbGxSZWZlcmVuY2VhYmxlUmVmZXJlbmNlcygpXG4gICAgICB9XG5cbiAgICAgIGVkaXRvci53aW5kb3dNYW5hZ2VyLm9wZW4oe1xuICAgICAgICAgIHRpdGxlOiAnQ3Jvc3MtcmVmZXJlbmNlIGVkaXRvcicsXG4gICAgICAgICAgdXJsOiAnanMvcmFqZS1jb3JlL3BsdWdpbi9yYWplX2Nyb3NzcmVmLmh0bWwnLFxuICAgICAgICAgIHdpZHRoOiA1MDAsXG4gICAgICAgICAgaGVpZ2h0OiA4MDAsXG4gICAgICAgICAgb25DbG9zZTogZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFxuICAgICAgICAgICAgICogVGhpcyBiZWhhdmlvdXIgaXMgY2FsbGVkIHdoZW4gdXNlciBwcmVzcyBcIkFERCBORVcgUkVGRVJFTkNFXCIgXG4gICAgICAgICAgICAgKiBidXR0b24gZnJvbSB0aGUgbW9kYWxcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgaWYgKHRpbnltY2UuYWN0aXZlRWRpdG9yLmNyZWF0ZU5ld1JlZmVyZW5jZSkge1xuXG4gICAgICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgICAgICAgIC8vIEdldCBzdWNjZXNzaXZlIGJpYmxpb2VudHJ5IGlkXG4gICAgICAgICAgICAgICAgbGV0IGlkID0gZ2V0U3VjY2Vzc2l2ZUVsZW1lbnRJZChCSUJMSU9FTlRSWV9TRUxFQ1RPUiwgQklCTElPRU5UUllfU1VGRklYKVxuXG4gICAgICAgICAgICAgICAgLy8gQ3JlYXRlIHRoZSByZWZlcmVuY2UgdGhhdCBwb2ludHMgdG8gdGhlIG5leHQgaWRcbiAgICAgICAgICAgICAgICBjcm9zc3JlZi5hZGQoaWQpXG5cbiAgICAgICAgICAgICAgICAvLyBBZGQgdGhlIG5leHQgYmlibGlvZW50cnlcbiAgICAgICAgICAgICAgICBzZWN0aW9uLmFkZEJpYmxpb2VudHJ5KGlkKVxuXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSByZWZlcmVuY2VcbiAgICAgICAgICAgICAgICBjcm9zc3JlZi51cGRhdGUoKVxuXG4gICAgICAgICAgICAgICAgLy8gTW92ZSBjYXJldCB0byBzdGFydCBvZiB0aGUgbmV3IGJpYmxpb2VudHJ5IGVsZW1lbnRcbiAgICAgICAgICAgICAgICAvLyBJc3N1ZSAjMTA1IEZpcmVmb3ggKyBDaHJvbWl1bVxuICAgICAgICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZXRDdXJzb3JMb2NhdGlvbigkKHRpbnltY2UuYWN0aXZlRWRpdG9yLmRvbS5nZXQoaWQpKS5maW5kKCdwJylbMF0sIGZhbHNlKVxuICAgICAgICAgICAgICAgIHNjcm9sbFRvKGAke0JJQkxJT0VOVFJZX1NFTEVDVE9SfSMke2lkfWApXG4gICAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgICAgLy8gU2V0IHZhcmlhYmxlIG51bGwgZm9yIHN1Y2Nlc3NpdmUgdXNhZ2VzXG4gICAgICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLmNyZWF0ZU5ld1JlZmVyZW5jZSA9IG51bGxcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBUaGlzIGlzIGNhbGxlZCBpZiBhIG5vcm1hbCByZWZlcmVuY2UgaXMgc2VsZWN0ZWQgZnJvbSBtb2RhbFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBlbHNlIGlmICh0aW55bWNlLmFjdGl2ZUVkaXRvci5yZWZlcmVuY2UpIHtcblxuICAgICAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICAgICAgICAvLyBDcmVhdGUgdGhlIGVtcHR5IGFuY2hvciBhbmQgdXBkYXRlIGl0cyBjb250ZW50XG4gICAgICAgICAgICAgICAgY3Jvc3NyZWYuYWRkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnJlZmVyZW5jZSlcbiAgICAgICAgICAgICAgICBjcm9zc3JlZi51cGRhdGUoKVxuXG4gICAgICAgICAgICAgICAgbGV0IHNlbGVjdGVkTm9kZSA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcblxuICAgICAgICAgICAgICAgIC8vIFRoaXMgc2VsZWN0IHRoZSBsYXN0IGVsZW1lbnQgKGxhc3QgYnkgb3JkZXIpIGFuZCBjb2xsYXBzZSB0aGUgc2VsZWN0aW9uIGFmdGVyIHRoZSBub2RlXG4gICAgICAgICAgICAgICAgLy8gIzEwNSBGaXJlZm94ICsgQ2hyb21pdW1cbiAgICAgICAgICAgICAgICAvL3RpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZXRDdXJzb3JMb2NhdGlvbigkKHRpbnltY2UuYWN0aXZlRWRpdG9yLmRvbS5zZWxlY3QoYGFbaHJlZj1cIiMke3RpbnltY2UuYWN0aXZlRWRpdG9yLnJlZmVyZW5jZX1cIl06bGFzdC1jaGlsZGApKVswXSwgZmFsc2UpXG4gICAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgICAgLy8gU2V0IHZhcmlhYmxlIG51bGwgZm9yIHN1Y2Nlc3NpdmUgdXNhZ2VzXG4gICAgICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnJlZmVyZW5jZSA9IG51bGxcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgLy8gTGlzdCBvZiBhbGwgcmVmZXJlbmNlYWJsZSBlbGVtZW50c1xuICAgICAgICByZWZlcmVuY2VhYmxlTGlzdClcbiAgICB9XG4gIH0pXG5cbiAgY3Jvc3NyZWYgPSB7XG4gICAgZ2V0QWxsUmVmZXJlbmNlYWJsZVNlY3Rpb25zOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgIGxldCBzZWN0aW9ucyA9IFtdXG5cbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLiQoJ3NlY3Rpb24nKS5lYWNoKGZ1bmN0aW9uICgpIHtcblxuICAgICAgICBsZXQgbGV2ZWwgPSAnJ1xuXG4gICAgICAgIGlmICghJCh0aGlzKS5pcyhFTkROT1RFX1NFTEVDVE9SKSkge1xuXG4gICAgICAgICAgLy8gU2VjdGlvbnMgd2l0aG91dCByb2xlIGhhdmUgOmFmdGVyXG4gICAgICAgICAgaWYgKCEkKHRoaXMpLmF0dHIoJ3JvbGUnKSkge1xuXG4gICAgICAgICAgICAvLyBTYXZlIGl0cyBkZWVwbmVzc1xuICAgICAgICAgICAgbGV0IHBhcmVudFNlY3Rpb25zID0gJCh0aGlzKS5wYXJlbnRzVW50aWwoJ2JvZHknKVxuXG4gICAgICAgICAgICBpZiAocGFyZW50U2VjdGlvbnMubGVuZ3RoKSB7XG5cbiAgICAgICAgICAgICAgLy8gSXRlcmF0ZSBpdHMgcGFyZW50cyBiYWNrd2FyZHMgKGhpZ2VyIGZpcnN0KVxuICAgICAgICAgICAgICBmb3IgKGxldCBpID0gcGFyZW50U2VjdGlvbnMubGVuZ3RoOyBpLS07IGkgPiAwKSB7XG4gICAgICAgICAgICAgICAgbGV0IHNlY3Rpb24gPSAkKHBhcmVudFNlY3Rpb25zW2ldKVxuICAgICAgICAgICAgICAgIGxldmVsICs9IGAke3NlY3Rpb24ucGFyZW50KCkuY2hpbGRyZW4oU0VDVElPTl9TRUxFQ1RPUikuaW5kZXgoc2VjdGlvbikrMX0uYFxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEN1cnJlbnQgaW5kZXhcbiAgICAgICAgICAgIGxldmVsICs9IGAkeyQodGhpcykucGFyZW50KCkuY2hpbGRyZW4oU0VDVElPTl9TRUxFQ1RPUikuaW5kZXgoJCh0aGlzKSkrMX0uYFxuICAgICAgICAgIH1cblxuICAgICAgICAgIHNlY3Rpb25zLnB1c2goe1xuICAgICAgICAgICAgcmVmZXJlbmNlOiAkKHRoaXMpLmF0dHIoJ2lkJyksXG4gICAgICAgICAgICB0ZXh0OiAkKHRoaXMpLmZpbmQoJzpoZWFkZXInKS5maXJzdCgpLnRleHQoKSxcbiAgICAgICAgICAgIGxldmVsOiBsZXZlbFxuICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICAgIH0pXG5cbiAgICAgIHJldHVybiBzZWN0aW9uc1xuICAgIH0sXG5cbiAgICBnZXRBbGxSZWZlcmVuY2VhYmxlVGFibGVzOiBmdW5jdGlvbiAoKSB7XG4gICAgICBsZXQgdGFibGVzID0gW11cblxuICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IuJCgnZmlndXJlOmhhcyh0YWJsZSknKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGFibGVzLnB1c2goe1xuICAgICAgICAgIHJlZmVyZW5jZTogJCh0aGlzKS5hdHRyKCdpZCcpLFxuICAgICAgICAgIHRleHQ6ICQodGhpcykuZmluZCgnZmlnY2FwdGlvbicpLnRleHQoKVxuICAgICAgICB9KVxuICAgICAgfSlcblxuICAgICAgcmV0dXJuIHRhYmxlc1xuICAgIH0sXG5cbiAgICBnZXRBbGxSZWZlcmVuY2VhYmxlTGlzdGluZ3M6IGZ1bmN0aW9uICgpIHtcbiAgICAgIGxldCBsaXN0aW5ncyA9IFtdXG5cbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLiQoJ2ZpZ3VyZTpoYXMocHJlOmhhcyhjb2RlKSknKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbGlzdGluZ3MucHVzaCh7XG4gICAgICAgICAgcmVmZXJlbmNlOiAkKHRoaXMpLmF0dHIoJ2lkJyksXG4gICAgICAgICAgdGV4dDogJCh0aGlzKS5maW5kKCdmaWdjYXB0aW9uJykudGV4dCgpXG4gICAgICAgIH0pXG4gICAgICB9KVxuXG4gICAgICByZXR1cm4gbGlzdGluZ3NcbiAgICB9LFxuXG4gICAgZ2V0QWxsUmVmZXJlbmNlYWJsZUZpZ3VyZXM6IGZ1bmN0aW9uICgpIHtcbiAgICAgIGxldCBmaWd1cmVzID0gW11cblxuICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IuJChGSUdVUkVfSU1BR0VfU0VMRUNUT1IpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICBmaWd1cmVzLnB1c2goe1xuICAgICAgICAgIHJlZmVyZW5jZTogJCh0aGlzKS5hdHRyKCdpZCcpLFxuICAgICAgICAgIHRleHQ6ICQodGhpcykuZmluZCgnZmlnY2FwdGlvbicpLnRleHQoKVxuICAgICAgICB9KVxuICAgICAgfSlcblxuICAgICAgcmV0dXJuIGZpZ3VyZXNcbiAgICB9LFxuXG4gICAgZ2V0QWxsUmVmZXJlbmNlYWJsZUZvcm11bGFzOiBmdW5jdGlvbiAoKSB7XG4gICAgICBsZXQgZm9ybXVsYXMgPSBbXVxuXG4gICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci4kKGZvcm11bGFib3hfc2VsZWN0b3IpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICBmb3JtdWxhcy5wdXNoKHtcbiAgICAgICAgICByZWZlcmVuY2U6ICQodGhpcykucGFyZW50cyhGSUdVUkVfU0VMRUNUT1IpLmF0dHIoJ2lkJyksXG4gICAgICAgICAgdGV4dDogYEZvcm11bGEgJHskKHRoaXMpLnBhcmVudHMoRklHVVJFX1NFTEVDVE9SKS5maW5kKCdzcGFuLmNnZW4nKS50ZXh0KCl9YFxuICAgICAgICB9KVxuICAgICAgfSlcblxuICAgICAgcmV0dXJuIGZvcm11bGFzXG4gICAgfSxcblxuICAgIGdldEFsbFJlZmVyZW5jZWFibGVSZWZlcmVuY2VzOiBmdW5jdGlvbiAoKSB7XG4gICAgICBsZXQgcmVmZXJlbmNlcyA9IFtdXG4gICAgICBcbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLiQoJ3NlY3Rpb25bcm9sZT1kb2MtYmlibGlvZ3JhcGh5XSBsaScpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICByZWZlcmVuY2VzLnB1c2goe1xuICAgICAgICAgIHJlZmVyZW5jZTogJCh0aGlzKS5hdHRyKCdpZCcpLFxuICAgICAgICAgIHRleHQ6ICQodGhpcykudGV4dCgpLFxuICAgICAgICAgIGxldmVsOiAkKHRoaXMpLmluZGV4KCkgKyAxXG4gICAgICAgIH0pXG4gICAgICB9KVxuXG4gICAgICByZXR1cm4gcmVmZXJlbmNlc1xuICAgIH0sXG5cbiAgICBhZGQ6IGZ1bmN0aW9uIChyZWZlcmVuY2UpIHtcblxuICAgICAgLy8gQ3JlYXRlIHRoZSBlbXB0eSByZWZlcmVuY2Ugd2l0aCBhIHdoaXRlc3BhY2UgYXQgdGhlIGVuZFxuICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLnNldENvbnRlbnQoYDxhIGNvbnRlbnRlZGl0YWJsZT1cImZhbHNlXCIgaHJlZj1cIiMke3JlZmVyZW5jZX1cIj4mbmJzcDs8L2E+Jm5ic3A7YClcbiAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuICAgIH0sXG5cbiAgICB1cGRhdGU6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgLy8gVXBkYXRlIHRoZSByZWZlcmVuY2UgKGluIHNhdmVkIGNvbnRlbnQpXG4gICAgICByZWZlcmVuY2VzKClcblxuICAgICAgLy8gUHJldmVudCBhZGRpbmcgb2YgbmVzdGVkIGEgYXMgZm9vdG5vdGVzXG4gICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci4kKCdhPnN1cD5hJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICQodGhpcykucGFyZW50KCkuaHRtbCgkKHRoaXMpLnRleHQoKSlcbiAgICAgIH0pXG4gICAgfVxuICB9XG59KVxuXG50aW55bWNlLlBsdWdpbk1hbmFnZXIuYWRkKCdyYWplX2Zvb3Rub3RlcycsIGZ1bmN0aW9uIChlZGl0b3IsIHVybCkge1xuXG4gIGVkaXRvci5hZGRCdXR0b24oJ3JhamVfZm9vdG5vdGVzJywge1xuICAgIHRpdGxlOiAncmFqZV9mb290bm90ZXMnLFxuICAgIGljb246ICdpY29uLWZvb3Rub3RlcycsXG4gICAgdG9vbHRpcDogJ0Zvb3Rub3RlJyxcbiAgICBkaXNhYmxlZFN0YXRlU2VsZWN0b3I6IGAke0RJU0FCTEVfU0VMRUNUT1JfSU5MSU5FfSw6aGVhZGVyYCxcblxuICAgIC8vIEJ1dHRvbiBiZWhhdmlvdXJcbiAgICBvbmNsaWNrOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAvLyBHZXQgc3VjY2Vzc2l2ZSBiaWJsaW9lbnRyeSBpZFxuICAgICAgICBsZXQgcmVmZXJlbmNlID0gZ2V0U3VjY2Vzc2l2ZUVsZW1lbnRJZChFTkROT1RFX1NFTEVDVE9SLCBFTkROT1RFX1NVRkZJWClcblxuICAgICAgICAvLyBDcmVhdGUgdGhlIHJlZmVyZW5jZSB0aGF0IHBvaW50cyB0byB0aGUgbmV4dCBpZFxuICAgICAgICBjcm9zc3JlZi5hZGQocmVmZXJlbmNlKVxuXG4gICAgICAgIC8vIEFkZCB0aGUgbmV4dCBiaWJsaW9lbnRyeVxuICAgICAgICBzZWN0aW9uLmFkZEVuZG5vdGUocmVmZXJlbmNlKVxuXG4gICAgICAgIC8vIFVwZGF0ZSB0aGUgcmVmZXJlbmNlXG4gICAgICAgIGNyb3NzcmVmLnVwZGF0ZSgpXG5cbiAgICAgICAgLy8gTW92ZSBjYXJldCBhdCB0aGUgZW5kIG9mIHAgaW4gbGFzdCBpbnNlcnRlZCBlbmRub3RlXG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZXRDdXJzb3JMb2NhdGlvbih0aW55bWNlLmFjdGl2ZUVkaXRvci5kb20uc2VsZWN0KGAke0VORE5PVEVfU0VMRUNUT1J9IyR7cmVmZXJlbmNlfT5wYClbMF0sIDEpXG4gICAgICB9KVxuICAgIH1cbiAgfSlcbn0pXG5cbmZ1bmN0aW9uIHJlZmVyZW5jZXMoKSB7XG5cbiAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG5cbiAgLyogUmVmZXJlbmNlcyAqL1xuICB0aW55bWNlLmFjdGl2ZUVkaXRvci4kKFwiYVtocmVmXVwiKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoJC50cmltKCQodGhpcykudGV4dCgpKSA9PSAnJykge1xuICAgICAgdmFyIGN1cl9pZCA9ICQodGhpcykuYXR0cihcImhyZWZcIik7XG4gICAgICBvcmlnaW5hbF9jb250ZW50ID0gJCh0aGlzKS5odG1sKClcbiAgICAgIG9yaWdpbmFsX3JlZmVyZW5jZSA9IGN1cl9pZFxuICAgICAgcmVmZXJlbmNlZF9lbGVtZW50ID0gJChjdXJfaWQpO1xuXG4gICAgICBpZiAocmVmZXJlbmNlZF9lbGVtZW50Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgcmVmZXJlbmNlZF9lbGVtZW50X2ZpZ3VyZSA9IHJlZmVyZW5jZWRfZWxlbWVudC5maW5kKFxuICAgICAgICAgIGZpZ3VyZWJveF9zZWxlY3Rvcl9pbWcgKyBcIixcIiArIGZpZ3VyZWJveF9zZWxlY3Rvcl9zdmcpO1xuICAgICAgICByZWZlcmVuY2VkX2VsZW1lbnRfdGFibGUgPSByZWZlcmVuY2VkX2VsZW1lbnQuZmluZCh0YWJsZWJveF9zZWxlY3Rvcl90YWJsZSk7XG4gICAgICAgIHJlZmVyZW5jZWRfZWxlbWVudF9mb3JtdWxhID0gcmVmZXJlbmNlZF9lbGVtZW50LmZpbmQoXG4gICAgICAgICAgZm9ybXVsYWJveF9zZWxlY3Rvcl9pbWcgKyBcIixcIiArIGZvcm11bGFib3hfc2VsZWN0b3Jfc3BhbiArIFwiLFwiICsgZm9ybXVsYWJveF9zZWxlY3Rvcl9tYXRoICsgXCIsXCIgKyBmb3JtdWxhYm94X3NlbGVjdG9yX3N2Zyk7XG4gICAgICAgIHJlZmVyZW5jZWRfZWxlbWVudF9saXN0aW5nID0gcmVmZXJlbmNlZF9lbGVtZW50LmZpbmQobGlzdGluZ2JveF9zZWxlY3Rvcl9wcmUpO1xuICAgICAgICAvKiBTcGVjaWFsIHNlY3Rpb25zICovXG4gICAgICAgIGlmIChcbiAgICAgICAgICAkKFwic2VjdGlvbltyb2xlPWRvYy1hYnN0cmFjdF1cIiArIGN1cl9pZCkubGVuZ3RoID4gMCB8fFxuICAgICAgICAgICQoXCJzZWN0aW9uW3JvbGU9ZG9jLWJpYmxpb2dyYXBoeV1cIiArIGN1cl9pZCkubGVuZ3RoID4gMCB8fFxuICAgICAgICAgICQoXCJzZWN0aW9uW3JvbGU9ZG9jLWVuZG5vdGVzXVwiICsgY3VyX2lkICsgXCIsIHNlY3Rpb25bcm9sZT1kb2MtZm9vdG5vdGVzXVwiICsgY3VyX2lkKS5sZW5ndGggPiAwIHx8XG4gICAgICAgICAgJChcInNlY3Rpb25bcm9sZT1kb2MtYWNrbm93bGVkZ2VtZW50c11cIiArIGN1cl9pZCkubGVuZ3RoID4gMCkge1xuICAgICAgICAgICQodGhpcykuaHRtbChcIjxzcGFuIGNsYXNzPVxcXCJjZ2VuXFxcIiBjb250ZW50ZWRpdGFibGU9XFxcImZhbHNlXFxcIiAgZGF0YS1yYXNoLW9yaWdpbmFsLWNvbnRlbnQ9XFxcIlwiICsgb3JpZ2luYWxfY29udGVudCArXG4gICAgICAgICAgICBcIlxcXCI+U2VjdGlvbiA8cT5cIiArICQoY3VyX2lkICsgXCIgPiBoMVwiKS50ZXh0KCkgKyBcIjwvcT48L3NwYW4+XCIpO1xuICAgICAgICAgIC8qIEJpYmxpb2dyYXBoaWMgcmVmZXJlbmNlcyAqL1xuICAgICAgICB9IGVsc2UgaWYgKCQoY3VyX2lkKS5wYXJlbnRzKFwic2VjdGlvbltyb2xlPWRvYy1iaWJsaW9ncmFwaHldXCIpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICB2YXIgY3VyX2NvdW50ID0gJChjdXJfaWQpLnByZXZBbGwoXCJsaVwiKS5sZW5ndGggKyAxO1xuICAgICAgICAgICQodGhpcykuaHRtbChcIjxzcGFuIGNsYXNzPVxcXCJjZ2VuXFxcIiBjb250ZW50ZWRpdGFibGU9XFxcImZhbHNlXFxcIiBkYXRhLXJhc2gtb3JpZ2luYWwtY29udGVudD1cXFwiXCIgKyBvcmlnaW5hbF9jb250ZW50ICtcbiAgICAgICAgICAgIFwiXFxcIiB0aXRsZT1cXFwiQmlibGlvZ3JhcGhpYyByZWZlcmVuY2UgXCIgKyBjdXJfY291bnQgKyBcIjogXCIgK1xuICAgICAgICAgICAgJChjdXJfaWQpLnRleHQoKS5yZXBsYWNlKC9cXHMrL2csIFwiIFwiKS50cmltKCkgKyBcIlxcXCI+W1wiICsgY3VyX2NvdW50ICsgXCJdPC9zcGFuPlwiKTtcbiAgICAgICAgICAvKiBGb290bm90ZSByZWZlcmVuY2VzIChkb2MtZm9vdG5vdGVzIGFuZCBkb2MtZm9vdG5vdGUgaW5jbHVkZWQgZm9yIGVhc2luZyBiYWNrIGNvbXBhdGliaWxpdHkpICovXG4gICAgICAgIH0gZWxzZSBpZiAoJChjdXJfaWQpLnBhcmVudHMoXCJzZWN0aW9uW3JvbGU9ZG9jLWVuZG5vdGVzXSwgc2VjdGlvbltyb2xlPWRvYy1mb290bm90ZXNdXCIpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICB2YXIgY3VyX2NvbnRlbnRzID0gJCh0aGlzKS5wYXJlbnQoKS5jb250ZW50cygpO1xuICAgICAgICAgIHZhciBjdXJfaW5kZXggPSBjdXJfY29udGVudHMuaW5kZXgoJCh0aGlzKSk7XG4gICAgICAgICAgdmFyIHByZXZfdG1wID0gbnVsbDtcbiAgICAgICAgICB3aGlsZSAoY3VyX2luZGV4ID4gMCAmJiAhcHJldl90bXApIHtcbiAgICAgICAgICAgIGN1cl9wcmV2ID0gY3VyX2NvbnRlbnRzW2N1cl9pbmRleCAtIDFdO1xuICAgICAgICAgICAgaWYgKGN1cl9wcmV2Lm5vZGVUeXBlICE9IDMgfHwgJChjdXJfcHJldikudGV4dCgpLnJlcGxhY2UoLyAvZywgJycpICE9ICcnKSB7XG4gICAgICAgICAgICAgIHByZXZfdG1wID0gY3VyX3ByZXY7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBjdXJfaW5kZXgtLTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIHByZXZfZWwgPSAkKHByZXZfdG1wKTtcbiAgICAgICAgICB2YXIgY3VycmVudF9pZCA9ICQodGhpcykuYXR0cihcImhyZWZcIik7XG4gICAgICAgICAgdmFyIGZvb3Rub3RlX2VsZW1lbnQgPSAkKGN1cnJlbnRfaWQpO1xuICAgICAgICAgIGlmIChmb290bm90ZV9lbGVtZW50Lmxlbmd0aCA+IDAgJiZcbiAgICAgICAgICAgIGZvb3Rub3RlX2VsZW1lbnQucGFyZW50KFwic2VjdGlvbltyb2xlPWRvYy1lbmRub3Rlc10sIHNlY3Rpb25bcm9sZT1kb2MtZm9vdG5vdGVzXVwiKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICB2YXIgY291bnQgPSAkKGN1cnJlbnRfaWQpLnByZXZBbGwoXCJzZWN0aW9uXCIpLmxlbmd0aCArIDE7XG4gICAgICAgICAgICBpZiAocHJldl9lbC5maW5kKFwic3VwXCIpLmhhc0NsYXNzKFwiZm5cIikpIHtcbiAgICAgICAgICAgICAgJCh0aGlzKS5iZWZvcmUoXCI8c3VwIGNsYXNzPVxcXCJjZ2VuXFxcIiBjb250ZW50ZWRpdGFibGU9XFxcImZhbHNlXFxcIiBkYXRhLXJhc2gtb3JpZ2luYWwtY29udGVudD1cXFwiXFxcIj4sPC9zdXA+XCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLyogU1RBUlQgUmVtb3ZlZCA8YT4gZnJvbSA8c3VwPiAqL1xuICAgICAgICAgICAgJCh0aGlzKS5odG1sKFwiPHN1cCBjbGFzcz1cXFwiZm4gY2dlblxcXCIgY29udGVudGVkaXRhYmxlPVxcXCJmYWxzZVxcXCIgZGF0YS1yYXNoLW9yaWdpbmFsLWNvbnRlbnQ9XFxcIlwiICsgb3JpZ2luYWxfY29udGVudCArIFwiXFxcIlwiICtcbiAgICAgICAgICAgICAgXCJuYW1lPVxcXCJmbl9wb2ludGVyX1wiICsgY3VycmVudF9pZC5yZXBsYWNlKFwiI1wiLCBcIlwiKSArXG4gICAgICAgICAgICAgIFwiXFxcIiB0aXRsZT1cXFwiRm9vdG5vdGUgXCIgKyBjb3VudCArIFwiOiBcIiArXG4gICAgICAgICAgICAgICQoY3VycmVudF9pZCkudGV4dCgpLnJlcGxhY2UoL1xccysvZywgXCIgXCIpLnRyaW0oKSArIFwiXFxcIj5cIiArIGNvdW50ICsgXCI8L3N1cD5cIik7XG4gICAgICAgICAgICAvKiBFTkQgUmVtb3ZlZCA8YT4gZnJvbSA8c3VwPiAqL1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkKHRoaXMpLmh0bWwoXCI8c3BhbiBjbGFzcz1cXFwiZXJyb3IgY2dlblxcXCIgY29udGVudGVkaXRhYmxlPVxcXCJmYWxzZVxcXCIgZGF0YS1yYXNoLW9yaWdpbmFsLWNvbnRlbnQ9XFxcIlwiICsgb3JpZ2luYWxfY29udGVudCArXG4gICAgICAgICAgICAgIFwiXFxcIj5FUlI6IGZvb3Rub3RlICdcIiArIGN1cnJlbnRfaWQucmVwbGFjZShcIiNcIiwgXCJcIikgKyBcIicgZG9lcyBub3QgZXhpc3Q8L3NwYW4+XCIpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvKiBDb21tb24gc2VjdGlvbnMgKi9cbiAgICAgICAgfSBlbHNlIGlmICgkKFwic2VjdGlvblwiICsgY3VyX2lkKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgdmFyIGN1cl9jb3VudCA9ICQoY3VyX2lkKS5maW5kSGllcmFyY2hpY2FsTnVtYmVyKFxuICAgICAgICAgICAgXCJzZWN0aW9uOm5vdChbcm9sZT1kb2MtYWJzdHJhY3RdKTpub3QoW3JvbGU9ZG9jLWJpYmxpb2dyYXBoeV0pOlwiICtcbiAgICAgICAgICAgIFwibm90KFtyb2xlPWRvYy1lbmRub3Rlc10pOm5vdChbcm9sZT1kb2MtZm9vdG5vdGVzXSk6bm90KFtyb2xlPWRvYy1hY2tub3dsZWRnZW1lbnRzXSlcIik7XG4gICAgICAgICAgaWYgKGN1cl9jb3VudCAhPSBudWxsICYmIGN1cl9jb3VudCAhPSBcIlwiKSB7XG4gICAgICAgICAgICAkKHRoaXMpLmh0bWwoXCI8c3BhbiBjbGFzcz1cXFwiY2dlblxcXCIgY29udGVudGVkaXRhYmxlPVxcXCJmYWxzZVxcXCIgZGF0YS1yYXNoLW9yaWdpbmFsLWNvbnRlbnQ9XFxcIlwiICsgb3JpZ2luYWxfY29udGVudCArXG4gICAgICAgICAgICAgIFwiXFxcIj5TZWN0aW9uIFwiICsgY3VyX2NvdW50ICsgXCI8L3NwYW4+XCIpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvKiBSZWZlcmVuY2UgdG8gZmlndXJlIGJveGVzICovXG4gICAgICAgIH0gZWxzZSBpZiAocmVmZXJlbmNlZF9lbGVtZW50X2ZpZ3VyZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgdmFyIGN1cl9jb3VudCA9IHJlZmVyZW5jZWRfZWxlbWVudF9maWd1cmUuZmluZE51bWJlcihmaWd1cmVib3hfc2VsZWN0b3IpO1xuICAgICAgICAgIGlmIChjdXJfY291bnQgIT0gMCkge1xuICAgICAgICAgICAgJCh0aGlzKS5odG1sKFwiPHNwYW4gY2xhc3M9XFxcImNnZW5cXFwiIGNvbnRlbnRlZGl0YWJsZT1cXFwiZmFsc2VcXFwiIGRhdGEtcmFzaC1vcmlnaW5hbC1jb250ZW50PVxcXCJcIiArIG9yaWdpbmFsX2NvbnRlbnQgK1xuICAgICAgICAgICAgICBcIlxcXCI+RmlndXJlIFwiICsgY3VyX2NvdW50ICsgXCI8L3NwYW4+XCIpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvKiBSZWZlcmVuY2UgdG8gdGFibGUgYm94ZXMgKi9cbiAgICAgICAgfSBlbHNlIGlmIChyZWZlcmVuY2VkX2VsZW1lbnRfdGFibGUubGVuZ3RoID4gMCkge1xuICAgICAgICAgIHZhciBjdXJfY291bnQgPSByZWZlcmVuY2VkX2VsZW1lbnRfdGFibGUuZmluZE51bWJlcih0YWJsZWJveF9zZWxlY3Rvcik7XG4gICAgICAgICAgaWYgKGN1cl9jb3VudCAhPSAwKSB7XG4gICAgICAgICAgICAkKHRoaXMpLmh0bWwoXCI8c3BhbiBjbGFzcz1cXFwiY2dlblxcXCIgY29udGVudGVkaXRhYmxlPVxcXCJmYWxzZVxcXCIgZGF0YS1yYXNoLW9yaWdpbmFsLWNvbnRlbnQ9XFxcIlwiICsgb3JpZ2luYWxfY29udGVudCArXG4gICAgICAgICAgICAgIFwiXFxcIj5UYWJsZSBcIiArIGN1cl9jb3VudCArIFwiPC9zcGFuPlwiKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLyogUmVmZXJlbmNlIHRvIGZvcm11bGEgYm94ZXMgKi9cbiAgICAgICAgfSBlbHNlIGlmIChyZWZlcmVuY2VkX2VsZW1lbnRfZm9ybXVsYS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgdmFyIGN1cl9jb3VudCA9IHJlZmVyZW5jZWRfZWxlbWVudF9mb3JtdWxhLmZpbmROdW1iZXIoZm9ybXVsYWJveF9zZWxlY3Rvcik7XG4gICAgICAgICAgaWYgKGN1cl9jb3VudCAhPSAwKSB7XG4gICAgICAgICAgICAkKHRoaXMpLmh0bWwoXCI8c3BhbiBjbGFzcz1cXFwiY2dlblxcXCIgY29udGVudGVkaXRhYmxlPVxcXCJmYWxzZVxcXCIgZGF0YS1yYXNoLW9yaWdpbmFsLWNvbnRlbnQ9XFxcIlwiICsgb3JpZ2luYWxfY29udGVudCArXG4gICAgICAgICAgICAgIFwiXFxcIj5Gb3JtdWxhIFwiICsgY3VyX2NvdW50ICsgXCI8L3NwYW4+XCIpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvKiBSZWZlcmVuY2UgdG8gbGlzdGluZyBib3hlcyAqL1xuICAgICAgICB9IGVsc2UgaWYgKHJlZmVyZW5jZWRfZWxlbWVudF9saXN0aW5nLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICB2YXIgY3VyX2NvdW50ID0gcmVmZXJlbmNlZF9lbGVtZW50X2xpc3RpbmcuZmluZE51bWJlcihsaXN0aW5nYm94X3NlbGVjdG9yKTtcbiAgICAgICAgICBpZiAoY3VyX2NvdW50ICE9IDApIHtcbiAgICAgICAgICAgICQodGhpcykuaHRtbChcIjxzcGFuIGNsYXNzPVxcXCJjZ2VuXFxcIiBjb250ZW50ZWRpdGFibGU9XFxcImZhbHNlXFxcIiBkYXRhLXJhc2gtb3JpZ2luYWwtY29udGVudD1cXFwiXCIgKyBvcmlnaW5hbF9jb250ZW50ICtcbiAgICAgICAgICAgICAgXCJcXFwiPkxpc3RpbmcgXCIgKyBjdXJfY291bnQgKyBcIjwvc3Bhbj5cIik7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICQodGhpcykuaHRtbChcIjxzcGFuIGNsYXNzPVxcXCJlcnJvciBjZ2VuXFxcIiBjb250ZW50ZWRpdGFibGU9XFxcImZhbHNlXFxcIiBkYXRhLXJhc2gtb3JpZ2luYWwtY29udGVudD1cXFwiXCIgKyBvcmlnaW5hbF9jb250ZW50ICtcbiAgICAgICAgICAgIFwiXFxcIj5FUlI6IHJlZmVyZW5jZWQgZWxlbWVudCAnXCIgKyBjdXJfaWQucmVwbGFjZShcIiNcIiwgXCJcIikgK1xuICAgICAgICAgICAgXCInIGhhcyBub3QgdGhlIGNvcnJlY3QgdHlwZSAoaXQgc2hvdWxkIGJlIGVpdGhlciBhIGZpZ3VyZSwgYSB0YWJsZSwgYSBmb3JtdWxhLCBhIGxpc3RpbmcsIG9yIGEgc2VjdGlvbik8L3NwYW4+XCIpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkKHRoaXMpLnJlcGxhY2VXaXRoKFwiPHNwYW4gY2xhc3M9XFxcImVycm9yIGNnZW5cXFwiIGNvbnRlbnRlZGl0YWJsZT1cXFwiZmFsc2VcXFwiIGRhdGEtcmFzaC1vcmlnaW5hbC1jb250ZW50PVxcXCJcIiArIG9yaWdpbmFsX2NvbnRlbnQgK1xuICAgICAgICAgIFwiXFxcIj5FUlI6IHJlZmVyZW5jZWQgZWxlbWVudCAnXCIgKyBjdXJfaWQucmVwbGFjZShcIiNcIiwgXCJcIikgKyBcIicgZG9lcyBub3QgZXhpc3Q8L3NwYW4+XCIpO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG4gIC8qIC9FTkQgUmVmZXJlbmNlcyAqL1xufVxuXG5mdW5jdGlvbiB1cGRhdGVSZWZlcmVuY2VzKCkge1xuXG4gIGlmICh0aW55bWNlLmFjdGl2ZUVkaXRvci4kKCdzcGFuLmNnZW5bZGF0YS1yYXNoLW9yaWdpbmFsLWNvbnRlbnRdLHN1cC5jZ2VuLmZuJykubGVuZ3RoKSB7XG5cbiAgICAvLyBSZXN0b3JlIGFsbCBzYXZlZCBjb250ZW50XG4gICAgdGlueW1jZS5hY3RpdmVFZGl0b3IuJCgnc3Bhbi5jZ2VuW2RhdGEtcmFzaC1vcmlnaW5hbC1jb250ZW50XSxzdXAuY2dlbi5mbicpLmVhY2goZnVuY3Rpb24gKCkge1xuXG4gICAgICAvLyBTYXZlIG9yaWdpbmFsIGNvbnRlbnQgYW5kIHJlZmVyZW5jZVxuICAgICAgbGV0IG9yaWdpbmFsX2NvbnRlbnQgPSAkKHRoaXMpLmF0dHIoJ2RhdGEtcmFzaC1vcmlnaW5hbC1jb250ZW50JylcbiAgICAgIGxldCBvcmlnaW5hbF9yZWZlcmVuY2UgPSAkKHRoaXMpLnBhcmVudCgnYScpLmF0dHIoJ2hyZWYnKVxuXG4gICAgICAkKHRoaXMpLnBhcmVudCgnYScpLnJlcGxhY2VXaXRoKGA8YSBjb250ZW50ZWRpdGFibGU9XCJmYWxzZVwiIGhyZWY9XCIke29yaWdpbmFsX3JlZmVyZW5jZX1cIj4ke29yaWdpbmFsX2NvbnRlbnR9PC9hPmApXG4gICAgfSlcbiAgICBcbiAgICByZWZlcmVuY2VzKClcbiAgfVxufSIsIi8qKlxuICogVGhpcyBzY3JpcHQgY29udGFpbnMgYWxsIGZpZ3VyZSBib3ggYXZhaWxhYmxlIHdpdGggUkFTSC5cbiAqIFxuICogcGx1Z2luczpcbiAqICByYWplX3RhYmxlXG4gKiAgcmFqZV9maWd1cmVcbiAqICByYWplX2Zvcm11bGFcbiAqICByYWplX2xpc3RpbmdcbiAqL1xubGV0IHJlbW92ZV9saXN0aW5nID0gMFxuXG4vKipcbiAqIFxuICogQHBhcmFtIHsqfSBmb3JtdWxhVmFsdWUgXG4gKiBAcGFyYW0geyp9IGNhbGxiYWNrIFxuICovXG5mdW5jdGlvbiBvcGVuSW5saW5lRm9ybXVsYUVkaXRvcihmb3JtdWxhVmFsdWUpIHtcbiAgdGlueW1jZS5hY3RpdmVFZGl0b3Iud2luZG93TWFuYWdlci5vcGVuKHtcbiAgICAgIHRpdGxlOiAnTWF0aCBmb3JtdWxhIGVkaXRvcicsXG4gICAgICB1cmw6ICdqcy9yYWplLWNvcmUvcGx1Z2luL3JhamVfZm9ybXVsYS5odG1sJyxcbiAgICAgIHdpZHRoOiA4MDAsXG4gICAgICBoZWlnaHQ6IDUwMCxcbiAgICAgIG9uQ2xvc2U6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgICBsZXQgb3V0cHV0ID0gdGlueW1jZS5hY3RpdmVFZGl0b3IuZm9ybXVsYV9vdXRwdXRcblxuICAgICAgICAvLyBJZiBhdCBsZWFzdCBmb3JtdWxhIGlzIHdyaXR0ZW5cbiAgICAgICAgaWYgKG91dHB1dCAhPSBudWxsKSB7XG5cbiAgICAgICAgICAvLyBJZiBoYXMgaWQsIFJBSkUgbXVzdCB1cGRhdGUgaXRcbiAgICAgICAgICBpZiAob3V0cHV0LmZvcm11bGFfaWQpXG4gICAgICAgICAgICBpbmxpbmVfZm9ybXVsYS51cGRhdGUob3V0cHV0LmZvcm11bGFfc3ZnLCBvdXRwdXQuZm9ybXVsYV9pZClcblxuICAgICAgICAgIC8vIE9yIGFkZCBpdCBub3JtYWxseVxuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIGlubGluZV9mb3JtdWxhLmFkZChvdXRwdXQuZm9ybXVsYV9zdmcpXG5cbiAgICAgICAgICAvLyBTZXQgZm9ybXVsYSBudWxsXG4gICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IuZm9ybXVsYV9vdXRwdXQgPSBudWxsXG4gICAgICAgIH1cblxuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci53aW5kb3dNYW5hZ2VyLmNsb3NlKClcbiAgICAgIH1cbiAgICB9LFxuICAgIGZvcm11bGFWYWx1ZVxuICApXG59XG5cbi8qKlxuICogXG4gKiBAcGFyYW0geyp9IGZvcm11bGFWYWx1ZSBcbiAqIEBwYXJhbSB7Kn0gY2FsbGJhY2sgXG4gKi9cbmZ1bmN0aW9uIG9wZW5Gb3JtdWxhRWRpdG9yKGZvcm11bGFWYWx1ZSkge1xuICB0aW55bWNlLmFjdGl2ZUVkaXRvci53aW5kb3dNYW5hZ2VyLm9wZW4oe1xuICAgICAgdGl0bGU6ICdNYXRoIGZvcm11bGEgZWRpdG9yJyxcbiAgICAgIHVybDogJ2pzL3JhamUtY29yZS9wbHVnaW4vcmFqZV9mb3JtdWxhLmh0bWwnLFxuICAgICAgd2lkdGg6IDgwMCxcbiAgICAgIGhlaWdodDogNTAwLFxuICAgICAgb25DbG9zZTogZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIGxldCBvdXRwdXQgPSB0aW55bWNlLmFjdGl2ZUVkaXRvci5mb3JtdWxhX291dHB1dFxuXG4gICAgICAgIC8vIElmIGF0IGxlYXN0IGZvcm11bGEgaXMgd3JpdHRlblxuICAgICAgICBpZiAob3V0cHV0ICE9IG51bGwpIHtcblxuICAgICAgICAgIC8vIElmIGhhcyBpZCwgUkFKRSBtdXN0IHVwZGF0ZSBpdFxuICAgICAgICAgIGlmIChvdXRwdXQuZm9ybXVsYV9pZClcbiAgICAgICAgICAgIGZvcm11bGEudXBkYXRlKG91dHB1dC5mb3JtdWxhX3N2Zywgb3V0cHV0LmZvcm11bGFfaWQpXG5cbiAgICAgICAgICAvLyBPciBhZGQgaXQgbm9ybWFsbHlcbiAgICAgICAgICBlbHNlXG4gICAgICAgICAgICBmb3JtdWxhLmFkZChvdXRwdXQuZm9ybXVsYV9zdmcpXG5cbiAgICAgICAgICAvLyBTZXQgZm9ybXVsYSBudWxsXG4gICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IuZm9ybXVsYV9vdXRwdXQgPSBudWxsXG4gICAgICAgIH1cblxuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci53aW5kb3dNYW5hZ2VyLmNsb3NlKClcbiAgICAgIH1cbiAgICB9LFxuICAgIGZvcm11bGFWYWx1ZVxuICApXG59XG5cbi8qKlxuICogUmFqZV90YWJsZVxuICovXG50aW55bWNlLlBsdWdpbk1hbmFnZXIuYWRkKCdyYWplX3RhYmxlJywgZnVuY3Rpb24gKGVkaXRvcikge1xuXG4gIC8vIEFkZCBhIGJ1dHRvbiB0aGF0IGhhbmRsZSB0aGUgaW5saW5lIGVsZW1lbnRcbiAgZWRpdG9yLmFkZEJ1dHRvbigncmFqZV90YWJsZScsIHtcbiAgICB0aXRsZTogJ3JhamVfdGFibGUnLFxuICAgIGljb246ICdpY29uLXRhYmxlJyxcbiAgICB0b29sdGlwOiAnVGFibGUnLFxuICAgIGRpc2FibGVkU3RhdGVTZWxlY3RvcjogRElTQUJMRV9TRUxFQ1RPUl9GSUdVUkVTLFxuXG4gICAgLy8gQnV0dG9uIGJlaGF2aW91clxuICAgIG9uY2xpY2s6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgLy8gT24gY2xpY2sgYSBkaWFsb2cgaXMgb3BlbmVkXG4gICAgICBlZGl0b3Iud2luZG93TWFuYWdlci5vcGVuKHtcbiAgICAgICAgdGl0bGU6ICdTZWxlY3QgVGFibGUgc2l6ZScsXG4gICAgICAgIGJvZHk6IFt7XG4gICAgICAgICAgdHlwZTogJ3RleHRib3gnLFxuICAgICAgICAgIG5hbWU6ICd3aWR0aCcsXG4gICAgICAgICAgbGFiZWw6ICdDb2x1bW5zJ1xuICAgICAgICB9LCB7XG4gICAgICAgICAgdHlwZTogJ3RleHRib3gnLFxuICAgICAgICAgIG5hbWU6ICdoZWlndGgnLFxuICAgICAgICAgIGxhYmVsOiAnUm93cydcbiAgICAgICAgfV0sXG4gICAgICAgIG9uU3VibWl0OiBmdW5jdGlvbiAoZSkge1xuXG4gICAgICAgICAgLy8gR2V0IHdpZHRoIGFuZCBoZWlndGhcbiAgICAgICAgICB0YWJsZS5hZGQoZS5kYXRhLndpZHRoLCBlLmRhdGEuaGVpZ3RoKVxuICAgICAgICB9XG4gICAgICB9KVxuICAgIH1cbiAgfSlcblxuICAvLyBCZWNhdXNlIHNvbWUgYmVoYXZpb3VycyBhcmVuJ3QgYWNjZXB0ZWQsIFJBSkUgbXVzdCBjaGVjayBzZWxlY3Rpb24gYW5kIGFjY2VwdCBiYWNrc3BhY2UsIGNhbmMgYW5kIGVudGVyIHByZXNzXG4gIGVkaXRvci5vbigna2V5RG93bicsIGZ1bmN0aW9uIChlKSB7XG5cbiAgICAvLyBUT0RPIGlmIGluc2lkZSB0YWJsZVxuXG4gICAgLy8ga2V5Q29kZSA4IGlzIGJhY2tzcGFjZSwgNDYgaXMgY2FuY1xuICAgIGlmIChlLmtleUNvZGUgPT0gOClcbiAgICAgIHJldHVybiBoYW5kbGVGaWd1cmVEZWxldGUodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uKVxuXG4gICAgaWYgKGUua2V5Q29kZSA9PSA0NilcbiAgICAgIHJldHVybiBoYW5kbGVGaWd1cmVDYW5jKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbilcblxuICAgIC8vIEhhbmRsZSBlbnRlciBrZXkgaW4gZmlnY2FwdGlvblxuICAgIGlmIChlLmtleUNvZGUgPT0gMTMpXG4gICAgICByZXR1cm4gaGFuZGxlRmlndXJlRW50ZXIodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uKVxuXG4gICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKVxuICB9KVxuXG4gIC8vIEhhbmRsZSBzdHJhbmdlIHN0cnVjdHVyYWwgbW9kaWZpY2F0aW9uIGVtcHR5IGZpZ3VyZXMgb3Igd2l0aCBjYXB0aW9uIGFzIGZpcnN0IGNoaWxkXG4gIGVkaXRvci5vbignbm9kZUNoYW5nZScsIGZ1bmN0aW9uICgpIHtcbiAgICBoYW5kbGVGaWd1cmVDaGFuZ2UodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uKVxuICB9KVxuXG4gIHRhYmxlID0ge1xuXG4gICAgLyoqXG4gICAgICogQWRkIHRoZSBuZXcgdGFibGUgKHdpdGggZ2l2ZW4gc2l6ZSkgYXQgdGhlIGNhcmV0IHBvc2l0aW9uXG4gICAgICovXG4gICAgYWRkOiBmdW5jdGlvbiAod2lkdGgsIGhlaWd0aCkge1xuXG4gICAgICAvLyBHZXQgdGhlIHJlZmVyZW5jZSBvZiB0aGUgY3VycmVudCBzZWxlY3RlZCBlbGVtZW50XG4gICAgICBsZXQgc2VsZWN0ZWRFbGVtZW50ID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuXG4gICAgICAvLyBHZXQgdGhlIHJlZmVyZW5jZSBvZiB0aGUgbmV3IGNyZWF0ZWQgdGFibGVcbiAgICAgIGxldCBuZXdUYWJsZSA9IHRoaXMuY3JlYXRlKHdpZHRoLCBoZWlndGgsIGdldFN1Y2Nlc3NpdmVFbGVtZW50SWQoRklHVVJFX1RBQkxFX1NFTEVDVE9SLCBUQUJMRV9TVUZGSVgpKVxuXG4gICAgICAvLyBCZWdpbiBhdG9taWMgVU5ETyBsZXZlbCBcbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAvLyBDaGVjayBpZiB0aGUgc2VsZWN0ZWQgZWxlbWVudCBpcyBub3QgZW1wdHksIGFuZCBhZGQgdGFibGUgYWZ0ZXJcbiAgICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC50ZXh0KCkudHJpbSgpLmxlbmd0aCAhPSAwKSB7XG5cbiAgICAgICAgICAvLyBJZiBzZWxlY3Rpb24gaXMgYXQgc3RhcnQgb2YgdGhlIHNlbGVjdGVkIGVsZW1lbnRcbiAgICAgICAgICBpZiAodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldFJuZygpLnN0YXJ0T2Zmc2V0ID09IDApXG4gICAgICAgICAgICBzZWxlY3RlZEVsZW1lbnQuYmVmb3JlKG5ld1RhYmxlKVxuXG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgc2VsZWN0ZWRFbGVtZW50LmFmdGVyKG5ld1RhYmxlKVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gSWYgc2VsZWN0ZWQgZWxlbWVudCBpcyBlbXB0eSwgcmVwbGFjZSBpdCB3aXRoIHRoZSBuZXcgdGFibGVcbiAgICAgICAgZWxzZVxuICAgICAgICAgIHNlbGVjdGVkRWxlbWVudC5yZXBsYWNlV2l0aChuZXdUYWJsZSlcblxuICAgICAgICAvLyBVcGRhdGUgYWxsIGNhcHRpb25zIHdpdGggUkFTSCBmdW5jdGlvblxuICAgICAgICBjYXB0aW9ucygpXG5cbiAgICAgICAgLy8gVXBkYXRlIGFsbCBjcm9zcy1yZWZcbiAgICAgICAgdXBkYXRlUmVmZXJlbmNlcygpXG5cbiAgICAgICAgLy8gU2F2ZSB1cGRhdGVzIFxuICAgICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcbiAgICAgIH0pXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSB0aGUgbmV3IHRhYmxlIHVzaW5nIHBhc3NlZCB3aWR0aCBhbmQgaGVpZ2h0XG4gICAgICovXG4gICAgY3JlYXRlOiBmdW5jdGlvbiAod2lkdGgsIGhlaWdodCwgaWQpIHtcblxuICAgICAgLy8gSWYgd2lkdGggYW5kIGhlaWd0aCBhcmUgcG9zaXRpdmVcbiAgICAgIHRyeSB7XG4gICAgICAgIGlmICh3aWR0aCA+IDAgJiYgaGVpZ2h0ID4gMCkge1xuXG4gICAgICAgICAgLy8gQ3JlYXRlIGZpZ3VyZSBhbmQgdGFibGVcbiAgICAgICAgICBsZXQgZmlndXJlID0gJChgPGZpZ3VyZSBpZD1cIiR7aWR9XCI+PC9maWd1cmU+YClcbiAgICAgICAgICBsZXQgdGFibGUgPSAkKGA8dGFibGU+PC90YWJsZT5gKVxuXG4gICAgICAgICAgLy8gUG9wdWxhdGUgd2l0aCB3aWR0aCAmIGhlaWd0aFxuICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDw9IGhlaWdodDsgaSsrKSB7XG5cbiAgICAgICAgICAgIGxldCByb3cgPSAkKGA8dHI+PC90cj5gKVxuICAgICAgICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB3aWR0aDsgeCsrKSB7XG5cbiAgICAgICAgICAgICAgaWYgKGkgPT0gMClcbiAgICAgICAgICAgICAgICByb3cuYXBwZW5kKGA8dGg+SGVhZGluZyBjZWxsICR7eCsxfTwvdGg+YClcblxuICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgcm93LmFwcGVuZChgPHRkPjxwPkRhdGEgY2VsbCAke3grMX08L3A+PC90ZD5gKVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0YWJsZS5hcHBlbmQocm93KVxuICAgICAgICAgIH1cblxuICAgICAgICAgIGZpZ3VyZS5hcHBlbmQodGFibGUpXG4gICAgICAgICAgZmlndXJlLmFwcGVuZChgPGZpZ2NhcHRpb24+Q2FwdGlvbi48L2ZpZ2NhcHRpb24+YClcblxuICAgICAgICAgIHJldHVybiBmaWd1cmVcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZSkge31cbiAgICB9XG4gIH1cbn0pXG5cbi8qKlxuICogUmFqZV9maWd1cmVcbiAqL1xudGlueW1jZS5QbHVnaW5NYW5hZ2VyLmFkZCgncmFqZV9pbWFnZScsIGZ1bmN0aW9uIChlZGl0b3IsIHVybCkge1xuXG4gIC8vIEFkZCBhIGJ1dHRvbiB0aGF0IGhhbmRsZSB0aGUgaW5saW5lIGVsZW1lbnRcbiAgZWRpdG9yLmFkZEJ1dHRvbigncmFqZV9pbWFnZScsIHtcbiAgICB0aXRsZTogJ3JhamVfaW1hZ2UnLFxuICAgIGljb246ICdpY29uLWltYWdlJyxcbiAgICB0b29sdGlwOiAnSW1hZ2UgYmxvY2snLFxuICAgIGRpc2FibGVkU3RhdGVTZWxlY3RvcjogRElTQUJMRV9TRUxFQ1RPUl9GSUdVUkVTLFxuXG4gICAgLy8gQnV0dG9uIGJlaGF2aW91clxuICAgIG9uY2xpY2s6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgbGV0IGZpbGVuYW1lID0gc2VsZWN0SW1hZ2UoKVxuXG4gICAgICBpZiAoZmlsZW5hbWUgIT0gbnVsbClcbiAgICAgICAgaW1hZ2UuYWRkKGZpbGVuYW1lLCBmaWxlbmFtZSlcbiAgICB9XG4gIH0pXG5cbiAgLy8gQmVjYXVzZSBzb21lIGJlaGF2aW91cnMgYXJlbid0IGFjY2VwdGVkLCBSQUpFIG11c3QgY2hlY2sgc2VsZWN0aW9uIGFuZCBhY2NlcHQgYmFja3NwYWNlLCBjYW5jIGFuZCBlbnRlciBwcmVzc1xuICBlZGl0b3Iub24oJ2tleURvd24nLCBmdW5jdGlvbiAoZSkge1xuXG5cbiAgICAvLyBrZXlDb2RlIDggaXMgYmFja3NwYWNlXG4gICAgaWYgKGUua2V5Q29kZSA9PSA4KVxuICAgICAgcmV0dXJuIGhhbmRsZUZpZ3VyZURlbGV0ZSh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24pXG5cbiAgICBpZiAoZS5rZXlDb2RlID09IDQ2KVxuICAgICAgcmV0dXJuIGhhbmRsZUZpZ3VyZUNhbmModGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uKVxuXG4gICAgLy8gSGFuZGxlIGVudGVyIGtleSBpbiBmaWdjYXB0aW9uXG4gICAgaWYgKGUua2V5Q29kZSA9PSAxMylcbiAgICAgIHJldHVybiBoYW5kbGVGaWd1cmVFbnRlcih0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24pXG5cbiAgfSlcblxuICBpbWFnZSA9IHtcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIGFkZDogZnVuY3Rpb24gKHVybCwgYWx0KSB7XG5cbiAgICAgIC8vIEdldCB0aGUgcmVmZXJlY2Ugb2YgdGhlIHNlbGVjdGVkIGVsZW1lbnRcbiAgICAgIGxldCBzZWxlY3RlZEVsZW1lbnQgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG4gICAgICBsZXQgbmV3RmlndXJlID0gdGhpcy5jcmVhdGUodXJsLCBhbHQsIGdldFN1Y2Nlc3NpdmVFbGVtZW50SWQoRklHVVJFX0lNQUdFX1NFTEVDVE9SLCBJTUFHRV9TVUZGSVgpKVxuXG4gICAgICAvLyBCZWdpbiBhdG9taWMgVU5ETyBsZXZlbCBcbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAvLyBDaGVjayBpZiB0aGUgc2VsZWN0ZWQgZWxlbWVudCBpcyBub3QgZW1wdHksIGFuZCBhZGQgdGFibGUgYWZ0ZXJcbiAgICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC50ZXh0KCkudHJpbSgpLmxlbmd0aCAhPSAwKSB7XG5cbiAgICAgICAgICAvLyBJZiBzZWxlY3Rpb24gaXMgYXQgc3RhcnQgb2YgdGhlIHNlbGVjdGVkIGVsZW1lbnRcbiAgICAgICAgICBpZiAodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldFJuZygpLnN0YXJ0T2Zmc2V0ID09IDApXG4gICAgICAgICAgICBzZWxlY3RlZEVsZW1lbnQuYmVmb3JlKG5ld0ZpZ3VyZSlcblxuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIHNlbGVjdGVkRWxlbWVudC5hZnRlcihuZXdGaWd1cmUpXG4gICAgICAgIH1cblxuICAgICAgICAvLyBJZiBzZWxlY3RlZCBlbGVtZW50IGlzIGVtcHR5LCByZXBsYWNlIGl0IHdpdGggdGhlIG5ldyB0YWJsZVxuICAgICAgICBlbHNlXG4gICAgICAgICAgc2VsZWN0ZWRFbGVtZW50LnJlcGxhY2VXaXRoKG5ld0ZpZ3VyZSlcblxuICAgICAgICAvLyBVcGRhdGUgYWxsIGNhcHRpb25zIHdpdGggUkFTSCBmdW5jdGlvblxuICAgICAgICBjYXB0aW9ucygpXG5cbiAgICAgICAgLy8gVXBkYXRlIGFsbCBjcm9zcy1yZWZcbiAgICAgICAgdXBkYXRlUmVmZXJlbmNlcygpXG5cbiAgICAgICAgLy8gU2F2ZSB1cGRhdGVzIFxuICAgICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcbiAgICAgIH0pXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIGNyZWF0ZTogZnVuY3Rpb24gKHVybCwgYWx0LCBpZCkge1xuICAgICAgcmV0dXJuICQoYDxmaWd1cmUgaWQ9XCIke2lkfVwiPjxwPjxpbWcgc3JjPVwiJHt1cmx9XCIgJHthbHQ/J2FsdD1cIicrYWx0KydcIic6Jyd9IC8+PC9wPjxmaWdjYXB0aW9uPkNhcHRpb24uPC9maWdjYXB0aW9uPjwvZmlndXJlPmApXG4gICAgfVxuICB9XG59KVxuXG4vKipcbiAqIFJhamVfZm9ybXVsYVxuICovXG50aW55bWNlLlBsdWdpbk1hbmFnZXIuYWRkKCdyYWplX2Zvcm11bGEnLCBmdW5jdGlvbiAoZWRpdG9yLCB1cmwpIHtcblxuICAvLyBBZGQgYSBidXR0b24gdGhhdCBoYW5kbGUgdGhlIGlubGluZSBlbGVtZW50XG4gIGVkaXRvci5hZGRCdXR0b24oJ3JhamVfZm9ybXVsYScsIHtcbiAgICB0aXRsZTogJ3JhamVfZm9ybXVsYScsXG4gICAgaWNvbjogJ2ljb24tZm9ybXVsYScsXG4gICAgdG9vbHRpcDogJ0Zvcm11bGEnLFxuICAgIGRpc2FibGVkU3RhdGVTZWxlY3RvcjogRElTQUJMRV9TRUxFQ1RPUl9GSUdVUkVTLFxuXG4gICAgLy8gQnV0dG9uIGJlaGF2aW91clxuICAgIG9uY2xpY2s6IGZ1bmN0aW9uICgpIHtcbiAgICAgIG9wZW5Gb3JtdWxhRWRpdG9yKClcbiAgICB9XG4gIH0pXG5cbiAgLy8gQmVjYXVzZSBzb21lIGJlaGF2aW91cnMgYXJlbid0IGFjY2VwdGVkLCBSQUpFIG11c3QgY2hlY2sgc2VsZWN0aW9uIGFuZCBhY2NlcHQgYmFja3NwYWNlLCBjYW5jIGFuZCBlbnRlciBwcmVzc1xuICBlZGl0b3Iub24oJ2tleURvd24nLCBmdW5jdGlvbiAoZSkge1xuXG4gICAgbGV0IHNlbGVjdGVkRWxlbWVudCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcblxuICAgIGlmIChmb3JtdWxhLmN1cnNvckluRm9ybXVsYShzZWxlY3RlZEVsZW1lbnQpKSB7XG5cbiAgICAgIC8vIGtleUNvZGUgOCBpcyBiYWNrc3BhY2VcbiAgICAgIGlmIChlLmtleUNvZGUgPT0gOCkge1xuICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpXG4gICAgICAgIHJldHVybiBoYW5kbGVGaWd1cmVEZWxldGUodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uKVxuICAgICAgfVxuXG4gICAgICBpZiAoZS5rZXlDb2RlID09IDQ2KSB7XG4gICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKClcbiAgICAgICAgcmV0dXJuIGhhbmRsZUZpZ3VyZUNhbmModGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uKVxuICAgICAgfVxuXG4gICAgICAvLyBIYW5kbGUgZW50ZXIga2V5IGluIGZpZ2NhcHRpb25cbiAgICAgIGlmIChlLmtleUNvZGUgPT0gMTMpIHtcbiAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKVxuICAgICAgICByZXR1cm4gaGFuZGxlRmlndXJlRW50ZXIodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uKVxuICAgICAgfVxuXG4gICAgICAvLyBCbG9jayBwcmludGFibGUgY2hhcnMgaW4gcFxuICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC5pcygncCcpICYmIGNoZWNrSWZQcmludGFibGVDaGFyKGUua2V5Q29kZSkpIHtcbiAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKVxuICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgIH1cbiAgICB9XG4gIH0pXG5cbiAgZWRpdG9yLm9uKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XG4gICAgbGV0IHNlbGVjdGVkRWxlbWVudCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcblxuICAgIC8vIE9wZW4gZm9ybXVsYSBlZGl0b3IgY2xpY2tpbmcgb24gbWF0aCBmb3JtdWxhc1xuICAgIC8vIE9ObHkgaWYgdGhlIGN1cnJlbnQgZWxlbWVudCB0aGUgc3BhbiB3aXRoIGNvbnRlbnRlZGl0YWJsZT1cImZhbHNlXCJcbiAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LmlzKCdzcGFuW2NvbnRlbnRlZGl0YWJsZT1mYWxzZV0nKSAmJiBmb3JtdWxhLmN1cnNvckluRm9ybXVsYShzZWxlY3RlZEVsZW1lbnQpKSB7XG5cbiAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKClcblxuICAgICAgbGV0IGZpZ3VyZSA9IHNlbGVjdGVkRWxlbWVudFxuXG4gICAgICBpZiAoIXNlbGVjdGVkRWxlbWVudC5pcyhGSUdVUkVfRk9STVVMQV9TRUxFQ1RPUikpXG4gICAgICAgIGZpZ3VyZSA9IHNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKEZJR1VSRV9GT1JNVUxBX1NFTEVDVE9SKVxuXG4gICAgICBvcGVuRm9ybXVsYUVkaXRvcih7XG4gICAgICAgIGZvcm11bGFfdmFsOiBmaWd1cmUuZmluZCgnc3ZnW2RhdGEtbWF0aC1vcmlnaW5hbC1pbnB1dF0nKS5hdHRyKCdkYXRhLW1hdGgtb3JpZ2luYWwtaW5wdXQnKSxcbiAgICAgICAgZm9ybXVsYV9pZDogZmlndXJlLmF0dHIoJ2lkJylcbiAgICAgIH0pXG4gICAgfVxuICB9KVxuXG4gIGZvcm11bGEgPSB7XG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgYWRkOiBmdW5jdGlvbiAoZm9ybXVsYV9zdmcpIHtcblxuICAgICAgbGV0IHNlbGVjdGVkRWxlbWVudCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcbiAgICAgIGxldCBpZCA9IGdldFN1Y2Nlc3NpdmVFbGVtZW50SWQoRklHVVJFX0ZPUk1VTEFfU0VMRUNUT1IsIEZPUk1VTEFfU1VGRklYKVxuICAgICAgbGV0IG5ld0Zvcm11bGEgPSB0aGlzLmNyZWF0ZShmb3JtdWxhX3N2ZywgaWQpXG5cbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAvLyBDaGVjayBpZiB0aGUgc2VsZWN0ZWQgZWxlbWVudCBpcyBub3QgZW1wdHksIGFuZCBhZGQgdGhlIG5ldyBmb3JtdWxhIHJpZ2h0IGFmdGVyXG4gICAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQudGV4dCgpLnRyaW0oKS5sZW5ndGggIT0gMClcbiAgICAgICAgICBzZWxlY3RlZEVsZW1lbnQuYWZ0ZXIobmV3Rm9ybXVsYSlcblxuICAgICAgICAvLyBJZiBzZWxlY3RlZCBlbGVtZW50IGlzIGVtcHR5LCByZXBsYWNlIGl0IHdpdGggdGhlIG5ldyBmb3JtdWxhXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBzZWxlY3RlZEVsZW1lbnQucmVwbGFjZVdpdGgobmV3Rm9ybXVsYSlcblxuICAgICAgICAvLyBTYXZlIHVwZGF0ZXMgXG4gICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuICAgICAgICBjYXB0aW9ucygpXG5cbiAgICAgICAgbmV3Rm9ybXVsYSA9ICQoYCMke2lkfWApXG5cbiAgICAgICAgZm9ybXVsYS51cGRhdGVTdHJ1Y3R1cmUobmV3Rm9ybXVsYSlcblxuICAgICAgICAvLyBBZGQgYSBuZXcgZW1wdHkgcCBhZnRlciB0aGUgZm9ybXVsYVxuICAgICAgICBpZiAoIW5ld0Zvcm11bGEubmV4dCgpLmxlbmd0aClcbiAgICAgICAgICBuZXdGb3JtdWxhLmFmdGVyKCc8cD48YnIvPjwvcD4nKVxuXG4gICAgICAgIC8vIFVwZGF0ZSBhbGwgY3Jvc3MtcmVmXG4gICAgICAgIHVwZGF0ZVJlZmVyZW5jZXMoKVxuXG4gICAgICAgIC8vIFVwZGF0ZSBSZW5kZXJlZCBSQVNIXG4gICAgICAgIC8vdXBkYXRlSWZyYW1lRnJvbVNhdmVkQ29udGVudCgpXG5cbiAgICAgICAgLy8gTW92ZSB0aGUgY2FyZXQgYXQgdGhlIHN0YXJ0IG9mIHRoZSBuZXh0IGVsZW1lbnRcbiAgICAgICAgbW92ZUNhcmV0KHRpbnltY2UuYWN0aXZlRWRpdG9yLmRvbS5nZXROZXh0KHRpbnltY2UuYWN0aXZlRWRpdG9yLmRvbS5nZXQoaWQpLCAnKicpLCB0cnVlKVxuICAgICAgfSlcblxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICB1cGRhdGU6IGZ1bmN0aW9uIChmb3JtdWxhX3N2ZywgZm9ybXVsYV9pZCkge1xuXG4gICAgICBsZXQgc2VsZWN0ZWRGaWd1cmUgPSAkKGAjJHtmb3JtdWxhX2lkfWApXG5cbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICBzZWxlY3RlZEZpZ3VyZS5maW5kKCdzdmcnKS5yZXBsYWNlV2l0aChmb3JtdWxhX3N2ZylcbiAgICAgICAgLy91cGRhdGVJZnJhbWVGcm9tU2F2ZWRDb250ZW50KClcbiAgICAgIH0pXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIGNyZWF0ZTogZnVuY3Rpb24gKGZvcm11bGFfc3ZnLCBpZCkge1xuICAgICAgcmV0dXJuIGA8ZmlndXJlIGlkPVwiJHtpZH1cIj48cD48c3Bhbj4ke2Zvcm11bGFfc3ZnWzBdLm91dGVySFRNTH08L3NwYW4+PC9wPjwvZmlndXJlPmBcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgY3Vyc29ySW5Gb3JtdWxhOiBmdW5jdGlvbiAoc2VsZWN0ZWRFbGVtZW50KSB7XG5cbiAgICAgIHJldHVybiAoXG5cbiAgICAgICAgLy8gSWYgdGhlIHNlbGVjdGVkIGVsZW1lbnQgaXMgdGhlIGZvcm11bGEgZmlndXJlXG4gICAgICAgIChzZWxlY3RlZEVsZW1lbnQuaXMoRklHVVJFX0ZPUk1VTEFfU0VMRUNUT1IpKSB8fFxuXG4gICAgICAgIC8vIElmIHRoZSBzZWxlY3RlZCBlbGVtZW50IGlzIGluc2lkZSB0aGUgZm9ybXVsYSBmaWd1cmVcbiAgICAgICAgc2VsZWN0ZWRFbGVtZW50LnBhcmVudHMoRklHVVJFX0ZPUk1VTEFfU0VMRUNUT1IpLmxlbmd0aCkgPT0gMSA/IHRydWUgOiBmYWxzZVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICB1cGRhdGVTdHJ1Y3R1cmU6IGZ1bmN0aW9uIChmb3JtdWxhKSB7XG5cbiAgICAgIC8vIEFkZCBhIG5vdCBlZGl0YWJsZSBzcGFuXG4gICAgICBsZXQgcGFyYWdyYXBoID0gZm9ybXVsYS5jaGlsZHJlbigncCcpXG4gICAgICBsZXQgcGFyYWdyYXBoQ29udGVudCA9IHBhcmFncmFwaC5odG1sKClcbiAgICAgIHBhcmFncmFwaC5odG1sKGA8c3BhbiBjb250ZW50ZWRpdGFibGU9XCJmYWxzZVwiPiR7cGFyYWdyYXBoQ29udGVudH08L3NwYW4+YClcbiAgICB9XG4gIH1cbn0pXG5cbi8qKlxuICogUmFqZV9saXN0aW5nXG4gKi9cbnRpbnltY2UuUGx1Z2luTWFuYWdlci5hZGQoJ3JhamVfbGlzdGluZycsIGZ1bmN0aW9uIChlZGl0b3IsIHVybCkge1xuXG4gIC8vIEFkZCBhIGJ1dHRvbiB0aGF0IGhhbmRsZSB0aGUgaW5saW5lIGVsZW1lbnRcbiAgZWRpdG9yLmFkZEJ1dHRvbigncmFqZV9saXN0aW5nJywge1xuICAgIHRpdGxlOiAncmFqZV9saXN0aW5nJyxcbiAgICBpY29uOiAnaWNvbi1saXN0aW5nJyxcbiAgICB0b29sdGlwOiAnTGlzdGluZycsXG4gICAgZGlzYWJsZWRTdGF0ZVNlbGVjdG9yOiBESVNBQkxFX1NFTEVDVE9SX0ZJR1VSRVMsXG5cbiAgICAvLyBCdXR0b24gYmVoYXZpb3VyXG4gICAgb25jbGljazogZnVuY3Rpb24gKCkge1xuICAgICAgbGlzdGluZy5hZGQoKVxuICAgIH1cbiAgfSlcblxuXG5cbiAgLy8gQmVjYXVzZSBzb21lIGJlaGF2aW91cnMgYXJlbid0IGFjY2VwdGVkLCBSQUpFIG11c3QgY2hlY2sgc2VsZWN0aW9uIGFuZCBhY2NlcHQgYmFja3NwYWNlLCBjYW5jIGFuZCBlbnRlciBwcmVzc1xuICBlZGl0b3Iub24oJ2tleURvd24nLCBmdW5jdGlvbiAoZSkge1xuXG4gICAgLy8gTk9URTogdGhpcyBiZWh2YWlvdXIgaXMgdGhlIHNhbWUgZm9yIGNvZGVibG9jayBcbiAgICBsZXQgc2VsZWN0ZWRFbGVtZW50ID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuICAgIGlmIChzZWxlY3RlZEVsZW1lbnQucGFyZW50cygncHJlOmhhcyhjb2RlKScpLmxlbmd0aCkge1xuXG5cbiAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQuaXMoJ2NvZGUnKSkge1xuXG5cbiAgICAgICAgLy8gRU5URVJcbiAgICAgICAgaWYgKGUua2V5Q29kZSA9PSAxMykge1xuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgICAgIHJldHVybiBsaXN0aW5nLnNldENvbnRlbnQoYFxcbmApXG4gICAgICAgIH1cblxuICAgICAgICAvL1RBQlxuICAgICAgICBpZiAoZS5rZXlDb2RlID09IDkpIHtcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgICByZXR1cm4gbGlzdGluZy5zZXRDb250ZW50KGBcXHRgKVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChlLmtleUNvZGUgPT0gMTMpXG4gICAgICAgIHJldHVybiBoYW5kbGVGaWd1cmVFbnRlcih0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24pXG5cbiAgICAgIC8vIGtleUNvZGUgOCBpcyBiYWNrc3BhY2VcbiAgICAgIGlmIChlLmtleUNvZGUgPT0gOClcbiAgICAgICAgcmV0dXJuIGhhbmRsZUZpZ3VyZURlbGV0ZSh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24pXG5cbiAgICAgIC8qXG4gICAgICAgIC8vIGtleUNvZGUgOCBpcyBiYWNrc3BhY2VcbiAgICAgICAgaWYgKGUua2V5Q29kZSA9PSA4KVxuICAgICAgICAgIHJldHVybiBoYW5kbGVGaWd1cmVEZWxldGUodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uKVxuXG4gICAgICAgIGlmIChlLmtleUNvZGUgPT0gNDYpXG4gICAgICAgICAgcmV0dXJuIGhhbmRsZUZpZ3VyZUNhbmModGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uKVxuXG4gICAgICAgIC8vIEhhbmRsZSBlbnRlciBrZXkgaW4gZmlnY2FwdGlvblxuICAgICAgICBpZiAoZS5rZXlDb2RlID09IDEzKVxuICAgICAgICAgIHJldHVybiBoYW5kbGVGaWd1cmVFbnRlcih0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24pXG4gICAgICAgICovXG4gICAgfVxuICAgIC8qXG4gICAgaWYgKGUua2V5Q29kZSA9PSA5KSB7XG4gICAgICBpZiAodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmlzQ29sbGFwc2VkKCkgJiYgJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKS5wYXJlbnRzKGBjb2RlLCR7RklHVVJFX1NFTEVDVE9SfWApLmxlbmd0aCkge1xuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2V0Q29udGVudCgnXFx0JylcbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGUua2V5Q29kZSA9PSAzNykge1xuICAgICAgbGV0IHJhbmdlID0gdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldFJuZygpXG4gICAgICBsZXQgc3RhcnROb2RlID0gJChyYW5nZS5zdGFydENvbnRhaW5lcilcbiAgICAgIGlmIChzdGFydE5vZGUucGFyZW50KCkuaXMoJ2NvZGUnKSAmJiAoc3RhcnROb2RlLnBhcmVudCgpLmNvbnRlbnRzKCkuaW5kZXgoc3RhcnROb2RlKSA9PSAwICYmIHJhbmdlLnN0YXJ0T2Zmc2V0ID09IDEpKSB7XG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZXRDdXJzb3JMb2NhdGlvbihzdGFydE5vZGUucGFyZW50cyhGSUdVUkVfU0VMRUNUT1IpLnByZXYoJ3AsOmhlYWRlcicpWzBdLCAxKVxuICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgIH1cbiAgICB9Ki9cbiAgfSlcblxuICBsaXN0aW5nID0ge1xuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIGFkZDogZnVuY3Rpb24gKCkge1xuXG4gICAgICBsZXQgc2VsZWN0ZWRFbGVtZW50ID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuICAgICAgbGV0IG5ld0xpc3RpbmcgPSB0aGlzLmNyZWF0ZShnZXRTdWNjZXNzaXZlRWxlbWVudElkKEZJR1VSRV9MSVNUSU5HX1NFTEVDVE9SLCBMSVNUSU5HX1NVRkZJWCkpXG5cbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAvLyBDaGVjayBpZiB0aGUgc2VsZWN0ZWQgcGFyYWdyYXBoIGlzIG5vdCBlbXB0eSwgYWRkIHRoZSBuZXcgbGlzdGluZyByaWdodCBiZWxvd1xuICAgICAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LnRleHQoKS50cmltKCkubGVuZ3RoICE9IDApXG4gICAgICAgICAgc2VsZWN0ZWRFbGVtZW50LmFmdGVyKG5ld0xpc3RpbmcpXG5cbiAgICAgICAgLy8gSWYgc2VsZWN0ZWQgcGFyYWdyYXBoIGlzIGVtcHR5LCByZXBsYWNlIGl0IHdpdGggdGhlIG5ldyB0YWJsZVxuICAgICAgICBlbHNlXG4gICAgICAgICAgc2VsZWN0ZWRFbGVtZW50LnJlcGxhY2VXaXRoKG5ld0xpc3RpbmcpXG5cblxuICAgICAgICAvLyBVcGRhdGUgYWxsIGNhcHRpb25zIHdpdGggUkFTSCBmdW5jdGlvblxuICAgICAgICBjYXB0aW9ucygpXG5cbiAgICAgICAgLy8gTW92ZSB0aGUgY2FyZXRcbiAgICAgICAgc2VsZWN0UmFuZ2UobmV3TGlzdGluZy5maW5kKCdjb2RlJylbMF0sIDApXG5cbiAgICAgICAgLy8gVXBkYXRlIGFsbCBjcm9zcy1yZWZcbiAgICAgICAgdXBkYXRlUmVmZXJlbmNlcygpXG5cbiAgICAgICAgLy8gU2F2ZSB1cGRhdGVzIFxuICAgICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcbiAgICAgIH0pXG5cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgY3JlYXRlOiBmdW5jdGlvbiAoaWQpIHtcbiAgICAgIHJldHVybiAkKGA8ZmlndXJlIGlkPVwiJHtpZH1cIj48cHJlPjxjb2RlPiR7WkVST19TUEFDRX08L2NvZGU+PC9wcmU+PGZpZ2NhcHRpb24+Q2FwdGlvbi48L2ZpZ2NhcHRpb24+PC9maWd1cmU+YClcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgc2V0Q29udGVudDogZnVuY3Rpb24gKGNoYXIpIHtcbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZXRDb250ZW50KGNoYXIpXG4gICAgfVxuICB9XG59KVxuXG5cbi8qKlxuICogXG4gKi9cbnRpbnltY2UuUGx1Z2luTWFuYWdlci5hZGQoJ3JhamVfaW5saW5lX2Zvcm11bGEnLCBmdW5jdGlvbiAoZWRpdG9yLCB1cmwpIHtcblxuICBlZGl0b3IuYWRkQnV0dG9uKCdyYWplX2lubGluZV9mb3JtdWxhJywge1xuICAgIGljb246ICdpY29uLWlubGluZS1mb3JtdWxhJyxcbiAgICB0b29sdGlwOiAnSW5saW5lIGZvcm11bGEnLFxuICAgIGRpc2FibGVkU3RhdGVTZWxlY3RvcjogYCR7RElTQUJMRV9TRUxFQ1RPUl9JTkxJTkV9LDpoZWFkZXJgLFxuXG4gICAgLy8gQnV0dG9uIGJlaGF2aW91clxuICAgIG9uY2xpY2s6IGZ1bmN0aW9uICgpIHtcbiAgICAgIG9wZW5JbmxpbmVGb3JtdWxhRWRpdG9yKClcbiAgICB9XG4gIH0pXG5cbiAgZWRpdG9yLm9uKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XG4gICAgbGV0IHNlbGVjdGVkRWxlbWVudCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcblxuICAgIC8vIE9wZW4gZm9ybXVsYSBlZGl0b3IgY2xpY2tpbmcgb24gbWF0aCBmb3JtdWxhc1xuICAgIGlmIChzZWxlY3RlZEVsZW1lbnQuY2hpbGRyZW4oJ3N2Z1tyb2xlPW1hdGhdJykubGVuZ3RoKSB7XG5cbiAgICAgIG9wZW5JbmxpbmVGb3JtdWxhRWRpdG9yKHtcbiAgICAgICAgZm9ybXVsYV92YWw6IHNlbGVjdGVkRWxlbWVudC5jaGlsZHJlbignc3ZnW3JvbGU9bWF0aF0nKS5hdHRyKCdkYXRhLW1hdGgtb3JpZ2luYWwtaW5wdXQnKSxcbiAgICAgICAgZm9ybXVsYV9pZDogc2VsZWN0ZWRFbGVtZW50LmF0dHIoJ2lkJylcbiAgICAgIH0pXG4gICAgfVxuICB9KVxuXG4gIGlubGluZV9mb3JtdWxhID0ge1xuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIGFkZDogZnVuY3Rpb24gKGZvcm11bGFfc3ZnKSB7XG5cbiAgICAgIGxldCBzZWxlY3RlZEVsZW1lbnQgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG4gICAgICBsZXQgbmV3Rm9ybXVsYSA9IHRoaXMuY3JlYXRlKGZvcm11bGFfc3ZnLCBnZXRTdWNjZXNzaXZlRWxlbWVudElkKEZJR1VSRV9GT1JNVUxBX1NFTEVDVE9SLCBGT1JNVUxBX1NVRkZJWCkpXG5cbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2V0Q29udGVudChuZXdGb3JtdWxhKVxuXG4gICAgICAgIC8vIFNhdmUgdXBkYXRlcyBcbiAgICAgICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG5cbiAgICAgICAgY2FwdGlvbnMoKVxuXG4gICAgICAgIC8vIFVwZGF0ZSBhbGwgY3Jvc3MtcmVmXG4gICAgICAgIHVwZGF0ZVJlZmVyZW5jZXMoKVxuXG4gICAgICAgIC8vIFVwZGF0ZSBSZW5kZXJlZCBSQVNIXG4gICAgICAgIC8vdXBkYXRlSWZyYW1lRnJvbVNhdmVkQ29udGVudCgpXG4gICAgICB9KVxuXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIHVwZGF0ZTogZnVuY3Rpb24gKGZvcm11bGFfc3ZnLCBmb3JtdWxhX2lkKSB7XG5cbiAgICAgIGxldCBzZWxlY3RlZEZpZ3VyZSA9ICQoYCMke2Zvcm11bGFfaWR9YClcblxuICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIHNlbGVjdGVkRmlndXJlLmZpbmQoJ3N2ZycpLnJlcGxhY2VXaXRoKGZvcm11bGFfc3ZnKVxuICAgICAgICAvL3VwZGF0ZUlmcmFtZUZyb21TYXZlZENvbnRlbnQoKVxuICAgICAgfSlcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgY3JlYXRlOiBmdW5jdGlvbiAoZm9ybXVsYV9zdmcsIGlkKSB7XG4gICAgICByZXR1cm4gYDxzcGFuIGlkPVwiJHtpZH1cIiBjb250ZW50ZWRpdGFibGU9XCJmYWxzZVwiPiR7Zm9ybXVsYV9zdmdbMF0ub3V0ZXJIVE1MfTwvc3Bhbj5gXG4gICAgfVxuICB9XG59KVxuXG4vKipcbiAqIFJhamUgY29kZWJsb2NrXG4gKi9cbnRpbnltY2UuUGx1Z2luTWFuYWdlci5hZGQoJ3JhamVfY29kZWJsb2NrJywgZnVuY3Rpb24gKGVkaXRvciwgdXJsKSB7XG5cbiAgLy8gQWRkIGEgYnV0dG9uIHRoYXQgaGFuZGxlIHRoZSBpbmxpbmUgZWxlbWVudFxuICBlZGl0b3IuYWRkQnV0dG9uKCdyYWplX2NvZGVibG9jaycsIHtcbiAgICB0aXRsZTogJ3JhamVfY29kZWJsb2NrJyxcbiAgICBpY29uOiAnaWNvbi1ibG9jay1jb2RlJyxcbiAgICB0b29sdGlwOiAnQmxvY2sgY29kZScsXG4gICAgZGlzYWJsZWRTdGF0ZVNlbGVjdG9yOiBgJHtESVNBQkxFX1NFTEVDVE9SX0ZJR1VSRVN9LGNvZGUscHJlYCxcblxuICAgIC8vIEJ1dHRvbiBiZWhhdmlvdXJcbiAgICBvbmNsaWNrOiBmdW5jdGlvbiAoKSB7XG4gICAgICBibG9ja2NvZGUuYWRkKClcbiAgICB9XG4gIH0pXG5cbiAgYmxvY2tjb2RlID0ge1xuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIGFkZDogZnVuY3Rpb24gKCkge1xuXG4gICAgICBsZXQgc2VsZWN0ZWRFbGVtZW50ID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuICAgICAgbGV0IGJsb2NrQ29kZSA9IHRoaXMuY3JlYXRlKGdldFN1Y2Nlc3NpdmVFbGVtZW50SWQoRklHVVJFX0xJU1RJTkdfU0VMRUNUT1IsIExJU1RJTkdfU1VGRklYKSlcblxuICAgICAgaWYgKCFzZWxlY3RlZEVsZW1lbnQucGFyZW50cygncHJlLGNvZGUnKS5sZW5ndGgpIHtcblxuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICAvLyBDaGVjayBpZiB0aGUgc2VsZWN0ZWQgcGFyYWdyYXBoIGlzIG5vdCBlbXB0eSwgYWRkIHRoZSBuZXcgbGlzdGluZyByaWdodCBiZWxvd1xuICAgICAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQudGV4dCgpLnRyaW0oKS5sZW5ndGggIT0gMClcbiAgICAgICAgICAgIHNlbGVjdGVkRWxlbWVudC5hZnRlcihibG9ja0NvZGUpXG5cbiAgICAgICAgICAvLyBJZiBzZWxlY3RlZCBwYXJhZ3JhcGggaXMgZW1wdHksIHJlcGxhY2UgaXQgd2l0aCB0aGUgbmV3IHRhYmxlXG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgc2VsZWN0ZWRFbGVtZW50LnJlcGxhY2VXaXRoKGJsb2NrQ29kZSlcblxuICAgICAgICAgIC8vIFVwZGF0ZSBhbGwgY2FwdGlvbnMgd2l0aCBSQVNIIGZ1bmN0aW9uXG4gICAgICAgICAgY2FwdGlvbnMoKVxuXG4gICAgICAgICAgLy8gTW92ZSB0aGUgY2FyZXRcbiAgICAgICAgICBzZWxlY3RSYW5nZShibG9ja0NvZGUuZmluZCgnY29kZScpWzBdLCAwKVxuXG4gICAgICAgICAgLy8gU2F2ZSB1cGRhdGVzIFxuICAgICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuICAgICAgICB9KVxuICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBjcmVhdGU6IGZ1bmN0aW9uIChpZCkge1xuICAgICAgcmV0dXJuICQoYDxwcmU+PGNvZGU+JHtaRVJPX1NQQUNFfTwvY29kZT48L3ByZT5gKVxuICAgIH1cbiAgfVxufSlcblxuLyoqXG4gKiBSYWplIHF1b3RlYmxvY2tcbiAqL1xudGlueW1jZS5QbHVnaW5NYW5hZ2VyLmFkZCgncmFqZV9xdW90ZWJsb2NrJywgZnVuY3Rpb24gKGVkaXRvciwgdXJsKSB7XG5cbiAgLy8gQWRkIGEgYnV0dG9uIHRoYXQgaGFuZGxlIHRoZSBpbmxpbmUgZWxlbWVudFxuICBlZGl0b3IuYWRkQnV0dG9uKCdyYWplX3F1b3RlYmxvY2snLCB7XG4gICAgdGl0bGU6ICdyYWplX3F1b3RlYmxvY2snLFxuICAgIGljb246ICdpY29uLWJsb2NrLXF1b3RlJyxcbiAgICB0b29sdGlwOiAnQmxvY2sgcXVvdGUnLFxuICAgIGRpc2FibGVkU3RhdGVTZWxlY3RvcjogYCR7RElTQUJMRV9TRUxFQ1RPUl9GSUdVUkVTfSxibG9ja3F1b3RlYCxcblxuICAgIC8vIEJ1dHRvbiBiZWhhdmlvdXJcbiAgICBvbmNsaWNrOiBmdW5jdGlvbiAoKSB7XG4gICAgICBibG9ja3F1b3RlLmFkZCgpXG4gICAgfVxuICB9KVxuXG4gIGVkaXRvci5vbigna2V5RG93bicsIGZ1bmN0aW9uIChlKSB7XG5cblxuICAgIGxldCBzZWxlY3RlZEVsZW1lbnQgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG4gICAgaWYgKHNlbGVjdGVkRWxlbWVudC5pcygncCcpICYmIHNlbGVjdGVkRWxlbWVudC5wYXJlbnQoKS5pcygnYmxvY2txdW90ZScpKSB7XG5cbiAgICAgIC8vRU5URVJcbiAgICAgIGlmIChlLmtleUNvZGUgPT0gMTMpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG5cbiAgICAgICAgLy8gRXhpdCBmcm9tIHRoZSBibG9ja3F1b3RlIGlmIHRoZSBjdXJyZW50IHAgaXMgZW1wdHlcbiAgICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC50ZXh0KCkudHJpbSgpLmxlbmd0aCA9PSAwKVxuICAgICAgICAgIHJldHVybiBibG9ja3F1b3RlLmV4aXQoKVxuXG4gICAgICAgIGJsb2NrcXVvdGUuYWRkUGFyYWdyYXBoKClcbiAgICAgIH1cbiAgICB9XG4gIH0pXG5cbiAgYmxvY2txdW90ZSA9IHtcbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBhZGQ6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgbGV0IHNlbGVjdGVkRWxlbWVudCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcbiAgICAgIGxldCBibG9ja1F1b3RlID0gdGhpcy5jcmVhdGUoZ2V0U3VjY2Vzc2l2ZUVsZW1lbnRJZChGSUdVUkVfTElTVElOR19TRUxFQ1RPUiwgTElTVElOR19TVUZGSVgpKVxuXG4gICAgICBpZiAoIXNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKCdwcmUsY29kZScpLmxlbmd0aCkge1xuXG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgIC8vIENoZWNrIGlmIHRoZSBzZWxlY3RlZCBwYXJhZ3JhcGggaXMgbm90IGVtcHR5LCBhZGQgdGhlIG5ldyBsaXN0aW5nIHJpZ2h0IGJlbG93XG4gICAgICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC50ZXh0KCkudHJpbSgpLmxlbmd0aCAhPSAwKVxuICAgICAgICAgICAgc2VsZWN0ZWRFbGVtZW50LmFmdGVyKGJsb2NrUXVvdGUpXG5cbiAgICAgICAgICAvLyBJZiBzZWxlY3RlZCBwYXJhZ3JhcGggaXMgZW1wdHksIHJlcGxhY2UgaXQgd2l0aCB0aGUgbmV3IHRhYmxlXG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgc2VsZWN0ZWRFbGVtZW50LnJlcGxhY2VXaXRoKGJsb2NrUXVvdGUpXG5cbiAgICAgICAgICAvLyBVcGRhdGUgYWxsIGNhcHRpb25zIHdpdGggUkFTSCBmdW5jdGlvblxuICAgICAgICAgIGNhcHRpb25zKClcblxuICAgICAgICAgIC8vIE1vdmUgdGhlIGNhcmV0XG4gICAgICAgICAgbW92ZUNhcmV0KGJsb2NrUXVvdGVbMF0pXG5cbiAgICAgICAgICAvLyBTYXZlIHVwZGF0ZXMgXG4gICAgICAgICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIGNyZWF0ZTogZnVuY3Rpb24gKGlkKSB7XG4gICAgICByZXR1cm4gJChgPGJsb2NrcXVvdGU+PHA+JHtaRVJPX1NQQUNFfTwvcD48L2Jsb2NrcXVvdGU+YClcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgZ2V0TGFzdE5vdEVtcHR5Tm9kZTogZnVuY3Rpb24gKG5vZGVzKSB7XG5cbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbm9kZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKChub2Rlc1tpXS5ub2RlVHlwZSA9PSAzIHx8IG5vZGVzW2ldLnRhZ05hbWUgPT0gJ2JyJykgJiYgIW5vZGVzW2ldLmxlbmd0aClcbiAgICAgICAgICBub2Rlcy5zcGxpY2UoaSwgMSlcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG5vZGVzW25vZGVzLmxlbmd0aCAtIDFdXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIGFkZFBhcmFncmFwaDogZnVuY3Rpb24gKCkge1xuXG4gICAgICBjb25zdCBCUiA9ICc8YnI+J1xuXG4gICAgICAvLyBHZXQgdGhlIHJlZmVyZW5jZXMgb2YgdGhlIGV4aXN0aW5nIGVsZW1lbnRcbiAgICAgIGxldCBwYXJhZ3JhcGggPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG5cbiAgICAgIC8vIFBsYWNlaG9sZGVyIHRleHQgb2YgdGhlIG5ldyBsaVxuICAgICAgbGV0IHRleHQgPSBCUlxuICAgICAgbGV0IHRleHROb2RlcyA9IHBhcmFncmFwaC5jb250ZW50cygpXG5cbiAgICAgIC8vIElmIHRoZXJlIGlzIGp1c3Qgb25lIG5vZGUgd3JhcHBlZCBpbnNpZGUgdGhlIHBhcmFncmFwaFxuICAgICAgaWYgKHRleHROb2Rlcy5sZW5ndGggPT0gMSkge1xuXG4gICAgICAgIC8vIEdldCB0aGUgc3RhcnQgb2Zmc2V0IGFuZCB0ZXh0IG9mIHRoZSBjdXJyZW50IGxpXG4gICAgICAgIGxldCBzdGFydE9mZnNldCA9IHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRSbmcoKS5zdGFydE9mZnNldFxuICAgICAgICBsZXQgd2hvbGVUZXh0ID0gcGFyYWdyYXBoLnRleHQoKVxuXG4gICAgICAgIC8vIElmIHRoZSBjdXJzb3IgaXNuJ3QgYXQgdGhlIGVuZCBidXQgaXQncyBpbiB0aGUgbWlkZGxlXG4gICAgICAgIC8vIEdldCB0aGUgcmVtYWluaW5nIHRleHQgZnJvbSB0aGUgY3Vyc29yIHRvIHRoZSBlbmRcbiAgICAgICAgaWYgKHN0YXJ0T2Zmc2V0ICE9IHdob2xlVGV4dC5sZW5ndGgpXG4gICAgICAgICAgdGV4dCA9IHdob2xlVGV4dC5zdWJzdHJpbmcoc3RhcnRPZmZzZXQsIHdob2xlVGV4dC5sZW5ndGgpXG5cbiAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgLy8gVXBkYXRlIHRoZSB0ZXh0IG9mIHRoZSBjdXJyZW50IGxpXG4gICAgICAgICAgcGFyYWdyYXBoLnRleHQod2hvbGVUZXh0LnN1YnN0cmluZygwLCBzdGFydE9mZnNldCkpXG5cbiAgICAgICAgICBpZiAoIXBhcmFncmFwaC50ZXh0KCkubGVuZ3RoKVxuICAgICAgICAgICAgcGFyYWdyYXBoLmh0bWwoQlIpXG5cbiAgICAgICAgICAvLyBDcmVhdGUgYW5kIGFkZCB0aGUgbmV3IGxpXG4gICAgICAgICAgbGV0IG5ld1BhcmFncmFwaCA9ICQoYDxwPiR7dGV4dH08L3A+YClcbiAgICAgICAgICBwYXJhZ3JhcGguYWZ0ZXIobmV3UGFyYWdyYXBoKVxuXG4gICAgICAgICAgLy8gTW92ZSB0aGUgY2FyZXQgdG8gdGhlIG5ldyBsaVxuICAgICAgICAgIG1vdmVDYXJldChuZXdQYXJhZ3JhcGhbMF0sIHRydWUpXG5cbiAgICAgICAgICAvLyBVcGRhdGUgdGhlIGNvbnRlbnRcbiAgICAgICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcbiAgICAgICAgfSlcbiAgICAgIH1cblxuICAgICAgLy8gSW5zdGVhZCBpZiB0aGVyZSBhcmUgbXVsdGlwbGUgbm9kZXMgaW5zaWRlIHRoZSBwYXJhZ3JhcGhcbiAgICAgIGVsc2Uge1xuXG4gICAgICAgIC8vIElzdGFudGlhdGUgdGhlIHJhbmdlIHRvIGJlIHNlbGVjdGVkXG4gICAgICAgIGxldCByYW5nZSA9IGRvY3VtZW50LmNyZWF0ZVJhbmdlKClcblxuICAgICAgICAvLyBTdGFydCB0aGUgcmFuZ2UgZnJvbSB0aGUgc2VsZWN0ZWQgbm9kZSBhbmQgb2Zmc2V0IGFuZCBlbmRzIGl0IGF0IHRoZSBlbmQgb2YgdGhlIGxhc3Qgbm9kZVxuICAgICAgICByYW5nZS5zZXRTdGFydCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Um5nKCkuc3RhcnRDb250YWluZXIsIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRSbmcoKS5zdGFydE9mZnNldClcbiAgICAgICAgcmFuZ2Uuc2V0RW5kKHRoaXMuZ2V0TGFzdE5vdEVtcHR5Tm9kZSh0ZXh0Tm9kZXMpLCAxKVxuXG4gICAgICAgIC8vIFNlbGVjdCB0aGUgcmFuZ2VcbiAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLnNldFJuZyhyYW5nZSlcblxuICAgICAgICAvLyBTYXZlIHRoZSBodG1sIGNvbnRlbnRcbiAgICAgICAgd2hvbGVUZXh0ID0gdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldENvbnRlbnQoKVxuXG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgIHBhcmFncmFwaC5odG1sKHBhcmFncmFwaC5odG1sKCkucmVwbGFjZSh3aG9sZVRleHQsICcnKSlcblxuICAgICAgICAgIGlmICghcGFyYWdyYXBoLnRleHQoKS5sZW5ndGgpXG4gICAgICAgICAgICBwYXJhZ3JhcGguaHRtbChCUilcblxuICAgICAgICAgIC8vIENyZWF0ZSBhbmQgYWRkIHRoZSBuZXcgbGlcbiAgICAgICAgICBsZXQgbmV3UGFyYWdyYXBoID0gJChgPHA+JHt3aG9sZVRleHR9PC9wPmApXG4gICAgICAgICAgcGFyYWdyYXBoLmFmdGVyKG5ld1BhcmFncmFwaClcblxuICAgICAgICAgIC8vIE1vdmUgdGhlIGNhcmV0IHRvIHRoZSBuZXcgbGlcbiAgICAgICAgICBtb3ZlQ2FyZXQobmV3UGFyYWdyYXBoWzBdLCB0cnVlKVxuXG4gICAgICAgICAgLy8gVXBkYXRlIHRoZSBjb250ZW50XG4gICAgICAgICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIGV4aXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgIGxldCBwYXJhZ3JhcGggPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG4gICAgICBsZXQgYmxvY2txdW90ZSA9IHBhcmFncmFwaC5wYXJlbnQoKVxuXG4gICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgcGFyYWdyYXBoLnJlbW92ZSgpXG5cbiAgICAgICAgaWYgKCFibG9ja3F1b3RlLm5leHQoKS5sZW5ndGgpIHtcbiAgICAgICAgICBibG9ja3F1b3RlLmFmdGVyKCQoYDxwPjxici8+PC9wPmApKVxuICAgICAgICB9XG5cbiAgICAgICAgbW92ZUNhcmV0KGJsb2NrcXVvdGUubmV4dCgpWzBdKVxuXG4gICAgICB9KVxuICAgIH1cbiAgfVxufSlcblxuLyoqXG4gKiBVcGRhdGUgdGFibGUgY2FwdGlvbnMgd2l0aCBhIFJBU0ggZnVuY2lvbiBcbiAqL1xuZnVuY3Rpb24gY2FwdGlvbnMoKSB7XG5cbiAgLyogQ2FwdGlvbnMgKi9cbiAgdGlueW1jZS5hY3RpdmVFZGl0b3IuJChmaWd1cmVib3hfc2VsZWN0b3IpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgIHZhciBjdXJfY2FwdGlvbiA9ICQodGhpcykucGFyZW50cyhcImZpZ3VyZVwiKS5maW5kKFwiZmlnY2FwdGlvblwiKTtcbiAgICB2YXIgY3VyX251bWJlciA9ICQodGhpcykuZmluZE51bWJlclJhamUoZmlndXJlYm94X3NlbGVjdG9yKTtcbiAgICBjdXJfY2FwdGlvbi5maW5kKCdzdHJvbmcnKS5yZW1vdmUoKTtcbiAgICBjdXJfY2FwdGlvbi5odG1sKFwiPHN0cm9uZyBjbGFzcz1cXFwiY2dlblxcXCIgZGF0YS1yYXNoLW9yaWdpbmFsLWNvbnRlbnQ9XFxcIlxcXCIgY29udGVudGVkaXRhYmxlPVxcXCJmYWxzZVxcXCI+RmlndXJlIFwiICsgY3VyX251bWJlciArXG4gICAgICBcIi4gPC9zdHJvbmc+XCIgKyBjdXJfY2FwdGlvbi5odG1sKCkpO1xuICB9KTtcbiAgdGlueW1jZS5hY3RpdmVFZGl0b3IuJCh0YWJsZWJveF9zZWxlY3RvcikuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGN1cl9jYXB0aW9uID0gJCh0aGlzKS5wYXJlbnRzKFwiZmlndXJlXCIpLmZpbmQoXCJmaWdjYXB0aW9uXCIpO1xuICAgIHZhciBjdXJfbnVtYmVyID0gJCh0aGlzKS5maW5kTnVtYmVyUmFqZSh0YWJsZWJveF9zZWxlY3Rvcik7XG4gICAgY3VyX2NhcHRpb24uZmluZCgnc3Ryb25nJykucmVtb3ZlKCk7XG4gICAgY3VyX2NhcHRpb24uaHRtbChcIjxzdHJvbmcgY2xhc3M9XFxcImNnZW5cXFwiIGRhdGEtcmFzaC1vcmlnaW5hbC1jb250ZW50PVxcXCJcXFwiIGNvbnRlbnRlZGl0YWJsZT1cXFwiZmFsc2VcXFwiID5UYWJsZSBcIiArIGN1cl9udW1iZXIgK1xuICAgICAgXCIuIDwvc3Ryb25nPlwiICsgY3VyX2NhcHRpb24uaHRtbCgpKTtcbiAgfSk7XG4gIHRpbnltY2UuYWN0aXZlRWRpdG9yLiQoZm9ybXVsYWJveF9zZWxlY3RvcikuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGN1cl9jYXB0aW9uID0gJCh0aGlzKS5wYXJlbnRzKFwiZmlndXJlXCIpLmZpbmQoXCJwXCIpO1xuICAgIHZhciBjdXJfbnVtYmVyID0gJCh0aGlzKS5maW5kTnVtYmVyUmFqZShmb3JtdWxhYm94X3NlbGVjdG9yKTtcblxuICAgIGlmIChjdXJfY2FwdGlvbi5maW5kKCdzcGFuLmNnZW4nKS5sZW5ndGgpIHtcbiAgICAgIGN1cl9jYXB0aW9uLmZpbmQoJ3NwYW4uY2dlbicpLnJlbW92ZSgpO1xuICAgICAgY3VyX2NhcHRpb24uZmluZCgnc3Bhbltjb250ZW50ZWRpdGFibGVdJykuYXBwZW5kKFwiPHNwYW4gY2xhc3M9XFxcImNnZW5cXFwiIGRhdGEtcmFzaC1vcmlnaW5hbC1jb250ZW50PVxcXCJcXFwiID4gKFwiICsgY3VyX251bWJlciArIFwiKTwvc3Bhbj5cIilcbiAgICB9IGVsc2VcbiAgICAgIGN1cl9jYXB0aW9uLmh0bWwoY3VyX2NhcHRpb24uaHRtbCgpICsgXCI8c3BhbiBjbGFzcz1cXFwiY2dlblxcXCIgZGF0YS1yYXNoLW9yaWdpbmFsLWNvbnRlbnQ9XFxcIlxcXCIgPiAoXCIgK1xuICAgICAgICBjdXJfbnVtYmVyICsgXCIpPC9zcGFuPlwiKTtcbiAgfSk7XG4gIHRpbnltY2UuYWN0aXZlRWRpdG9yLiQobGlzdGluZ2JveF9zZWxlY3RvcikuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGN1cl9jYXB0aW9uID0gJCh0aGlzKS5wYXJlbnRzKFwiZmlndXJlXCIpLmZpbmQoXCJmaWdjYXB0aW9uXCIpO1xuICAgIHZhciBjdXJfbnVtYmVyID0gJCh0aGlzKS5maW5kTnVtYmVyUmFqZShsaXN0aW5nYm94X3NlbGVjdG9yKTtcbiAgICBjdXJfY2FwdGlvbi5maW5kKCdzdHJvbmcnKS5yZW1vdmUoKTtcbiAgICBjdXJfY2FwdGlvbi5odG1sKFwiPHN0cm9uZyBjbGFzcz1cXFwiY2dlblxcXCIgZGF0YS1yYXNoLW9yaWdpbmFsLWNvbnRlbnQ9XFxcIlxcXCIgY29udGVudGVkaXRhYmxlPVxcXCJmYWxzZVxcXCI+TGlzdGluZyBcIiArIGN1cl9udW1iZXIgK1xuICAgICAgXCIuIDwvc3Ryb25nPlwiICsgY3VyX2NhcHRpb24uaHRtbCgpKTtcbiAgfSk7XG4gIC8qIC9FTkQgQ2FwdGlvbnMgKi9cbn1cblxuLyoqXG4gKiBcbiAqIEBwYXJhbSB7Kn0gc2VsID0+IHRpbnltY2Ugc2VsZWN0aW9uXG4gKiBcbiAqIE1haW5seSBpdCBjaGVja3Mgd2hlcmUgc2VsZWN0aW9uIHN0YXJ0cyBhbmQgZW5kcyB0byBibG9jayB1bmFsbG93ZWQgZGVsZXRpb25cbiAqIEluIHNhbWUgZmlndXJlIGFyZW4ndCBibG9ja2VkLCB1bmxlc3Mgc2VsZWN0aW9uIHN0YXJ0IE9SIGVuZCBpbnNpZGUgZmlnY2FwdGlvbiAobm90IGJvdGgpXG4gKi9cbmZ1bmN0aW9uIGhhbmRsZUZpZ3VyZURlbGV0ZShzZWwpIHtcblxuICB0cnkge1xuXG4gICAgLy8gR2V0IHJlZmVyZW5jZSBvZiBzdGFydCBhbmQgZW5kIG5vZGVcbiAgICBsZXQgc3RhcnROb2RlID0gJChzZWwuZ2V0Um5nKCkuc3RhcnRDb250YWluZXIpXG4gICAgbGV0IHN0YXJ0Tm9kZVBhcmVudCA9IHN0YXJ0Tm9kZS5wYXJlbnRzKEZJR1VSRV9TRUxFQ1RPUilcblxuICAgIGxldCBlbmROb2RlID0gJChzZWwuZ2V0Um5nKCkuZW5kQ29udGFpbmVyKVxuICAgIGxldCBlbmROb2RlUGFyZW50ID0gZW5kTm9kZS5wYXJlbnRzKEZJR1VSRV9TRUxFQ1RPUilcblxuICAgIC8vIElmIGF0IGxlYXN0IHNlbGVjdGlvbiBzdGFydCBvciBlbmQgaXMgaW5zaWRlIHRoZSBmaWd1cmVcbiAgICBpZiAoc3RhcnROb2RlUGFyZW50Lmxlbmd0aCB8fCBlbmROb2RlUGFyZW50Lmxlbmd0aCkge1xuXG4gICAgICAvLyBJZiBzZWxlY3Rpb24gd3JhcHMgZW50aXJlbHkgYSBmaWd1cmUgZnJvbSB0aGUgc3RhcnQgb2YgZmlyc3QgZWxlbWVudCAodGggaW4gdGFibGUpIGFuZCBzZWxlY3Rpb24gZW5kc1xuICAgICAgaWYgKGVuZE5vZGUucGFyZW50cygnZmlnY2FwdGlvbicpLmxlbmd0aCkge1xuXG4gICAgICAgIGxldCBjb250ZW50cyA9IGVuZE5vZGUucGFyZW50KCkuY29udGVudHMoKVxuICAgICAgICBpZiAoc3RhcnROb2RlLmlzKEZJR1VSRV9TRUxFQ1RPUikgJiYgY29udGVudHMuaW5kZXgoZW5kTm9kZSkgPT0gY29udGVudHMubGVuZ3RoIC0gMSAmJiBzZWwuZ2V0Um5nKCkuZW5kT2Zmc2V0ID09IGVuZE5vZGUudGV4dCgpLmxlbmd0aCkge1xuICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgICAgLy8gTW92ZSBjdXJzb3IgYXQgdGhlIHByZXZpb3VzIGVsZW1lbnQgYW5kIHJlbW92ZSBmaWd1cmVcbiAgICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLmZvY3VzKClcbiAgICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZXRDdXJzb3JMb2NhdGlvbihzdGFydE5vZGUucHJldigpWzBdLCAxKVxuICAgICAgICAgICAgc3RhcnROb2RlLnJlbW92ZSgpXG5cbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gSWYgc2VsZWN0aW9uIGRvZXNuJ3Qgc3RhcnQgYW5kIGVuZCBpbiB0aGUgc2FtZSBmaWd1cmUsIGJ1dCBvbmUgYmVldHdlbiBzdGFydCBvciBlbmQgaXMgaW5zaWRlIHRoZSBmaWdjYXB0aW9uLCBtdXN0IGJsb2NrXG4gICAgICBpZiAoc3RhcnROb2RlLnBhcmVudHMoJ2ZpZ2NhcHRpb24nKS5sZW5ndGggIT0gZW5kTm9kZS5wYXJlbnRzKCdmaWdjYXB0aW9uJykubGVuZ3RoICYmIChzdGFydE5vZGUucGFyZW50cygnZmlnY2FwdGlvbicpLmxlbmd0aCB8fCBlbmROb2RlLnBhcmVudHMoJ2ZpZ2NhcHRpb24nKS5sZW5ndGgpKVxuICAgICAgICByZXR1cm4gZmFsc2VcblxuICAgICAgLy8gSWYgdGhlIGZpZ3VyZSBpcyBub3QgdGhlIHNhbWUsIG11c3QgYmxvY2tcbiAgICAgIC8vIEJlY2F1c2UgYSBzZWxlY3Rpb24gY2FuIHN0YXJ0IGluIGZpZ3VyZVggYW5kIGVuZCBpbiBmaWd1cmVZXG4gICAgICBpZiAoKHN0YXJ0Tm9kZVBhcmVudC5hdHRyKCdpZCcpICE9IGVuZE5vZGVQYXJlbnQuYXR0cignaWQnKSkpXG4gICAgICAgIHJldHVybiBmYWxzZVxuXG4gICAgICAvLyBJZiBjdXJzb3IgaXMgYXQgc3RhcnQgb2YgY29kZSBwcmV2ZW50XG4gICAgICBpZiAoc3RhcnROb2RlLnBhcmVudHMoRklHVVJFX1NFTEVDVE9SKS5maW5kKCdwcmUnKS5sZW5ndGgpIHtcblxuICAgICAgICAvLyBJZiBhdCB0aGUgc3RhcnQgb2YgcHJlPmNvZGUsIHByZXNzaW5nIDJ0aW1lcyBiYWNrc3BhY2Ugd2lsbCByZW1vdmUgZXZlcnl0aGluZyBcbiAgICAgICAgaWYgKHN0YXJ0Tm9kZS5wYXJlbnQoKS5pcygnY29kZScpICYmIChzdGFydE5vZGUucGFyZW50KCkuY29udGVudHMoKS5pbmRleChzdGFydE5vZGUpID09IDAgJiYgc2VsLmdldFJuZygpLnN0YXJ0T2Zmc2V0ID09IDEpKSB7XG4gICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc3RhcnROb2RlLnBhcmVudHMoRklHVVJFX1NFTEVDVE9SKS5yZW1vdmUoKVxuICAgICAgICAgIH0pXG4gICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgIH1cblxuXG4gICAgICAgIGlmIChzdGFydE5vZGUucGFyZW50KCkuaXMoJ3ByZScpICYmIHNlbC5nZXRSbmcoKS5zdGFydE9mZnNldCA9PSAwKVxuICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0cnVlXG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxufVxuXG4vKipcbiAqIFxuICogQHBhcmFtIHsqfSBzZWwgXG4gKi9cbmZ1bmN0aW9uIGhhbmRsZUZpZ3VyZUNhbmMoc2VsKSB7XG5cbiAgLy8gR2V0IHJlZmVyZW5jZSBvZiBzdGFydCBhbmQgZW5kIG5vZGVcbiAgbGV0IHN0YXJ0Tm9kZSA9ICQoc2VsLmdldFJuZygpLnN0YXJ0Q29udGFpbmVyKVxuICBsZXQgc3RhcnROb2RlUGFyZW50ID0gc3RhcnROb2RlLnBhcmVudHMoRklHVVJFX1NFTEVDVE9SKVxuXG4gIGxldCBlbmROb2RlID0gJChzZWwuZ2V0Um5nKCkuZW5kQ29udGFpbmVyKVxuICBsZXQgZW5kTm9kZVBhcmVudCA9IGVuZE5vZGUucGFyZW50cyhGSUdVUkVfU0VMRUNUT1IpXG5cbiAgLy8gSWYgYXQgbGVhc3Qgc2VsZWN0aW9uIHN0YXJ0IG9yIGVuZCBpcyBpbnNpZGUgdGhlIGZpZ3VyZVxuICBpZiAoc3RhcnROb2RlUGFyZW50Lmxlbmd0aCB8fCBlbmROb2RlUGFyZW50Lmxlbmd0aCkge1xuXG4gICAgLy8gSWYgc2VsZWN0aW9uIGRvZXNuJ3Qgc3RhcnQgYW5kIGVuZCBpbiB0aGUgc2FtZSBmaWd1cmUsIGJ1dCBvbmUgYmVldHdlbiBzdGFydCBvciBlbmQgaXMgaW5zaWRlIHRoZSBmaWdjYXB0aW9uLCBtdXN0IGJsb2NrXG4gICAgaWYgKHN0YXJ0Tm9kZS5wYXJlbnRzKCdmaWdjYXB0aW9uJykubGVuZ3RoICE9IGVuZE5vZGUucGFyZW50cygnZmlnY2FwdGlvbicpLmxlbmd0aCAmJiAoc3RhcnROb2RlLnBhcmVudHMoJ2ZpZ2NhcHRpb24nKS5sZW5ndGggfHwgZW5kTm9kZS5wYXJlbnRzKCdmaWdjYXB0aW9uJykubGVuZ3RoKSlcbiAgICAgIHJldHVybiBmYWxzZVxuXG4gICAgLy8gSWYgdGhlIGZpZ3VyZSBpcyBub3QgdGhlIHNhbWUsIG11c3QgYmxvY2tcbiAgICAvLyBCZWNhdXNlIGEgc2VsZWN0aW9uIGNhbiBzdGFydCBpbiBmaWd1cmVYIGFuZCBlbmQgaW4gZmlndXJlWVxuICAgIGlmICgoc3RhcnROb2RlUGFyZW50LmF0dHIoJ2lkJykgIT0gZW5kTm9kZVBhcmVudC5hdHRyKCdpZCcpKSlcbiAgICAgIHJldHVybiBmYWxzZVxuXG4gIH1cblxuICAvLyBUaGlzIGFsZ29yaXRobSBkb2Vzbid0IHdvcmsgaWYgY2FyZXQgaXMgaW4gZW1wdHkgdGV4dCBlbGVtZW50XG5cbiAgLy8gQ3VycmVudCBlbGVtZW50IGNhbiBiZSBvciB0ZXh0IG9yIHBcbiAgbGV0IHBhcmFncmFwaCA9IHN0YXJ0Tm9kZS5pcygncCcpID8gc3RhcnROb2RlIDogc3RhcnROb2RlLnBhcmVudHMoJ3AnKS5maXJzdCgpXG4gIC8vIFNhdmUgYWxsIGNobGRyZW4gbm9kZXMgKHRleHQgaW5jbHVkZWQpXG4gIGxldCBwYXJhZ3JhcGhDb250ZW50ID0gcGFyYWdyYXBoLmNvbnRlbnRzKClcblxuICAvLyBJZiBuZXh0IHRoZXJlIGlzIGEgZmlndXJlXG4gIGlmIChwYXJhZ3JhcGgubmV4dCgpLmlzKEZJR1VSRV9TRUxFQ1RPUikpIHtcblxuICAgIGlmIChlbmROb2RlWzBdLm5vZGVUeXBlID09IDMpIHtcblxuICAgICAgLy8gSWYgdGhlIGVuZCBub2RlIGlzIGEgdGV4dCBpbnNpZGUgYSBzdHJvbmcsIGl0cyBpbmRleCB3aWxsIGJlIC0xLlxuICAgICAgLy8gSW4gdGhpcyBjYXNlIHRoZSBlZGl0b3IgbXVzdCBpdGVyYXRlIHVudGlsIGl0IGZhY2UgYSBpbmxpbmUgZWxlbWVudFxuICAgICAgaWYgKHBhcmFncmFwaENvbnRlbnQuaW5kZXgoZW5kTm9kZSkgPT0gLTEpIC8vJiYgcGFyYWdyYXBoLnBhcmVudHMoU0VDVElPTl9TRUxFQ1RPUikubGVuZ3RoKVxuICAgICAgICBlbmROb2RlID0gZW5kTm9kZS5wYXJlbnQoKVxuXG4gICAgICAvLyBJZiBpbmRleCBvZiB0aGUgaW5saW5lIGVsZW1lbnQgaXMgZXF1YWwgb2YgY2hpbGRyZW4gbm9kZSBsZW5ndGhcbiAgICAgIC8vIEFORCB0aGUgY3Vyc29yIGlzIGF0IHRoZSBsYXN0IHBvc2l0aW9uXG4gICAgICAvLyBSZW1vdmUgdGhlIG5leHQgZmlndXJlIGluIG9uZSB1bmRvIGxldmVsXG4gICAgICBpZiAocGFyYWdyYXBoQ29udGVudC5pbmRleChlbmROb2RlKSArIDEgPT0gcGFyYWdyYXBoQ29udGVudC5sZW5ndGggJiYgcGFyYWdyYXBoQ29udGVudC5sYXN0KCkudGV4dCgpLmxlbmd0aCA9PSBzZWwuZ2V0Um5nKCkuZW5kT2Zmc2V0KSB7XG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBwYXJhZ3JhcGgubmV4dCgpLnJlbW92ZSgpXG4gICAgICAgIH0pXG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0cnVlXG59XG5cbi8qKlxuICogXG4gKiBAcGFyYW0geyp9IHNlbCA9PiB0aW55bWNlIHNlbGVjdGlvblxuICogXG4gKiBBZGQgYSBwYXJhZ3JhcGggYWZ0ZXIgdGhlIGZpZ3VyZVxuICovXG5mdW5jdGlvbiBoYW5kbGVGaWd1cmVFbnRlcihzZWwpIHtcblxuICBsZXQgc2VsZWN0ZWRFbGVtZW50ID0gJChzZWwuZ2V0Tm9kZSgpKVxuICBpZiAoc2VsZWN0ZWRFbGVtZW50LmlzKCdmaWdjYXB0aW9uJykgfHwgKHNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKEZJR1VSRV9TRUxFQ1RPUikubGVuZ3RoICYmIHNlbGVjdGVkRWxlbWVudC5pcygncCcpKSkge1xuXG4gICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAvL2FkZCBhIG5ldyBwYXJhZ3JhcGggYWZ0ZXIgdGhlIGZpZ3VyZVxuICAgICAgc2VsZWN0ZWRFbGVtZW50LnBhcmVudChGSUdVUkVfU0VMRUNUT1IpLmFmdGVyKCc8cD48YnIvPjwvcD4nKVxuXG4gICAgICAvL21vdmUgY2FyZXQgYXQgdGhlIHN0YXJ0IG9mIG5ldyBwXG4gICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2V0Q3Vyc29yTG9jYXRpb24oc2VsZWN0ZWRFbGVtZW50LnBhcmVudChGSUdVUkVfU0VMRUNUT1IpWzBdLm5leHRTaWJsaW5nLCAwKVxuICAgIH0pXG4gICAgcmV0dXJuIGZhbHNlXG4gIH0gZWxzZSBpZiAoc2VsZWN0ZWRFbGVtZW50LmlzKCd0aCcpKVxuICAgIHJldHVybiBmYWxzZVxuICByZXR1cm4gdHJ1ZVxufVxuXG4vKipcbiAqIFxuICogQHBhcmFtIHsqfSBzZWwgPT4gdGlueW1jZSBzZWxlY3Rpb25cbiAqL1xuZnVuY3Rpb24gaGFuZGxlRmlndXJlQ2hhbmdlKCkge1xuXG4gIC8vIElmIHJhc2gtZ2VuZXJhdGVkIHNlY3Rpb24gaXMgZGVsZXRlLCByZS1hZGQgaXRcbiAgaWYgKCQoJ2ZpZ2NhcHRpb246bm90KDpoYXMoc3Ryb25nKSknKS5sZW5ndGgpIHtcbiAgICBjYXB0aW9ucygpXG4gICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG4gIH1cbn0iLCIvKipcbiAqIHJhamVfaW5saW5lX2NvZGUgcGx1Z2luIFJBSkVcbiAqL1xuXG4vKipcbiAqIFxuICovXG5sZXQgaW5saW5lID0ge1xuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGhhbmRsZTogZnVuY3Rpb24gKHR5cGUpIHtcbiAgICBsZXQgc2VsZWN0ZWRFbGVtZW50ID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuXG4gICAgLy8gSWYgdGhlcmUgaXNuJ3QgYW55IGlubGluZSBjb2RlXG4gICAgaWYgKCFzZWxlY3RlZEVsZW1lbnQuaXModHlwZSkgJiYgIXNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKHR5cGUpLmxlbmd0aCkge1xuXG4gICAgICBsZXQgdGV4dCA9IFpFUk9fU1BBQ0VcblxuICAgICAgLy8gQ2hlY2sgaWYgdGhlIHNlbGVjdGlvbiBzdGFydHMgYW5kIGVuZHMgaW4gdGhlIHNhbWUgcGFyYWdyYXBoXG4gICAgICBpZiAoIXRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5pc0NvbGxhcHNlZCgpKSB7XG5cbiAgICAgICAgbGV0IHN0YXJ0Tm9kZSA9IHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRTdGFydCgpXG4gICAgICAgIGxldCBlbmROb2RlID0gdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldEVuZCgpXG5cbiAgICAgICAgLy8gTm90aWZ5IHRoZSBlcnJvciBhbmQgZXhpdFxuICAgICAgICBpZiAoc3RhcnROb2RlICE9IGVuZE5vZGUpIHtcbiAgICAgICAgICBub3RpZnkoSU5MSU5FX0VSUk9SUywgJ2Vycm9yJywgMzAwMClcbiAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNhdmUgdGhlIHNlbGVjdGVkIGNvbnRlbnQgYXMgdGV4dFxuICAgICAgICB0ZXh0ICs9IHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRDb250ZW50KClcbiAgICAgIH1cblxuICAgICAgLy8gVXBkYXRlIHRoZSBjdXJyZW50IHNlbGVjdGlvbiB3aXRoIGNvZGUgZWxlbWVudFxuICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIC8vIEdldCB0aGUgaW5kZXggb2YgdGhlIGN1cnJlbnQgc2VsZWN0ZWQgbm9kZVxuICAgICAgICBsZXQgcHJldmlvdXNOb2RlSW5kZXggPSBzZWxlY3RlZEVsZW1lbnQuY29udGVudHMoKS5pbmRleCgkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRSbmcoKS5zdGFydENvbnRhaW5lcikpXG5cbiAgICAgICAgLy8gQWRkIGNvZGUgZWxlbWVudFxuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2V0Q29udGVudChgPCR7dHlwZX0+JHt0ZXh0fTwvJHt0eXBlfT4keyh0eXBlID09ICdxJyA/IFpFUk9fU1BBQ0UgOiAnJyl9YClcbiAgICAgICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG5cbiAgICAgICAgLy8gTW92ZSBjYXJldCBhdCB0aGUgZW5kIG9mIHRoZSBzdWNjZXNzaXZlIG5vZGUgb2YgcHJldmlvdXMgc2VsZWN0ZWQgbm9kZVxuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2V0Q3Vyc29yTG9jYXRpb24oc2VsZWN0ZWRFbGVtZW50LmNvbnRlbnRzKClbcHJldmlvdXNOb2RlSW5kZXggKyAxXSwgMSlcbiAgICAgIH0pXG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGV4aXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAvLyBHZXQgdGhlIGN1cnJlbnQgbm9kZSBpbmRleCwgcmVsYXRpdmUgdG8gaXRzIHBhcmVudFxuICAgIGxldCBzZWxlY3RlZEVsZW1lbnQgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG4gICAgbGV0IHBhcmVudENvbnRlbnQgPSBzZWxlY3RlZEVsZW1lbnQucGFyZW50KCkuY29udGVudHMoKVxuICAgIGxldCBpbmRleCA9IHBhcmVudENvbnRlbnQuaW5kZXgoc2VsZWN0ZWRFbGVtZW50KVxuXG4gICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAvLyBDaGVjayBpZiB0aGUgY3VycmVudCBub2RlIGhhcyBhIHRleHQgYWZ0ZXJcbiAgICAgIGlmICh0eXBlb2YgcGFyZW50Q29udGVudFtpbmRleCArIDFdICE9ICd1bmRlZmluZWQnICYmICQocGFyZW50Q29udGVudFtpbmRleCArIDFdKS5pcygndGV4dCcpKSB7XG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZXRDdXJzb3JMb2NhdGlvbihwYXJlbnRDb250ZW50W2luZGV4ICsgMV0sIDApXG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZXRDb250ZW50KFpFUk9fU1BBQ0UpXG4gICAgICB9XG5cbiAgICAgIC8vIElmIHRoZSBub2RlIGhhc24ndCB0ZXh0IGFmdGVyLCByYWplIGhhcyB0byBhZGQgaXRcbiAgICAgIGVsc2Uge1xuICAgICAgICBzZWxlY3RlZEVsZW1lbnQuYWZ0ZXIoWkVST19TUEFDRSlcbiAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLnNldEN1cnNvckxvY2F0aW9uKHBhcmVudENvbnRlbnRbaW5kZXggKyAxXSwgMClcbiAgICAgIH1cbiAgICB9KVxuICB9LFxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIHJlcGxhY2VUZXh0OiBmdW5jdGlvbiAoY2hhcikge1xuXG4gICAgbGV0IHNlbGVjdGVkRWxlbWVudCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcbiAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgIC8vIFNldCB0aGUgbmV3IGNoYXIgYW5kIG92ZXJ3cml0ZSBjdXJyZW50IHRleHRcbiAgICAgIHNlbGVjdGVkRWxlbWVudC5odG1sKGNoYXIpXG5cbiAgICAgIC8vIE1vdmUgdGhlIGNhcmV0IGF0IHRoZSBlbmQgb2YgY3VycmVudCB0ZXh0XG4gICAgICBsZXQgY29udGVudCA9IHNlbGVjdGVkRWxlbWVudC5jb250ZW50cygpXG4gICAgICBtb3ZlQ2FyZXQoY29udGVudFtjb250ZW50Lmxlbmd0aCAtIDFdKVxuICAgIH0pXG4gIH1cbn1cblxuLyoqXG4gKiBcbiAqL1xudGlueW1jZS5QbHVnaW5NYW5hZ2VyLmFkZCgncmFqZV9pbmxpbmVDb2RlJywgZnVuY3Rpb24gKGVkaXRvciwgdXJsKSB7XG5cbiAgY29uc3QgQ09ERSA9ICdjb2RlJ1xuXG4gIC8vIEFkZCBhIGJ1dHRvbiB0aGF0IG9wZW5zIGEgd2luZG93XG4gIGVkaXRvci5hZGRCdXR0b24oJ3JhamVfaW5saW5lQ29kZScsIHtcbiAgICB0aXRsZTogJ2lubGluZV9jb2RlJyxcbiAgICBpY29uOiAnaWNvbi1pbmxpbmUtY29kZScsXG4gICAgdG9vbHRpcDogJ0lubGluZSBjb2RlJyxcbiAgICBkaXNhYmxlZFN0YXRlU2VsZWN0b3I6IERJU0FCTEVfU0VMRUNUT1JfSU5MSU5FLFxuXG4gICAgLy8gQnV0dG9uIGJlaGF2aW91clxuICAgIG9uY2xpY2s6IGZ1bmN0aW9uICgpIHtcbiAgICAgIGlubGluZS5oYW5kbGUoQ09ERSlcbiAgICB9XG4gIH0pXG5cbiAgZWRpdG9yLm9uKCdrZXlEb3duJywgZnVuY3Rpb24gKGUpIHtcblxuXG4gICAgLy8gQ2hlY2sgaWYgdGhlIHNlbGVjdGVkIGVsZW1lbnQgaXMgYSBDT0RFIHRoYXQgaXNuJ3QgaW5zaWRlIGEgRklHVVJFIG9yIFBSRVxuICAgIGxldCBzZWxlY3RlZEVsZW1lbnQgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG4gICAgaWYgKHNlbGVjdGVkRWxlbWVudC5pcygnY29kZScpICYmICFzZWxlY3RlZEVsZW1lbnQucGFyZW50cyhGSUdVUkVfU0VMRUNUT1IpLmxlbmd0aCAmJiAhc2VsZWN0ZWRFbGVtZW50LnBhcmVudHMoJ3ByZScpLmxlbmd0aCkge1xuXG4gICAgICAvLyBDaGVjayBpZiBFTlRFUiBpcyBwcmVzc2VkXG4gICAgICBpZiAoZS5rZXlDb2RlID09IDEzKSB7XG5cbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKClcbiAgICAgICAgaW5saW5lLmV4aXQoKVxuICAgICAgfVxuXG4gICAgICAvL0NoZWNrIGlmIGEgUFJJTlRBQkxFIENIQVIgaXMgcHJlc3NlZFxuICAgICAgaWYgKGNoZWNrSWZQcmludGFibGVDaGFyKGUua2V5Q29kZSkpIHtcblxuICAgICAgICAvLyBJZiB0aGUgZmlyc3QgY2hhciBpcyBaRVJPX1NQQUNFIGFuZCB0aGUgY29kZSBoYXMgbm8gY2hhclxuICAgICAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LnRleHQoKS5sZW5ndGggPT0gMiAmJiBgJiMke3NlbGVjdGVkRWxlbWVudC50ZXh0KCkuY2hhckNvZGVBdCgwKX07YCA9PSBaRVJPX1NQQUNFKSB7XG5cbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpXG4gICAgICAgICAgaW5saW5lLnJlcGxhY2VUZXh0KGUua2V5KVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9KVxufSlcblxuLyoqXG4gKiAgSW5saW5lIHF1b3RlIHBsdWdpbiBSQUpFXG4gKi9cbnRpbnltY2UuUGx1Z2luTWFuYWdlci5hZGQoJ3JhamVfaW5saW5lUXVvdGUnLCBmdW5jdGlvbiAoZWRpdG9yLCB1cmwpIHtcblxuICBjb25zdCBRID0gJ3EnXG5cbiAgLy8gQWRkIGEgYnV0dG9uIHRoYXQgaGFuZGxlIHRoZSBpbmxpbmUgZWxlbWVudFxuICBlZGl0b3IuYWRkQnV0dG9uKCdyYWplX2lubGluZVF1b3RlJywge1xuICAgIHRpdGxlOiAnaW5saW5lX3F1b3RlJyxcbiAgICBpY29uOiAnaWNvbi1pbmxpbmUtcXVvdGUnLFxuICAgIHRvb2x0aXA6ICdJbmxpbmUgcXVvdGUnLFxuICAgIGRpc2FibGVkU3RhdGVTZWxlY3RvcjogRElTQUJMRV9TRUxFQ1RPUl9JTkxJTkUsXG5cbiAgICAvLyBCdXR0b24gYmVoYXZpb3VyXG4gICAgb25jbGljazogZnVuY3Rpb24gKCkge1xuICAgICAgaW5saW5lLmhhbmRsZSgncScpXG4gICAgfVxuICB9KVxuXG4gIGVkaXRvci5vbigna2V5RG93bicsIGZ1bmN0aW9uIChlKSB7XG5cbiAgICAvLyBDaGVjayBpZiB0aGUgc2VsZWN0ZWQgZWxlbWVudCBpcyBhIENPREUgdGhhdCBpc24ndCBpbnNpZGUgYSBGSUdVUkUgb3IgUFJFXG4gICAgbGV0IHNlbGVjdGVkRWxlbWVudCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcbiAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LmlzKCdxJykpIHtcblxuICAgICAgLy8gQ2hlY2sgaWYgRU5URVIgaXMgcHJlc3NlZFxuICAgICAgaWYgKGUua2V5Q29kZSA9PSAxMykge1xuXG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpXG4gICAgICAgIGlubGluZS5leGl0KClcbiAgICAgIH1cblxuICAgICAgLy8gQ2hlY2sgaWYgYSBQUklOVEFCTEUgQ0hBUiBpcyBwcmVzc2VkXG4gICAgICBpZiAoY2hlY2tJZlByaW50YWJsZUNoYXIoZS5rZXlDb2RlKSkge1xuXG4gICAgICAgIC8vIElmIHRoZSBmaXJzdCBjaGFyIGlzIFpFUk9fU1BBQ0UgYW5kIHRoZSBjb2RlIGhhcyBubyBjaGFyXG4gICAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQudGV4dCgpLmxlbmd0aCA9PSAxICYmIGAmIyR7c2VsZWN0ZWRFbGVtZW50LnRleHQoKS5jaGFyQ29kZUF0KDApfTtgID09IFpFUk9fU1BBQ0UpIHtcblxuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKClcbiAgICAgICAgICBpbmxpbmUucmVwbGFjZVRleHQoZS5rZXkpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH0pXG59KVxuXG4vKipcbiAqIFxuICovXG50aW55bWNlLlBsdWdpbk1hbmFnZXIuYWRkKCdyYWplX2V4dGVybmFsTGluaycsIGZ1bmN0aW9uIChlZGl0b3IsIHVybCkge1xuXG4gIGVkaXRvci5hZGRCdXR0b24oJ3JhamVfZXh0ZXJuYWxMaW5rJywge1xuICAgIHRpdGxlOiAnZXh0ZXJuYWxfbGluaycsXG4gICAgaWNvbjogJ2ljb24tZXh0ZXJuYWwtbGluaycsXG4gICAgdG9vbHRpcDogJ0V4dGVybmFsIGxpbmsnLFxuICAgIGRpc2FibGVkU3RhdGVTZWxlY3RvcjogRElTQUJMRV9TRUxFQ1RPUl9JTkxJTkUsXG5cbiAgICAvLyBCdXR0b24gYmVoYXZpb3VyXG4gICAgb25jbGljazogZnVuY3Rpb24gKCkge31cbiAgfSlcblxuXG4gIGxldCBsaW5rID0ge1xuICAgIGFkZDogZnVuY3Rpb24gKCkge1xuXG4gICAgfVxuICB9XG59KVxuXG4vKipcbiAqIFxuICovXG50aW55bWNlLlBsdWdpbk1hbmFnZXIuYWRkKCdyYWplX2lubGluZUZpZ3VyZScsIGZ1bmN0aW9uIChlZGl0b3IsIHVybCkge1xuICBlZGl0b3IuYWRkQnV0dG9uKCdyYWplX2lubGluZUZpZ3VyZScsIHtcbiAgICB0ZXh0OiAnaW5saW5lX2ZpZ3VyZScsXG4gICAgdG9vbHRpcDogJ0lubGluZSBxdW90ZScsXG4gICAgZGlzYWJsZWRTdGF0ZVNlbGVjdG9yOiBESVNBQkxFX1NFTEVDVE9SX0lOTElORSxcblxuICAgIC8vIEJ1dHRvbiBiZWhhdmlvdXJcbiAgICBvbmNsaWNrOiBmdW5jdGlvbiAoKSB7fVxuICB9KVxufSkiLCJ0aW55bWNlLlBsdWdpbk1hbmFnZXIuYWRkKCdyYWplX2xpc3RzJywgZnVuY3Rpb24gKGVkaXRvciwgdXJsKSB7XG5cbiAgY29uc3QgT0wgPSAnb2wnXG4gIGNvbnN0IFVMID0gJ3VsJ1xuXG4gIGVkaXRvci5hZGRCdXR0b24oJ3JhamVfb2wnLCB7XG4gICAgdGl0bGU6ICdyYWplX29sJyxcbiAgICBpY29uOiAnaWNvbi1vbCcsXG4gICAgdG9vbHRpcDogJ09yZGVyZWQgbGlzdCcsXG4gICAgZGlzYWJsZWRTdGF0ZVNlbGVjdG9yOiBESVNBQkxFX1NFTEVDVE9SX0ZJR1VSRVMsXG5cbiAgICAvLyBCdXR0b24gYmVoYXZpb3VyXG4gICAgb25jbGljazogZnVuY3Rpb24gKCkge1xuICAgICAgbGlzdC5hZGQoT0wpXG4gICAgfVxuICB9KVxuXG4gIGVkaXRvci5hZGRCdXR0b24oJ3JhamVfdWwnLCB7XG4gICAgdGl0bGU6ICdyYWplX3VsJyxcbiAgICBpY29uOiAnaWNvbi11bCcsXG4gICAgdG9vbHRpcDogJ1Vub3JkZXJlZCBsaXN0JyxcbiAgICBkaXNhYmxlZFN0YXRlU2VsZWN0b3I6IERJU0FCTEVfU0VMRUNUT1JfRklHVVJFUyxcblxuICAgIC8vIEJ1dHRvbiBiZWhhdmlvdXJcbiAgICBvbmNsaWNrOiBmdW5jdGlvbiAoKSB7XG4gICAgICBsaXN0LmFkZChVTClcbiAgICB9XG4gIH0pXG5cbiAgLyoqXG4gICAqIFxuICAgKi9cbiAgZWRpdG9yLm9uKCdrZXlEb3duJywgZnVuY3Rpb24gKGUpIHtcblxuXG4gICAgLy8gQ2hlY2sgaWYgdGhlIHNlbGVjdGVkIGVsZW1lbnQgaXMgYSBQIGluc2lkZSBhIGxpc3QgKE9MLCBVTClcbiAgICBsZXQgc2VsZWN0ZWRFbGVtZW50ID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuICAgIGlmIChzZWxlY3RlZEVsZW1lbnQuaXMoJ3AnKSAmJiAoc2VsZWN0ZWRFbGVtZW50LnBhcmVudHMoJ3VsJykubGVuZ3RoIHx8IHNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKCdsaScpLmxlbmd0aCkpIHtcblxuXG4gICAgICAvKipcbiAgICAgICAqIENoZWNrIGlmIENNRCtFTlRFUiBvciBDVFJMK0VOVEVSIGFyZSBwcmVzc2VkXG4gICAgICAgKi9cbiAgICAgIGlmICgoZS5tZXRhS2V5IHx8IGUuY3RybEtleSkgJiYgZS5rZXlDb2RlID09IDEzKSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgICBsaXN0LmFkZFBhcmFncmFwaCgpXG4gICAgICB9XG5cbiAgICAgIC8qKlxuICAgICAgICogQ2hlY2sgaWYgU0hJRlQrVEFCIGlzIHByZXNzZWRcbiAgICAgICAqL1xuICAgICAgZWxzZSBpZiAoZS5zaGlmdEtleSAmJiBlLmtleUNvZGUgPT0gOSkge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgbGlzdC5kZU5lc3QoKVxuICAgICAgfVxuXG4gICAgICAvKipcbiAgICAgICAqIENoZWNrIGlmIEVOVEVSIGlzIHByZXNzZWRcbiAgICAgICAqL1xuICAgICAgZWxzZSBpZiAoZS5rZXlDb2RlID09IDEzKSB7XG5cbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIHNlbGVjdGlvbiBpcyBjb2xsYXBzZWRcbiAgICAgICAgaWYgKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5pc0NvbGxhcHNlZCgpKSB7XG5cbiAgICAgICAgICBpZiAoIXNlbGVjdGVkRWxlbWVudC50ZXh0KCkudHJpbSgpLmxlbmd0aCkge1xuXG4gICAgICAgICAgICAvLyBEZSBuZXN0XG4gICAgICAgICAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LnBhcmVudHMoJ3VsLG9sJykubGVuZ3RoID4gMSlcbiAgICAgICAgICAgICAgbGlzdC5kZU5lc3QoKVxuXG4gICAgICAgICAgICAvLyBSZW1vdmUgdGhlIGVtcHR5IExJXG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgIGxpc3QucmVtb3ZlTGlzdEl0ZW0oKVxuXG4gICAgICAgICAgfSBlbHNlXG4gICAgICAgICAgICBsaXN0LmFkZExpc3RJdGVtKClcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvKipcbiAgICAgICAqIENoZWNrIGlmIFRBQiBpcyBwcmVzc2VkXG4gICAgICAgKi9cbiAgICAgIGVsc2UgaWYgKGUua2V5Q29kZSA9PSA5KSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgICBsaXN0Lm5lc3QoKVxuICAgICAgfVxuICAgIH1cbiAgfSlcblxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGxldCBsaXN0ID0ge1xuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgYWRkOiBmdW5jdGlvbiAodHlwZSkge1xuXG4gICAgICAvLyBHZXQgdGhlIGN1cnJlbnQgZWxlbWVudCBcbiAgICAgIGxldCBzZWxlY3RlZEVsZW1lbnQgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG4gICAgICBsZXQgdGV4dCA9ICc8YnI+J1xuXG4gICAgICAvLyBJZiB0aGUgY3VycmVudCBlbGVtZW50IGhhcyB0ZXh0LCBzYXZlIGl0XG4gICAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LnRleHQoKS50cmltKCkubGVuZ3RoID4gMClcbiAgICAgICAgdGV4dCA9IHNlbGVjdGVkRWxlbWVudC50ZXh0KCkudHJpbSgpXG5cbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICBsZXQgbmV3TGlzdCA9ICQoYDwke3R5cGV9PjxsaT48cD4ke3RleHR9PC9wPjwvbGk+PC8ke3R5cGV9PmApXG5cbiAgICAgICAgLy8gQWRkIHRoZSBuZXcgZWxlbWVudFxuICAgICAgICBzZWxlY3RlZEVsZW1lbnQucmVwbGFjZVdpdGgobmV3TGlzdClcblxuICAgICAgICAvLyBTYXZlIGNoYW5nZXNcbiAgICAgICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG5cbiAgICAgICAgLy8gTW92ZSB0aGUgY3Vyc29yXG4gICAgICAgIG1vdmVDYXJldChuZXdMaXN0LmZpbmQoJ3AnKVswXSwgZmFsc2UpXG4gICAgICB9KVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBhZGRMaXN0SXRlbTogZnVuY3Rpb24gKCkge1xuXG4gICAgICBjb25zdCBCUiA9ICc8YnI+J1xuXG4gICAgICAvLyBHZXQgdGhlIHJlZmVyZW5jZXMgb2YgdGhlIGV4aXN0aW5nIGVsZW1lbnRcbiAgICAgIGxldCBwID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuICAgICAgbGV0IGxpc3RJdGVtID0gcC5wYXJlbnQoJ2xpJylcblxuICAgICAgLy8gUGxhY2Vob2xkZXIgdGV4dCBvZiB0aGUgbmV3IGxpXG4gICAgICBsZXQgbmV3VGV4dCA9IEJSXG4gICAgICBsZXQgbm9kZXMgPSBwLmNvbnRlbnRzKClcblxuICAgICAgLy8gSWYgdGhlcmUgaXMganVzdCBvbmUgbm9kZSB3cmFwcGVkIGluc2lkZSB0aGUgcGFyYWdyYXBoXG4gICAgICBpZiAobm9kZXMubGVuZ3RoID09IDEpIHtcblxuICAgICAgICAvLyBHZXQgdGhlIHN0YXJ0IG9mZnNldCBhbmQgdGV4dCBvZiB0aGUgY3VycmVudCBsaVxuICAgICAgICBsZXQgc3RhcnRPZmZzZXQgPSB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Um5nKCkuc3RhcnRPZmZzZXRcbiAgICAgICAgbGV0IHBUZXh0ID0gcC50ZXh0KClcblxuICAgICAgICAvLyBJZiB0aGUgY3Vyc29yIGlzbid0IGF0IHRoZSBlbmRcbiAgICAgICAgaWYgKHN0YXJ0T2Zmc2V0ICE9IHBUZXh0Lmxlbmd0aCkge1xuXG4gICAgICAgICAgLy8gR2V0IHRoZSByZW1haW5pbmcgdGV4dFxuICAgICAgICAgIG5ld1RleHQgPSBwVGV4dC5zdWJzdHJpbmcoc3RhcnRPZmZzZXQsIHBUZXh0Lmxlbmd0aClcbiAgICAgICAgfVxuXG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgdGV4dCBvZiB0aGUgY3VycmVudCBsaVxuICAgICAgICAgIHAudGV4dChwVGV4dC5zdWJzdHJpbmcoMCwgc3RhcnRPZmZzZXQpKVxuXG4gICAgICAgICAgaWYgKCFwLnRleHQoKS5sZW5ndGgpXG4gICAgICAgICAgICBwLmh0bWwoQlIpXG5cbiAgICAgICAgICAvLyBDcmVhdGUgYW5kIGFkZCB0aGUgbmV3IGxpXG4gICAgICAgICAgbGV0IG5ld0xpc3RJdGVtID0gJChgPGxpPjxwPiR7bmV3VGV4dH08L3A+PC9saT5gKVxuICAgICAgICAgIGxpc3RJdGVtLmFmdGVyKG5ld0xpc3RJdGVtKVxuXG4gICAgICAgICAgLy8gTW92ZSB0aGUgY2FyZXQgdG8gdGhlIG5ldyBsaVxuICAgICAgICAgIG1vdmVDYXJldChuZXdMaXN0SXRlbVswXSwgdHJ1ZSlcblxuICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgY29udGVudFxuICAgICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuICAgICAgICB9KVxuICAgICAgfVxuXG4gICAgICAvLyBJbnN0ZWFkIGlmIHRoZXJlIGFyZSBtdWx0aXBsZSBub2RlcyBpbnNpZGUgdGhlIHBhcmFncmFwaFxuICAgICAgZWxzZSB7XG5cbiAgICAgICAgLy8gSXN0YW50aWF0ZSB0aGUgcmFuZ2UgdG8gYmUgc2VsZWN0ZWRcbiAgICAgICAgbGV0IHJhbmdlID0gZG9jdW1lbnQuY3JlYXRlUmFuZ2UoKVxuXG4gICAgICAgIC8vIFN0YXJ0IHRoZSByYW5nZSBmcm9tIHRoZSBzZWxlY3RlZCBub2RlIGFuZCBvZmZzZXQgYW5kIGVuZHMgaXQgYXQgdGhlIGVuZCBvZiB0aGUgbGFzdCBub2RlXG4gICAgICAgIHJhbmdlLnNldFN0YXJ0KHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRSbmcoKS5zdGFydENvbnRhaW5lciwgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldFJuZygpLnN0YXJ0T2Zmc2V0KVxuICAgICAgICByYW5nZS5zZXRFbmQodGhpcy5nZXRMYXN0Tm90RW1wdHlOb2RlKG5vZGVzKSwgMSlcblxuICAgICAgICAvLyBTZWxlY3QgdGhlIHJhbmdlXG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZXRSbmcocmFuZ2UpXG5cbiAgICAgICAgLy8gU2F2ZSB0aGUgaHRtbCBjb250ZW50XG4gICAgICAgIG5ld1RleHQgPSB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Q29udGVudCgpXG5cbiAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgcC5odG1sKHAuaHRtbCgpLnJlcGxhY2UobmV3VGV4dCwgJycpKVxuXG4gICAgICAgICAgaWYgKCFwLnRleHQoKS5sZW5ndGgpXG4gICAgICAgICAgICBwLmh0bWwoQlIpXG5cbiAgICAgICAgICAvLyBDcmVhdGUgYW5kIGFkZCB0aGUgbmV3IGxpXG4gICAgICAgICAgbGV0IG5ld0xpc3RJdGVtID0gJChgPGxpPjxwPiR7bmV3VGV4dH08L3A+PC9saT5gKVxuICAgICAgICAgIGxpc3RJdGVtLmFmdGVyKG5ld0xpc3RJdGVtKVxuXG4gICAgICAgICAgLy8gTW92ZSB0aGUgY2FyZXQgdG8gdGhlIG5ldyBsaVxuICAgICAgICAgIG1vdmVDYXJldChuZXdMaXN0SXRlbVswXSwgdHJ1ZSlcblxuICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgY29udGVudFxuICAgICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuICAgICAgICB9KVxuICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBnZXRMYXN0Tm90RW1wdHlOb2RlOiBmdW5jdGlvbiAobm9kZXMpIHtcblxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBub2Rlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAobm9kZXNbaV0ubm9kZVR5cGUgPT0gMyAmJiAhbm9kZXNbaV0ubGVuZ3RoKVxuICAgICAgICAgIG5vZGVzLnNwbGljZShpLCAxKVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gbm9kZXNbbm9kZXMubGVuZ3RoIC0gMV1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgcmVtb3ZlTGlzdEl0ZW06IGZ1bmN0aW9uICgpIHtcblxuICAgICAgLy8gR2V0IHRoZSBzZWxlY3RlZCBsaXN0SXRlbVxuICAgICAgbGV0IGxpc3RJdGVtID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKS5wYXJlbnQoJ2xpJylcblxuICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIC8vIEFkZCBhIGVtcHR5IHBhcmFncmFwaCBhZnRlciB0aGUgbGlzdFxuICAgICAgICBsZXQgbmV3UCA9ICQoJzxwPjxicj48L3A+JylcbiAgICAgICAgbGlzdEl0ZW0ucGFyZW50KCkuYWZ0ZXIobmV3UClcblxuICAgICAgICAvLyBDaGVjayBpZiB0aGUgbGlzdCBoYXMgZXhhY3RseSBvbmUgY2hpbGQgcmVtb3ZlIHRoZSBsaXN0XG4gICAgICAgIGlmIChsaXN0SXRlbS5wYXJlbnQoKS5jaGlsZHJlbignbGknKS5sZW5ndGggPT0gMSkge1xuICAgICAgICAgIGxldCBsaXN0ID0gbGlzdEl0ZW0ucGFyZW50KClcbiAgICAgICAgICBsaXN0LnJlbW92ZSgpXG4gICAgICAgIH1cblxuICAgICAgICAvLyBJZiB0aGUgbGlzdCBoYXMgbW9yZSBjaGlsZHJlbiByZW1vdmUgdGhlIHNlbGVjdGVkIGNoaWxkXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBsaXN0SXRlbS5yZW1vdmUoKVxuXG4gICAgICAgIG1vdmVDYXJldChuZXdQWzBdKVxuXG4gICAgICAgIC8vIFVwZGF0ZSB0aGUgY29udGVudFxuICAgICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcbiAgICAgIH0pXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIG5lc3Q6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgbGV0IHAgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG4gICAgICBsZXQgbGlzdEl0ZW0gPSBwLnBhcmVudCgnbGknKVxuXG4gICAgICAvLyBDaGVjayBpZiB0aGUgY3VycmVudCBsaSBoYXMgYXQgbGVhc3Qgb25lIHByZXZpb3VzIGVsZW1lbnRcbiAgICAgIGlmIChsaXN0SXRlbS5wcmV2QWxsKCkubGVuZ3RoID4gMCkge1xuXG4gICAgICAgIC8vIENyZWF0ZSB0aGUgbmV3IGxpc3RcbiAgICAgICAgbGV0IHRleHQgPSAnPGJyPidcblxuICAgICAgICBpZiAocC50ZXh0KCkudHJpbSgpLmxlbmd0aClcbiAgICAgICAgICB0ZXh0ID0gcC50ZXh0KCkudHJpbSgpXG5cbiAgICAgICAgLy8gR2V0IHR5cGUgb2YgdGhlIHBhcmVudCBsaXN0XG4gICAgICAgIGxldCB0eXBlID0gbGlzdEl0ZW0ucGFyZW50KClbMF0udGFnTmFtZS50b0xvd2VyQ2FzZSgpXG5cbiAgICAgICAgLy8gQ3JlYXRlIHRoZSBuZXcgbmVzdGVkIGxpc3RcbiAgICAgICAgbGV0IG5ld0xpc3RJdGVtID0gJChsaXN0SXRlbVswXS5vdXRlckhUTUwpXG5cbiAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgLy8gSWYgdGhlIHByZXZpb3VzIGVsZW1lbnQgaGFzIGEgbGlzdFxuICAgICAgICAgIGlmIChsaXN0SXRlbS5wcmV2KCkuZmluZCgndWwsb2wnKS5sZW5ndGgpXG4gICAgICAgICAgICBsaXN0SXRlbS5wcmV2KCkuZmluZCgndWwsb2wnKS5hcHBlbmQobmV3TGlzdEl0ZW0pXG5cbiAgICAgICAgICAvLyBBZGQgdGhlIG5ldyBsaXN0IGluc2lkZSB0aGUgcHJldmlvdXMgbGlcbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIG5ld0xpc3RJdGVtID0gJChgPCR7dHlwZX0+JHtuZXdMaXN0SXRlbVswXS5vdXRlckhUTUx9PC8ke3R5cGV9PmApXG4gICAgICAgICAgICBsaXN0SXRlbS5wcmV2KCkuYXBwZW5kKG5ld0xpc3RJdGVtKVxuICAgICAgICAgIH1cblxuICAgICAgICAgIGxpc3RJdGVtLnJlbW92ZSgpXG5cbiAgICAgICAgICAvLyBNb3ZlIHRoZSBjYXJldCBhdCB0aGUgZW5kIG9mIHRoZSBuZXcgcCBcbiAgICAgICAgICBtb3ZlQ2FyZXQobmV3TGlzdEl0ZW0uZmluZCgncCcpWzBdKVxuXG4gICAgICAgICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIGRlTmVzdDogZnVuY3Rpb24gKCkge1xuXG4gICAgICBsZXQgbGlzdEl0ZW0gPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpLnBhcmVudCgnbGknKVxuICAgICAgbGV0IGxpc3QgPSBsaXN0SXRlbS5wYXJlbnQoKVxuXG4gICAgICAvLyBDaGVjayBpZiB0aGUgY3VycmVudCBsaXN0IGhhcyBhdCBsZWFzdCBhbm90aGVyIGxpc3QgYXMgcGFyZW50XG4gICAgICBpZiAobGlzdEl0ZW0ucGFyZW50cygndWwsb2wnKS5sZW5ndGggPiAxKSB7XG5cbiAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgLy8gR2V0IGFsbCBsaTogY3VycmVudCBhbmQgaWYgdGhlcmUgYXJlIHN1Y2Nlc3NpdmVcbiAgICAgICAgICBsZXQgbmV4dExpID0gW2xpc3RJdGVtXVxuICAgICAgICAgIGlmIChsaXN0SXRlbS5uZXh0QWxsKCkubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgbGlzdEl0ZW0ubmV4dEFsbCgpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICBuZXh0TGkucHVzaCgkKHRoaXMpKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBNb3ZlIGFsbCBsaSBvdXQgZnJvbSB0aGUgbmVzdGVkIGxpc3RcbiAgICAgICAgICBmb3IgKGxldCBpID0gbmV4dExpLmxlbmd0aCAtIDE7IGkgPiAtMTsgaS0tKSB7XG4gICAgICAgICAgICBuZXh0TGlbaV0ucmVtb3ZlKClcbiAgICAgICAgICAgIGxpc3QucGFyZW50KCkuYWZ0ZXIobmV4dExpW2ldKVxuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIElmIGVtcHR5IHJlbW92ZSB0aGUgbGlzdFxuICAgICAgICAgIGlmICghbGlzdC5jaGlsZHJlbignbGknKS5sZW5ndGgpXG4gICAgICAgICAgICBsaXN0LnJlbW92ZSgpXG5cbiAgICAgICAgICAvLyBNb3ZlIHRoZSBjYXJldCBhdCB0aGUgZW5kXG4gICAgICAgICAgbW92ZUNhcmV0KGxpc3RJdGVtLmZpbmQoJ3AnKVswXSlcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgYWRkUGFyYWdyYXBoOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgIC8vIEdldCByZWZlcmVuY2VzIG9mIGN1cnJlbnQgcFxuICAgICAgbGV0IHAgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG4gICAgICBsZXQgc3RhcnRPZmZzZXQgPSB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Um5nKCkuc3RhcnRPZmZzZXRcbiAgICAgIGxldCBwVGV4dCA9IHAudGV4dCgpLnRyaW0oKVxuXG4gICAgICBsZXQgdGV4dCA9ICc8YnI+J1xuXG4gICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgLy8gSWYgdGhlIEVOVEVSIGJyZWFrcyBwXG4gICAgICAgIGlmIChzdGFydE9mZnNldCAhPSBwVGV4dC5sZW5ndGgpIHtcblxuICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgdGV4dCBvZiB0aGUgY3VycmVudCBsaVxuICAgICAgICAgIHAudGV4dChwVGV4dC5zdWJzdHJpbmcoMCwgc3RhcnRPZmZzZXQpKVxuXG4gICAgICAgICAgLy8gR2V0IHRoZSByZW1haW5pbmcgdGV4dFxuICAgICAgICAgIHRleHQgPSBwVGV4dC5zdWJzdHJpbmcoc3RhcnRPZmZzZXQsIHBUZXh0Lmxlbmd0aClcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENyZWF0ZSBhbmQgYWRkIHRoZSBlbGVtZW50XG4gICAgICAgIGxldCBuZXdQID0gJChgPHA+JHt0ZXh0fTwvcD5gKVxuICAgICAgICBwLmFmdGVyKG5ld1ApXG5cbiAgICAgICAgbW92ZUNhcmV0KG5ld1BbMF0sIHRydWUpXG4gICAgICB9KVxuICAgIH1cbiAgfVxufSkiLCIvKipcbiAqIFxuICovXG5cbmZ1bmN0aW9uIG9wZW5NZXRhZGF0YURpYWxvZygpIHtcbiAgdGlueW1jZS5hY3RpdmVFZGl0b3Iud2luZG93TWFuYWdlci5vcGVuKHtcbiAgICB0aXRsZTogJ0VkaXQgbWV0YWRhdGEnLFxuICAgIHVybDogJ2pzL3JhamUtY29yZS9wbHVnaW4vcmFqZV9tZXRhZGF0YS5odG1sJyxcbiAgICB3aWR0aDogOTUwLFxuICAgIGhlaWdodDogODAwLFxuICAgIG9uQ2xvc2U6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgaWYgKHRpbnltY2UuYWN0aXZlRWRpdG9yLnVwZGF0ZWRfbWV0YWRhdGEgIT0gbnVsbCkge1xuXG4gICAgICAgIG1ldGFkYXRhLnVwZGF0ZSh0aW55bWNlLmFjdGl2ZUVkaXRvci51cGRhdGVkX21ldGFkYXRhKVxuXG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVwZGF0ZWRfbWV0YWRhdGEgPT0gbnVsbFxuICAgICAgfVxuXG4gICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci53aW5kb3dNYW5hZ2VyLmNsb3NlKClcbiAgICB9XG4gIH0sIG1ldGFkYXRhLmdldEFsbE1ldGFkYXRhKCkpXG59XG5cbnRpbnltY2UuUGx1Z2luTWFuYWdlci5hZGQoJ3JhamVfbWV0YWRhdGEnLCBmdW5jdGlvbiAoZWRpdG9yLCB1cmwpIHtcblxuICAvLyBBZGQgYSBidXR0b24gdGhhdCBoYW5kbGUgdGhlIGlubGluZSBlbGVtZW50XG4gIGVkaXRvci5hZGRCdXR0b24oJ3JhamVfbWV0YWRhdGEnLCB7XG4gICAgdGV4dDogJ01ldGFkYXRhJyxcbiAgICBpY29uOiBmYWxzZSxcbiAgICB0b29sdGlwOiAnRWRpdCBtZXRhZGF0YScsXG5cbiAgICAvLyBCdXR0b24gYmVoYXZpb3VyXG4gICAgb25jbGljazogZnVuY3Rpb24gKCkge1xuICAgICAgb3Blbk1ldGFkYXRhRGlhbG9nKClcbiAgICB9XG4gIH0pXG5cbiAgZWRpdG9yLm9uKCdjbGljaycsIGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKS5pcyhIRUFERVJfU0VMRUNUT1IpKVxuICAgICAgb3Blbk1ldGFkYXRhRGlhbG9nKClcbiAgfSlcblxuICBtZXRhZGF0YSA9IHtcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIGdldEFsbE1ldGFkYXRhOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgIC8vIEdldCBoZWFkZXIgZnJvbSBpZnJhbWUgb25seSB0aGUgZmlyc3Qgb25lXG4gICAgICBsZXQgaGVhZGVyID0gdGlueW1jZS5hY3RpdmVFZGl0b3IuJChIRUFERVJfU0VMRUNUT1IpLmZpcnN0KClcblxuICAgICAgLy8gR2V0IGFsbCBtZXRhZGF0YVxuICAgICAgbGV0IHN1YnRpdGxlID0gaGVhZGVyLmZpbmQoJ2gxLnRpdGxlID4gc21hbGwnKS50ZXh0KClcbiAgICAgIGxldCBkYXRhID0ge1xuICAgICAgICBzdWJ0aXRsZTogc3VidGl0bGUsXG4gICAgICAgIHRpdGxlOiBoZWFkZXIuZmluZCgnaDEudGl0bGUnKS50ZXh0KCkucmVwbGFjZShzdWJ0aXRsZSwgJycpLFxuICAgICAgICBhdXRob3JzOiBtZXRhZGF0YS5nZXRBdXRob3JzKGhlYWRlciksXG4gICAgICAgIGNhdGVnb3JpZXM6IG1ldGFkYXRhLmdldENhdGVnb3JpZXMoaGVhZGVyKSxcbiAgICAgICAga2V5d29yZHM6IG1ldGFkYXRhLmdldEtleXdvcmRzKGhlYWRlcilcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGRhdGFcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgZ2V0QXV0aG9yczogZnVuY3Rpb24gKGhlYWRlcikge1xuICAgICAgbGV0IGF1dGhvcnMgPSBbXVxuXG4gICAgICBoZWFkZXIuZmluZCgnYWRkcmVzcy5sZWFkLmF1dGhvcnMnKS5lYWNoKGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAvLyBHZXQgYWxsIGFmZmlsaWF0aW9uc1xuICAgICAgICBsZXQgYWZmaWxpYXRpb25zID0gW11cbiAgICAgICAgJCh0aGlzKS5maW5kKCdzcGFuJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgYWZmaWxpYXRpb25zLnB1c2goJCh0aGlzKS50ZXh0KCkpXG4gICAgICAgIH0pXG5cbiAgICAgICAgLy8gcHVzaCBzaW5nbGUgYXV0aG9yXG4gICAgICAgIGF1dGhvcnMucHVzaCh7XG4gICAgICAgICAgbmFtZTogJCh0aGlzKS5jaGlsZHJlbignc3Ryb25nLmF1dGhvcl9uYW1lJykudGV4dCgpLFxuICAgICAgICAgIGVtYWlsOiAkKHRoaXMpLmZpbmQoJ2NvZGUuZW1haWwgPiBhJykudGV4dCgpLFxuICAgICAgICAgIGFmZmlsaWF0aW9uczogYWZmaWxpYXRpb25zXG4gICAgICAgIH0pXG4gICAgICB9KVxuXG4gICAgICByZXR1cm4gYXV0aG9yc1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBnZXRDYXRlZ29yaWVzOiBmdW5jdGlvbiAoaGVhZGVyKSB7XG4gICAgICBsZXQgY2F0ZWdvcmllcyA9IFtdXG5cbiAgICAgIGhlYWRlci5maW5kKCdwLmFjbV9zdWJqZWN0X2NhdGVnb3JpZXMgPiBjb2RlJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNhdGVnb3JpZXMucHVzaCgkKHRoaXMpLnRleHQoKSlcbiAgICAgIH0pXG5cbiAgICAgIHJldHVybiBjYXRlZ29yaWVzXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIGdldEtleXdvcmRzOiBmdW5jdGlvbiAoaGVhZGVyKSB7XG4gICAgICBsZXQga2V5d29yZHMgPSBbXVxuXG4gICAgICBoZWFkZXIuZmluZCgndWwubGlzdC1pbmxpbmUgPiBsaSA+IGNvZGUnKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAga2V5d29yZHMucHVzaCgkKHRoaXMpLnRleHQoKSlcbiAgICAgIH0pXG5cbiAgICAgIHJldHVybiBrZXl3b3Jkc1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICB1cGRhdGU6IGZ1bmN0aW9uICh1cGRhdGVkTWV0YWRhdGEpIHtcblxuICAgICAgLy8gUmVtb3ZlIGFsbCBtZXRhIGFuZCBsaW5rcyBjb3JyZXNwb25kaW5nIHRvIG1ldGFkYXRhIGluIGhlYWRcbiAgICAgICQoJ2hlYWQgbWV0YVtwcm9wZXJ0eV0sIGhlYWQgbGlua1twcm9wZXJ0eV0sIGhlYWQgbWV0YVtuYW1lXScpLnJlbW92ZSgpXG5cbiAgICAgIC8vIEdldCBhbGwgY3VycmVudCBtZXRhZGF0YVxuICAgICAgbGV0IGN1cnJlbnRNZXRhZGF0YSA9IG1ldGFkYXRhLmdldEFsbE1ldGFkYXRhKClcblxuICAgICAgLy8gVXBkYXRlIHRpdGxlIGFuZCBzdWJ0aXRsZVxuICAgICAgaWYgKHVwZGF0ZWRNZXRhZGF0YS50aXRsZSAhPSBjdXJyZW50TWV0YWRhdGEudGl0bGUgfHwgdXBkYXRlZE1ldGFkYXRhLnN1YnRpdGxlICE9IGN1cnJlbnRNZXRhZGF0YS5zdWJ0aXRsZSkge1xuICAgICAgICBsZXQgdGV4dCA9IHVwZGF0ZWRNZXRhZGF0YS50aXRsZVxuXG4gICAgICAgIGlmICh1cGRhdGVkTWV0YWRhdGEuc3VidGl0bGUudHJpbSgpLmxlbmd0aClcbiAgICAgICAgICB0ZXh0ICs9IGAgLS0gJHt1cGRhdGVkTWV0YWRhdGEuc3VidGl0bGV9YFxuXG4gICAgICAgICQoJ3RpdGxlJykudGV4dCh0ZXh0KVxuICAgICAgfVxuXG4gICAgICBsZXQgYWZmaWxpYXRpb25zQ2FjaGUgPSBbXVxuXG4gICAgICB1cGRhdGVkTWV0YWRhdGEuYXV0aG9ycy5mb3JFYWNoKGZ1bmN0aW9uIChhdXRob3IpIHtcblxuICAgICAgICAkKCdoZWFkJykuYXBwZW5kKGA8bWV0YSBhYm91dD1cIm1haWx0bzoke2F1dGhvci5lbWFpbH1cIiB0eXBlb2Y9XCJzY2hlbWE6UGVyc29uXCIgcHJvcGVydHk9XCJzY2hlbWE6bmFtZVwiIG5hbWU9XCJkYy5jcmVhdG9yXCIgY29udGVudD1cIiR7YXV0aG9yLm5hbWV9XCI+YClcbiAgICAgICAgJCgnaGVhZCcpLmFwcGVuZChgPG1ldGEgYWJvdXQ9XCJtYWlsdG86JHthdXRob3IuZW1haWx9XCIgcHJvcGVydHk9XCJzY2hlbWE6ZW1haWxcIiBjb250ZW50PVwiJHthdXRob3IuZW1haWx9XCI+YClcblxuICAgICAgICBhdXRob3IuYWZmaWxpYXRpb25zLmZvckVhY2goZnVuY3Rpb24gKGFmZmlsaWF0aW9uKSB7XG5cbiAgICAgICAgICAvLyBMb29rIHVwIGZvciBhbHJlYWR5IGV4aXN0aW5nIGFmZmlsaWF0aW9uXG4gICAgICAgICAgbGV0IHRvQWRkID0gdHJ1ZVxuICAgICAgICAgIGxldCBpZFxuXG4gICAgICAgICAgYWZmaWxpYXRpb25zQ2FjaGUuZm9yRWFjaChmdW5jdGlvbiAoYWZmaWxpYXRpb25DYWNoZSkge1xuICAgICAgICAgICAgaWYgKGFmZmlsaWF0aW9uQ2FjaGUuY29udGVudCA9PSBhZmZpbGlhdGlvbikge1xuICAgICAgICAgICAgICB0b0FkZCA9IGZhbHNlXG4gICAgICAgICAgICAgIGlkID0gYWZmaWxpYXRpb25DYWNoZS5pZFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pXG5cbiAgICAgICAgICAvLyBJZiB0aGVyZSBpcyBubyBleGlzdGluZyBhZmZpbGlhdGlvbiwgYWRkIGl0XG4gICAgICAgICAgaWYgKHRvQWRkKSB7XG4gICAgICAgICAgICBsZXQgZ2VuZXJhdGVkSWQgPSBgI2FmZmlsaWF0aW9uXyR7YWZmaWxpYXRpb25zQ2FjaGUubGVuZ3RoKzF9YFxuICAgICAgICAgICAgYWZmaWxpYXRpb25zQ2FjaGUucHVzaCh7XG4gICAgICAgICAgICAgIGlkOiBnZW5lcmF0ZWRJZCxcbiAgICAgICAgICAgICAgY29udGVudDogYWZmaWxpYXRpb25cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICBpZCA9IGdlbmVyYXRlZElkXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgJCgnaGVhZCcpLmFwcGVuZChgPGxpbmsgYWJvdXQ9XCJtYWlsdG86JHthdXRob3IuZW1haWx9XCIgcHJvcGVydHk9XCJzY2hlbWE6YWZmaWxpYXRpb25cIiBocmVmPVwiJHtpZH1cIj5gKVxuICAgICAgICB9KVxuICAgICAgfSlcblxuICAgICAgYWZmaWxpYXRpb25zQ2FjaGUuZm9yRWFjaChmdW5jdGlvbiAoYWZmaWxpYXRpb25DYWNoZSkge1xuICAgICAgICAkKCdoZWFkJykuYXBwZW5kKGA8bWV0YSBhYm91dD1cIiR7YWZmaWxpYXRpb25DYWNoZS5pZH1cIiB0eXBlb2Y9XCJzY2hlbWE6T3JnYW5pemF0aW9uXCIgcHJvcGVydHk9XCJzY2hlbWE6bmFtZVwiIGNvbnRlbnQ9XCIke2FmZmlsaWF0aW9uQ2FjaGUuY29udGVudH1cIj5gKVxuICAgICAgfSlcblxuICAgICAgdXBkYXRlZE1ldGFkYXRhLmNhdGVnb3JpZXMuZm9yRWFjaChmdW5jdGlvbihjYXRlZ29yeSl7XG4gICAgICAgICQoJ2hlYWQnKS5hcHBlbmQoYDxtZXRhIG5hbWU9XCJkY3Rlcm1zLnN1YmplY3RcIiBjb250ZW50PVwiJHtjYXRlZ29yeX1cIi8+YClcbiAgICAgIH0pXG5cbiAgICAgIHVwZGF0ZWRNZXRhZGF0YS5rZXl3b3Jkcy5mb3JFYWNoKGZ1bmN0aW9uKGtleXdvcmQpe1xuICAgICAgICAkKCdoZWFkJykuYXBwZW5kKGA8bWV0YSBwcm9wZXJ0eT1cInByaXNtOmtleXdvcmRcIiBjb250ZW50PVwiJHtrZXl3b3JkfVwiLz5gKVxuICAgICAgfSlcblxuICAgICAgbWV0YWRhdGEuYWRkSGVhZGVySFRNTCgpXG4gICAgICBzZXROb25FZGl0YWJsZUhlYWRlcigpXG5cbiAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBhZGRIZWFkZXJIVE1MOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgIC8qIFJlc2V0IGhlYWRlciAqL1xuICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IuJCgnaGVhZGVyJykucmVtb3ZlKClcbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLiQoJ3Aua2V5d29yZHMnKS5yZW1vdmUoKVxuICBcbiAgICAgIC8qIEhlYWRlciB0aXRsZSAqL1xuICAgICAgdmFyIGhlYWRlciA9IHRpbnltY2UuYWN0aXZlRWRpdG9yLiQoJzxoZWFkZXIgY2xhc3M9XCJwYWdlLWhlYWRlciBjb250YWluZXIgY2dlblwiIGRhdGEtcmFzaC1vcmlnaW5hbC1jb250ZW50PVwiXCI+PC9oZWFkZXI+JylcbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLiQoU0lERUJBUl9BTk5PVEFUSU9OKS5hZnRlcihoZWFkZXIpXG5cbiAgICAgIHZhciB0aXRsZV9zdHJpbmcgPSAnJ1xuICAgICAgdmFyIHRpdGxlX3NwbGl0ID0gJCgnaGVhZCB0aXRsZScpLmh0bWwoKS5zcGxpdChcIiAtLSBcIilcbiAgICAgIGlmICh0aXRsZV9zcGxpdC5sZW5ndGggPT0gMSkge1xuICAgICAgICB0aXRsZV9zdHJpbmcgPSB0aXRsZV9zcGxpdFswXVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGl0bGVfc3RyaW5nID0gYCR7dGl0bGVfc3BsaXRbMF19PGJyIC8+PHNtYWxsPiR7dGl0bGVfc3BsaXRbMV19PC9zbWFsbD5gXG4gICAgICB9XG4gIFxuICAgICAgaGVhZGVyLmFwcGVuZChgPGgxIGNsYXNzPVwidGl0bGVcIj4ke3RpdGxlX3N0cmluZ308L2gxPmApXG4gICAgICAvKiAvRU5EIEhlYWRlciB0aXRsZSAqL1xuICBcbiAgICAgIC8qIEhlYWRlciBhdXRob3IgKi9cbiAgICAgIHZhciBsaXN0X29mX2F1dGhvcnMgPSBbXVxuICAgICAgJCgnaGVhZCBtZXRhW25hbWU9XCJkYy5jcmVhdG9yXCJdJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBjdXJyZW50X3ZhbHVlID0gJCh0aGlzKS5hdHRyKCduYW1lJylcbiAgICAgICAgdmFyIGN1cnJlbnRfaWQgPSAkKHRoaXMpLmF0dHIoJ2Fib3V0JylcbiAgICAgICAgdmFyIGN1cnJlbnRfbmFtZSA9ICQodGhpcykuYXR0cignY29udGVudCcpXG4gICAgICAgIHZhciBjdXJyZW50X2VtYWlsID0gJChgaGVhZCBtZXRhW2Fib3V0PScke2N1cnJlbnRfaWR9J11bcHJvcGVydHk9J3NjaGVtYTplbWFpbCddYCkuYXR0cignY29udGVudCcpXG4gICAgICAgIHZhciBjdXJyZW50X2FmZmlsaWF0aW9ucyA9IFtdXG4gICAgICAgICQoYGhlYWQgbGlua1thYm91dD0nJHtjdXJyZW50X2lkfSddW3Byb3BlcnR5PSdzY2hlbWE6YWZmaWxpYXRpb24nXWApLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHZhciBjdXJfYWZmaWxpYXRpb25faWQgPSAkKHRoaXMpLmF0dHIoJ2hyZWYnKVxuICAgICAgICAgIGN1cnJlbnRfYWZmaWxpYXRpb25zLnB1c2goJChgaGVhZCBtZXRhW2Fib3V0PScke2N1cl9hZmZpbGlhdGlvbl9pZH0nXVtwcm9wZXJ0eT0nc2NoZW1hOm5hbWUnXWApLmF0dHIoJ2NvbnRlbnQnKSlcbiAgICAgICAgfSlcbiAgXG4gICAgICAgIGxpc3Rfb2ZfYXV0aG9ycy5wdXNoKHtcbiAgICAgICAgICBcIm5hbWVcIjogY3VycmVudF9uYW1lLFxuICAgICAgICAgIFwiZW1haWxcIjogY3VycmVudF9lbWFpbCxcbiAgICAgICAgICBcImFmZmlsaWF0aW9uXCI6IGN1cnJlbnRfYWZmaWxpYXRpb25zXG4gICAgICAgIH0pXG4gICAgICB9KVxuICBcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGlzdF9vZl9hdXRob3JzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBhdXRob3IgPSBsaXN0X29mX2F1dGhvcnNbaV1cbiAgICAgICAgdmFyIGF1dGhvcl9lbGVtZW50ID0gJChgPGFkZHJlc3MgY2xhc3M9XCJsZWFkIGF1dGhvcnNcIj48L2FkZHJlc3M+YClcbiAgICAgICAgaWYgKGF1dGhvclsnbmFtZSddICE9IG51bGwpIHtcbiAgICAgICAgICB2YXIgbmFtZV9lbGVtZW50X3N0cmluZyA9IGA8c3Ryb25nIGNsYXNzPVwiYXV0aG9yX25hbWVcIj4ke2F1dGhvci5uYW1lfTwvc3Ryb25nPiBgXG4gICAgICAgICAgaWYgKGF1dGhvclsnZW1haWwnXSAhPSBudWxsKSB7XG4gICAgICAgICAgICBuYW1lX2VsZW1lbnRfc3RyaW5nICs9IGA8Y29kZSBjbGFzcz1cImVtYWlsXCI+PGEgaHJlZj1cIm1haWx0bzoke2F1dGhvci5lbWFpbH1cIj4ke2F1dGhvci5lbWFpbH08L2E+PC9jb2RlPmBcbiAgICAgICAgICB9XG4gICAgICAgICAgYXV0aG9yX2VsZW1lbnQuYXBwZW5kKG5hbWVfZWxlbWVudF9zdHJpbmcpXG4gICAgICAgIH1cbiAgXG4gICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgYXV0aG9yLmFmZmlsaWF0aW9uLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgYXV0aG9yX2VsZW1lbnQuYXBwZW5kKGA8YnIgLz48c3BhbiBjbGFzcz1cImFmZmlsaWF0aW9uXFxcIj4ke2F1dGhvci5hZmZpbGlhdGlvbltqXS5yZXBsYWNlKC9cXHMrL2csIFwiIFwiKS5yZXBsYWNlKC8sID8vZywgXCIsIFwiKS50cmltKCl9PC9zcGFuPmApXG4gICAgICAgIH1cbiAgICAgICAgaWYgKGkgPT0gMCkge1xuICAgICAgICAgIGF1dGhvcl9lbGVtZW50Lmluc2VydEFmdGVyKHRpbnltY2UuYWN0aXZlRWRpdG9yLiQoXCJoZWFkZXIgaDFcIikpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYXV0aG9yX2VsZW1lbnQuaW5zZXJ0QWZ0ZXIodGlueW1jZS5hY3RpdmVFZGl0b3IuJChcImhlYWRlciBhZGRyZXNzOmxhc3Qtb2YtdHlwZVwiKSlcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLyogL0VORCBIZWFkZXIgYXV0aG9yICovXG4gIFxuICAgICAgLyogQUNNIHN1YmplY3RzICovXG4gICAgICB2YXIgY2F0ZWdvcmllcyA9ICQoXCJtZXRhW25hbWU9J2RjdGVybXMuc3ViamVjdCddXCIpXG4gICAgICBpZiAoY2F0ZWdvcmllcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIHZhciBsaXN0X29mX2NhdGVnb3JpZXMgPSAkKGA8cCBjbGFzcz1cImFjbV9zdWJqZWN0X2NhdGVnb3JpZXNcIj48c3Ryb25nPkFDTSBTdWJqZWN0IENhdGVnb3JpZXM8L3N0cm9uZz48L3A+YClcbiAgICAgICAgY2F0ZWdvcmllcy5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBsaXN0X29mX2NhdGVnb3JpZXMuYXBwZW5kKGA8YnIgLz48Y29kZT4keyQodGhpcykuYXR0cihcImNvbnRlbnRcIikuc3BsaXQoXCIsXCIpLmpvaW4oXCIsIFwiKX08L2NvZGU+YClcbiAgICAgICAgfSlcbiAgICAgICAgbGlzdF9vZl9jYXRlZ29yaWVzLmFwcGVuZFRvKGhlYWRlcilcbiAgICAgIH1cbiAgICAgIC8qIC9FTkQgQUNNIHN1YmplY3RzICovXG4gIFxuICAgICAgLyogS2V5d29yZHMgKi9cbiAgICAgIHZhciBrZXl3b3JkcyA9ICQoJ21ldGFbcHJvcGVydHk9XCJwcmlzbTprZXl3b3JkXCJdJylcbiAgICAgIGlmIChrZXl3b3Jkcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIHZhciBsaXN0X29mX2tleXdvcmRzID0gJCgnPHVsIGNsYXNzPVwibGlzdC1pbmxpbmVcIj48L3VsPicpXG4gICAgICAgIGtleXdvcmRzLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGxpc3Rfb2Zfa2V5d29yZHMuYXBwZW5kKGA8bGk+PGNvZGU+JHskKHRoaXMpLmF0dHIoXCJjb250ZW50XCIpfTwvY29kZT48L2xpPmApXG4gICAgICAgIH0pXG4gICAgICAgICQoJzxwIGNsYXNzPVwia2V5d29yZHNcIj48c3Ryb25nPktleXdvcmRzPC9zdHJvbmc+PC9wPicpLmFwcGVuZChsaXN0X29mX2tleXdvcmRzKS5hcHBlbmRUbyhoZWFkZXIpXG4gICAgICB9XG4gICAgICAvKiAvRU5EIEtleXdvcmRzICovXG4gICAgfVxuICB9XG5cbn0pIiwidGlueW1jZS5QbHVnaW5NYW5hZ2VyLmFkZCgncmFqZV9zYXZlJywgZnVuY3Rpb24gKGVkaXRvciwgdXJsKSB7XG5cbiAgc2F2ZU1hbmFnZXIgPSB7XG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBpbml0U2F2ZTogZnVuY3Rpb24gKCkge1xuICAgICAgLy8gUmV0dXJuIHRoZSBtZXNzYWdlIGZvciB0aGUgYmFja2VuZFxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdGl0bGU6IHNhdmVNYW5hZ2VyLmdldFRpdGxlKCksXG4gICAgICAgIGRvY3VtZW50OiBzYXZlTWFuYWdlci5nZXREZXJhc2hlZEFydGljbGUoKVxuICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBzYXZlQXM6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgLy8gU2VuZCBtZXNzYWdlIHRvIHRoZSBiYWNrZW5kXG4gICAgICBzYXZlQXNBcnRpY2xlKHNhdmVNYW5hZ2VyLmluaXRTYXZlKCkpXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIHNhdmU6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgLy8gU2VuZCBtZXNzYWdlIHRvIHRoZSBiYWNrZW5kXG4gICAgICBzYXZlQXJ0aWNsZShzYXZlTWFuYWdlci5pbml0U2F2ZSgpKVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm4gdGhlIFJBU0ggYXJ0aWNsZSByZW5kZXJlZCAod2l0aG91dCB0aW55bWNlKVxuICAgICAqL1xuICAgIGdldERlcmFzaGVkQXJ0aWNsZTogZnVuY3Rpb24gKCkge1xuXG4gICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcblxuICAgICAgLy8gU2F2ZSBodG1sIHJlZmVyZW5jZXNcbiAgICAgIGxldCBhcnRpY2xlID0gJCgnaHRtbCcpLmNsb25lKClcbiAgICAgIGxldCB0aW55bWNlU2F2ZWRDb250ZW50ID0gYXJ0aWNsZS5maW5kKCcjcmFqZV9yb290JylcblxuICAgICAgYXJ0aWNsZS5yZW1vdmVBdHRyKCdjbGFzcycpXG5cbiAgICAgIC8vcmVwbGFjZSBib2R5IHdpdGggdGhlIHJpZ2h0IG9uZSAodGhpcyBhY3Rpb24gcmVtb3ZlIHRpbnltY2UpXG4gICAgICBhcnRpY2xlLmZpbmQoJ2JvZHknKS5odG1sKHRpbnltY2VTYXZlZENvbnRlbnQuaHRtbCgpKVxuICAgICAgYXJ0aWNsZS5maW5kKCdib2R5JykucmVtb3ZlQXR0cignc3R5bGUnKVxuICAgICAgYXJ0aWNsZS5maW5kKCdib2R5JykucmVtb3ZlQXR0cignY2xhc3MnKVxuXG4gICAgICAvL3JlbW92ZSBhbGwgc3R5bGUgYW5kIGxpbmsgdW4tbmVlZGVkIGZyb20gdGhlIGhlYWRcbiAgICAgIGFydGljbGUuZmluZCgnaGVhZCcpLmNoaWxkcmVuKCdzdHlsZVt0eXBlPVwidGV4dC9jc3NcIl0nKS5yZW1vdmUoKVxuICAgICAgYXJ0aWNsZS5maW5kKCdoZWFkJykuY2hpbGRyZW4oJ2xpbmtbaWRdJykucmVtb3ZlKClcblxuICAgICAgLy8gSWYgdGhlIHBsdWdpbiByYWplX2Fubm90YXRpb25zIGlzIGFkZGVkIHRvIHRpbnltY2UgXG4gICAgICBpZiAodHlwZW9mIHRpbnltY2UuYWN0aXZlRWRpdG9yLnBsdWdpbnMucmFqZV9hbm5vdGF0aW9ucyAhPSB1bmRlZmluZWQpXG4gICAgICAgIGFydGljbGUgPSB1cGRhdGVBbm5vdGF0aW9uc09uU2F2ZShhcnRpY2xlKVxuXG4gICAgICAvLyBFeGVjdXRlIGRlcmFzaCAocmVwbGFjZSBhbGwgY2dlbiBlbGVtZW50cyB3aXRoIGl0cyBvcmlnaW5hbCBjb250ZW50KVxuICAgICAgYXJ0aWNsZS5maW5kKCcqW2RhdGEtcmFzaC1vcmlnaW5hbC1jb250ZW50XScpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICBsZXQgb3JpZ2luYWxDb250ZW50ID0gJCh0aGlzKS5hdHRyKCdkYXRhLXJhc2gtb3JpZ2luYWwtY29udGVudCcpXG4gICAgICAgICQodGhpcykucmVwbGFjZVdpdGgob3JpZ2luYWxDb250ZW50KVxuICAgICAgfSlcblxuICAgICAgYXJ0aWNsZS5maW5kKCcqW2RhdGEtcmFzaC1vcmlnaW5hbC1wYXJlbnQtY29udGVudF0nKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbGV0IG9yaWdpbmFsQ29udGVudCA9ICQodGhpcykuYXR0cignZGF0YS1yYXNoLW9yaWdpbmFsLXBhcmVudC1jb250ZW50JylcbiAgICAgICAgJCh0aGlzKS5wYXJlbnQoKS5yZXBsYWNlV2l0aChvcmlnaW5hbENvbnRlbnQpXG4gICAgICB9KVxuXG4gICAgICAvLyBFeGVjdXRlIGRlcmFzaCBjaGFuZ2luZyB0aGUgd3JhcHBlclxuICAgICAgYXJ0aWNsZS5maW5kKCcqW2RhdGEtcmFzaC1vcmlnaW5hbC13cmFwcGVyXScpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICBsZXQgY29udGVudCA9ICQodGhpcykuaHRtbCgpXG4gICAgICAgIGxldCB3cmFwcGVyID0gJCh0aGlzKS5hdHRyKCdkYXRhLXJhc2gtb3JpZ2luYWwtd3JhcHBlcicpXG4gICAgICAgICQodGhpcykucmVwbGFjZVdpdGgoYDwke3dyYXBwZXJ9PiR7Y29udGVudH08LyR7d3JhcHBlcn0+YClcbiAgICAgIH0pXG5cbiAgICAgIC8vIFJlbW92ZSB0YXJnZXQgZnJvbSBUaW55TUNFIGxpbmtcbiAgICAgIGFydGljbGUuZmluZCgnYVt0YXJnZXRdJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICQodGhpcykucmVtb3ZlQXR0cigndGFyZ2V0JylcbiAgICAgIH0pXG5cbiAgICAgIC8vIFJlbW92ZSBjb250ZW50ZWRpdGFibGUgZnJvbSBUaW55TUNFIGxpbmtcbiAgICAgIGFydGljbGUuZmluZCgnYVtjb250ZW50ZWRpdGFibGVdJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICQodGhpcykucmVtb3ZlQXR0cignY29udGVudGVkaXRhYmxlJylcbiAgICAgIH0pXG5cbiAgICAgIC8vIFJlbW92ZSBub3QgYWxsb3dlZCBzcGFuIGVsbWVudHMgaW5zaWRlIHRoZSBmb3JtdWxhLCBpbmxpbmVfZm9ybXVsYVxuICAgICAgYXJ0aWNsZS5maW5kKGAke0ZJR1VSRV9GT1JNVUxBX1NFTEVDVE9SfSwke0lOTElORV9GT1JNVUxBX1NFTEVDVE9SfWApLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICAkKHRoaXMpLmNoaWxkcmVuKCdwJykuaHRtbCgkKHRoaXMpLmZpbmQoJ3NwYW5bY29udGVudGVkaXRhYmxlXScpLmh0bWwoKSlcbiAgICAgIH0pXG5cbiAgICAgIGFydGljbGUuZmluZChgJHtGSUdVUkVfRk9STVVMQV9TRUxFQ1RPUn0sJHtJTkxJTkVfRk9STVVMQV9TRUxFQ1RPUn1gKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbGV0IHN2ZyA9ICQodGhpcykuZmluZCgnc3ZnW2RhdGEtbWF0aG1sXScpXG4gICAgICAgIGlmIChzdmcubGVuZ3RoKSB7XG5cbiAgICAgICAgICAkKHRoaXMpLmF0dHIoREFUQV9NQVRIX09SSUdJTkFMX0lOUFVULCBzdmcuYXR0cihEQVRBX01BVEhfT1JJR0lOQUxfSU5QVVQpKVxuICAgICAgICAgICQodGhpcykuY2hpbGRyZW4oJ3AnKS5odG1sKHN2Zy5hdHRyKCdkYXRhLW1hdGhtbCcpKVxuICAgICAgICB9XG4gICAgICB9KVxuXG4gICAgICAvLyBSZXBsYWNlIHRib2R5IHdpdGggaXRzIGNvbnRlbnQgI1xuICAgICAgYXJ0aWNsZS5maW5kKCd0Ym9keScpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICAkKHRoaXMpLnJlcGxhY2VXaXRoKCQodGhpcykuaHRtbCgpKVxuICAgICAgfSlcblxuICAgICAgcmV0dXJuIGA8IURPQ1RZUEUgaHRtbD4ke25ldyBYTUxTZXJpYWxpemVyKCkuc2VyaWFsaXplVG9TdHJpbmcoYXJ0aWNsZVswXSl9YFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm4gdGhlIHRpdGxlIFxuICAgICAqL1xuICAgIGdldFRpdGxlOiBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gJCgndGl0bGUnKS50ZXh0KClcbiAgICB9LFxuXG4gIH1cbn0pIiwiY29uc3Qgbm90X2Fubm90YWJsZV9lbGVtZW50cyA9IGAke05PTl9FRElUQUJMRV9IRUFERVJfU0VMRUNUT1J9LCR7U0lERUJBUl9BTk5PVEFUSU9OfSwke0lOTElORV9GT1JNVUxBX1NFTEVDVE9SfWBcbmNvbnN0IGFubm90YXRvclBvcHVwU2VsZWN0b3IgPSAnI2Fubm90YXRvclBvcHVwJ1xuY29uc3QgYW5ub3RhdG9yRm9ybVBvcHVwU2VsZWN0b3IgPSAnI2Fubm90YXRvckZvcm1Qb3B1cCdcbmNvbnN0IGNvbW1lbnRpbmcgPSAnY29tbWVudGluZydcblxudGlueW1jZS5QbHVnaW5NYW5hZ2VyLmFkZCgncmFqZV9hbm5vdGF0aW9ucycsIGZ1bmN0aW9uIChlZGl0b3IpIHtcblxuICBlZGl0b3Iub24oJ2NsaWNrJywgZSA9PiB7XG5cbiAgICBsZXQgY2xpY2tlZEVsZW1lbnQgPSAkKGUuc3JjRWxlbWVudClcblxuICAgIC8vIENsb3NlIGFubm90YXRvckZvcm1Qb3B1cCBpZiB0aGUgdXNlciBjbGljayBzb21ld2hlcmUgZWxzZVxuICAgIGlmICgkKGFubm90YXRvckZvcm1Qb3B1cFNlbGVjdG9yKS5pcygnOnZpc2libGUnKSAmJiAoIWNsaWNrZWRFbGVtZW50LmlzKGFubm90YXRvckZvcm1Qb3B1cFNlbGVjdG9yKSB8fCAhY2xpY2tlZEVsZW1lbnQucGFyZW50cyhhbm5vdGF0b3JGb3JtUG9wdXBTZWxlY3RvcikubGVuZ3RoKSlcbiAgICAgIGhpZGVBbm5vdGF0aW9uRm9ybVBvcHVwKClcbiAgfSlcblxuICBlZGl0b3Iub24oJ01vdXNlVXAnLCBlID0+IHtcblxuICAgIGhpZGVBbm5vdGF0aW9uUG9wdXAoKVxuXG4gICAgLy8gSWYgdGhlIHNlbGVjdGlvbiBpcyBub3QgY29sbGFwc2VkIGFuZCB0aGUgZWxlbWVudCBzZWxlY3RlZCBpcyBhbiBcImFubm90YWJsZSBlbGVtZW50XCJcbiAgICBpZiAoIXRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5pc0NvbGxhcHNlZCgpICYmICEkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpLmlzKG5vdF9hbm5vdGFibGVfZWxlbWVudHMpKVxuICAgICAgaGFuZGxlQW5ub3RhdGlvbihlKVxuICB9KVxuXG4gIGVkaXRvci5vbignaW5pdCcsICgpID0+IHtcblxuICAgIC8vIFRoaXMgaXMgbmVlZGVkIGJlY2F1c2UgdGlueW1jZSBjaGFuZ2VzIFwiYXBwbGljYXRpb25cIiBpbiBcIm1jZS1hcHBsaWNhdGlvblwiXG4gICAgZWRpdG9yLiQobWNlX3NlbWFudGljX2Fubm90YXRpb25fc2VsZWN0b3IpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgJCh0aGlzKS5hdHRyKCd0eXBlJywgJ2FwcGxpY2F0aW9uL2xkK2pzb24nKVxuICAgIH0pXG5cbiAgICBBbm5vdGF0aW9uQ29udGV4dC5yZW5kZXIoKVxuXG4gICAgZWRpdG9yLiQodG9nZ2xlX2Fubm90YXRpb25fc2VsZWN0b3IpLm9uKCdjbGljaycsIGZ1bmN0aW9uICgpIHtcbiAgICAgIEFubm90YXRpb25Db250ZXh0LnRvZ2dsZUFubm90YXRpb24oKVxuICAgIH0pXG5cbiAgICBlZGl0b3IuJCh0b2dnbGVfc2lkZWJhcl9zZWxlY3Rvcikub24oJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xuICAgICAgQW5ub3RhdGlvbkNvbnRleHQudG9nZ2xlQW5ub3RhdGlvblRvb2xiYXIoKVxuICAgIH0pXG4gIH0pXG5cbiAgZWRpdG9yLm9uKCdrZXlEb3duJywgZnVuY3Rpb24gKGUpIHtcblxuICAgIGxldCBmb2N1c0VsZW1lbnQgPSBlZGl0b3IuJChlZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcblxuICAgIC8vIFVwZGF0ZSBzaWRlYmFyIGhlaWdodFxuICAgIGlmIChlZGl0b3IuJChTSURFQkFSX0FOTk9UQVRJT04pWzBdLmNsaWVudEhlaWdodCA8IGVkaXRvci4kKCdodG1sJylbMF0ub2Zmc2V0SGVpZ2h0KVxuICAgICAgZWRpdG9yLiQoU0lERUJBUl9BTk5PVEFUSU9OKS5jc3MoJ2hlaWdodCcsIGVkaXRvci4kKCdodG1sJylbMF0ub2Zmc2V0SGVpZ2h0KVxuXG4gICAgLy8gSGlkZSBhbm5vdGF0aW9uIHBvcHVwXG4gICAgaGlkZUFubm90YXRpb25Qb3B1cCgpXG5cbiAgICAvKipcbiAgICAgKiBGaXJlcyBpZiBCQUNLU1BBQ0Ugb3IgQ0FOQyBhcmUgcHJlc3NlZFxuICAgICAqL1xuICAgIGlmIChlLmtleUNvZGUgPT0gOCB8fCBlLmtleUNvZGUgPT0gNDYpIHtcblxuICAgICAgaWYgKGVkaXRvci5zZWxlY3Rpb24uZ2V0Q29udGVudCgpLmluZGV4T2YoJ2RhdGEtcmFzaC1hbm5vdGF0aW9uLXR5cGUnKSAhPSAtMSkge1xuXG4gICAgICAgIC8vVE9ETyB1c2UgYSBmdW5jdGlvblxuICAgICAgICBlZGl0b3IuZXhlY0NvbW1hbmQoREVMRVRFX0NNRClcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG5cbiAgICAgICAgQU5OT1RBVElPTlMuZm9yRWFjaChhbm5vdGF0aW9uID0+IHtcblxuICAgICAgICAgIC8vIFJlbW92ZSB0aGUgc2NyaXB0IG9mIHRoZSBhbm5vdGF0aW9uXG4gICAgICAgICAgaWYgKGVkaXRvci4kKGFubm90YXRpb24ubm90ZV9zZWxlY3RvcikubGVuZ3RoID09IDApXG4gICAgICAgICAgICBlZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICBlZGl0b3IuJChgJHtzZW1hbnRpY19hbm5vdGF0aW9uX3NlbGVjdG9yfVtpZD0ke2Fubm90YXRpb24uaWR9XWApLnJlbW92ZSgpXG4gICAgICAgICAgICAgIGFubm90YXRpb24ucmVtb3ZlKClcbiAgICAgICAgICAgICAgQU5OT1RBVElPTlMuZGVsZXRlKGFubm90YXRpb24uaWQpXG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChmb2N1c0VsZW1lbnQuaXMoYW5ub3RhdGlvbl93cmFwcGVyX3NlbGVjdG9yKSkge1xuXG4gICAgICAvKipcbiAgICAgICAqIEZpcmVzIGlmIEJBQ0tTUEFDRSBvciBDQU5DIGFyZSBwcmVzc2VkXG4gICAgICAgKi9cbiAgICAgIGlmIChlLmtleUNvZGUgPT0gMTMpIHtcblxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgaW5saW5lLmV4aXQoKVxuICAgICAgfVxuXG4gICAgICAvL1RPRE8gY2hlY2sgd2hlbiB0aGUgZW50aXJlIHNlbGVjdGlvbiBpcyByZW1vdmVkXG4gICAgICAvKipcbiAgICAgICAqIEZpcmVzIGlmIEJBQ0tTUEFDRSBvciBDQU5DIGFyZSBwcmVzc2VkXG4gICAgICAgKi9cbiAgICAgIGlmIChlLmtleUNvZGUgPT0gOCB8fCBlLmtleUNvZGUgPT0gNDYpIHtcblxuICAgICAgICAvL1RPRE8gdXNlIGEgZnVuY3Rpb25cbiAgICAgICAgZWRpdG9yLmV4ZWNDb21tYW5kKERFTEVURV9DTUQpXG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKVxuXG4gICAgICAgIEFOTk9UQVRJT05TLmZvckVhY2goYW5ub3RhdGlvbiA9PiB7XG5cbiAgICAgICAgICAvLyBSZW1vdmUgdGhlIHNjcmlwdCBvZiB0aGUgYW5ub3RhdGlvblxuICAgICAgICAgIGlmIChlZGl0b3IuJChhbm5vdGF0aW9uLm5vdGVfc2VsZWN0b3IpLmxlbmd0aCA9PSAwKVxuICAgICAgICAgICAgZWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgZWRpdG9yLiQoYCR7c2VtYW50aWNfYW5ub3RhdGlvbl9zZWxlY3Rvcn1baWQ9JHthbm5vdGF0aW9uLmlkfV1gKS5yZW1vdmUoKVxuICAgICAgICAgICAgICBhbm5vdGF0aW9uLnJlbW92ZSgpXG4gICAgICAgICAgICAgIEFOTk9UQVRJT05TLmRlbGV0ZShhbm5vdGF0aW9uLmlkKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9XG4gIH0pXG5cbiAgZWRpdG9yLm9uKCdrZXlQcmVzcycsIGZ1bmN0aW9uICgpIHtcblxuICAgIGhpZGVBbm5vdGF0aW9uUG9wdXAoKVxuICB9KVxuXG4gIGVkaXRvci5vbignRXhlY0NvbW1hbmQnLCBmdW5jdGlvbiAoZSkge1xuXG4gICAgaWYgKGUuY29tbWFuZCA9PSBVTkRPX0NNRCB8fCBlLmNvbW1hbmQgPT0gUkVET19DTUQpIHtcblxuICAgICAgZWRpdG9yLiQodG9nZ2xlX2Fubm90YXRpb25fc2VsZWN0b3IpLm9uKCdjbGljaycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgQW5ub3RhdGlvbkNvbnRleHQudG9nZ2xlQW5ub3RhdGlvbigpXG4gICAgICB9KVxuXG4gICAgICBlZGl0b3IuJCh0b2dnbGVfc2lkZWJhcl9zZWxlY3Rvcikub24oJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBBbm5vdGF0aW9uQ29udGV4dC50b2dnbGVBbm5vdGF0aW9uVG9vbGJhcigpXG4gICAgICB9KVxuXG4gICAgICBBTk5PVEFUSU9OUy5mb3JFYWNoKGFubm90YXRpb24gPT4gYW5ub3RhdGlvbi5zZXRFdmVudHMoKSlcbiAgICB9XG4gIH0pXG59KVxuXG4vKipcbiAqIFxuICovXG5oYW5kbGVBbm5vdGF0aW9uID0gZSA9PiB7XG5cbiAgaWYgKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRDb250ZW50KCkuaW5kZXhPZignaW1nJykgPiAwIHx8IHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRDb250ZW50KCkuaW5kZXhPZignZmlndXJlJykgPiAwKVxuICAgIGdsb2JhbC5zZWxlY3Rpb25FcnJvciA9IEFOTk9UQVRJT05fRVJST1JfSU1BR0VfU0VMRUNURURcblxuICAvLyBTaG93IHRoZSBwb3B1cFxuICBzaG93QW5ub3RhdGlvblBvcHVwKGUuY2xpZW50WCwgZS5jbGllbnRZKVxufVxuXG4vKipcbiAqIFxuICovXG5jcmVhdGVBbm5vdGF0aW9uQ29tbWVudGluZyA9IHRleHQgPT4ge1xuXG4gIGNvbnN0IGNyZWF0b3IgPSBpcGNSZW5kZXJlci5zZW5kU3luYygnZ2V0U2V0dGluZ3MnKS51c2VybmFtZVxuXG4gIGNvbnN0IHNlbGVjdGlvbiA9IHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvblxuXG4gIGNvbnN0IHJhbmdlID0gc2VsZWN0aW9uLmdldFJuZygpXG5cbiAgY29uc3QgcmFuZ2VTdGFydE9mZnNldCA9IHJhbmdlLnN0YXJ0T2Zmc2V0XG4gIGNvbnN0IHJhbmdlRW5kT2Zmc2V0ID0gcmFuZ2UuZW5kT2Zmc2V0XG5cbiAgY29uc3QgbmV4dElkID0gQW5ub3RhdGlvbkNvbnRleHQuZ2V0TmV4dEFubm90YXRpb25JZCgpXG5cbiAgY29uc3Qgc3RhcnRDc3NTZWxlY3RvciA9IEFubm90YXRpb25Db250ZXh0LmdldENzc1NlbGVjdG9yKCQoc2VsZWN0aW9uLmdldFN0YXJ0KCkpKVxuICBjb25zdCBzdGFydE9mZnNldCA9IEFubm90YXRpb25Db250ZXh0LmdldE9mZnNldChyYW5nZS5zdGFydENvbnRhaW5lciwgcmFuZ2VTdGFydE9mZnNldCwgc3RhcnRDc3NTZWxlY3RvcilcblxuICBjb25zdCBlbmRDc3NTZWxlY3RvciA9IEFubm90YXRpb25Db250ZXh0LmdldENzc1NlbGVjdG9yKCQoc2VsZWN0aW9uLmdldEVuZCgpKSlcbiAgY29uc3QgZW5kT2Zmc2V0ID0gQW5ub3RhdGlvbkNvbnRleHQuZ2V0T2Zmc2V0KHJhbmdlLmVuZENvbnRhaW5lciwgcmFuZ2VFbmRPZmZzZXQsIGVuZENzc1NlbGVjdG9yKVxuXG4gIGNvbnN0IGRhdGEgPSB7XG4gICAgXCJpZFwiOiBuZXh0SWQsXG4gICAgXCJAY29udGVueHRcIjogXCJodHRwOi8vd3d3LnczLm9yZy9ucy9hbm5vLmpzb25sZFwiLFxuICAgIFwiY3JlYXRlZFwiOiBEYXRlLm5vdygpICsgKC0obmV3IERhdGUoKS5nZXRUaW1lem9uZU9mZnNldCgpICogNjAwMDApKSxcbiAgICBcImJvZHlWYWx1ZVwiOiB0ZXh0LFxuICAgIFwiY3JlYXRvclwiOiBjcmVhdG9yLFxuICAgIFwiTW90aXZhdGlvblwiOiBjb21tZW50aW5nLFxuICAgIFwidGFyZ2V0XCI6IHtcbiAgICAgIFwic2VsZWN0b3JcIjoge1xuICAgICAgICBcInN0YXJ0U2VsZWN0b3JcIjoge1xuICAgICAgICAgIFwiQHR5cGVcIjogXCJDc3NTZWxlY3RvclwiLFxuICAgICAgICAgIFwiQHZhbHVlXCI6IHN0YXJ0Q3NzU2VsZWN0b3JcbiAgICAgICAgfSxcbiAgICAgICAgXCJlbmRTZWxlY3RvclwiOiB7XG4gICAgICAgICAgXCJAdHlwZVwiOiBcIkNzc1NlbGVjdG9yXCIsXG4gICAgICAgICAgXCJAdmFsdWVcIjogZW5kQ3NzU2VsZWN0b3JcbiAgICAgICAgfSxcbiAgICAgICAgXCJzdGFydFwiOiB7XG4gICAgICAgICAgXCJAdHlwZVwiOiBcIkRhdGFQb3NpdGlvblNlbGVjdG9yXCIsXG4gICAgICAgICAgXCJAdmFsdWVcIjogc3RhcnRPZmZzZXRcbiAgICAgICAgfSxcbiAgICAgICAgXCJlbmRcIjoge1xuICAgICAgICAgIFwiQHR5cGVcIjogXCJEYXRhUG9zaXRpb25TZWxlY3RvclwiLFxuICAgICAgICAgIFwiQHZhbHVlXCI6IGVuZE9mZnNldFxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgdGlueW1jZS5hY3RpdmVFZGl0b3IuJCgnYm9keScpLmFwcGVuZChgPHNjcmlwdCBpZD1cIiR7bmV4dElkfVwiIHR5cGU9XCJhcHBsaWNhdGlvbi9sZCtqc29uXCI+JHtKU09OLnN0cmluZ2lmeShkYXRhLCBudWxsLCAyKSB9PC9zY3JpcHQ+YClcbiAgICBBbm5vdGF0aW9uQ29udGV4dC5jbGVhckFubm90YXRpb25zKClcbiAgICBBbm5vdGF0aW9uQ29udGV4dC5yZW5kZXIoKVxuICB9KVxufVxuXG4vKipcbiAqIFxuICovXG5jcmVhdGVBbm5vdGF0aW9uUmVwbHlpbmcgPSAodGV4dCwgdGFyZ2V0SWQpID0+IHtcblxuICBjb25zdCBjcmVhdG9yID0gaXBjUmVuZGVyZXIuc2VuZFN5bmMoJ2dldFNldHRpbmdzJykudXNlcm5hbWVcbiAgY29uc3QgbmV4dElkID0gQW5ub3RhdGlvbkNvbnRleHQuZ2V0TmV4dEFubm90YXRpb25JZCgpXG5cbiAgY29uc3QgZGF0YSA9IHtcbiAgICBcImlkXCI6IG5leHRJZCxcbiAgICBcIkBjb250ZW54dFwiOiBcImh0dHA6Ly93d3cudzMub3JnL25zL2Fubm8uanNvbmxkXCIsXG4gICAgXCJjcmVhdGVkXCI6IERhdGUubm93KCkgKyAoLShuZXcgRGF0ZSgpLmdldFRpbWV6b25lT2Zmc2V0KCkgKiA2MDAwMCkpLFxuICAgIFwiYm9keVZhbHVlXCI6IHRleHQsXG4gICAgXCJjcmVhdG9yXCI6IGNyZWF0b3IsXG4gICAgXCJNb3RpdmF0aW9uXCI6IHJlcGx5aW5nLFxuICAgIFwidGFyZ2V0XCI6IHRhcmdldElkXG4gIH1cblxuICAvLyBBZGQgdGhlIG5ldyBhbm5vdGF0aW9uIHdpdGhvdXQgY2xlYXJpbmcgZXZlcnl0aGluZ1xuICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci4kKCdib2R5JykuYXBwZW5kKGA8c2NyaXB0IGlkPVwiJHtuZXh0SWR9XCIgdHlwZT1cImFwcGxpY2F0aW9uL2xkK2pzb25cIj4ke0pTT04uc3RyaW5naWZ5KGRhdGEsIG51bGwsIDIpIH08L3NjcmlwdD5gKVxuICAgIEFubm90YXRpb25Db250ZXh0LnJlbmRlclNpbmdsZShuZXh0SWQsIGRhdGEpXG4gIH0pXG59XG5cbi8qKlxuICogXG4gKi9cbnNob3dBbm5vdGF0aW9uUG9wdXAgPSAoeCwgeSkgPT4ge1xuXG4gIGxldCBhbm5vdGF0b3JQb3B1cCA9ICQoYFxuICAgIDxkaXYgaWQ9J2Fubm90YXRvclBvcHVwJz5cbiAgICAgIDxkaXYgY2xhc3M9XCJhbm5vdGF0b3JQb3B1cF9hcnJvd1wiPjwvZGl2PlxuICAgICAgPHNwYW4gY2xhc3M9XCJnbHlwaGljb24gZ2x5cGhpY29uLXBlbmNpbFwiIGFyaWEtaGlkZGVuPVwidHJ1ZVwiPjwvc3Bhbj5cbiAgICA8L2Rpdj5gKVxuXG4gIGFubm90YXRvclBvcHVwLmNzcyh7XG4gICAgdG9wOiB5IC0gMjAsXG4gICAgbGVmdDogeCAtIDE4LjVcbiAgfSlcblxuICBhbm5vdGF0b3JQb3B1cC5vbignY2xpY2snLCBmdW5jdGlvbiAoKSB7XG4gICAgc2hvd0Fubm90YXRpb25Gb3JtUG9wdXAoKVxuICB9KVxuXG4gIGFubm90YXRvclBvcHVwLmFwcGVuZFRvKCdib2R5Jylcbn1cblxuLyoqXG4gKiBcbiAqL1xuc2hvd0Fubm90YXRpb25Gb3JtUG9wdXAgPSAoKSA9PiB7XG5cbiAgaWYgKGdsb2JhbC5zZWxlY3Rpb25FcnJvcikge1xuICAgIGdsb2JhbC5zZWxlY3Rpb25FcnJvciA9IG51bGxcbiAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uY29sbGFwc2UoKVxuICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLmZvY3VzKClcbiAgICBoaWRlQW5ub3RhdGlvblBvcHVwKClcbiAgICByZXR1cm4gbm90aWZ5KEFOTk9UQVRJT05fRVJST1JfSU1BR0VfU0VMRUNURUQsICdlcnJvcicsIDUwMDApXG4gIH1cblxuXG4gIGxldCBhbm5vdGF0b3JGb3JtUG9wdXAgPSAkKGBcbiAgICA8ZGl2IGlkPVwiYW5ub3RhdG9yRm9ybVBvcHVwXCI+XG4gICAgICA8dGV4dGFyZWEgY2xhc3M9XCJmb3JtLWNvbnRyb2xcIiByb3dzPVwiM1wiPjwvdGV4dGFyZWE+XG4gICAgICA8ZGl2IGNsYXNzPVwiYW5ub3RhdG9yRm9ybVBvcHVwX2Zvb3RlclwiPlxuICAgICAgICA8YSBpZD1cImFubm90YXRvckZvcm1Qb3B1cF9zYXZlXCIgY2xhc3M9XCJidG4gYnRuLXN1Y2Nlc3MgYnRuLXhzXCI+QW5ub3RhdGU8L2E+XG4gICAgICA8L2Rpdj5cbiAgICA8L2Rpdj5cbiAgYClcblxuICBhbm5vdGF0b3JGb3JtUG9wdXAuYXBwZW5kVG8oJ2JvZHknKVxuXG4gIGFubm90YXRvckZvcm1Qb3B1cC5jc3Moe1xuICAgIHRvcDogJChhbm5vdGF0b3JQb3B1cFNlbGVjdG9yKS5vZmZzZXQoKS50b3AgLSBhbm5vdGF0b3JGb3JtUG9wdXAuaGVpZ2h0KCkgLyAyIC0gMjAsXG4gICAgbGVmdDogJChhbm5vdGF0b3JQb3B1cFNlbGVjdG9yKS5vZmZzZXQoKS5sZWZ0XG4gIH0pXG5cbiAgJChgJHthbm5vdGF0b3JGb3JtUG9wdXBTZWxlY3Rvcn0gYS5idG4tc3VjY2Vzc2ApLm9uKCdjbGljaycsIGZ1bmN0aW9uICgpIHtcblxuICAgIGNyZWF0ZUFubm90YXRpb25Db21tZW50aW5nKCQoYCR7YW5ub3RhdG9yRm9ybVBvcHVwU2VsZWN0b3J9PnRleHRhcmVhYCkudmFsKCksIGNvbW1lbnRpbmcpXG4gICAgaGlkZUFubm90YXRpb25Gb3JtUG9wdXAoKVxuICB9KVxuXG4gIC8vIEhpZGUgdGhlIGxhc3QgYW5ub3RhdGlvbiBwb3B1cFxuICBoaWRlQW5ub3RhdGlvblBvcHVwKClcblxuICAkKGAke2Fubm90YXRvckZvcm1Qb3B1cFNlbGVjdG9yfT50ZXh0YXJlYWApLmZvY3VzKClcblxufVxuXG4vKipcbiAqIFxuICovXG5oaWRlQW5ub3RhdGlvbkZvcm1Qb3B1cCA9ICgpID0+IHtcbiAgJChhbm5vdGF0b3JGb3JtUG9wdXBTZWxlY3RvcikucmVtb3ZlKClcbn1cblxuLyoqXG4gKiBcbiAqL1xuaGlkZUFubm90YXRpb25Qb3B1cCA9ICgpID0+IHtcbiAgJChhbm5vdGF0b3JQb3B1cFNlbGVjdG9yKS5yZW1vdmUoKVxufVxuXG4vKipcbiAqIFxuICovXG51cGRhdGVBbm5vdGF0aW9uc09uU2F2ZSA9IGFydGljbGUgPT4ge1xuXG4gIC8qKlxuICAgKiBcbiAgICogQHBhcmFtIHtKUXVlcnkgb2JqZWN0fSBub2RlIFxuICAgKiBAcGFyYW0ge0ludGVnZXJ9IG9mZnNldCBvcHRpb25hbCwgaXQncyBuZWVkZWQgZm9yIHRoZSBlbmRpbmcgb2Zmc2V0XG4gICAqL1xuICBjb25zdCBnZXRPZmZzZXQgPSAobm9kZSwgb2Zmc2V0ID0gMCkgPT4ge1xuXG4gICAgbm9kZSA9IG5vZGVbMF0ucHJldmlvdXNTaWJsaW5nXG5cbiAgICB3aGlsZSAobm9kZSAhPSBudWxsKSB7XG5cbiAgICAgIGlmIChub2RlLm5vZGVUeXBlID09IDMpXG4gICAgICAgIG9mZnNldCArPSBub2RlLmxlbmd0aFxuICAgICAgZWxzZVxuICAgICAgICBvZmZzZXQgKz0gbm9kZS5pbm5lclRleHQubGVuZ3RoXG5cbiAgICAgIG5vZGUgPSBub2RlLnByZXZpb3VzU2libGluZ1xuICAgIH1cblxuICAgIHJldHVybiBvZmZzZXRcbiAgfVxuXG4gIC8vIEdldCBhbGwgYW5ub3RhdGlvbiBzY3JpcHRzXG4gIGFydGljbGUuZmluZCgnc2NyaXB0W3R5cGU9XCJhcHBsaWNhdGlvbi9sZCtqc29uXCJdJykuZWFjaChmdW5jdGlvbiAoKSB7XG5cbiAgICAvL1RPRE8gdXBkYXRlIGFsc28gdGhlIE1hcCgpXG4gICAgbGV0IGpzb24gPSBKU09OLnBhcnNlKCQodGhpcykuaHRtbCgpKVxuXG4gICAgaWYgKGpzb24uTW90aXZhdGlvbiA9PSBjb21tZW50aW5nKSB7XG5cbiAgICAgIC8vIEdldCBhbm5vdGF0aW9uXG4gICAgICBsZXQgYW5ub3RhdGlvbiA9IEFOTk9UQVRJT05TLmdldChqc29uLmlkKVxuXG4gICAgICAvLyBHZXQgdGhlIGxpc3Qgb2YgaGlnaGxpZ2h0ZWQgYW5ub3RhdGlvbnNcbiAgICAgIGNvbnN0IGZpcnN0ID0gdGlueW1jZS5hY3RpdmVFZGl0b3IuJChhbm5vdGF0aW9uLm5vdGVfc2VsZWN0b3IpLmZpcnN0KClcbiAgICAgIGNvbnN0IGxhc3QgPSB0aW55bWNlLmFjdGl2ZUVkaXRvci4kKGFubm90YXRpb24ubm90ZV9zZWxlY3RvcikubGFzdCgpXG5cbiAgICAgIC8vIFVwZGF0ZSBib3RoIHN0YXJ0IGFuZCBlbmQgb2Zmc2V0cywgdGhlIGVuZGluZyBvZmZzZXQgaGFzIGFsc28gdGhlIGN1cnJudCBsZW5ndGhcbiAgICAgIGpzb24udGFyZ2V0LnNlbGVjdG9yLnN0YXJ0WydAdmFsdWUnXSA9IGdldE9mZnNldChmaXJzdClcbiAgICAgIGpzb24udGFyZ2V0LnNlbGVjdG9yLmVuZFsnQHZhbHVlJ10gPSBnZXRPZmZzZXQobGFzdCwgbGFzdC50ZXh0KCkubGVuZ3RoKVxuXG4gICAgICAvLyBVcGRhdGUgYm90aCBzdGFydCBhbmQgZW5kIHNlbGVjdG9ycyB3aXRoIHRoZSByaWdodCB4cGF0aFxuICAgICAganNvbi50YXJnZXQuc2VsZWN0b3Iuc3RhcnRTZWxlY3RvclsnQHZhbHVlJ10gPSBBbm5vdGF0aW9uQ29udGV4dC5nZXRDc3NTZWxlY3RvcihmaXJzdClcbiAgICAgIGpzb24udGFyZ2V0LnNlbGVjdG9yLmVuZFNlbGVjdG9yWydAdmFsdWUnXSA9IEFubm90YXRpb25Db250ZXh0LmdldENzc1NlbGVjdG9yKGxhc3QpXG5cbiAgICAgICQodGhpcykuaHRtbChKU09OLnN0cmluZ2lmeShqc29uLCBudWxsLCAyKSlcbiAgICB9XG4gIH0pXG5cbiAgLy8gQ2hhbmdlIGRhdGEtcmFzaC1vcmlnaW5hbFstcGFyZW50XS1jb250ZW50XG4gIGNvbnN0IGNvbnRlbnQgPSAnZGF0YS1yYXNoLW9yaWdpbmFsLWNvbnRlbnQnXG4gIGNvbnN0IHBhcmVudCA9ICdkYXRhLXJhc2gtb3JpZ2luYWwtcGFyZW50LWNvbnRlbnQnXG4gIGxldCBhdHRyaWJ1dGVcblxuICBhcnRpY2xlLmZpbmQoYW5ub3RhdGlvbl93cmFwcGVyX3NlbGVjdG9yKS5lYWNoKGZ1bmN0aW9uICgpIHtcblxuICAgIGlmICgkKHRoaXMpLmF0dHIoY29udGVudCkpXG4gICAgICBhdHRyaWJ1dGUgPSBjb250ZW50XG5cbiAgICBpZiAoJCh0aGlzKS5hdHRyKHBhcmVudCkpXG4gICAgICBhdHRyaWJ1dGUgPSBwYXJlbnRcblxuICAgICQodGhpcykuYXR0cihhdHRyaWJ1dGUsICQodGhpcykuaHRtbCgpKVxuICB9KVxuXG4gIHJldHVybiBhcnRpY2xlXG59XG4iXX0=

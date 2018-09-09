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
const ANNOTATION_ERROR_IMAGE_SELECTED = 'Ehm, do you really want to annotate pictures? :('



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

    /**
     * Fires if BACKSPACE or CANC are pressed
     */
    if (e.keyCode == 8 || e.keyCode == 46) {

      hideAnnotationPopup()

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

    editor.$(toggle_annotation_selector).on('click', function () {
      AnnotationContext.toggleAnnotation()
    })

    editor.$(toggle_sidebar_selector).on('click', function () {
      AnnotationContext.toggleAnnotationToolbar()
    })

    ANNOTATIONS.forEach(annotation => annotation.setEvents())

    //if (e.command == UNDO_CMD || e.command == REDO_CMD) { }
  })
})

/**
 * 
 */
handleAnnotation = e => {

  if (tinymce.activeEditor.selection.getContent().indexOf('img') > 0)
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
    return notify(ANNOTATION_ERROR_IMAGE_SELECTED, 'error')
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluaXQuanMiLCIwX3JhamVfY29uc3RhbnRzLmpzIiwiMV9yYWplX3NlY3Rpb24uanMiLCIyX3JhamVfY3Jvc3NyZWYuanMiLCIzX3JhamVfZmlndXJlcy5qcyIsIjRfcmFqZV9pbmxpbmVzLmpzIiwiNV9yYWplX2xpc3RzLmpzIiwiNl9yYWplX21ldGFkYXRhLmpzIiwiN19yYWplX3NhdmUuanMiLCI4X3JhamVfYW5ub3RhdGlvbnMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMvcUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM5RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzU5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM3WEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzluQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3JPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNoWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDekxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDckhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJjb3JlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBcbiAqIEluaXRpbGl6ZSBUaW55TUNFIGVkaXRvciB3aXRoIGFsbCByZXF1aXJlZCBvcHRpb25zXG4gKi9cblxuLy8gSW52aXNpYmxlIHNwYWNlIGNvbnN0YW50c1xuY29uc3QgWkVST19TUEFDRSA9ICcmIzgyMDM7J1xuY29uc3QgUkFKRV9TRUxFQ1RPUiA9ICdib2R5I3RpbnltY2UnXG5cbi8vIFNlbGVjdG9yIGNvbnN0YW50cyAodG8gbW92ZSBpbnNpZGUgYSBuZXcgY29uc3QgZmlsZSlcbmNvbnN0IEhFQURFUl9TRUxFQ1RPUiA9ICdoZWFkZXIucGFnZS1oZWFkZXIuY29udGFpbmVyLmNnZW4nXG5jb25zdCBGSVJTVF9IRUFESU5HID0gYCR7UkFKRV9TRUxFQ1RPUn0+c2VjdGlvbjpmaXJzdD5oMTpmaXJzdGBcblxuY29uc3QgREFUQV9NQVRIX09SSUdJTkFMX0lOUFVUID0gJ2RhdGEtbWF0aC1vcmlnaW5hbC1pbnB1dCdcbmNvbnN0IFRJTllNQ0VfVE9PTEJBUl9IRUlHVEggPSA3NlxuXG5sZXQgaXBjUmVuZGVyZXIsIHdlYkZyYW1lXG5cbmlmIChoYXNCYWNrZW5kKSB7XG5cbiAgaXBjUmVuZGVyZXIgPSByZXF1aXJlKCdlbGVjdHJvbicpLmlwY1JlbmRlcmVyXG4gIHdlYkZyYW1lID0gcmVxdWlyZSgnZWxlY3Ryb24nKS53ZWJGcmFtZVxuXG4gIC8qKlxuICAgKiBJbml0aWxpc2UgVGlueU1DRSBcbiAgICovXG4gICQoZG9jdW1lbnQpLnJlYWR5KGZ1bmN0aW9uICgpIHtcblxuICAgIC8vIE92ZXJyaWRlIHRoZSBtYXJnaW4gYm90dG9uIGdpdmVuIGJ5IFJBU0ggZm9yIHRoZSBmb290ZXJcbiAgICAkKCdib2R5JykuY3NzKHtcbiAgICAgICdtYXJnaW4tYm90dG9tJzogMFxuICAgIH0pXG5cbiAgICAvL2hpZGUgZm9vdGVyXG4gICAgJCgnZm9vdGVyLmZvb3RlcicpLnJlbW92ZSgpXG5cbiAgICAvL2F0dGFjaCB3aG9sZSBib2R5IGluc2lkZSBhIHBsYWNlaG9sZGVyIGRpdlxuICAgICQoJ2JvZHknKS5odG1sKGA8ZGl2IGlkPVwicmFqZV9yb290XCI+JHskKCdib2R5JykuaHRtbCgpfTwvZGl2PmApXG5cbiAgICAvLyBcbiAgICBzZXROb25FZGl0YWJsZUhlYWRlcigpXG5cbiAgICAvL1xuICAgIG1hdGhtbDJzdmdBbGxGb3JtdWxhcygpXG5cbiAgICB0aW55bWNlLmluaXQoe1xuXG4gICAgICAvLyBTZWxlY3QgdGhlIGVsZW1lbnQgdG8gd3JhcFxuICAgICAgc2VsZWN0b3I6ICcjcmFqZV9yb290JyxcblxuICAgICAgLy8gU2V0IHdpbmRvdyBzaXplXG4gICAgICBoZWlnaHQ6IHdpbmRvdy5pbm5lckhlaWdodCAtIFRJTllNQ0VfVE9PTEJBUl9IRUlHVEgsXG5cbiAgICAgIC8vIFNldCB0aGUgc3R5bGVzIG9mIHRoZSBjb250ZW50IHdyYXBwZWQgaW5zaWRlIHRoZSBlbGVtZW50XG4gICAgICBjb250ZW50X2NzczogWydjc3MvYm9vdHN0cmFwLm1pbi5jc3MnLCAnY3NzL3Jhc2guY3NzJywgJ2Nzcy9yYWplLWNvcmUuY3NzJ10sXG5cbiAgICAgIC8vIFNldCBwbHVnaW5zIFt0YWJsZSBpbWFnZSBsaW5rIGNvZGVzYW1wbGVdXG4gICAgICBwbHVnaW5zOiBcInNlYXJjaHJlcGxhY2UgcmFqZV9pbmxpbmVGaWd1cmUgZnVsbHNjcmVlbiByYWplX2V4dGVybmFsTGluayByYWplX2lubGluZUNvZGUgcmFqZV9pbmxpbmVRdW90ZSByYWplX3NlY3Rpb24gIG5vbmVkaXRhYmxlIHJhamVfaW1hZ2UgcmFqZV9xdW90ZWJsb2NrIHJhamVfY29kZWJsb2NrIHJhamVfdGFibGUgcmFqZV9saXN0aW5nIHJhamVfaW5saW5lX2Zvcm11bGEgcmFqZV9mb3JtdWxhIHJhamVfY3Jvc3NyZWYgcmFqZV9mb290bm90ZXMgcmFqZV9tZXRhZGF0YSByYWplX2xpc3RzIHJhamVfc2F2ZSByYWplX2Fubm90YXRpb25zIHNwZWxsY2hlY2tlciBwYXN0ZSB0YWJsZSBsaW5rXCIsXG5cbiAgICAgIC8vIFJlbW92ZSBtZW51YmFyXG4gICAgICBtZW51YmFyOiBmYWxzZSxcblxuICAgICAgLy8gQ3VzdG9tIHRvb2xiYXJcbiAgICAgIHRvb2xiYXI6ICd1bmRvIHJlZG8gYm9sZCBpdGFsaWMgbGluayBzdXBlcnNjcmlwdCBzdWJzY3JpcHQgcmFqZV9pbmxpbmVDb2RlIHJhamVfaW5saW5lUXVvdGUgcmFqZV9pbmxpbmVfZm9ybXVsYSByYWplX2Nyb3NzcmVmIHJhamVfZm9vdG5vdGVzIHwgcmFqZV9vbCByYWplX3VsIHJhamVfY29kZWJsb2NrIHJhamVfcXVvdGVibG9jayByYWplX3RhYmxlIHJhamVfaW1hZ2UgcmFqZV9saXN0aW5nIHJhamVfZm9ybXVsYSB8IHNlYXJjaHJlcGxhY2Ugc3BlbGxjaGVja2VyIHwgcmFqZV9zZWN0aW9uIHJhamVfbWV0YWRhdGEgcmFqZV9zYXZlJyxcblxuICAgICAgc3BlbGxjaGVja2VyX2NhbGxiYWNrOiBmdW5jdGlvbiAobWV0aG9kLCB0ZXh0LCBzdWNjZXNzLCBmYWlsdXJlKSB7XG4gICAgICAgIHRpbnltY2UudXRpbC5KU09OUmVxdWVzdC5zZW5kUlBDKHtcbiAgICAgICAgICB1cmw6IFwic3BlbGxjaGVja2VyLnBocFwiLFxuICAgICAgICAgIG1ldGhvZDogXCJzcGVsbGNoZWNrXCIsXG4gICAgICAgICAgcGFyYW1zOiB7XG4gICAgICAgICAgICBsYW5nOiB0aGlzLmdldExhbmd1YWdlKCksXG4gICAgICAgICAgICB3b3JkczogdGV4dC5tYXRjaCh0aGlzLmdldFdvcmRDaGFyUGF0dGVybigpKVxuICAgICAgICAgIH0sXG4gICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgc3VjY2VzcyhyZXN1bHQpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgZXJyb3I6IGZ1bmN0aW9uIChlcnJvciwgeGhyKSB7XG4gICAgICAgICAgICBmYWlsdXJlKFwiU3BlbGxjaGVjayBlcnJvcjogXCIgKyBlcnJvcik7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0sXG5cbiAgICAgIHNwZWxsY2hlY2tlcl9sYW5ndWFnZXM6ICcnLFxuXG4gICAgICAvLyBTZXQgZGVmYXVsdCB0YXJnZXRcbiAgICAgIGRlZmF1bHRfbGlua190YXJnZXQ6IFwiX2JsYW5rXCIsXG5cbiAgICAgIC8vIFByZXBlbmQgcHJvdG9jb2wgaWYgdGhlIGxpbmsgc3RhcnRzIHdpdGggd3d3XG4gICAgICBsaW5rX2Fzc3VtZV9leHRlcm5hbF90YXJnZXRzOiB0cnVlLFxuXG4gICAgICAvLyBIaWRlIHRhcmdldCBsaXN0XG4gICAgICB0YXJnZXRfbGlzdDogZmFsc2UsXG5cbiAgICAgIC8vIEhpZGUgdGl0bGVcbiAgICAgIGxpbmtfdGl0bGU6IGZhbHNlLFxuXG4gICAgICAvLyBSZW1vdmUgXCJwb3dlcmVkIGJ5IHRpbnltY2VcIlxuICAgICAgYnJhbmRpbmc6IGZhbHNlLFxuXG4gICAgICAvLyBQcmV2ZW50IGF1dG8gYnIgb24gZWxlbWVudCBpbnNlcnRcbiAgICAgIGFwcGx5X3NvdXJjZV9mb3JtYXR0aW5nOiBmYWxzZSxcblxuICAgICAgLy8gUHJldmVudCBub24gZWRpdGFibGUgb2JqZWN0IHJlc2l6ZVxuICAgICAgb2JqZWN0X3Jlc2l6aW5nOiBmYWxzZSxcblxuICAgICAgLy8gVXBkYXRlIHRoZSB0YWJsZSBwb3BvdmVyIGxheW91dFxuICAgICAgdGFibGVfdG9vbGJhcjogXCJ0YWJsZWluc2VydHJvd2JlZm9yZSB0YWJsZWluc2VydHJvd2FmdGVyIHRhYmxlZGVsZXRlcm93IHwgdGFibGVpbnNlcnRjb2xiZWZvcmUgdGFibGVpbnNlcnRjb2xhZnRlciB0YWJsZWRlbGV0ZWNvbFwiLFxuXG4gICAgICBpbWFnZV9hZHZ0YWI6IHRydWUsXG5cbiAgICAgIHBhc3RlX2Jsb2NrX2Ryb3A6IHRydWUsXG5cbiAgICAgIGV4dGVuZGVkX3ZhbGlkX2VsZW1lbnRzOiBcInN2Z1sqXSxkZWZzWypdLHBhdHRlcm5bKl0sZGVzY1sqXSxtZXRhZGF0YVsqXSxnWypdLG1hc2tbKl0scGF0aFsqXSxsaW5lWypdLG1hcmtlclsqXSxyZWN0WypdLGNpcmNsZVsqXSxlbGxpcHNlWypdLHBvbHlnb25bKl0scG9seWxpbmVbKl0sbGluZWFyR3JhZGllbnRbKl0scmFkaWFsR3JhZGllbnRbKl0sc3RvcFsqXSxpbWFnZVsqXSx2aWV3WypdLHRleHRbKl0sdGV4dFBhdGhbKl0sdGl0bGVbKl0sdHNwYW5bKl0sZ2x5cGhbKl0sc3ltYm9sWypdLHN3aXRjaFsqXSx1c2VbKl1cIixcblxuICAgICAgZm9ybXVsYToge1xuICAgICAgICBwYXRoOiAnbm9kZV9tb2R1bGVzL3RpbnltY2UtZm9ybXVsYS8nXG4gICAgICB9LFxuXG4gICAgICBjbGVhbnVwX29uX3N0YXJ0dXA6IGZhbHNlLFxuICAgICAgdHJpbV9zcGFuX2VsZW1lbnRzOiBmYWxzZSxcbiAgICAgIHZlcmlmeV9odG1sOiBmYWxzZSxcbiAgICAgIGNsZWFudXA6IGZhbHNlLFxuICAgICAgY29udmVydF91cmxzOiBmYWxzZSxcblxuICAgICAgLy8gU2V0dXAgZnVsbCBzY3JlZW4gb24gaW5pdFxuICAgICAgc2V0dXA6IGZ1bmN0aW9uIChlZGl0b3IpIHtcblxuICAgICAgICBsZXQgcGFzdGVCb29rbWFya1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBcbiAgICAgICAgICovXG4gICAgICAgIGVkaXRvci5vbignaW5pdCcsIGZ1bmN0aW9uIChlKSB7XG5cbiAgICAgICAgICBlZGl0b3IuZXhlY0NvbW1hbmQoJ21jZUZ1bGxTY3JlZW4nKVxuXG4gICAgICAgICAgLy8gTW92ZSBjYXJldCBhdCB0aGUgZmlyc3QgaDEgZWxlbWVudCBvZiBtYWluIHNlY3Rpb25cbiAgICAgICAgICAvLyBPciByaWdodCBhZnRlciBoZWFkaW5nXG4gICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLnNldEN1cnNvckxvY2F0aW9uKHRpbnltY2UuYWN0aXZlRWRpdG9yLmRvbS5zZWxlY3QoRklSU1RfSEVBRElORylbMF0sIDApXG4gICAgICAgIH0pXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFxuICAgICAgICAgKi9cbiAgICAgICAgZWRpdG9yLm9uKCdrZXlEb3duJywgZnVuY3Rpb24gKGUpIHtcblxuICAgICAgICAgIC8vIFByZXZlbnQgc2hpZnQrZW50ZXJcbiAgICAgICAgICBpZiAoZS5rZXlDb2RlID09IDEzICYmIGUuc2hpZnRLZXkpXG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcblxuICAgICAgICAgIGlmIChlLmtleUNvZGUgPT0gODYgJiYgZS5tZXRhS2V5KSB7XG5cbiAgICAgICAgICAgIGlmICgkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpLmlzKCdwcmUnKSkge1xuXG4gICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpXG5cbiAgICAgICAgICAgICAgcGFzdGVCb29rbWFyayA9IHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRCb29rbWFyaygpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBcbiAgICAgICAgICovXG4gICAgICAgIGVkaXRvci5vbignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuXG4gICAgICAgICAgLy8gRG9uJ3QgY2FwdHVyZSB0aGUgY2xpY2sgb2YgdGhlIHNpZGViYXIgYW5ub3RhdGlvblxuICAgICAgICAgIGlmICghJChlLnNyY0VsZW1lbnQpLnBhcmVudHMoU0lERUJBUl9BTk5PVEFUSU9OKS5sZW5ndGgpXG5cbiAgICAgICAgICAgIC8vIENhcHR1cmUgdGhlIHRyaXBsZSBjbGljayBldmVudFxuICAgICAgICAgICAgaWYgKGUuZGV0YWlsID09IDMpIHtcblxuICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKVxuXG4gICAgICAgICAgICAgIGxldCB3cmFwcGVyID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Um5nKCkuc3RhcnRDb250YWluZXIpLnBhcmVudHMoJ3AsZmlnY2FwdGlvbiw6aGVhZGVyJykuZmlyc3QoKVxuICAgICAgICAgICAgICBsZXQgc3RhcnRDb250YWluZXIgPSB3cmFwcGVyWzBdXG4gICAgICAgICAgICAgIGxldCBlbmRDb250YWluZXIgPSB3cmFwcGVyWzBdXG4gICAgICAgICAgICAgIGxldCByYW5nZSA9IGRvY3VtZW50LmNyZWF0ZVJhbmdlKClcblxuICAgICAgICAgICAgICAvLyBDaGVjayBpZiB0aGUgd3JhcHBlciBoYXMgbW9yZSB0ZXh0IG5vZGUgaW5zaWRlXG4gICAgICAgICAgICAgIGlmICh3cmFwcGVyLmNvbnRlbnRzKCkubGVuZ3RoID4gMSkge1xuXG4gICAgICAgICAgICAgICAgLy8gSWYgdGhlIGZpcnN0IHRleHQgbm9kZSBpcyBhIG5vdCBlZGl0YWJsZSBzdHJvbmcsIHRoZSBzZWxlY3Rpb24gbXVzdCBzdGFydCB3aXRoIHRoZSBzZWNvbmQgZWxlbWVudFxuICAgICAgICAgICAgICAgIGlmICh3cmFwcGVyLmNvbnRlbnRzKCkuZmlyc3QoKS5pcygnc3Ryb25nW2NvbnRlbnRlZGl0YWJsZT1mYWxzZV0nKSlcbiAgICAgICAgICAgICAgICAgIHN0YXJ0Q29udGFpbmVyID0gd3JhcHBlci5jb250ZW50cygpWzFdXG5cbiAgICAgICAgICAgICAgICAvLyBJbiB0aGlzIGNhc2UgdGhlIGVuZENvbnRhaW5lciB3aWxsIGJlIHRoZSBsYXN0IHRleHQgbm9kZVxuICAgICAgICAgICAgICAgIGVuZENvbnRhaW5lciA9IHdyYXBwZXIuY29udGVudHMoKS5sYXN0KClbMF1cbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIHJhbmdlLnNldFN0YXJ0KHN0YXJ0Q29udGFpbmVyLCAwKVxuXG4gICAgICAgICAgICAgIGlmICh3cmFwcGVyLmlzKCdmaWdjYXB0aW9uJykpXG4gICAgICAgICAgICAgICAgcmFuZ2Uuc2V0RW5kKGVuZENvbnRhaW5lciwgZW5kQ29udGFpbmVyLmxlbmd0aClcblxuICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgcmFuZ2Uuc2V0RW5kKGVuZENvbnRhaW5lciwgMSlcblxuICAgICAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2V0Um5nKHJhbmdlKVxuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0pXG5cbiAgICAgICAgLy8gUHJldmVudCBzcGFuIFxuICAgICAgICBlZGl0b3Iub24oJ25vZGVDaGFuZ2UnLCBmdW5jdGlvbiAoZSkge1xuXG4gICAgICAgICAgbGV0IHNlbGVjdGVkRWxlbWVudCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcblxuICAgICAgICAgIC8vIE1vdmUgY2FyZXQgdG8gZmlyc3QgaGVhZGluZyBpZiBpcyBhZnRlciBvciBiZWZvcmUgbm90IGVkaXRhYmxlIGhlYWRlclxuICAgICAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQuaXMoJ3AnKSAmJiAoc2VsZWN0ZWRFbGVtZW50Lm5leHQoKS5pcyhIRUFERVJfU0VMRUNUT1IpIHx8IChzZWxlY3RlZEVsZW1lbnQucHJldigpLmlzKEhFQURFUl9TRUxFQ1RPUikgJiYgdGlueW1jZS5hY3RpdmVFZGl0b3IuZG9tLnNlbGVjdChGSVJTVF9IRUFESU5HKS5sZW5ndGgpKSlcbiAgICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZXRDdXJzb3JMb2NhdGlvbih0aW55bWNlLmFjdGl2ZUVkaXRvci5kb20uc2VsZWN0KEZJUlNUX0hFQURJTkcpWzBdLCAwKVxuXG4gICAgICAgICAgLy8gSWYgdGhlIGN1cnJlbnQgZWxlbWVudCBpc24ndCBpbnNpZGUgaGVhZGVyLCBvbmx5IGluIHNlY3Rpb24gdGhpcyBpcyBwZXJtaXR0ZWRcbiAgICAgICAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LnBhcmVudHMoJ3NlY3Rpb24nKS5sZW5ndGgpIHtcblxuICAgICAgICAgICAgLypcbiAgICAgICAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQuaXMoJ3NwYW4jX21jZV9jYXJldFtkYXRhLW1jZS1ib2d1c10nKSB8fCBzZWxlY3RlZEVsZW1lbnQucGFyZW50KCkuaXMoJ3NwYW4jX21jZV9jYXJldFtkYXRhLW1jZS1ib2d1c10nKSkge1xuXG4gICAgICAgICAgICAgIC8vIFJlbW92ZSBzcGFuIG5vcm1hbGx5IGNyZWF0ZWQgd2l0aCBib2xkXG4gICAgICAgICAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQucGFyZW50KCkuaXMoJ3NwYW4jX21jZV9jYXJldFtkYXRhLW1jZS1ib2d1c10nKSlcbiAgICAgICAgICAgICAgICBzZWxlY3RlZEVsZW1lbnQgPSBzZWxlY3RlZEVsZW1lbnQucGFyZW50KClcblxuICAgICAgICAgICAgICBsZXQgYm0gPSB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Qm9va21hcmsoKVxuICAgICAgICAgICAgICBzZWxlY3RlZEVsZW1lbnQucmVwbGFjZVdpdGgoc2VsZWN0ZWRFbGVtZW50Lmh0bWwoKSlcbiAgICAgICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLm1vdmVUb0Jvb2ttYXJrKGJtKVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgKi9cbiAgICAgICAgICB9XG4gICAgICAgICAgdXBkYXRlRG9jdW1lbnRTdGF0ZSgpXG4gICAgICAgIH0pXG5cbiAgICAgICAgLy8gVXBkYXRlIHNhdmVkIGNvbnRlbnQgb24gdW5kbyBhbmQgcmVkbyBldmVudHNcbiAgICAgICAgZWRpdG9yLm9uKCdVbmRvJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcbiAgICAgICAgfSlcblxuICAgICAgICBlZGl0b3Iub24oJ1JlZG8nLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuICAgICAgICB9KVxuXG4gICAgICAgIGVkaXRvci5vbignUGFzdGUnLCBmdW5jdGlvbiAoZSkge1xuXG4gICAgICAgICAgbGV0IHRhcmdldCA9ICQoZS50YXJnZXQpXG5cbiAgICAgICAgICAvLyBJZiB0aGUgcGFzdGUgZXZlbnQgaXMgY2FsbGVkIGluc2lkZSBhIGxpc3RpbmdcbiAgICAgICAgICBpZiAocGFzdGVCb29rbWFyayAmJiB0YXJnZXQucGFyZW50cygnZmlndXJlOmhhcyhwcmU6aGFzKGNvZGUpKScpLmxlbmd0aCkge1xuXG4gICAgICAgICAgICBsZXQgZGF0YSA9IGUuY2xpcGJvYXJkRGF0YS5nZXREYXRhKCdUZXh0JylcblxuICAgICAgICAgICAgLy8gUmVzdG9yZSB0aGUgc2VsZWN0aW9uIHNhdmVkIG9uIGNtZCt2XG4gICAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24ubW92ZVRvQm9va21hcmsocGFzdGVCb29rbWFyaylcblxuICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSBjb250ZW50XG4gICAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2V0Q29udGVudChlLmNsaXBib2FyZERhdGEuZ2V0RGF0YSgnVGV4dCcpKVxuXG4gICAgICAgICAgICBwYXN0ZUJvb2ttYXJrID0gbnVsbFxuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgIH0sXG4gICAgfSlcbiAgfSlcblxuICAvKipcbiAgICogT3BlbiBhbmQgY2xvc2UgdGhlIGhlYWRpbmdzIGRyb3Bkb3duXG4gICAqL1xuICAkKHdpbmRvdykubG9hZChmdW5jdGlvbiAoKSB7XG5cbiAgICAvLyBPcGVuIGFuZCBjbG9zZSBtZW51IGhlYWRpbmdzIE7DpGl2ZSB3YXlcbiAgICAkKGBkaXZbYXJpYS1sYWJlbD0naGVhZGluZyddYCkuZmluZCgnYnV0dG9uJykudHJpZ2dlcignY2xpY2snKVxuICAgICQoYGRpdlthcmlhLWxhYmVsPSdoZWFkaW5nJ11gKS5maW5kKCdidXR0b24nKS50cmlnZ2VyKCdjbGljaycpXG4gIH0pXG5cbiAgLyoqXG4gICAqIEFjY2VwdCBhIGpzIG9iamVjdCB0aGF0IGV4aXN0cyBpbiBmcmFtZVxuICAgKiBAcGFyYW0geyp9IGVsZW1lbnQgXG4gICAqL1xuICBmdW5jdGlvbiBtb3ZlQ2FyZXQoZWxlbWVudCwgdG9TdGFydCkge1xuICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZWxlY3QoZWxlbWVudCwgdHJ1ZSlcbiAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uY29sbGFwc2UodG9TdGFydClcblxuICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLmZvY3VzKClcbiAgfVxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGZ1bmN0aW9uIHNlbGVjdFJhbmdlKHN0YXJ0Q29udGFpbmVyLCBzdGFydE9mZnNldCwgZW5kQ29udGFpbmVyLCBlbmRPZmZzZXQpIHtcblxuICAgIGxldCByYW5nZSA9IGRvY3VtZW50LmNyZWF0ZVJhbmdlKClcbiAgICByYW5nZS5zZXRTdGFydChzdGFydENvbnRhaW5lciwgc3RhcnRPZmZzZXQpXG5cbiAgICAvLyBJZiB0aGVzZSBwcm9wZXJ0aWVzIGFyZSBub3QgaW4gdGhlIHNpZ25hdHVyZSB1c2UgdGhlIHN0YXJ0XG4gICAgaWYgKCFlbmRDb250YWluZXIgJiYgIWVuZE9mZnNldCkge1xuICAgICAgZW5kQ29udGFpbmVyID0gc3RhcnRDb250YWluZXJcbiAgICAgIGVuZE9mZnNldCA9IHN0YXJ0T2Zmc2V0XG4gICAgfVxuXG4gICAgcmFuZ2Uuc2V0RW5kKGVuZENvbnRhaW5lciwgZW5kT2Zmc2V0KVxuICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZXRSbmcocmFuZ2UpXG4gIH1cblxuICAvKipcbiAgICogXG4gICAqIEBwYXJhbSB7Kn0gZWxlbWVudCBcbiAgICovXG4gIGZ1bmN0aW9uIG1vdmVDdXJzb3JUb0VuZChlbGVtZW50KSB7XG5cbiAgICBsZXQgaGVhZGluZyA9IGVsZW1lbnRcbiAgICBsZXQgb2Zmc2V0ID0gMFxuXG4gICAgaWYgKGhlYWRpbmcuY29udGVudHMoKS5sZW5ndGgpIHtcblxuICAgICAgaGVhZGluZyA9IGhlYWRpbmcuY29udGVudHMoKS5sYXN0KClcblxuICAgICAgLy8gSWYgdGhlIGxhc3Qgbm9kZSBpcyBhIHN0cm9uZyxlbSxxIGV0Yy4gd2UgaGF2ZSB0byB0YWtlIGl0cyB0ZXh0IFxuICAgICAgaWYgKGhlYWRpbmdbMF0ubm9kZVR5cGUgIT0gMylcbiAgICAgICAgaGVhZGluZyA9IGhlYWRpbmcuY29udGVudHMoKS5sYXN0KClcblxuICAgICAgb2Zmc2V0ID0gaGVhZGluZ1swXS53aG9sZVRleHQubGVuZ3RoXG4gICAgfVxuXG4gICAgdGlueW1jZS5hY3RpdmVFZGl0b3IuZm9jdXMoKVxuICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZXRDdXJzb3JMb2NhdGlvbihoZWFkaW5nWzBdLCBvZmZzZXQpXG4gIH1cblxuICAvKipcbiAgICogXG4gICAqIEBwYXJhbSB7Kn0gZWxlbWVudCBcbiAgICovXG4gIGZ1bmN0aW9uIG1vdmVDdXJzb3JUb1N0YXJ0KGVsZW1lbnQpIHtcblxuICAgIGxldCBoZWFkaW5nID0gZWxlbWVudFxuICAgIGxldCBvZmZzZXQgPSAwXG5cbiAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5mb2N1cygpXG4gICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLnNldEN1cnNvckxvY2F0aW9uKGhlYWRpbmdbMF0sIG9mZnNldClcbiAgfVxuXG5cbiAgLyoqXG4gICAqIENyZWF0ZSBjdXN0b20gaW50byBub3RpZmljYXRpb25cbiAgICogQHBhcmFtIHsqfSB0ZXh0IFxuICAgKiBAcGFyYW0geyp9IHRpbWVvdXQgXG4gICAqL1xuICBmdW5jdGlvbiBub3RpZnkodGV4dCwgdHlwZSA9ICdpbmZvJywgdGltZW91dCA9IDMwMDApIHtcblxuICAgIGlmICh0aW55bWNlLmFjdGl2ZUVkaXRvci5ub3RpZmljYXRpb25NYW5hZ2VyLmdldE5vdGlmaWNhdGlvbnMoKS5sZW5ndGgpXG4gICAgICB0b3AudGlueW1jZS5hY3RpdmVFZGl0b3Iubm90aWZpY2F0aW9uTWFuYWdlci5jbG9zZSgpXG5cbiAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5ub3RpZmljYXRpb25NYW5hZ2VyLm9wZW4oe1xuICAgICAgdGV4dDogdGV4dCxcbiAgICAgIHR5cGU6IHR5cGUsXG4gICAgICB0aW1lb3V0OiB0aW1lb3V0XG4gICAgfSlcbiAgfVxuXG4gIC8qKlxuICAgKiBcbiAgICogQHBhcmFtIHsqfSBlbGVtZW50U2VsZWN0b3IgXG4gICAqL1xuICBmdW5jdGlvbiBzY3JvbGxUbyhlbGVtZW50U2VsZWN0b3IpIHtcbiAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci4kKGVsZW1lbnRTZWxlY3RvcilbMF0uc2Nyb2xsSW50b1ZpZXcoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGZ1bmN0aW9uIGdldFN1Y2Nlc3NpdmVFbGVtZW50SWQoZWxlbWVudFNlbGVjdG9yLCBTVUZGSVgpIHtcblxuICAgIGxldCBsYXN0SWQgPSAwXG5cbiAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci4kKGVsZW1lbnRTZWxlY3RvcikuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICBsZXQgY3VycmVudElkID0gcGFyc2VJbnQoJCh0aGlzKS5hdHRyKCdpZCcpLnJlcGxhY2UoU1VGRklYLCAnJykpXG4gICAgICBsYXN0SWQgPSBjdXJyZW50SWQgPiBsYXN0SWQgPyBjdXJyZW50SWQgOiBsYXN0SWRcbiAgICB9KVxuXG4gICAgcmV0dXJuIGAke1NVRkZJWH0ke2xhc3RJZCsxfWBcbiAgfVxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGZ1bmN0aW9uIGhlYWRpbmdEaW1lbnNpb24oKSB7XG4gICAgdGlueW1jZS5hY3RpdmVFZGl0b3IuJCgnaDEsaDIsaDMsaDQsaDUsaDYnKS5lYWNoKGZ1bmN0aW9uICgpIHtcblxuICAgICAgaWYgKCEkKHRoaXMpLnBhcmVudHMoSEVBREVSX1NFTEVDVE9SKS5sZW5ndGggJiYgISQodGhpcykucGFyZW50cyhTUEVDSUFMX1NFQ1RJT05fU0VMRUNUT1IpLmxlbmd0aCkge1xuICAgICAgICB2YXIgY291bnRlciA9IDA7XG4gICAgICAgICQodGhpcykucGFyZW50cyhcInNlY3Rpb25cIikuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgaWYgKCQodGhpcykuY2hpbGRyZW4oXCJoMSxoMixoMyxoNCxoNSxoNlwiKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb3VudGVyKys7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgJCh0aGlzKS5yZXBsYWNlV2l0aChcIjxoXCIgKyBjb3VudGVyICsgXCIgZGF0YS1yYXNoLW9yaWdpbmFsLXdyYXBwZXI9XFxcImgxXFxcIiA+XCIgKyAkKHRoaXMpLmh0bWwoKSArIFwiPC9oXCIgKyBjb3VudGVyICsgXCI+XCIpXG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogXG4gICAqL1xuICBmdW5jdGlvbiBjaGVja0lmUHJpbnRhYmxlQ2hhcihrZXljb2RlKSB7XG5cbiAgICByZXR1cm4gKGtleWNvZGUgPiA0NyAmJiBrZXljb2RlIDwgNTgpIHx8IC8vIG51bWJlciBrZXlzXG4gICAgICAoa2V5Y29kZSA9PSAzMiB8fCBrZXljb2RlID09IDEzKSB8fCAvLyBzcGFjZWJhciAmIHJldHVybiBrZXkocykgKGlmIHlvdSB3YW50IHRvIGFsbG93IGNhcnJpYWdlIHJldHVybnMpXG4gICAgICAoa2V5Y29kZSA+IDY0ICYmIGtleWNvZGUgPCA5MSkgfHwgLy8gbGV0dGVyIGtleXNcbiAgICAgIChrZXljb2RlID4gOTUgJiYga2V5Y29kZSA8IDExMikgfHwgLy8gbnVtcGFkIGtleXNcbiAgICAgIChrZXljb2RlID4gMTg1ICYmIGtleWNvZGUgPCAxOTMpIHx8IC8vIDs9LC0uL2AgKGluIG9yZGVyKVxuICAgICAgKGtleWNvZGUgPiAyMTggJiYga2V5Y29kZSA8IDIyMyk7IC8vIFtcXF0nIChpbiBvcmRlcilcbiAgfVxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGZ1bmN0aW9uIGNoZWNrSWZTcGVjaWFsQ2hhcihrZXljb2RlKSB7XG5cbiAgICByZXR1cm4gKGtleWNvZGUgPiA0NyAmJiBrZXljb2RlIDwgNTgpIHx8IC8vIG51bWJlciBrZXlzXG4gICAgICAoa2V5Y29kZSA+IDk1ICYmIGtleWNvZGUgPCAxMTIpIHx8IC8vIG51bXBhZCBrZXlzXG4gICAgICAoa2V5Y29kZSA+IDE4NSAmJiBrZXljb2RlIDwgMTkzKSB8fCAvLyA7PSwtLi9gIChpbiBvcmRlcilcbiAgICAgIChrZXljb2RlID4gMjE4ICYmIGtleWNvZGUgPCAyMjMpXG4gIH1cblxuICAvKipcbiAgICogXG4gICAqL1xuICBmdW5jdGlvbiBtYXJrVGlueU1DRSgpIHtcbiAgICAkKCdkaXZbaWRePW1jZXVfXScpLmF0dHIoJ2RhdGEtcmFzaC1vcmlnaW5hbC1jb250ZW50JywgJycpXG4gIH1cblxuICAvKipcbiAgICogXG4gICAqL1xuICBmdW5jdGlvbiBzZXROb25FZGl0YWJsZUhlYWRlcigpIHtcbiAgICAkKEhFQURFUl9TRUxFQ1RPUikuYWRkQ2xhc3MoJ21jZU5vbkVkaXRhYmxlJylcbiAgICAkKFNJREVCQVJfQU5OT1RBVElPTikuYWRkQ2xhc3MoJ21jZU5vbkVkaXRhYmxlJylcbiAgfVxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGZ1bmN0aW9uIGNoZWNrSWZBcHAoKSB7XG4gICAgcmV0dXJuIGlwY1JlbmRlcmVyLnNlbmRTeW5jKCdpc0FwcFN5bmMnKVxuICB9XG5cbiAgLyoqXG4gICAqIFxuICAgKi9cbiAgZnVuY3Rpb24gc2VsZWN0SW1hZ2UoKSB7XG4gICAgcmV0dXJuIGlwY1JlbmRlcmVyLnNlbmRTeW5jKCdzZWxlY3RJbWFnZVN5bmMnKVxuICB9XG5cbiAgLyoqXG4gICAqIFNlbmQgYSBtZXNzYWdlIHRvIHRoZSBiYWNrZW5kLCBub3RpZnkgdGhlIHN0cnVjdHVyYWwgY2hhbmdlXG4gICAqIFxuICAgKiBJZiB0aGUgZG9jdW1lbnQgaXMgZHJhZnQgc3RhdGUgPSB0cnVlXG4gICAqIElmIHRoZSBkb2N1bWVudCBpcyBzYXZlZCBzdGF0ZSA9IGZhbHNlXG4gICAqL1xuICBmdW5jdGlvbiB1cGRhdGVEb2N1bWVudFN0YXRlKCkge1xuXG4gICAgLy8gR2V0IHRoZSBJZnJhbWUgY29udGVudCBub3QgaW4geG1sIFxuICAgIGxldCBKcXVlcnlJZnJhbWUgPSAkKGA8ZGl2PiR7dGlueW1jZS5hY3RpdmVFZGl0b3IuZ2V0Q29udGVudCgpfTwvZGl2PmApXG4gICAgbGV0IEpxdWVyeVNhdmVkQ29udGVudCA9ICQoYCNyYWplX3Jvb3RgKVxuXG4gICAgLy8gVHJ1ZSBpZiB0aGV5J3JlIGRpZmZlcmVudCwgRmFsc2UgaXMgdGhleSdyZSBlcXVhbFxuICAgIGlwY1JlbmRlcmVyLnNlbmQoJ3VwZGF0ZURvY3VtZW50U3RhdGUnLCBKcXVlcnlJZnJhbWUuaHRtbCgpICE9IEpxdWVyeVNhdmVkQ29udGVudC5odG1sKCkpXG4gIH1cblxuICAvKipcbiAgICogXG4gICAqL1xuICBmdW5jdGlvbiBzYXZlQXNBcnRpY2xlKG9wdGlvbnMpIHtcbiAgICByZXR1cm4gaXBjUmVuZGVyZXIuc2VuZCgnc2F2ZUFzQXJ0aWNsZScsIG9wdGlvbnMpXG4gIH1cblxuICAvKipcbiAgICogXG4gICAqL1xuICBmdW5jdGlvbiBzYXZlQXJ0aWNsZShvcHRpb25zKSB7XG4gICAgcmV0dXJuIGlwY1JlbmRlcmVyLnNlbmQoJ3NhdmVBcnRpY2xlJywgb3B0aW9ucylcbiAgfVxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGZ1bmN0aW9uIG1hdGhtbDJzdmdBbGxGb3JtdWxhcygpIHtcblxuICAgIC8vIEZvciBlYWNoIGZpZ3VyZSBmb3JtdWxhXG4gICAgJCgnZmlndXJlW2lkXj1cImZvcm11bGFfXCJdJykuZWFjaChmdW5jdGlvbiAoKSB7XG5cbiAgICAgIC8vIEdldCB0aGUgaWRcbiAgICAgIGxldCBpZCA9ICQodGhpcykuYXR0cignaWQnKVxuICAgICAgbGV0IGFzY2lpTWF0aCA9ICQodGhpcykuYXR0cihEQVRBX01BVEhfT1JJR0lOQUxfSU5QVVQpXG4gICAgICAkKHRoaXMpLnJlbW92ZUF0dHIoREFUQV9NQVRIX09SSUdJTkFMX0lOUFVUKVxuXG4gICAgICBNYXRoSmF4Lkh1Yi5RdWV1ZShcblxuICAgICAgICAvLyBQcm9jZXNzIHRoZSBmb3JtdWxhIGJ5IGlkXG4gICAgICAgIFtcIlR5cGVzZXRcIiwgTWF0aEpheC5IdWIsIGlkXSxcbiAgICAgICAgZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgLy8gR2V0IHRoZSBlbGVtZW50LCBzdmcgYW5kIG1hdGhtbCBjb250ZW50XG4gICAgICAgICAgbGV0IGZpZ3VyZUZvcm11bGEgPSAkKGAjJHtpZH1gKVxuICAgICAgICAgIGxldCBzdmdDb250ZW50ID0gZmlndXJlRm9ybXVsYS5maW5kKCdzdmcnKVxuICAgICAgICAgIGxldCBtbWxDb250ZW50ID0gZmlndXJlRm9ybXVsYS5maW5kKCdzY3JpcHRbdHlwZT1cIm1hdGgvbW1sXCJdJykuaHRtbCgpXG5cbiAgICAgICAgICAvLyBBZGQgdGhlIHJvbGVcbiAgICAgICAgICBzdmdDb250ZW50LmF0dHIoJ3JvbGUnLCAnbWF0aCcpXG4gICAgICAgICAgc3ZnQ29udGVudC5hdHRyKCdkYXRhLW1hdGhtbCcsIG1tbENvbnRlbnQpXG5cbiAgICAgICAgICAvLyBBZGQgdGhlIGFzY2lpbWF0aCBpbnB1dCBpZiBleGlzdHNcbiAgICAgICAgICBpZiAodHlwZW9mIGFzY2lpTWF0aCAhPSAndW5kZWZpbmVkJylcbiAgICAgICAgICAgIHN2Z0NvbnRlbnQuYXR0cihEQVRBX01BVEhfT1JJR0lOQUxfSU5QVVQsIGFzY2lpTWF0aClcblxuICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgZmlndXJlIGNvbnRlbnQgYW5kIGl0cyBjYXB0aW9uXG4gICAgICAgICAgZmlndXJlRm9ybXVsYS5odG1sKGA8cD48c3Bhbj4ke3N2Z0NvbnRlbnRbMF0ub3V0ZXJIVE1MfTwvc3Bhbj48L3A+YClcbiAgICAgICAgICBjYXB0aW9ucygpXG5cbiAgICAgICAgICBmb3JtdWxhLnVwZGF0ZVN0cnVjdHVyZShmaWd1cmVGb3JtdWxhKVxuXG4gICAgICAgICAgLy8gVXBkYXRlIHRoZSBjb250ZW50IGFuZCBjbGVhciB0aGUgd2hvbGUgdW5kbyBsZXZlbHMgc2V0XG4gICAgICAgICAgLy91cGRhdGVJZnJhbWVGcm9tU2F2ZWRDb250ZW50KClcbiAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci5jbGVhcigpXG4gICAgICAgIH1cbiAgICAgIClcbiAgICB9KVxuICB9XG5cbiAgLyoqICovXG4gIHNlbGVjdGlvbkNvbnRlbnQgPSB7XG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBjb250YWluc0JpYmxpb2dyYXBoeTogZnVuY3Rpb24gKHNlbGVjdGlvbikge1xuXG4gICAgICBsZXQgcm5nID0gc2VsZWN0aW9uLmdldFJuZygpXG5cbiAgICAgIC8vIFNhdmUgdGhlIHN0YXJ0aW5nIGVsZW1lbnRcbiAgICAgIGxldCBzdGFydCA9IHJuZy5zdGFydENvbnRhaW5lclxuICAgICAgbGV0IHN0YXJ0Tm9kZSA9ICQoc3RhcnQubm9kZVR5cGUgPT0gMyA/IHN0YXJ0LnBhcmVudE5vZGUgOiBzdGFydClcblxuICAgICAgLy8gU2F2ZSB0aGUgZW5kaW5nIGVsZW1lbnRcbiAgICAgIGxldCBlbmQgPSBybmcuZW5kQ29udGFpbmVyXG4gICAgICBsZXQgZW5kTm9kZSA9ICQoZW5kLm5vZGVUeXBlID09IDMgPyBlbmQucGFyZW50Tm9kZSA6IGVuZClcblxuICAgICAgLy8gQ29udHJvbHMgaWYgdGhlIHNlbGVjdGlvbiBoYXMgdGhlIGJpYmxpb2dyYXBoeSBpbnNpZGVcbiAgICAgIHJldHVybiAoJChybmcuY29tbW9uQW5jZXN0b3JDb250YWluZXIpLmZpbmQoQklCTElPR1JBUEhZX1NFTEVDVE9SKS5sZW5ndGggJiZcbiAgICAgICAgICAoIXN0YXJ0Tm9kZS5pcyhgJHtCSUJMSU9HUkFQSFlfU0VMRUNUT1J9ID4gaDFgKSB8fFxuICAgICAgICAgICAgIWVuZE5vZGUuaXMoYCR7QklCTElPR1JBUEhZX1NFTEVDVE9SfSA+IGgxYCkpKSB8fFxuXG4gICAgICAgIC8vIE9yIGlmIHRoZSBzZWxlY3Rpb24gaXMgdGhlIGJpYmxpb2dyYXBoeVxuICAgICAgICAoJChybmcuY29tbW9uQW5jZXN0b3JDb250YWluZXIpLmlzKEJJQkxJT0dSQVBIWV9TRUxFQ1RPUikgJiZcbiAgICAgICAgICAoc3RhcnROb2RlLmlzKCdoMScpICYmIHJuZy5zdGFydE9mZnNldCA9PSAwKSAmJlxuICAgICAgICAgIChlbmROb2RlLmlzKCdwJykgJiYgcm5nLmVuZE9mZnNldCA9PSBlbmQubGVuZ3RoKSlcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgaXNBdEJlZ2lubmluZ09mRW1wdHlCaWJsaW9lbnRyeTogZnVuY3Rpb24gKHNlbGVjdGlvbikge1xuXG4gICAgICBsZXQgcm5nID0gc2VsZWN0aW9uLmdldFJuZygpXG5cbiAgICAgIC8vIFNhdmUgdGhlIHN0YXJ0aW5nIGVsZW1lbnRcbiAgICAgIGxldCBzdGFydCA9IHJuZy5zdGFydENvbnRhaW5lclxuICAgICAgbGV0IHN0YXJ0Tm9kZSA9ICQoc3RhcnQubm9kZVR5cGUgPT0gMyA/IHN0YXJ0LnBhcmVudE5vZGUgOiBzdGFydClcblxuICAgICAgLy8gU2F2ZSB0aGUgZW5kaW5nIGVsZW1lbnRcbiAgICAgIGxldCBlbmQgPSBybmcuZW5kQ29udGFpbmVyXG4gICAgICBsZXQgZW5kTm9kZSA9ICQoZW5kLm5vZGVUeXBlID09IDMgPyBlbmQucGFyZW50Tm9kZSA6IGVuZClcblxuICAgICAgcmV0dXJuIChybmcuY29tbW9uQW5jZXN0b3JDb250YWluZXIubm9kZVR5cGUgPT0gMyB8fCAkKHJuZy5jb21tb25BbmNlc3RvckNvbnRhaW5lcikuaXMoYCR7QklCTElPRU5UUllfU0VMRUNUT1J9ID4gcGApKSAmJlxuICAgICAgICAoc3RhcnROb2RlLmlzKGVuZE5vZGUpICYmIHN0YXJ0Tm9kZS5pcyhgJHtCSUJMSU9FTlRSWV9TRUxFQ1RPUn0gPiBwYCkpICYmXG4gICAgICAgIChybmcuc3RhcnRPZmZzZXQgPT0gcm5nLmVuZE9mZnNldCAmJiBybmcuc3RhcnRPZmZzZXQgPT0gMClcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgaXNBdEJlZ2lubmluZ09mRW1wdHlFbmRub3RlOiBmdW5jdGlvbiAoc2VsZWN0aW9uKSB7XG5cbiAgICAgIGxldCBybmcgPSBzZWxlY3Rpb24uZ2V0Um5nKClcblxuICAgICAgLy8gU2F2ZSB0aGUgc3RhcnRpbmcgZWxlbWVudFxuICAgICAgbGV0IHN0YXJ0ID0gcm5nLnN0YXJ0Q29udGFpbmVyXG4gICAgICBsZXQgc3RhcnROb2RlID0gJChzdGFydC5ub2RlVHlwZSA9PSAzID8gc3RhcnQucGFyZW50Tm9kZSA6IHN0YXJ0KVxuXG4gICAgICAvLyBTYXZlIHRoZSBlbmRpbmcgZWxlbWVudFxuICAgICAgbGV0IGVuZCA9IHJuZy5lbmRDb250YWluZXJcbiAgICAgIGxldCBlbmROb2RlID0gJChlbmQubm9kZVR5cGUgPT0gMyA/IGVuZC5wYXJlbnROb2RlIDogZW5kKVxuXG4gICAgICByZXR1cm4gKCQocm5nLmNvbW1vbkFuY2VzdG9yQ29udGFpbmVyKS5wYXJlbnQoKS5pcyhFTkROT1RFX1NFTEVDVE9SKSAmJiBzdGFydE5vZGUuaXMoZW5kTm9kZSkgJiYgc3RhcnROb2RlLmlzKGAke0VORE5PVEVfU0VMRUNUT1J9ID4gcDpmaXJzdC1jaGlsZGApKSAmJlxuICAgICAgICAoKHJuZy5zdGFydE9mZnNldCA9PSBybmcuZW5kT2Zmc2V0ICYmIHJuZy5zdGFydE9mZnNldCA9PSAwKSB8fCAoL1xccnxcXG4vLmV4ZWMoc3RhcnQuaW5uZXJUZXh0KSAhPSBudWxsKSlcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgY29udGFpbnNCaWJsaW9lbnRyaWVzOiBmdW5jdGlvbiAoc2VsZWN0aW9uKSB7XG5cbiAgICAgIGxldCBybmcgPSBzZWxlY3Rpb24uZ2V0Um5nKClcblxuICAgICAgLy8gU2F2ZSB0aGUgc3RhcnRpbmcgZWxlbWVudFxuICAgICAgbGV0IHN0YXJ0ID0gcm5nLnN0YXJ0Q29udGFpbmVyXG4gICAgICBsZXQgc3RhcnROb2RlID0gJChzdGFydC5ub2RlVHlwZSA9PSAzID8gc3RhcnQucGFyZW50Tm9kZSA6IHN0YXJ0KVxuXG4gICAgICAvLyBTYXZlIHRoZSBlbmRpbmcgZWxlbWVudFxuICAgICAgbGV0IGVuZCA9IHJuZy5lbmRDb250YWluZXJcbiAgICAgIGxldCBlbmROb2RlID0gJChlbmQubm9kZVR5cGUgPT0gMyA/IGVuZC5wYXJlbnROb2RlIDogZW5kKVxuXG4gICAgICAvLyBDaGVjayBpZiB0aGUgc2VsZWN0aW9uIGNvbnRhaW5zIG1vcmUgdGhhbiBvbmUgYmlibGlvZW50cnlcbiAgICAgIHJldHVybiAoJChybmcuY29tbW9uQW5jZXN0b3JDb250YWluZXIpLmlzKGAke0JJQkxJT0dSQVBIWV9TRUxFQ1RPUn0gPiB1bGApIHx8ICQocm5nLmNvbW1vbkFuY2VzdG9yQ29udGFpbmVyKS5pcyhCSUJMSU9HUkFQSFlfU0VMRUNUT1IpKSAmJlxuICAgICAgICAoQm9vbGVhbihzdGFydE5vZGUucGFyZW50KEJJQkxJT0VOVFJZX1NFTEVDVE9SKS5sZW5ndGgpIHx8IHN0YXJ0Tm9kZS5pcygnaDEnKSkgJiZcbiAgICAgICAgQm9vbGVhbihlbmROb2RlLnBhcmVudHMoQklCTElPRU5UUllfU0VMRUNUT1IpLmxlbmd0aClcbiAgICB9LFxuICB9XG5cbiAgLyoqXG4gICAqIFN0YXJ0IHRoZSBzYXZlIGFzIHByb2Nlc3MgZ2V0dGluZyB0aGUgZGF0YSBhbmQgc2VuZGluZyBpdFxuICAgKiB0byB0aGUgbWFpbiBwcm9jZXNzXG4gICAqL1xuICBpcGNSZW5kZXJlci5vbignZXhlY3V0ZVNhdmVBcycsIChldmVudCwgZGF0YSkgPT4ge1xuICAgIHNhdmVNYW5hZ2VyLnNhdmVBcygpXG4gIH0pXG5cbiAgLyoqXG4gICAqIFN0YXJ0IHRoZSBzYXZlIHByb2Nlc3MgZ2V0dGluZyB0aGUgZGF0YSBhbmQgc2VuZGluZyBpdFxuICAgKiB0byB0aGUgbWFpbiBwcm9jZXNzXG4gICAqL1xuICBpcGNSZW5kZXJlci5vbignZXhlY3V0ZVNhdmUnLCAoZXZlbnQsIGRhdGEpID0+IHtcbiAgICBzYXZlTWFuYWdlci5zYXZlKClcbiAgfSlcblxuICAvKipcbiAgICogXG4gICAqL1xuICBpcGNSZW5kZXJlci5vbignbm90aWZ5JywgKGV2ZW50LCBkYXRhKSA9PiB7XG4gICAgbm90aWZ5KGRhdGEudGV4dCwgZGF0YS50eXBlLCBkYXRhLnRpbWVvdXQpXG4gIH0pXG5cbiAgLyoqXG4gICAqIFxuICAgKi9cbiAgaXBjUmVuZGVyZXIub24oJ3VwZGF0ZUNvbnRlbnQnLCAoZXZlbnQsIGRhdGEpID0+IHtcbiAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcbiAgfSlcblxuICBjdXJzb3IgPSB7XG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBpc0luc2lkZUhlYWRpbmc6IGZ1bmN0aW9uIChzZWxlY3Rpb24pIHtcblxuICAgICAgbGV0IHJuZyA9IHNlbGVjdGlvbi5nZXRSbmcoKVxuXG4gICAgICAvLyBTYXZlIHRoZSBzdGFydGluZyBlbGVtZW50XG4gICAgICBsZXQgc3RhcnQgPSBybmcuc3RhcnRDb250YWluZXJcbiAgICAgIGxldCBzdGFydE5vZGUgPSAkKHN0YXJ0Lm5vZGVUeXBlID09IDMgPyBzdGFydC5wYXJlbnROb2RlIDogc3RhcnQpXG5cbiAgICAgIC8vIFNhdmUgdGhlIGVuZGluZyBlbGVtZW50XG4gICAgICBsZXQgZW5kID0gcm5nLmVuZENvbnRhaW5lclxuICAgICAgbGV0IGVuZE5vZGUgPSAkKGVuZC5ub2RlVHlwZSA9PSAzID8gZW5kLnBhcmVudE5vZGUgOiBlbmQpXG5cbiAgICAgIC8vIENoZWNrIGlmIHRoZSBzZWxlY3Rpb24gY29udGFpbnMgbW9yZSB0aGFuIG9uZSBiaWJsaW9lbnRyeVxuICAgICAgcmV0dXJuICQocm5nLmNvbW1vbkFuY2VzdG9yQ29udGFpbmVyKS5pcygnOmhlYWRlcicpICYmXG4gICAgICAgICQocm5nLmNvbW1vbkFuY2VzdG9yQ29udGFpbmVyKS50ZXh0KCkudHJpbSgpLmxlbmd0aCAhPSBybmcuc3RhcnRPZmZzZXRcbiAgICB9LFxuXG4gICAgaXNJbnNpZGVUYWJsZTogZnVuY3Rpb24gKHNlbGVjdGlvbikge1xuXG4gICAgICBsZXQgcm5nID0gc2VsZWN0aW9uLmdldFJuZygpXG5cbiAgICAgIC8vIFNhdmUgdGhlIHN0YXJ0aW5nIGVsZW1lbnRcbiAgICAgIGxldCBzdGFydCA9IHJuZy5zdGFydENvbnRhaW5lclxuICAgICAgbGV0IHN0YXJ0Tm9kZSA9ICQoc3RhcnQubm9kZVR5cGUgPT0gMyA/IHN0YXJ0LnBhcmVudE5vZGUgOiBzdGFydClcblxuICAgICAgLy8gU2F2ZSB0aGUgZW5kaW5nIGVsZW1lbnRcbiAgICAgIGxldCBlbmQgPSBybmcuZW5kQ29udGFpbmVyXG4gICAgICBsZXQgZW5kTm9kZSA9ICQoZW5kLm5vZGVUeXBlID09IDMgPyBlbmQucGFyZW50Tm9kZSA6IGVuZClcblxuICAgICAgLy8gQ2hlY2sgaWYgdGhlIHNlbGVjdGlvbiBjb250YWlucyBtb3JlIHRoYW4gb25lIGJpYmxpb2VudHJ5XG4gICAgICByZXR1cm4gKCQocm5nLmNvbW1vbkFuY2VzdG9yQ29udGFpbmVyKS5pcyhGSUdVUkVfVEFCTEVfU0VMRUNUT1IpIHx8ICQocm5nLmNvbW1vbkFuY2VzdG9yQ29udGFpbmVyKS5wYXJlbnRzKEZJR1VSRV9UQUJMRV9TRUxFQ1RPUikubGVuZ3RoKSAmJlxuICAgICAgICAkKHJuZy5jb21tb25BbmNlc3RvckNvbnRhaW5lcikudGV4dCgpLnRyaW0oKS5sZW5ndGggIT0gcm5nLnN0YXJ0T2Zmc2V0XG4gICAgfVxuICB9XG59IiwiLy8jcmVnaW9uIDFfcmFqZV9zZWN0aW9uLmpzIENvbnN0YW50c1xuXG4vLyBUZXh0IG9mIGJ1dHRvbiBsYWJlbHNcbmNvbnN0IEhFQURJTkdfQlVUVE9OX0xBQkVMID0gJ0hlYWRpbmcgJ1xuY29uc3QgU1BFQ0lBTF9CVVRUT05fTEFCRUwgPSAnU3BlY2lhbCdcbmNvbnN0IEFCU1RSQUNUX0JVVFRPTl9MQUJFTCA9ICdBYnN0cmFjdCdcbmNvbnN0IEFDS05PV0xFREdFTUVOVFNfQlVUVE9OX0xBQkVMID0gJ0Fja25vd2xlZGdlbWVudHMnXG5jb25zdCBSRUZFUkVOQ0VTX0JVVFRPTl9MQUJFTCA9ICdSZWZlcmVuY2VzJ1xuY29uc3QgSEVBRElOR1NfQlVUVE9OTElTVF9MQUJFTCA9ICdIZWFkaW5ncydcblxuLy8gTWVzc2FnZSB0ZXh0XG5jb25zdCBIRUFESU5HX1RSQVNGT1JNQVRJT05fRk9SQklEREVOID0gJ0Vycm9yLCB5b3UgY2Fubm90IHRyYW5zZm9ybSB0aGUgY3VycmVudCBoZWFkZXIgaW4gdGhpcyB3YXkhJ1xuXG4vLyBTZWN0aW9uIHNlbGVjdG9yXG5jb25zdCBNQUlOX1NFQ1RJT05fU0VMRUNUT1IgPSAnc2VjdGlvbjpub3QoW3JvbGVdKSdcbmNvbnN0IFNFQ1RJT05fU0VMRUNUT1IgPSAnc2VjdGlvbjpub3QoW3JvbGVdKSdcbmNvbnN0IFNQRUNJQUxfU0VDVElPTl9TRUxFQ1RPUiA9ICdzZWN0aW9uW3JvbGVdJ1xuY29uc3QgQklCTElPR1JBUEhZX1NFTEVDVE9SID0gJ3NlY3Rpb25bcm9sZT1kb2MtYmlibGlvZ3JhcGh5XSdcbmNvbnN0IEVORE5PVEVTX1NFTEVDVE9SID0gJ3NlY3Rpb25bcm9sZT1kb2MtZW5kbm90ZXNdJ1xuY29uc3QgRU5ETk9URV9TRUxFQ1RPUiA9ICdzZWN0aW9uW3JvbGU9ZG9jLWVuZG5vdGVdJ1xuXG4vLyBFbGVtZW50IHNlbGVjdG9yXG5jb25zdCBIMSA9ICdoMSdcbmNvbnN0IEJJQkxJT0VOVFJZX1NFTEVDVE9SID0gJ2xpW3JvbGU9ZG9jLWJpYmxpb2VudHJ5XSdcblxuXG4vLyNlbmRyZWdpb25cblxuLy8jcmVnaW9uIGNvbW1hbmRzXG5cbmNvbnN0IERFTEVURV9DTUQgPSAnRGVsZXRlJ1xuY29uc3QgVU5ET19DTUQgPSAnVW5kbydcbmNvbnN0IFJFRE9fQ01EID0gJ1JlZG8nXG5cbi8vI2VuZHJlZ2lvblxuXG4vLyNyZWdpb24gQW5ub3RhdGlvbnNcblxuY29uc3Qgc2lkZV9ub3RlX3JlcGx5X3NlbGVjdG9yID0gJy5zaWRlX25vdGVfcmVwbHknXG5jb25zdCB0b2dnbGVfYW5ub3RhdGlvbl9zZWxlY3RvciA9ICcjdG9nZ2xlQW5ub3RhdGlvbnMnXG5jb25zdCB0b2dnbGVfc2lkZWJhcl9zZWxlY3RvciA9ICcjdG9nZ2xlU2lkZWJhcidcblxuY29uc3QgYW5ub3RhdGlvbl93cmFwcGVyX3NlbGVjdG9yID0gJ3NwYW5bZGF0YS1yYXNoLWFubm90YXRpb24tdHlwZV0nXG5jb25zdCBzZW1hbnRpY19hbm5vdGF0aW9uX3NlbGVjdG9yID0gJ3NjcmlwdFt0eXBlPVwiYXBwbGljYXRpb24vbGQranNvblwiXSdcbmNvbnN0IG1jZV9zZW1hbnRpY19hbm5vdGF0aW9uX3NlbGVjdG9yID0gJ3NjcmlwdFt0eXBlPVwibWNlLWFwcGxpY2F0aW9uL2xkK2pzb25cIl0nXG5cblxuLy8jZW5kcmVnaW9uXG5cbmNvbnN0IE5PTl9FRElUQUJMRV9IRUFERVJfU0VMRUNUT1IgPSAnaGVhZGVyLnBhZ2UtaGVhZGVyLmNvbnRhaW5lci5jZ2VuJ1xuY29uc3QgQklCTElPRU5UUllfU1VGRklYID0gJ2JpYmxpb2VudHJ5XydcbmNvbnN0IEVORE5PVEVfU1VGRklYID0gJ2VuZG5vdGVfJ1xuXG5cbmNvbnN0IEFCU1RSQUNUX1NFTEVDVE9SID0gJ3NlY3Rpb25bcm9sZT1kb2MtYWJzdHJhY3RdJ1xuY29uc3QgQUNLTk9XTEVER0VNRU5UU19TRUxFQ1RPUiA9ICdzZWN0aW9uW3JvbGU9ZG9jLWFja25vd2xlZGdlbWVudHNdJ1xuXG5cblxuY29uc3QgTUVOVV9TRUxFQ1RPUiA9ICdkaXZbaWRePW1jZXVfXVtpZCQ9LWJvZHldW3JvbGU9bWVudV0nXG5cbmNvbnN0IERBVEFfVVBHUkFERSA9ICdkYXRhLXVwZ3JhZGUnXG5jb25zdCBEQVRBX0RPV05HUkFERSA9ICdkYXRhLWRvd25ncmFkZSdcblxuLy8gSW5saW5lIEVycm9yc1xuY29uc3QgSU5MSU5FX0VSUk9SUyA9ICdFcnJvciwgSW5saW5lIGVsZW1lbnRzIGNhbiBiZSBPTkxZIGNyZWF0ZWQgaW5zaWRlIHRoZSBzYW1lIHBhcmFncmFwaCdcblxuLy8gQW5ub3RhdGlvbiBzZWxlY3RlZCBpbWFnZSBlcnJvclxuY29uc3QgQU5OT1RBVElPTl9FUlJPUl9JTUFHRV9TRUxFQ1RFRCA9ICdFaG0sIGRvIHlvdSByZWFsbHkgd2FudCB0byBhbm5vdGF0ZSBwaWN0dXJlcz8gOignXG5cblxuXG5jb25zdCBESVNBQkxFX1NFTEVDVE9SX0ZJR1VSRVMgPSAnZmlndXJlICosIGgxLCBoMiwgaDMsIGg0LCBoNSwgaDYsJyArIEJJQkxJT0dSQVBIWV9TRUxFQ1RPUlxuXG5jb25zdCBGSUdVUkVfU0VMRUNUT1IgPSAnZmlndXJlW2lkXSdcblxuY29uc3QgRklHVVJFX1RBQkxFX1NFTEVDVE9SID0gYCR7RklHVVJFX1NFTEVDVE9SfTpoYXModGFibGUpYFxuY29uc3QgVEFCTEVfU1VGRklYID0gJ3RhYmxlXydcblxuY29uc3QgRklHVVJFX0lNQUdFX1NFTEVDVE9SID0gYCR7RklHVVJFX1NFTEVDVE9SfTpoYXMoaW1nOm5vdChbcm9sZT1tYXRoXSkpYFxuY29uc3QgSU1BR0VfU1VGRklYID0gJ2ltZ18nXG5cbmNvbnN0IEZJR1VSRV9GT1JNVUxBX1NFTEVDVE9SID0gYCR7RklHVVJFX1NFTEVDVE9SfTpoYXMoc3ZnW3JvbGU9bWF0aF0pYFxuY29uc3QgSU5MSU5FX0ZPUk1VTEFfU0VMRUNUT1IgPSBgc3BhbjpoYXMoc3ZnW3JvbGU9bWF0aF0pYFxuY29uc3QgRk9STVVMQV9TVUZGSVggPSAnZm9ybXVsYV8nXG5cbmNvbnN0IEZJR1VSRV9MSVNUSU5HX1NFTEVDVE9SID0gYCR7RklHVVJFX1NFTEVDVE9SfTpoYXMocHJlOmhhcyhjb2RlKSlgXG5jb25zdCBMSVNUSU5HX1NVRkZJWCA9ICdsaXN0aW5nXydcblxuY29uc3QgRElTQUJMRV9TRUxFQ1RPUl9JTkxJTkUgPSAndGFibGUsIGltZywgcHJlLCBjb2RlJ1xuXG5jb25zdCBTSURFQkFSX0FOTk9UQVRJT04gPSAnYXNpZGUjYW5ub3RhdGlvbnMnXG5cblxuIiwiLyoqXG4gKiBSQVNIIHNlY3Rpb24gcGx1Z2luIFJBSkVcbiAqL1xuXG50aW55bWNlLlBsdWdpbk1hbmFnZXIuYWRkKCdyYWplX3NlY3Rpb24nLCBmdW5jdGlvbiAoZWRpdG9yKSB7XG5cbiAgLy8gQWRkIHRoZSBidXR0b24gdG8gc2VsZWN0IHRoZSBzZWN0aW9uXG4gIGVkaXRvci5hZGRCdXR0b24oJ3JhamVfc2VjdGlvbicsIHtcbiAgICB0eXBlOiAnbWVudWJ1dHRvbicsXG4gICAgdGV4dDogSEVBRElOR1NfQlVUVE9OTElTVF9MQUJFTCxcbiAgICB0aXRsZTogJ2hlYWRpbmcnLFxuICAgIGljb25zOiBmYWxzZSxcblxuICAgIC8vIFNlY3Rpb25zIHN1YiBtZW51XG4gICAgbWVudTogW3tcbiAgICAgIHRleHQ6IGAke0hFQURJTkdfQlVUVE9OX0xBQkVMfTEuYCxcbiAgICAgIG9uY2xpY2s6IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIHNlY3Rpb24uYWRkT3JEb3duVXBncmFkZShlLCAxKVxuICAgICAgfVxuICAgIH0sIHtcbiAgICAgIHRleHQ6IGAke0hFQURJTkdfQlVUVE9OX0xBQkVMfTEuMS5gLFxuICAgICAgb25jbGljazogZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgc2VjdGlvbi5hZGRPckRvd25VcGdyYWRlKGUsIDIpXG4gICAgICB9XG4gICAgfSwge1xuICAgICAgdGV4dDogYCR7SEVBRElOR19CVVRUT05fTEFCRUx9MS4xLjEuYCxcbiAgICAgIG9uY2xpY2s6IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIHNlY3Rpb24uYWRkT3JEb3duVXBncmFkZShlLCAzKVxuICAgICAgfVxuICAgIH0sIHtcbiAgICAgIHRleHQ6IGAke0hFQURJTkdfQlVUVE9OX0xBQkVMfTEuMS4xLjEuYCxcbiAgICAgIG9uY2xpY2s6IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIHNlY3Rpb24uYWRkT3JEb3duVXBncmFkZShlLCA0KVxuICAgICAgfVxuICAgIH0sIHtcbiAgICAgIHRleHQ6IGAke0hFQURJTkdfQlVUVE9OX0xBQkVMfTEuMS4xLjEuMS5gLFxuICAgICAgb25jbGljazogZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgc2VjdGlvbi5hZGRPckRvd25VcGdyYWRlKGUsIDUpXG4gICAgICB9XG4gICAgfSwge1xuICAgICAgdGV4dDogYCR7SEVBRElOR19CVVRUT05fTEFCRUx9MS4xLjEuMS4xLjEuYCxcbiAgICAgIG9uY2xpY2s6IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIHNlY3Rpb24uYWRkT3JEb3duVXBncmFkZShlLCA2KVxuICAgICAgfVxuICAgIH0sIHtcbiAgICAgIHRleHQ6IFNQRUNJQUxfQlVUVE9OX0xBQkVMLFxuICAgICAgbWVudTogW3tcbiAgICAgICAgICB0ZXh0OiBBQlNUUkFDVF9CVVRUT05fTEFCRUwsXG4gICAgICAgICAgb25jbGljazogZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgICBzZWN0aW9uLmFkZEFic3RyYWN0KClcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICB0ZXh0OiBBQ0tOT1dMRURHRU1FTlRTX0JVVFRPTl9MQUJFTCxcbiAgICAgICAgICBvbmNsaWNrOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWN0aW9uLmFkZEFja25vd2xlZGdlbWVudHMoKVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIHRleHQ6IFJFRkVSRU5DRVNfQlVUVE9OX0xBQkVMLFxuICAgICAgICAgIG9uY2xpY2s6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlY3Rpb24uaGFuZGxlQWRkQmxpYmxpb2VudHJ5KClcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIF1cbiAgICB9XVxuICB9KVxuXG4gIGVkaXRvci5vbigna2V5RG93bicsIGZ1bmN0aW9uIChlKSB7XG5cbiAgICAvLyBpbnN0YW5jZSBvZiB0aGUgc2VsZWN0ZWQgZWxlbWVudFxuICAgIGxldCBzZWxlY3RlZEVsZW1lbnQgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG4gICAgbGV0IHNlbGVjdGlvbiA9IHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvblxuXG4gICAgbGV0IHN0YXJ0Tm9kZSA9ICQoc2VsZWN0aW9uLmdldFJuZygpLnN0YXJ0Q29udGFpbmVyKVxuICAgIGxldCBlbmROb2RlID0gJChzZWxlY3Rpb24uZ2V0Um5nKCkuZW5kQ29udGFpbmVyKVxuXG4gICAgLy8gQ2hlY2sgaWYgdGhlIGNhcmV0IGlzIGluc2lkZSBhIHNlY3Rpb25cbiAgICBpZiAoKHNlY3Rpb24uY3Vyc29ySW5TZWN0aW9uKHNlbGVjdGlvbikgfHwgc2VjdGlvbi5jdXJzb3JJblNwZWNpYWxTZWN0aW9uKHNlbGVjdGlvbikpKSB7XG5cbiAgICAgIC8vIEJsb2NrIHNwZWNpYWwgY2hhcnMgaW4gc3BlY2lhbCBlbGVtZW50c1xuICAgICAgaWYgKGNoZWNrSWZTcGVjaWFsQ2hhcihlLmtleUNvZGUpICYmXG4gICAgICAgIChzdGFydE5vZGUucGFyZW50cyhTUEVDSUFMX1NFQ1RJT05fU0VMRUNUT1IpLmxlbmd0aCB8fCBlbmROb2RlLnBhcmVudHMoU1BFQ0lBTF9TRUNUSU9OX1NFTEVDVE9SKS5sZW5ndGgpICYmXG4gICAgICAgIChzdGFydE5vZGUucGFyZW50cyhIMSkubGVuZ3RoID4gMCB8fCBlbmROb2RlLnBhcmVudHMoSDEpLmxlbmd0aCA+IDApKSB7XG5cbiAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKVxuICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgIH1cblxuICAgICAgLyoqXG4gICAgICAgKiBDaGVjayBpZiBCQUNLU1BBQ0Ugb3IgQ0FOQyBhcmUgcHJlc3NlZFxuICAgICAgICovXG4gICAgICBpZiAoZS5rZXlDb2RlID09IDggfHwgZS5rZXlDb2RlID09IDQ2KSB7XG5cbiAgICAgICAgLy8gSWYgdGhlIHNlY3Rpb24gaXNuJ3QgY29sbGFwc2VkXG4gICAgICAgIGlmICghdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmlzQ29sbGFwc2VkKCkpIHtcblxuICAgICAgICAgIC8vIElmIHRoZSBzZWxlY3Rpb24gY29udGFpbnMgYXQgbGVhc3QgYSBiaWJsaW9lbnRyeVxuICAgICAgICAgIGlmIChzZWxlY3Rpb25Db250ZW50LmNvbnRhaW5zQmlibGlvZW50cmllcyhzZWxlY3Rpb24pKSB7XG5cbiAgICAgICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKClcblxuICAgICAgICAgICAgLy8gQm90aCBkZWxldGUgZXZlbnQgYW5kIHVwZGF0ZSBhcmUgc3RvcmVkIGluIGEgc2luZ2xlIHVuZG8gbGV2ZWxcbiAgICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5leGVjQ29tbWFuZChERUxFVEVfQ01EKVxuICAgICAgICAgICAgICBzZWN0aW9uLnVwZGF0ZUJpYmxpb2dyYXBoeVNlY3Rpb24oKVxuICAgICAgICAgICAgICB1cGRhdGVSZWZlcmVuY2VzKClcblxuICAgICAgICAgICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcbiAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIElmIHRoZSBzZWxlY3Rpb24gY29udGFpbnMgdGhlIGVudGlyZSBiaWJsaW9ncmFwaHkgc2VjdGlvblxuICAgICAgICAgIGlmIChzZWxlY3Rpb25Db250ZW50LmNvbnRhaW5zQmlibGlvZ3JhcGh5KHNlbGVjdGlvbikpIHtcblxuICAgICAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKVxuXG4gICAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICAgICAgLy8gRXhlY3V0ZSBub3JtYWwgZGVsZXRlXG4gICAgICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLiQoQklCTElPR1JBUEhZX1NFTEVDVE9SKS5yZW1vdmUoKVxuICAgICAgICAgICAgICB1cGRhdGVSZWZlcmVuY2VzKClcblxuICAgICAgICAgICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcbiAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIFJlc3RydWN0dXJlIHRoZSBlbnRpcmUgYm9keSBpZiB0aGUgc2VjdGlvbiBpc24ndCBjb2xsYXBzZWQgYW5kIG5vdCBpbnNpZGUgYSBzcGVjaWFsIHNlY3Rpb25cbiAgICAgICAgICBpZiAoIXNlY3Rpb24uY3Vyc29ySW5TcGVjaWFsU2VjdGlvbihzZWxlY3Rpb24pKSB7XG4gICAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpXG4gICAgICAgICAgICBzZWN0aW9uLm1hbmFnZURlbGV0ZSgpXG4gICAgICAgICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIElmIHRoZSBzZWN0aW9uIGlzIGNvbGxhcHNlZFxuICAgICAgICBpZiAodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmlzQ29sbGFwc2VkKCkpIHtcblxuICAgICAgICAgIC8vIElmIHRoZSBzZWxlY3Rpb24gaXMgaW5zaWRlIGEgc3BlY2lhbCBzZWN0aW9uXG4gICAgICAgICAgaWYgKHNlY3Rpb24uY3Vyc29ySW5TcGVjaWFsU2VjdGlvbihzZWxlY3Rpb24pKSB7XG5cbiAgICAgICAgICAgIC8vIFJlbW92ZSBzcGVjaWFsIHNlY3Rpb24gaWYgdGhlIGN1cnNvciBpcyBhdCB0aGUgYmVnaW5uaW5nXG4gICAgICAgICAgICBpZiAoKHN0YXJ0Tm9kZS5wYXJlbnRzKEgxKS5sZW5ndGggfHwgc3RhcnROb2RlLmlzKEgxKSkgJiYgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldFJuZygpLnN0YXJ0T2Zmc2V0ID09IDApIHtcblxuICAgICAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpXG4gICAgICAgICAgICAgIHNlY3Rpb24uZGVsZXRlU3BlY2lhbFNlY3Rpb24oc2VsZWN0ZWRFbGVtZW50KVxuICAgICAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gaWYgdGhlIGN1cnNvciBpcyBhdCB0aGUgYmVnaW5uaW5nIG9mIGEgZW1wdHkgcCBpbnNpZGUgaXRzIGJpYmxpb2VudHJ5LCByZW1vdmUgaXQgYW5kIHVwZGF0ZSB0aGUgcmVmZXJlbmNlc1xuICAgICAgICAgICAgaWYgKHNlbGVjdGlvbkNvbnRlbnQuaXNBdEJlZ2lubmluZ09mRW1wdHlCaWJsaW9lbnRyeShzZWxlY3Rpb24pKSB7XG5cbiAgICAgICAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKVxuXG4gICAgICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgICAgICAgIC8vIEV4ZWN1dGUgbm9ybWFsIGRlbGV0ZVxuICAgICAgICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLmV4ZWNDb21tYW5kKERFTEVURV9DTUQpXG4gICAgICAgICAgICAgICAgdXBkYXRlUmVmZXJlbmNlcygpXG5cbiAgICAgICAgICAgICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcbiAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gaWYgdGhlIGN1cnNvciBpcyBhdCB0aGUgYmVnaW5uaW5nIG9mIHRoZSBmaXJzdCBlbXB0eSBwIGluc2lkZSBhIGZvb3Rub3RlLCByZW1vdmUgaXQgYW5kIHVwZGF0ZSB0aGUgcmVmZXJlbmNlc1xuICAgICAgICAgICAgaWYgKHNlbGVjdGlvbkNvbnRlbnQuaXNBdEJlZ2lubmluZ09mRW1wdHlFbmRub3RlKHNlbGVjdGlvbikpIHtcblxuICAgICAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpXG5cbiAgICAgICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgICAgICAgbGV0IGVuZG5vdGUgPSBzZWxlY3RlZEVsZW1lbnQucGFyZW50cyhFTkROT1RFX1NFTEVDVE9SKVxuXG4gICAgICAgICAgICAgICAgLy8gSWYgdGhlIGN1cnJlbnQgZW5kbm90ZSBpcyB0aGUgbGFzdCBvbmUgcmVtb3ZlIHRoZSBlbnRpcmUgZm9vdG5vdGVzIHNlY3Rpb25cbiAgICAgICAgICAgICAgICBpZiAoIWVuZG5vdGUucHJldihFTkROT1RFX1NFTEVDVE9SKS5sZW5ndGggJiYgIWVuZG5vdGUubmV4dChFTkROT1RFX1NFTEVDVE9SKS5sZW5ndGgpXG4gICAgICAgICAgICAgICAgICAkKEVORE5PVEVTX1NFTEVDVE9SKS5yZW1vdmUoKVxuXG4gICAgICAgICAgICAgICAgZWxzZSBcbiAgICAgICAgICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLmV4ZWNDb21tYW5kKERFTEVURV9DTUQpXG4gICAgICAgICAgICAgICAgXG5cbiAgICAgICAgICAgICAgICB1cGRhdGVSZWZlcmVuY2VzKClcblxuICAgICAgICAgICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFByZXZlbnQgcmVtb3ZlIGZyb20gaGVhZGVyXG4gICAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQuaXMoTk9OX0VESVRBQkxFX0hFQURFUl9TRUxFQ1RPUikgfHxcbiAgICAgICAgICAoc2VsZWN0ZWRFbGVtZW50LmF0dHIoJ2RhdGEtbWNlLWNhcmV0JykgPT0gJ2FmdGVyJyAmJiBzZWxlY3RlZEVsZW1lbnQucGFyZW50KCkuaXMoUkFKRV9TRUxFQ1RPUikpIHx8XG4gICAgICAgICAgKHNlbGVjdGVkRWxlbWVudC5hdHRyKCdkYXRhLW1jZS1jYXJldCcpICYmIHNlbGVjdGVkRWxlbWVudC5wYXJlbnQoKS5pcyhSQUpFX1NFTEVDVE9SKSkgPT0gJ2JlZm9yZScpXG4gICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICB9XG5cbiAgICAgIC8qKlxuICAgICAgICogQ2hlY2sgaWYgRU5URVIgaXMgcHJlc3NlZFxuICAgICAgICovXG4gICAgICBpZiAoZS5rZXlDb2RlID09IDEzKSB7XG5cbiAgICAgICAgLy8gV2hlbiBlbnRlciBpcyBwcmVzc2VkIGluc2lkZSBhbiBoZWFkZXIsIG5vdCBhdCB0aGUgZW5kIG9mIGl0XG4gICAgICAgIGlmIChjdXJzb3IuaXNJbnNpZGVIZWFkaW5nKHNlbGVjdGlvbikpIHtcbiAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpXG4gICAgICAgICAgc2VjdGlvbi5hZGRXaXRoRW50ZXIoKVxuICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gSWYgc2VsZWN0aW9uIGlzIGJlZm9yZS9hZnRlciBoZWFkZXJcbiAgICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC5pcygncCcpKSB7XG5cbiAgICAgICAgICAvLyBCbG9jayBlbnRlciBiZWZvcmUgaGVhZGVyXG4gICAgICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC5hdHRyKCdkYXRhLW1jZS1jYXJldCcpID09ICdiZWZvcmUnKSB7XG4gICAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpXG4gICAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgICAgICB9XG5cblxuICAgICAgICAgIC8vIEFkZCBuZXcgc2VjdGlvbiBhZnRlciBoZWFkZXJcbiAgICAgICAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LmF0dHIoJ2RhdGEtbWNlLWNhcmV0JykgPT0gJ2FmdGVyJykge1xuICAgICAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKVxuICAgICAgICAgICAgc2VjdGlvbi5hZGQoMSlcbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIElmIGVudGVyIGlzIHByZXNzZWQgaW5zaWRlIGJpYmxpb2dyYXBoeSBzZWxlY3RvclxuICAgICAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LnBhcmVudHMoQklCTElPR1JBUEhZX1NFTEVDVE9SKS5sZW5ndGgpIHtcblxuICAgICAgICAgIGxldCBpZCA9IGdldFN1Y2Nlc3NpdmVFbGVtZW50SWQoQklCTElPRU5UUllfU0VMRUNUT1IsIEJJQkxJT0VOVFJZX1NVRkZJWClcblxuICAgICAgICAgIC8vIFByZXNzaW5nIGVudGVyIGluIGgxIHdpbGwgYWRkIGEgbmV3IGJpYmxpb2VudHJ5IGFuZCBjYXJldCByZXBvc2l0aW9uXG4gICAgICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC5pcyhIMSkpIHtcblxuICAgICAgICAgICAgc2VjdGlvbi5hZGRCaWJsaW9lbnRyeShpZClcbiAgICAgICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIElmIHNlbGVjdGVkIGVsZW1lbnQgaXMgaW5zaWRlIHRleHRcbiAgICAgICAgICBlbHNlIGlmIChzZWxlY3RlZEVsZW1lbnQuaXMoJ3AnKSlcbiAgICAgICAgICAgIHNlY3Rpb24uYWRkQmlibGlvZW50cnkoaWQsIG51bGwsIHNlbGVjdGVkRWxlbWVudC5wYXJlbnQoJ2xpJykpXG5cbiAgICAgICAgICAvLyBJZiBzZWxlY3RlZCBlbGVtZW50IGlzIHdpdGhvdXQgdGV4dFxuICAgICAgICAgIGVsc2UgaWYgKHNlbGVjdGVkRWxlbWVudC5pcygnbGknKSlcbiAgICAgICAgICAgIHNlY3Rpb24uYWRkQmlibGlvZW50cnkoaWQsIG51bGwsIHNlbGVjdGVkRWxlbWVudClcblxuICAgICAgICAgIC8vIE1vdmUgY2FyZXQgIzEwNVxuICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZXRDdXJzb3JMb2NhdGlvbih0aW55bWNlLmFjdGl2ZUVkaXRvci5kb20uc2VsZWN0KGAke0JJQkxJT0VOVFJZX1NFTEVDVE9SfSMke2lkfSA+IHBgKVswXSwgZmFsc2UpXG4gICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgIH1cblxuICAgICAgICAvLyBBZGRpbmcgc2VjdGlvbnMgd2l0aCBzaG9ydGN1dHMgI1xuICAgICAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LmlzKCdwJykgJiYgc2VsZWN0ZWRFbGVtZW50LnRleHQoKS50cmltKCkuc3Vic3RyaW5nKDAsIDEpID09ICcjJykge1xuXG4gICAgICAgICAgbGV0IGxldmVsID0gc2VjdGlvbi5nZXRMZXZlbEZyb21IYXNoKHNlbGVjdGVkRWxlbWVudC50ZXh0KCkudHJpbSgpKVxuICAgICAgICAgIGxldCBkZWVwbmVzcyA9ICQoc2VsZWN0ZWRFbGVtZW50KS5wYXJlbnRzVW50aWwoUkFKRV9TRUxFQ1RPUikubGVuZ3RoIC0gbGV2ZWwgKyAxXG5cbiAgICAgICAgICAvLyBJbnNlcnQgc2VjdGlvbiBvbmx5IGlmIGNhcmV0IGlzIGluc2lkZSBhYnN0cmFjdCBzZWN0aW9uLCBhbmQgdXNlciBpcyBnb2luZyB0byBpbnNlcnQgYSBzdWIgc2VjdGlvblxuICAgICAgICAgIC8vIE9SIHRoZSBjdXJzb3IgaXNuJ3QgaW5zaWRlIG90aGVyIHNwZWNpYWwgc2VjdGlvbnNcbiAgICAgICAgICAvLyBBTkQgc2VsZWN0ZWRFbGVtZW50IGlzbid0IGluc2lkZSBhIGZpZ3VyZVxuICAgICAgICAgIGlmICgoKHNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKEFCU1RSQUNUX1NFTEVDVE9SKS5sZW5ndGggJiYgZGVlcG5lc3MgPiAwKSB8fCAhc2VsZWN0ZWRFbGVtZW50LnBhcmVudHMoU1BFQ0lBTF9TRUNUSU9OX1NFTEVDVE9SKS5sZW5ndGgpICYmICFzZWxlY3RlZEVsZW1lbnQucGFyZW50cyhGSUdVUkVfU0VMRUNUT1IpLmxlbmd0aCkge1xuXG4gICAgICAgICAgICBzZWN0aW9uLmFkZChsZXZlbCwgc2VsZWN0ZWRFbGVtZW50LnRleHQoKS5zdWJzdHJpbmcobGV2ZWwpLnRyaW0oKSlcbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfSlcblxuICBlZGl0b3Iub24oJ05vZGVDaGFuZ2UnLCBmdW5jdGlvbiAoZSkge1xuICAgIHNlY3Rpb24udXBkYXRlU2VjdGlvblRvb2xiYXIoKVxuICB9KVxufSlcblxuc2VjdGlvbiA9IHtcblxuICAvKipcbiAgICogRnVuY3Rpb24gY2FsbGVkIHdoZW4gYSBuZXcgc2VjdGlvbiBuZWVkcyB0byBiZSBhdHRhY2hlZCwgd2l0aCBidXR0b25zXG4gICAqL1xuICBhZGQ6IChsZXZlbCwgdGV4dCkgPT4ge1xuXG4gICAgLy8gU2VsZWN0IGN1cnJlbnQgbm9kZVxuICAgIGxldCBzZWxlY3RlZEVsZW1lbnQgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG5cbiAgICAvLyBDcmVhdGUgdGhlIHNlY3Rpb25cbiAgICBsZXQgbmV3U2VjdGlvbiA9IHNlY3Rpb24uY3JlYXRlKHRleHQgIT0gbnVsbCA/IHRleHQgOiBzZWxlY3RlZEVsZW1lbnQuaHRtbCgpLnRyaW0oKSwgbGV2ZWwpXG5cbiAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgIC8vIENoZWNrIHdoYXQga2luZCBvZiBzZWN0aW9uIG5lZWRzIHRvIGJlIGluc2VydGVkXG4gICAgICBpZiAoc2VjdGlvbi5tYW5hZ2VTZWN0aW9uKHNlbGVjdGVkRWxlbWVudCwgbmV3U2VjdGlvbiwgbGV2ZWwgPyBsZXZlbCA6IHNlbGVjdGVkRWxlbWVudC5wYXJlbnRzVW50aWwoUkFKRV9TRUxFQ1RPUikubGVuZ3RoKSkge1xuXG4gICAgICAgIC8vIFJlbW92ZSB0aGUgc2VsZWN0ZWQgc2VjdGlvblxuICAgICAgICBzZWxlY3RlZEVsZW1lbnQucmVtb3ZlKClcblxuICAgICAgICAvLyBJZiB0aGUgbmV3IGhlYWRpbmcgaGFzIHRleHQgbm9kZXMsIHRoZSBvZmZzZXQgd29uJ3QgYmUgMCAoYXMgbm9ybWFsKSBidXQgaW5zdGVhZCBpdCdsbCBiZSBsZW5ndGggb2Ygbm9kZSB0ZXh0XG4gICAgICAgIG1vdmVDYXJldChuZXdTZWN0aW9uLmZpbmQoJzpoZWFkZXInKS5maXJzdCgpWzBdKVxuXG4gICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuICAgICAgfVxuICAgIH0pXG4gIH0sXG5cbiAgLyoqXG4gICAqIFxuICAgKi9cbiAgYWRkT3JEb3duVXBncmFkZTogKGUsIGxldmVsKSA9PiB7XG5cbiAgICBsZXQgc2VsZWN0ZWRNZW51SXRlbSA9ICQoZS50YXJnZXQpLnBhcmVudCgnLm1jZS1tZW51LWl0ZW0nKVxuXG4gICAgLy8gVXBncmFkZSB0aGUgaGVhZGVyIHNlbGVjdGVkIGZyb20gaWZyYW1lXG4gICAgaWYgKHNlbGVjdGVkTWVudUl0ZW0uYXR0cihEQVRBX1VQR1JBREUpKVxuICAgICAgcmV0dXJuIHRoaXMudXBncmFkZSgpXG5cbiAgICAvLyBEb3duZ3JhZGUgdGhlIGhlYWRlciBzZWxlY3RlZCBmcm9tIGlmcmFtZVxuICAgIGlmIChzZWxlY3RlZE1lbnVJdGVtLmF0dHIoREFUQV9ET1dOR1JBREUpKVxuICAgICAgcmV0dXJuIHRoaXMuZG93bmdyYWRlKClcblxuICAgIC8vIFRyYW5zZm9ybSB0aGUgcGFyYWdyYXBoIHNlbGVjdGVkIGZyb20gaWZyYW1lXG4gICAgcmV0dXJuIHRoaXMuYWRkKGxldmVsKVxuICB9LFxuXG4gIC8qKlxuICAgKiBGdW5jdGlvbiBjYWxsZWQgd2hlbiBhIG5ldyBzZWN0aW9uIG5lZWRzIHRvIGJlIGF0dGFjaGVkLCB3aXRoIGJ1dHRvbnNcbiAgICovXG4gIGFkZFdpdGhFbnRlcjogZnVuY3Rpb24gKCkge1xuXG4gICAgLy8gU2VsZWN0IGN1cnJlbnQgbm9kZVxuICAgIGxldCBzZWxlY3RlZEVsZW1lbnQgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG5cbiAgICAvLyBJZiB0aGUgc2VjdGlvbiBpc24ndCBzcGVjaWFsXG4gICAgaWYgKCFzZWxlY3RlZEVsZW1lbnQucGFyZW50KCkuYXR0cigncm9sZScpKSB7XG5cbiAgICAgIGxldmVsID0gc2VsZWN0ZWRFbGVtZW50LnBhcmVudHNVbnRpbChSQUpFX1NFTEVDVE9SKS5sZW5ndGhcblxuICAgICAgLy8gQ3JlYXRlIHRoZSBzZWN0aW9uXG4gICAgICBsZXQgbmV3U2VjdGlvbiA9IHRoaXMuY3JlYXRlKHNlbGVjdGVkRWxlbWVudC50ZXh0KCkudHJpbSgpLnN1YnN0cmluZyh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Um5nKCkuc3RhcnRPZmZzZXQpLCBsZXZlbClcblxuICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIC8vIENoZWNrIHdoYXQga2luZCBvZiBzZWN0aW9uIG5lZWRzIHRvIGJlIGluc2VydGVkXG4gICAgICAgIHNlY3Rpb24ubWFuYWdlU2VjdGlvbihzZWxlY3RlZEVsZW1lbnQsIG5ld1NlY3Rpb24sIGxldmVsKVxuXG4gICAgICAgIC8vIFJlbW92ZSB0aGUgc2VsZWN0ZWQgc2VjdGlvblxuICAgICAgICBzZWxlY3RlZEVsZW1lbnQuaHRtbChzZWxlY3RlZEVsZW1lbnQudGV4dCgpLnRyaW0oKS5zdWJzdHJpbmcoMCwgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldFJuZygpLnN0YXJ0T2Zmc2V0KSlcblxuICAgICAgICBtb3ZlQ2FyZXQobmV3U2VjdGlvbi5maW5kKCc6aGVhZGVyJykuZmlyc3QoKVswXSwgdHJ1ZSlcblxuICAgICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcbiAgICAgIH0pXG4gICAgfSBlbHNlXG4gICAgICBub3RpZnkoJ0Vycm9yLCBoZWFkZXJzIG9mIHNwZWNpYWwgc2VjdGlvbnMgKGFic3RyYWN0LCBhY2tub3dsZWRtZW50cykgY2Fubm90IGJlIHNwbGl0dGVkJywgJ2Vycm9yJywgNDAwMClcbiAgfSxcblxuICAvKipcbiAgICogR2V0IHRoZSBsYXN0IGluc2VydGVkIGlkXG4gICAqL1xuICBnZXROZXh0SWQ6IGZ1bmN0aW9uICgpIHtcbiAgICBsZXQgaWQgPSAwXG4gICAgdGlueW1jZS5hY3RpdmVFZGl0b3IuJCgnc2VjdGlvbltpZF0nKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgIGlmICgkKHRoaXMpLmF0dHIoJ2lkJykuaW5kZXhPZignc2VjdGlvbicpID4gLTEpIHtcbiAgICAgICAgbGV0IGN1cnJJZCA9IHBhcnNlSW50KCQodGhpcykuYXR0cignaWQnKS5yZXBsYWNlKCdzZWN0aW9uJywgJycpKVxuICAgICAgICBpZCA9IGlkID4gY3VycklkID8gaWQgOiBjdXJySWRcbiAgICAgIH1cbiAgICB9KVxuICAgIHJldHVybiBgc2VjdGlvbiR7aWQrMX1gXG4gIH0sXG5cbiAgLyoqXG4gICAqIFJldHJpZXZlIGFuZCB0aGVuIHJlbW92ZSBldmVyeSBzdWNjZXNzaXZlIGVsZW1lbnRzIFxuICAgKi9cbiAgZ2V0U3VjY2Vzc2l2ZUVsZW1lbnRzOiBmdW5jdGlvbiAoZWxlbWVudCwgZGVlcG5lc3MpIHtcblxuICAgIGxldCBzdWNjZXNzaXZlRWxlbWVudHMgPSAkKCc8ZGl2PjwvZGl2PicpXG5cbiAgICB3aGlsZSAoZGVlcG5lc3MgPj0gMCkge1xuXG4gICAgICBpZiAoZWxlbWVudC5uZXh0QWxsKCc6bm90KC5mb290ZXIpJykpIHtcblxuICAgICAgICAvLyBJZiB0aGUgZGVlcG5lc3MgaXMgMCwgb25seSBwYXJhZ3JhcGggYXJlIHNhdmVkIChub3Qgc2VjdGlvbnMpXG4gICAgICAgIGlmIChkZWVwbmVzcyA9PSAwKSB7XG4gICAgICAgICAgLy8gU3VjY2Vzc2l2ZSBlbGVtZW50cyBjYW4gYmUgcCBvciBmaWd1cmVzXG4gICAgICAgICAgc3VjY2Vzc2l2ZUVsZW1lbnRzLmFwcGVuZChlbGVtZW50Lm5leHRBbGwoYHAsJHtGSUdVUkVfU0VMRUNUT1J9YCkpXG4gICAgICAgICAgZWxlbWVudC5uZXh0QWxsKCkucmVtb3ZlKGBwLCR7RklHVVJFX1NFTEVDVE9SfWApXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc3VjY2Vzc2l2ZUVsZW1lbnRzLmFwcGVuZChlbGVtZW50Lm5leHRBbGwoKSlcbiAgICAgICAgICBlbGVtZW50Lm5leHRBbGwoKS5yZW1vdmUoKVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGVsZW1lbnQgPSBlbGVtZW50LnBhcmVudCgnc2VjdGlvbicpXG4gICAgICBkZWVwbmVzcy0tXG4gICAgfVxuXG4gICAgcmV0dXJuICQoc3VjY2Vzc2l2ZUVsZW1lbnRzLmh0bWwoKSlcbiAgfSxcblxuICAvKipcbiAgICogXG4gICAqL1xuICBnZXRMZXZlbEZyb21IYXNoOiBmdW5jdGlvbiAodGV4dCkge1xuXG4gICAgbGV0IGxldmVsID0gMFxuICAgIHRleHQgPSB0ZXh0LnN1YnN0cmluZygwLCB0ZXh0Lmxlbmd0aCA+PSA2ID8gNiA6IHRleHQubGVuZ3RoKVxuXG4gICAgd2hpbGUgKHRleHQubGVuZ3RoID4gMCkge1xuXG4gICAgICBpZiAodGV4dC5zdWJzdHJpbmcodGV4dC5sZW5ndGggLSAxKSA9PSAnIycpXG4gICAgICAgIGxldmVsKytcblxuICAgICAgICB0ZXh0ID0gdGV4dC5zdWJzdHJpbmcoMCwgdGV4dC5sZW5ndGggLSAxKVxuICAgIH1cblxuICAgIHJldHVybiBsZXZlbFxuICB9LFxuXG4gIC8qKlxuICAgKiBSZXR1cm4gSlFldXJ5IG9iamVjdCB0aGF0IHJlcHJlc2VudCB0aGUgc2VjdGlvblxuICAgKi9cbiAgY3JlYXRlOiBmdW5jdGlvbiAodGV4dCwgbGV2ZWwpIHtcblxuICAgIC8vIFRyaW0gd2hpdGUgc3BhY2VzIGFuZCBhZGQgemVyb19zcGFjZSBjaGFyIGlmIG5vdGhpbmcgaXMgaW5zaWRlXG4gICAgaWYgKHR5cGVvZiB0ZXh0ICE9IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgIHRleHQgPSB0ZXh0LnRyaW0oKVxuICAgICAgaWYgKHRleHQubGVuZ3RoID09IDApXG4gICAgICAgIHRleHQgPSBcIjxicj5cIlxuICAgIH0gZWxzZVxuICAgICAgdGV4dCA9IFwiPGJyPlwiXG5cbiAgICByZXR1cm4gJChgPHNlY3Rpb24gaWQ9XCIke3RoaXMuZ2V0TmV4dElkKCl9XCI+PGgke2xldmVsfSBkYXRhLXJhc2gtb3JpZ2luYWwtd3JhcHBlcj1cImgxXCI+JHt0ZXh0fTwvaCR7bGV2ZWx9Pjwvc2VjdGlvbj5gKVxuICB9LFxuXG4gIC8qKlxuICAgKiBDaGVjayB3aGF0IGtpbmQgb2Ygc2VjdGlvbiBuZWVkcyB0byBiZSBhZGRlZCwgYW5kIHByZWNlZWRcbiAgICovXG4gIG1hbmFnZVNlY3Rpb246IGZ1bmN0aW9uIChzZWxlY3RlZEVsZW1lbnQsIG5ld1NlY3Rpb24sIGxldmVsKSB7XG5cbiAgICBsZXQgZGVlcG5lc3MgPSAkKHNlbGVjdGVkRWxlbWVudCkucGFyZW50c1VudGlsKCdib2R5JykubGVuZ3RoIC0gbGV2ZWwgKyAxXG5cbiAgICBpZiAoZGVlcG5lc3MgPj0gMCkge1xuXG4gICAgICAvLyBCbG9jayBpbnNlcnQgc2VsZWN0aW9uIGlmIGNhcmV0IGlzIGluc2lkZSBzcGVjaWFsIHNlY3Rpb24sIGFuZCB1c2VyIGlzIGdvaW5nIHRvIGluc2VydCBhIHN1YiBzZWN0aW9uXG4gICAgICBpZiAoKHNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKFNQRUNJQUxfU0VDVElPTl9TRUxFQ1RPUikubGVuZ3RoICYmIGRlZXBuZXNzICE9IDEpIHx8IChzZWxlY3RlZEVsZW1lbnQucGFyZW50cyhBQ0tOT1dMRURHRU1FTlRTX1NFTEVDVE9SKS5sZW5ndGggJiZcbiAgICAgICAgICBzZWxlY3RlZEVsZW1lbnQucGFyZW50cyhCSUJMSU9HUkFQSFlfU0VMRUNUT1IpICYmXG4gICAgICAgICAgc2VsZWN0ZWRFbGVtZW50LnBhcmVudHMoRU5ETk9URVNfU0VMRUNUT1IpKSlcbiAgICAgICAgcmV0dXJuIGZhbHNlXG5cbiAgICAgIC8vIEdldCBkaXJlY3QgcGFyZW50IGFuZCBhbmNlc3RvciByZWZlcmVuY2VcbiAgICAgIGxldCBzdWNjZXNzaXZlRWxlbWVudHMgPSB0aGlzLmdldFN1Y2Nlc3NpdmVFbGVtZW50cyhzZWxlY3RlZEVsZW1lbnQsIGRlZXBuZXNzKVxuXG4gICAgICBpZiAoc3VjY2Vzc2l2ZUVsZW1lbnRzLmxlbmd0aClcbiAgICAgICAgbmV3U2VjdGlvbi5hcHBlbmQoc3VjY2Vzc2l2ZUVsZW1lbnRzKVxuXG4gICAgICAvLyBDQVNFOiBzdWIgc2VjdGlvblxuICAgICAgaWYgKGRlZXBuZXNzID09IDApXG4gICAgICAgIHNlbGVjdGVkRWxlbWVudC5hZnRlcihuZXdTZWN0aW9uKVxuXG4gICAgICAvLyBDQVNFOiBzaWJsaW5nIHNlY3Rpb25cbiAgICAgIGVsc2UgaWYgKGRlZXBuZXNzID09IDEpXG4gICAgICAgIHNlbGVjdGVkRWxlbWVudC5wYXJlbnQoJ3NlY3Rpb24nKS5hZnRlcihuZXdTZWN0aW9uKVxuXG4gICAgICAvLyBDQVNFOiBhbmNlc3RvciBzZWN0aW9uIGF0IGFueSB1cGxldmVsXG4gICAgICBlbHNlXG4gICAgICAgICQoc2VsZWN0ZWRFbGVtZW50LnBhcmVudHMoJ3NlY3Rpb24nKVtkZWVwbmVzcyAtIDFdKS5hZnRlcihuZXdTZWN0aW9uKVxuXG4gICAgICBoZWFkaW5nRGltZW5zaW9uKClcblxuICAgICAgcmV0dXJuIHRydWVcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIFxuICAgKi9cbiAgdXBncmFkZTogZnVuY3Rpb24gKCkge1xuXG4gICAgbGV0IHNlbGVjdGVkRWxlbWVudCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcblxuICAgIGlmIChzZWxlY3RlZEVsZW1lbnQuaXMoJzpoZWFkZXInKSkge1xuXG4gICAgICAvLyBHZXQgdGhlIHJlZmVyZW5jZXMgb2Ygc2VsZWN0ZWQgYW5kIHBhcmVudCBzZWN0aW9uXG4gICAgICBsZXQgc2VsZWN0ZWRTZWN0aW9uID0gc2VsZWN0ZWRFbGVtZW50LnBhcmVudChTRUNUSU9OX1NFTEVDVE9SKVxuICAgICAgbGV0IHBhcmVudFNlY3Rpb24gPSBzZWxlY3RlZFNlY3Rpb24ucGFyZW50KFNFQ1RJT05fU0VMRUNUT1IpXG5cbiAgICAgIC8vIElmIHRoZXJlIGlzIGEgcGFyZW50IHNlY3Rpb24sIHRoZSB1cGdyYWRlIGlzIGFsbG93ZWRcbiAgICAgIGlmIChwYXJlbnRTZWN0aW9uLmxlbmd0aCkge1xuXG4gICAgICAgIC8vIEV2ZXJ5dGhpbmcgaW4gaGVyZSwgaXMgYW4gYXRvbWljIHVuZG8gbGV2ZWxcbiAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgLy8gU2F2ZSB0aGUgc2VjdGlvbiBhbmQgZGV0YWNoXG4gICAgICAgICAgbGV0IGJvZHlTZWN0aW9uID0gJChzZWxlY3RlZFNlY3Rpb25bMF0ub3V0ZXJIVE1MKVxuICAgICAgICAgIHNlbGVjdGVkU2VjdGlvbi5kZXRhY2goKVxuXG4gICAgICAgICAgLy8gVXBkYXRlIGRpbWVuc2lvbiBhbmQgbW92ZSB0aGUgc2VjdGlvbiBvdXRcbiAgICAgICAgICBwYXJlbnRTZWN0aW9uLmFmdGVyKGJvZHlTZWN0aW9uKVxuXG4gICAgICAgICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG4gICAgICAgICAgaGVhZGluZ0RpbWVuc2lvbigpXG4gICAgICAgIH0pXG4gICAgICB9XG5cbiAgICAgIC8vIE5vdGlmeSBlcnJvclxuICAgICAgZWxzZVxuICAgICAgICBub3RpZnkoSEVBRElOR19UUkFTRk9STUFUSU9OX0ZPUkJJRERFTiwgJ2Vycm9yJywgMjAwMClcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIFxuICAgKi9cbiAgZG93bmdyYWRlOiBmdW5jdGlvbiAoKSB7XG5cbiAgICBsZXQgc2VsZWN0ZWRFbGVtZW50ID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuXG4gICAgaWYgKHNlbGVjdGVkRWxlbWVudC5pcygnaDEsaDIsaDMsaDQsaDUsaDYnKSkge1xuICAgICAgLy8gR2V0IHRoZSByZWZlcmVuY2VzIG9mIHNlbGVjdGVkIGFuZCBzaWJsaW5nIHNlY3Rpb25cbiAgICAgIGxldCBzZWxlY3RlZFNlY3Rpb24gPSBzZWxlY3RlZEVsZW1lbnQucGFyZW50KFNFQ1RJT05fU0VMRUNUT1IpXG4gICAgICBsZXQgc2libGluZ1NlY3Rpb24gPSBzZWxlY3RlZFNlY3Rpb24ucHJldihTRUNUSU9OX1NFTEVDVE9SKVxuXG4gICAgICAvLyBJZiB0aGVyZSBpcyBhIHByZXZpb3VzIHNpYmxpbmcgc2VjdGlvbiBkb3duZ3JhZGUgaXMgYWxsb3dlZFxuICAgICAgaWYgKHNpYmxpbmdTZWN0aW9uLmxlbmd0aCkge1xuXG4gICAgICAgIC8vIEV2ZXJ5dGhpbmcgaW4gaGVyZSwgaXMgYW4gYXRvbWljIHVuZG8gbGV2ZWxcbiAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgLy8gU2F2ZSB0aGUgc2VjdGlvbiBhbmQgZGV0YWNoXG4gICAgICAgICAgbGV0IGJvZHlTZWN0aW9uID0gJChzZWxlY3RlZFNlY3Rpb25bMF0ub3V0ZXJIVE1MKVxuICAgICAgICAgIHNlbGVjdGVkU2VjdGlvbi5kZXRhY2goKVxuXG4gICAgICAgICAgLy8gVXBkYXRlIGRpbWVuc2lvbiBhbmQgbW92ZSB0aGUgc2VjdGlvbiBvdXRcbiAgICAgICAgICBzaWJsaW5nU2VjdGlvbi5hcHBlbmQoYm9keVNlY3Rpb24pXG5cbiAgICAgICAgICAvLyBSZWZyZXNoIHRpbnltY2UgY29udGVudCBhbmQgc2V0IHRoZSBoZWFkaW5nIGRpbWVuc2lvblxuICAgICAgICAgIGhlYWRpbmdEaW1lbnNpb24oKVxuICAgICAgICB9KVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIE5vdGlmeSBlcnJvclxuICAgIGVsc2VcbiAgICAgIG5vdGlmeShIRUFESU5HX1RSQVNGT1JNQVRJT05fRk9SQklEREVOLCAnZXJyb3InLCAyMDAwKVxuICB9LFxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGFkZEFic3RyYWN0OiBmdW5jdGlvbiAoKSB7XG5cbiAgICBpZiAoIXRpbnltY2UuYWN0aXZlRWRpdG9yLiQoQUJTVFJBQ1RfU0VMRUNUT1IpLmxlbmd0aCkge1xuXG4gICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgLy8gVGhpcyBzZWN0aW9uIGNhbiBvbmx5IGJlIHBsYWNlZCBhZnRlciBub24gZWRpdGFibGUgaGVhZGVyXG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLiQoTk9OX0VESVRBQkxFX0hFQURFUl9TRUxFQ1RPUikuYWZ0ZXIoYDxzZWN0aW9uIGlkPVwiZG9jLWFic3RyYWN0XCIgcm9sZT1cImRvYy1hYnN0cmFjdFwiPjxoMT5BYnN0cmFjdDwvaDE+PC9zZWN0aW9uPmApXG4gICAgICB9KVxuICAgIH1cblxuICAgIC8vbW92ZSBjYXJldCBhbmQgc2V0IGZvY3VzIHRvIGFjdGl2ZSBhZGl0b3IgIzEwNVxuICAgIG1vdmVDYXJldCh0aW55bWNlLmFjdGl2ZUVkaXRvci5kb20uc2VsZWN0KGAke0FCU1RSQUNUX1NFTEVDVE9SfSA+IGgxYClbMF0pXG4gICAgc2Nyb2xsVG8oQUJTVFJBQ1RfU0VMRUNUT1IpXG4gIH0sXG5cbiAgLyoqXG4gICAqIFxuICAgKi9cbiAgYWRkQWNrbm93bGVkZ2VtZW50czogZnVuY3Rpb24gKCkge1xuXG4gICAgaWYgKCF0aW55bWNlLmFjdGl2ZUVkaXRvci4kKEFDS05PV0xFREdFTUVOVFNfU0VMRUNUT1IpLmxlbmd0aCkge1xuXG4gICAgICBsZXQgYWNrID0gJChgPHNlY3Rpb24gaWQ9XCJkb2MtYWNrbm93bGVkZ2VtZW50c1wiIHJvbGU9XCJkb2MtYWNrbm93bGVkZ2VtZW50c1wiPjxoMT5BY2tub3dsZWRnZW1lbnRzPC9oMT48L3NlY3Rpb24+YClcblxuICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIC8vIEluc2VydCB0aGlzIHNlY3Rpb24gYWZ0ZXIgbGFzdCBub24gc3BlY2lhbCBzZWN0aW9uIFxuICAgICAgICAvLyBPUiBhZnRlciBhYnN0cmFjdCBzZWN0aW9uIFxuICAgICAgICAvLyBPUiBhZnRlciBub24gZWRpdGFibGUgaGVhZGVyXG4gICAgICAgIGlmICh0aW55bWNlLmFjdGl2ZUVkaXRvci4kKE1BSU5fU0VDVElPTl9TRUxFQ1RPUikubGVuZ3RoKVxuICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLiQoTUFJTl9TRUNUSU9OX1NFTEVDVE9SKS5sYXN0KCkuYWZ0ZXIoYWNrKVxuXG4gICAgICAgIGVsc2UgaWYgKHRpbnltY2UuYWN0aXZlRWRpdG9yLiQoQUJTVFJBQ1RfU0VMRUNUT1IpLmxlbmd0aClcbiAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci4kKEFCU1RSQUNUX1NFTEVDVE9SKS5hZnRlcihhY2spXG5cbiAgICAgICAgZWxzZVxuICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLiQoTk9OX0VESVRBQkxFX0hFQURFUl9TRUxFQ1RPUikuYWZ0ZXIoYWNrKVxuICAgICAgfSlcbiAgICB9XG5cbiAgICAvL21vdmUgY2FyZXQgYW5kIHNldCBmb2N1cyB0byBhY3RpdmUgYWRpdG9yICMxMDVcbiAgICBtb3ZlQ2FyZXQodGlueW1jZS5hY3RpdmVFZGl0b3IuZG9tLnNlbGVjdChgJHtBQ0tOT1dMRURHRU1FTlRTX1NFTEVDVE9SfSA+IGgxYClbMF0pXG4gICAgc2Nyb2xsVG8oQUNLTk9XTEVER0VNRU5UU19TRUxFQ1RPUilcbiAgfSxcblxuICBoYW5kbGVBZGRCbGlibGlvZW50cnk6IGZ1bmN0aW9uICgpIHtcblxuICAgIC8vIE9ubHkgaWYgYmlibGlvZ3JhcGh5IHNlY3Rpb24gZG9lc24ndCBleGlzdHNcbiAgICBpZiAoIXRpbnltY2UuYWN0aXZlRWRpdG9yLiQoQklCTElPR1JBUEhZX1NFTEVDVE9SKS5sZW5ndGgpIHtcblxuICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIC8vIEFkZCBuZXcgYmlibGlvZW50cnlcbiAgICAgICAgc2VjdGlvbi5hZGRCaWJsaW9lbnRyeSgpXG5cbiAgICAgICAgLy9tb3ZlIGNhcmV0IGFuZCBzZXQgZm9jdXMgdG8gYWN0aXZlIGFkaXRvciAjMTA1XG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZWxlY3QodGlueW1jZS5hY3RpdmVFZGl0b3IuZG9tLnNlbGVjdChgJHtCSUJMSU9FTlRSWV9TRUxFQ1RPUn06bGFzdC1jaGlsZGApWzBdLCB0cnVlKVxuICAgICAgfSlcbiAgICB9IGVsc2VcbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZWxlY3QodGlueW1jZS5hY3RpdmVFZGl0b3IuZG9tLnNlbGVjdChgJHtCSUJMSU9HUkFQSFlfU0VMRUNUT1J9PmgxYClbMF0pXG5cbiAgICBzY3JvbGxUbyhgJHtCSUJMSU9FTlRSWV9TRUxFQ1RPUn06bGFzdC1jaGlsZGApXG4gICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG4gICAgdGlueW1jZS5hY3RpdmVFZGl0b3IuZm9jdXMoKVxuICB9LFxuXG4gIC8qKlxuICAgKiBUaGlzIG1ldGhvZCBpcyB0aGUgbWFpbiBvbmUuIEl0J3MgY2FsbGVkIGJlY2F1c2UgYWxsIHRpbWVzIHRoZSBpbnRlbnQgaXMgdG8gYWRkIGEgbmV3IGJpYmxpb2VudHJ5IChzaW5nbGUgcmVmZXJlbmNlKVxuICAgKiBUaGVuIGl0IGNoZWNrcyBpZiBpcyBuZWNlc3NhcnkgdG8gYWRkIHRoZSBlbnRpcmUgPHNlY3Rpb24+IG9yIG9ubHkgdGhlIG1pc3NpbmcgPHVsPlxuICAgKi9cbiAgYWRkQmlibGlvZW50cnk6IGZ1bmN0aW9uIChpZCwgdGV4dCwgbGlzdEl0ZW0pIHtcblxuICAgIC8vIEFkZCBiaWJsaW9ncmFwaHkgc2VjdGlvbiBpZiBub3QgZXhpc3RzXG4gICAgaWYgKCF0aW55bWNlLmFjdGl2ZUVkaXRvci4kKEJJQkxJT0dSQVBIWV9TRUxFQ1RPUikubGVuZ3RoKSB7XG5cbiAgICAgIGxldCBiaWJsaW9ncmFwaHkgPSAkKGA8c2VjdGlvbiBpZD1cImRvYy1iaWJsaW9ncmFwaHlcIiByb2xlPVwiZG9jLWJpYmxpb2dyYXBoeVwiPjxoMT5SZWZlcmVuY2VzPC9oMT48dWw+PC91bD48L3NlY3Rpb24+YClcblxuICAgICAgLy8gVGhpcyBzZWN0aW9uIGlzIGFkZGVkIGFmdGVyIGFja25vd2xlZGdlbWVudHMgc2VjdGlvblxuICAgICAgLy8gT1IgYWZ0ZXIgbGFzdCBub24gc3BlY2lhbCBzZWN0aW9uXG4gICAgICAvLyBPUiBhZnRlciBhYnN0cmFjdCBzZWN0aW9uXG4gICAgICAvLyBPUiBhZnRlciBub24gZWRpdGFibGUgaGVhZGVyIFxuICAgICAgaWYgKHRpbnltY2UuYWN0aXZlRWRpdG9yLiQoQUNLTk9XTEVER0VNRU5UU19TRUxFQ1RPUikubGVuZ3RoKVxuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci4kKEFDS05PV0xFREdFTUVOVFNfU0VMRUNUT1IpLmFmdGVyKGJpYmxpb2dyYXBoeSlcblxuICAgICAgZWxzZSBpZiAodGlueW1jZS5hY3RpdmVFZGl0b3IuJChNQUlOX1NFQ1RJT05fU0VMRUNUT1IpLmxlbmd0aClcbiAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IuJChNQUlOX1NFQ1RJT05fU0VMRUNUT1IpLmxhc3QoKS5hZnRlcihiaWJsaW9ncmFwaHkpXG5cbiAgICAgIGVsc2UgaWYgKHRpbnltY2UuYWN0aXZlRWRpdG9yLiQoQUJTVFJBQ1RfU0VMRUNUT1IpLmxlbmd0aClcbiAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IuJChBQlNUUkFDVF9TRUxFQ1RPUikuYWZ0ZXIoYmlibGlvZ3JhcGh5KVxuXG4gICAgICBlbHNlXG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLiQoTk9OX0VESVRBQkxFX0hFQURFUl9TRUxFQ1RPUikuYWZ0ZXIoYmlibGlvZ3JhcGh5KVxuXG4gICAgfVxuXG4gICAgLy8gQWRkIHVsIGluIGJpYmxpb2dyYXBoeSBzZWN0aW9uIGlmIG5vdCBleGlzdHNcbiAgICBpZiAoIXRpbnltY2UuYWN0aXZlRWRpdG9yLiQoQklCTElPR1JBUEhZX1NFTEVDVE9SKS5maW5kKCd1bCcpLmxlbmd0aClcbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLiQoQklCTElPR1JBUEhZX1NFTEVDVE9SKS5hcHBlbmQoJzx1bD48L3VsPicpXG5cbiAgICAvLyBJRiBpZCBhbmQgdGV4dCBhcmVuJ3QgcGFzc2VkIGFzIHBhcmFtZXRlcnMsIHRoZXNlIGNhbiBiZSByZXRyaWV2ZWQgb3IgaW5pdCBmcm9tIGhlcmVcbiAgICBpZCA9IChpZCkgPyBpZCA6IGdldFN1Y2Nlc3NpdmVFbGVtZW50SWQoQklCTElPRU5UUllfU0VMRUNUT1IsIEJJQkxJT0VOVFJZX1NVRkZJWClcbiAgICB0ZXh0ID0gdGV4dCA/IHRleHQgOiAnPGJyLz4nXG5cbiAgICBsZXQgbmV3SXRlbSA9ICQoYDxsaSByb2xlPVwiZG9jLWJpYmxpb2VudHJ5XCIgaWQ9XCIke2lkfVwiPjxwPiR7dGV4dH08L3A+PC9saT5gKVxuXG4gICAgLy8gQXBwZW5kIG5ldyBsaSB0byB1bCBhdCBsYXN0IHBvc2l0aW9uXG4gICAgLy8gT1IgaW5zZXJ0IHRoZSBuZXcgbGkgcmlnaHQgYWZ0ZXIgdGhlIGN1cnJlbnQgb25lXG4gICAgaWYgKCFsaXN0SXRlbSlcbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLiQoYCR7QklCTElPR1JBUEhZX1NFTEVDVE9SfSB1bGApLmFwcGVuZChuZXdJdGVtKVxuXG4gICAgZWxzZVxuICAgICAgbGlzdEl0ZW0uYWZ0ZXIobmV3SXRlbSlcbiAgfSxcblxuICAvKipcbiAgICogXG4gICAqL1xuICB1cGRhdGVCaWJsaW9ncmFwaHlTZWN0aW9uOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAvLyBSZW1vdmUgYWxsIHNlY3Rpb25zIHdpdGhvdXQgcCBjaGlsZFxuICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLiQoYCR7QklCTElPRU5UUllfU0VMRUNUT1J9Om5vdCg6aGFzKHApKWApLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgJCh0aGlzKS5yZW1vdmUoKVxuICAgIH0pXG4gIH0sXG5cbiAgLyoqXG4gICAqIFxuICAgKi9cbiAgYWRkRW5kbm90ZTogZnVuY3Rpb24gKGlkKSB7XG5cbiAgICAvLyBBZGQgdGhlIHNlY3Rpb24gaWYgaXQgbm90IGV4aXN0c1xuICAgIGlmICghJChFTkROT1RFX1NFTEVDVE9SKS5sZW5ndGgpIHtcblxuICAgICAgbGV0IGVuZG5vdGVzID0gJChgPHNlY3Rpb24gaWQ9XCJkb2MtZW5kbm90ZXNcIiByb2xlPVwiZG9jLWVuZG5vdGVzXCI+PGgxIGRhdGEtcmFzaC1vcmlnaW5hbC1jb250ZW50PVwiXCI+Rm9vdG5vdGVzPC9oMT48L3NlY3Rpb24+YClcblxuICAgICAgLy8gSW5zZXJ0IHRoaXMgc2VjdGlvbiBhZnRlciBiaWJsaW9ncmFwaHkgc2VjdGlvblxuICAgICAgLy8gT1IgYWZ0ZXIgYWNrbm93bGVkZ2VtZW50cyBzZWN0aW9uXG4gICAgICAvLyBPUiBhZnRlciBub24gc3BlY2lhbCBzZWN0aW9uIHNlbGVjdG9yXG4gICAgICAvLyBPUiBhZnRlciBhYnN0cmFjdCBzZWN0aW9uXG4gICAgICAvLyBPUiBhZnRlciBub24gZWRpdGFibGUgaGVhZGVyIFxuICAgICAgaWYgKCQoQklCTElPR1JBUEhZX1NFTEVDVE9SKS5sZW5ndGgpXG4gICAgICAgICQoQklCTElPR1JBUEhZX1NFTEVDVE9SKS5hZnRlcihlbmRub3RlcylcblxuICAgICAgZWxzZSBpZiAoJChBQ0tOT1dMRURHRU1FTlRTX1NFTEVDVE9SKS5sZW5ndGgpXG4gICAgICAgICQoQUNLTk9XTEVER0VNRU5UU19TRUxFQ1RPUikuYWZ0ZXIoZW5kbm90ZXMpXG5cbiAgICAgIGVsc2UgaWYgKCQoTUFJTl9TRUNUSU9OX1NFTEVDVE9SKS5sZW5ndGgpXG4gICAgICAgICQoTUFJTl9TRUNUSU9OX1NFTEVDVE9SKS5sYXN0KCkuYWZ0ZXIoZW5kbm90ZXMpXG5cbiAgICAgIGVsc2UgaWYgKCQoQUJTVFJBQ1RfU0VMRUNUT1IpLmxlbmd0aClcbiAgICAgICAgJChBQlNUUkFDVF9TRUxFQ1RPUikuYWZ0ZXIoZW5kbm90ZXMpXG5cbiAgICAgIGVsc2VcbiAgICAgICAgJChOT05fRURJVEFCTEVfSEVBREVSX1NFTEVDVE9SKS5hZnRlcihlbmRub3RlcylcbiAgICB9XG5cbiAgICAvLyBDcmVhdGUgYW5kIGFwcGVuZCB0aGUgbmV3IGVuZG5vdGVcbiAgICBsZXQgZW5kbm90ZSA9ICQoYDxzZWN0aW9uIHJvbGU9XCJkb2MtZW5kbm90ZVwiIGlkPVwiJHtpZH1cIj48cD48YnIvPjwvcD48L3NlY3Rpb24+YClcbiAgICAkKEVORE5PVEVTX1NFTEVDVE9SKS5hcHBlbmQoZW5kbm90ZSlcbiAgfSxcblxuICAvKipcbiAgICogXG4gICAqL1xuICB1cGRhdGVTZWN0aW9uVG9vbGJhcjogZnVuY3Rpb24gKCkge1xuXG4gICAgLy8gRHJvcGRvd24gbWVudSByZWZlcmVuY2VcbiAgICBsZXQgbWVudSA9ICQoTUVOVV9TRUxFQ1RPUilcblxuICAgIGlmIChtZW51Lmxlbmd0aCkge1xuICAgICAgc2VjdGlvbi5yZXN0b3JlU2VjdGlvblRvb2xiYXIobWVudSlcblxuICAgICAgLy8gU2F2ZSBjdXJyZW50IHNlbGVjdGVkIGVsZW1lbnRcbiAgICAgIGxldCBzZWxlY3RlZEVsZW1lbnQgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRSbmcoKS5zdGFydENvbnRhaW5lcilcblxuICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudFswXS5ub2RlVHlwZSA9PSAzKVxuICAgICAgICBzZWxlY3RlZEVsZW1lbnQgPSBzZWxlY3RlZEVsZW1lbnQucGFyZW50KClcblxuICAgICAgLy8gSWYgY3VycmVudCBlbGVtZW50IGlzIHBcbiAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQuaXMoJ3AnKSB8fCBzZWxlY3RlZEVsZW1lbnQucGFyZW50KCkuaXMoJ3AnKSkge1xuXG4gICAgICAgIC8vIENoZWNrIGlmIGNhcmV0IGlzIGluc2lkZSBzcGVjaWFsIHNlY3Rpb25cbiAgICAgICAgLy8gSW4gdGhpcyBjYXNlIGVuYWJsZSBvbmx5IGZpcnN0IG1lbnVpdGVtIGlmIGNhcmV0IGlzIGluIGFic3RyYWN0XG4gICAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQucGFyZW50cyhTUEVDSUFMX1NFQ1RJT05fU0VMRUNUT1IpLmxlbmd0aCkge1xuXG4gICAgICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKEFCU1RSQUNUX1NFTEVDVE9SKS5sZW5ndGgpXG4gICAgICAgICAgICBtZW51LmNoaWxkcmVuKGA6bHQoMSlgKS5yZW1vdmVDbGFzcygnbWNlLWRpc2FibGVkJylcblxuICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gR2V0IGRlZXBuZXNzIG9mIHRoZSBzZWN0aW9uXG4gICAgICAgIGxldCBkZWVwbmVzcyA9IHNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKFNFQ1RJT05fU0VMRUNUT1IpLmxlbmd0aCArIDFcblxuICAgICAgICAvLyBSZW1vdmUgZGlzYWJsaW5nIGNsYXNzIG9uIGZpcnN0IHtkZWVwbmVzc30gbWVudSBpdGVtc1xuICAgICAgICBtZW51LmNoaWxkcmVuKGA6bHQoJHtkZWVwbmVzc30pYCkucmVtb3ZlQ2xhc3MoJ21jZS1kaXNhYmxlZCcpXG5cbiAgICAgICAgLy8gR2V0IHRoZSBzZWN0aW9uIGxpc3QgYW5kIHVwZGF0ZSB0aGUgZHJvcGRvd24gd2l0aCB0aGUgcmlnaHQgdGV4dHNcbiAgICAgICAgbGV0IGxpc3QgPSBzZWN0aW9uLmdldEFuY2VzdG9yU2VjdGlvbnNMaXN0KHNlbGVjdGVkRWxlbWVudClcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPD0gbGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIG1lbnUuY2hpbGRyZW4oYDplcSgke2l9KWApLmZpbmQoJ3NwYW4ubWNlLXRleHQnKS50ZXh0KGxpc3RbaV0pXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gRW5hYmxlIG9ubHkgZm9yIHVwZ3JhZGUvZG93bmdyYWRlXG4gICAgICBlbHNlIGlmICghc2VsZWN0ZWRFbGVtZW50LnBhcmVudHMoU1BFQ0lBTF9TRUNUSU9OX1NFTEVDVE9SKS5sZW5ndGggJiYgc2VsZWN0ZWRFbGVtZW50LmlzKCdoMSxoMixoMycpKSB7XG5cbiAgICAgICAgLy8gR2V0IHRoZSBzZWxlY3RlZCBzZWN0aW9uXG4gICAgICAgIGxldCBzZWxlY3RlZFNlY3Rpb24gPSBzZWxlY3RlZEVsZW1lbnQucGFyZW50cyhTRUNUSU9OX1NFTEVDVE9SKS5maXJzdCgpXG5cbiAgICAgICAgLy8gR2V0IHRoZSBudW1iZXIgb2YgdGhlIGhlYWRpbmcgKGVnLiBIMSA9PiAxLCBIMiA9PiAyKVxuICAgICAgICBsZXQgaW5kZXggPSBwYXJzZUludChzZWxlY3RlZEVsZW1lbnQucHJvcCgndGFnTmFtZScpLnRvTG93ZXJDYXNlKCkucmVwbGFjZSgnaCcsICcnKSlcblxuICAgICAgICAvLyBHZXQgdGhlIGRlZXBuZXNzIG9mIHRoZSBzZWN0aW9uIChlZy4gMSBpZiBpcyBhIG1haW4gc2VjdGlvbiwgMiBpZiBpcyBhIHN1YnNlY3Rpb24pXG4gICAgICAgIGxldCBkZWVwbmVzcyA9IHNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKFNFQ1RJT05fU0VMRUNUT1IpLmxlbmd0aFxuXG4gICAgICAgIC8vIEdldCB0aGUgbGlzdCBvZiB0ZXh0cyB0aGF0IGFyZSBiZWVcbiAgICAgICAgbGV0IGxpc3QgPSBzZWN0aW9uLmdldEFuY2VzdG9yU2VjdGlvbnNMaXN0KHNlbGVjdGVkRWxlbWVudClcblxuICAgICAgICAvLyBUaGUgdGV4dCBpbmRleCBpbiBsaXN0XG4gICAgICAgIGxldCBpID0gZGVlcG5lc3MgLSBpbmRleFxuXG4gICAgICAgIC8vIENoZWNrIGlmIHRoZSBjdXJyZW50IHNlY3Rpb24gaGFzIGEgcHJldmlvdXMgc2VjdGlvbiBcbiAgICAgICAgLy8gSW4gdGhpcyBjYXNlIHRoZSB1cGdyYWRlIGlzIHBlcm1pdHRlZFxuICAgICAgICBpZiAoc2VsZWN0ZWRTZWN0aW9uLnByZXYoKS5pcyhTRUNUSU9OX1NFTEVDVE9SKSkge1xuXG4gICAgICAgICAgLy8gbWVudSBpdGVtIGluc2lkZSB0aGUgZHJvcGRvd25cbiAgICAgICAgICBsZXQgbWVudUl0ZW0gPSBtZW51LmNoaWxkcmVuKGA6ZXEoJHtpbmRleH0pYClcblxuICAgICAgICAgIGxldCB0bXAgPSBsaXN0W2luZGV4XS5yZXBsYWNlKEhFQURJTkdfQlVUVE9OX0xBQkVMLCAnJylcbiAgICAgICAgICB0bXAgPSB0bXAuc3BsaXQoJy4nKVxuICAgICAgICAgIHRtcFtpbmRleCAtIDFdID0gcGFyc2VJbnQodG1wW2luZGV4IC0gMV0pIC0gMVxuXG4gICAgICAgICAgbGV0IHRleHQgPSBIRUFESU5HX0JVVFRPTl9MQUJFTCArIHRtcC5qb2luKCcuJylcblxuICAgICAgICAgIG1lbnVJdGVtLmZpbmQoJ3NwYW4ubWNlLXRleHQnKS50ZXh0KHRleHQpXG4gICAgICAgICAgbWVudUl0ZW0ucmVtb3ZlQ2xhc3MoJ21jZS1kaXNhYmxlZCcpXG4gICAgICAgICAgbWVudUl0ZW0uYXR0cihEQVRBX0RPV05HUkFERSwgdHJ1ZSlcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGlmIHRoZSBjdXJyZW50IHNlY3Rpb24gaGFzIGEgcGFyZW50XG4gICAgICAgIC8vIEluIHRoaXMgY2FzZSB0aGUgdXBncmFkZSBpcyBwZXJtaXR0ZWRcbiAgICAgICAgaWYgKHNlbGVjdGVkU2VjdGlvbi5wYXJlbnQoU0VDVElPTl9TRUxFQ1RPUikubGVuZ3RoKSB7XG5cbiAgICAgICAgICBpbmRleCA9IGluZGV4IC0gMlxuXG4gICAgICAgICAgLy8gbWVudSBpdGVtIGluc2lkZSB0aGUgZHJvcGRvd25cbiAgICAgICAgICBsZXQgbWVudUl0ZW0gPSBtZW51LmNoaWxkcmVuKGA6ZXEoJHtpbmRleH0pYClcbiAgICAgICAgICBtZW51SXRlbS5maW5kKCdzcGFuLm1jZS10ZXh0JykudGV4dChsaXN0W2luZGV4XSlcbiAgICAgICAgICBtZW51SXRlbS5yZW1vdmVDbGFzcygnbWNlLWRpc2FibGVkJylcbiAgICAgICAgICBtZW51SXRlbS5hdHRyKERBVEFfVVBHUkFERSwgdHJ1ZSlcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBEaXNhYmxlIGluIGFueSBvdGhlciBjYXNlc1xuICAgICAgZWxzZVxuICAgICAgICBtZW51LmNoaWxkcmVuKCc6Z3QoMTApJykuYWRkQ2xhc3MoJ21jZS1kaXNhYmxlZCcpXG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGdldEFuY2VzdG9yU2VjdGlvbnNMaXN0OiBmdW5jdGlvbiAoc2VsZWN0ZWRFbGVtZW50KSB7XG5cbiAgICBsZXQgcHJlSGVhZGVycyA9IFtdXG4gICAgbGV0IGxpc3QgPSBbXVxuICAgIGxldCBwYXJlbnRTZWN0aW9ucyA9IHNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKCdzZWN0aW9uJylcblxuICAgIC8vIFNhdmUgaW5kZXggb2YgYWxsIHBhcmVudCBzZWN0aW9uc1xuICAgIGZvciAobGV0IGkgPSBwYXJlbnRTZWN0aW9ucy5sZW5ndGg7IGkgPiAwOyBpLS0pIHtcbiAgICAgIGxldCBlbGVtID0gJChwYXJlbnRTZWN0aW9uc1tpIC0gMV0pXG4gICAgICBsZXQgaW5kZXggPSBlbGVtLnBhcmVudCgpLmNoaWxkcmVuKFNFQ1RJT05fU0VMRUNUT1IpLmluZGV4KGVsZW0pICsgMVxuICAgICAgcHJlSGVhZGVycy5wdXNoKGluZGV4KVxuICAgIH1cblxuICAgIC8vIFVwZGF0ZSB0ZXh0IG9mIGFsbCBtZW51IGl0ZW1cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8PSBwcmVIZWFkZXJzLmxlbmd0aDsgaSsrKSB7XG5cbiAgICAgIGxldCB0ZXh0ID0gSEVBRElOR19CVVRUT05fTEFCRUxcblxuICAgICAgLy8gVXBkYXRlIHRleHQgYmFzZWQgb24gc2VjdGlvbiBzdHJ1Y3R1cmVcbiAgICAgIGlmIChpICE9IHByZUhlYWRlcnMubGVuZ3RoKSB7XG4gICAgICAgIGZvciAobGV0IHggPSAwOyB4IDw9IGk7IHgrKylcbiAgICAgICAgICB0ZXh0ICs9IGAke3ByZUhlYWRlcnNbeF0gKyAoeCA9PSBpID8gMSA6IDApfS5gXG4gICAgICB9XG5cbiAgICAgIC8vIEluIHRoaXMgY2FzZSByYWplIGNoYW5nZXMgdGV4dCBvZiBuZXh0IHN1YiBoZWFkaW5nXG4gICAgICBlbHNlIHtcbiAgICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCBpOyB4KyspXG4gICAgICAgICAgdGV4dCArPSBgJHtwcmVIZWFkZXJzW3hdfS5gXG5cbiAgICAgICAgdGV4dCArPSAnMS4nXG4gICAgICB9XG5cbiAgICAgIGxpc3QucHVzaCh0ZXh0KVxuICAgIH1cblxuICAgIHJldHVybiBsaXN0XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJlc3RvcmUgbm9ybWFsIHRleHQgaW4gc2VjdGlvbiB0b29sYmFyIGFuZCBkaXNhYmxlIGFsbFxuICAgKi9cbiAgcmVzdG9yZVNlY3Rpb25Ub29sYmFyOiBmdW5jdGlvbiAobWVudSkge1xuXG4gICAgbGV0IGNudCA9IDFcblxuICAgIG1lbnUuY2hpbGRyZW4oJzpsdCg2KScpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgbGV0IHRleHQgPSBIRUFESU5HX0JVVFRPTl9MQUJFTFxuXG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGNudDsgaSsrKVxuICAgICAgICB0ZXh0ICs9IGAxLmBcblxuICAgICAgLy8gUmVtb3ZlIGRhdGEgZWxlbWVudHNcbiAgICAgICQodGhpcykucmVtb3ZlQXR0cihEQVRBX1VQR1JBREUpXG4gICAgICAkKHRoaXMpLnJlbW92ZUF0dHIoREFUQV9ET1dOR1JBREUpXG5cbiAgICAgICQodGhpcykuZmluZCgnc3Bhbi5tY2UtdGV4dCcpLnRleHQodGV4dClcbiAgICAgICQodGhpcykuYWRkQ2xhc3MoJ21jZS1kaXNhYmxlZCcpXG5cbiAgICAgIGNudCsrXG4gICAgfSlcblxuICAgIC8vIEVuYWJsZSB1cGdyYWRlL2Rvd25ncmFkZSBsYXN0IHRocmVlIG1lbnUgaXRlbXNcbiAgICBtZW51LmNoaWxkcmVuKCc6Z3QoMTApJykucmVtb3ZlQ2xhc3MoJ21jZS1kaXNhYmxlZCcpXG4gIH0sXG5cbiAgLyoqXG4gICAqIFxuICAgKi9cbiAgbWFuYWdlRGVsZXRlOiBmdW5jdGlvbiAoKSB7XG5cbiAgICBsZXQgc2VsZWN0ZWRDb250ZW50ID0gdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldENvbnRlbnQoKVxuXG4gICAgLy8gSWYgdGhlIHNlbGVjdGVkIGNvbnRlbnQgaGFzIEhUTUwgaW5zaWRlXG4gICAgaWYgKHNlbGVjdGVkQ29udGVudC5pbmRleE9mKCc8JykgPiAtMSkge1xuXG4gICAgICBzZWxlY3RlZENvbnRlbnQgPSAkKHNlbGVjdGVkQ29udGVudClcbiAgICAgIGxldCBoYXNTZWN0aW9uID0gZmFsc2VcbiAgICAgIC8vIENoZWNrIGlmIG9uZSBvZiB0aGUgc2VsZWN0ZWQgZWxlbWVudCBpcyBhIHNlY3Rpb25cbiAgICAgIHNlbGVjdGVkQ29udGVudC5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCQodGhpcykuaXMoU0VDVElPTl9TRUxFQ1RPUikpXG4gICAgICAgICAgcmV0dXJuIGhhc1NlY3Rpb24gPSB0cnVlXG4gICAgICB9KVxuXG4gICAgICAvLyBJZiB0aGUgc2VsZWN0ZWQgY29udGVudCBoYXMgYSBzZWN0aW9uIGluc2lkZSwgdGhlbiBtYW5hZ2UgZGVsZXRlXG4gICAgICBpZiAoaGFzU2VjdGlvbikge1xuXG4gICAgICAgIGxldCByYW5nZSA9IHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRSbmcoKVxuICAgICAgICBsZXQgc3RhcnROb2RlID0gJChyYW5nZS5zdGFydENvbnRhaW5lcikucGFyZW50KClcbiAgICAgICAgbGV0IGVuZE5vZGUgPSAkKHJhbmdlLmVuZENvbnRhaW5lcikucGFyZW50KClcbiAgICAgICAgbGV0IGNvbW1vbkFuY2VzdG9yQ29udGFpbmVyID0gJChyYW5nZS5jb21tb25BbmNlc3RvckNvbnRhaW5lcilcblxuICAgICAgICAvLyBEZWVwbmVzcyBpcyByZWxhdGl2ZSB0byB0aGUgY29tbW9uIGFuY2VzdG9yIGNvbnRhaW5lciBvZiB0aGUgcmFuZ2Ugc3RhcnRDb250YWluZXIgYW5kIGVuZFxuICAgICAgICBsZXQgZGVlcG5lc3MgPSBlbmROb2RlLnBhcmVudCgnc2VjdGlvbicpLnBhcmVudHNVbnRpbChjb21tb25BbmNlc3RvckNvbnRhaW5lcikubGVuZ3RoICsgMVxuICAgICAgICBsZXQgY3VycmVudEVsZW1lbnQgPSBlbmROb2RlXG4gICAgICAgIGxldCB0b01vdmVFbGVtZW50cyA9IFtdXG5cbiAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgLy8gR2V0IGFuZCBkZXRhY2ggYWxsIG5leHRfZW5kXG4gICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPD0gZGVlcG5lc3M7IGkrKykge1xuICAgICAgICAgICAgY3VycmVudEVsZW1lbnQubmV4dEFsbCgnc2VjdGlvbixwLGZpZ3VyZSxwcmUsdWwsb2wsYmxvY2txdW90ZScpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICB0b01vdmVFbGVtZW50cy5wdXNoKCQodGhpcykpXG5cbiAgICAgICAgICAgICAgJCh0aGlzKS5kZXRhY2goKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIGN1cnJlbnRFbGVtZW50ID0gY3VycmVudEVsZW1lbnQucGFyZW50KClcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBFeGVjdXRlIGRlbGV0ZVxuICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLmV4ZWNDb21tYW5kKERFTEVURV9DTUQpXG5cbiAgICAgICAgICAvLyBEZXRhY2ggYWxsIG5leHRfYmVnaW5cbiAgICAgICAgICBzdGFydE5vZGUubmV4dEFsbCgpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJCh0aGlzKS5kZXRhY2goKVxuICAgICAgICAgIH0pXG5cbiAgICAgICAgICAvLyBBcHBlbmQgYWxsIG5leHRfZW5kIHRvIHN0YXJ0bm9kZSBwYXJlbnRcbiAgICAgICAgICB0b01vdmVFbGVtZW50cy5mb3JFYWNoKGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgICAgICAgICBzdGFydE5vZGUucGFyZW50KCdzZWN0aW9uJykuYXBwZW5kKGVsZW1lbnQpXG4gICAgICAgICAgfSlcblxuICAgICAgICAgIC8vIFJlZnJlc2ggaGVhZGluZ3NcbiAgICAgICAgICBoZWFkaW5nRGltZW5zaW9uKClcblxuICAgICAgICAgIC8vIFVwZGF0ZSByZWZlcmVuY2VzIGlmIG5lZWRlZFxuICAgICAgICAgIHVwZGF0ZVJlZmVyZW5jZXMoKVxuICAgICAgICB9KVxuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogXG4gICAqL1xuICBkZWxldGVTcGVjaWFsU2VjdGlvbjogZnVuY3Rpb24gKHNlbGVjdGVkRWxlbWVudCkge1xuXG4gICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAvLyBSZW1vdmUgdGhlIHNlY3Rpb24gYW5kIHVwZGF0ZSBcbiAgICAgIHNlbGVjdGVkRWxlbWVudC5wYXJlbnQoU1BFQ0lBTF9TRUNUSU9OX1NFTEVDVE9SKS5yZW1vdmUoKVxuXG4gICAgICAvLyBVcGRhdGUgcmVmZXJlbmNlc1xuICAgICAgdXBkYXRlUmVmZXJlbmNlcygpXG5cbiAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuICAgIH0pXG4gIH0sXG5cbiAgLyoqXG4gICAqIFxuICAgKi9cbiAgY3Vyc29ySW5TZWN0aW9uOiBmdW5jdGlvbiAoc2VsZWN0aW9uKSB7XG5cbiAgICByZXR1cm4gJChzZWxlY3Rpb24uZ2V0Tm9kZSgpKS5pcyhTRUNUSU9OX1NFTEVDVE9SKSB8fCBCb29sZWFuKCQoc2VsZWN0aW9uLmdldE5vZGUoKSkucGFyZW50cyhTRUNUSU9OX1NFTEVDVE9SKS5sZW5ndGgpXG4gIH0sXG5cbiAgLyoqXG4gICAqIFxuICAgKi9cbiAgY3Vyc29ySW5TcGVjaWFsU2VjdGlvbjogZnVuY3Rpb24gKHNlbGVjdGlvbikge1xuXG4gICAgcmV0dXJuICQoc2VsZWN0aW9uLmdldE5vZGUoKSkuaXMoU1BFQ0lBTF9TRUNUSU9OX1NFTEVDVE9SKSB8fFxuICAgICAgQm9vbGVhbigkKHNlbGVjdGlvbi5nZXRSbmcoKS5zdGFydENvbnRhaW5lcikucGFyZW50cyhTUEVDSUFMX1NFQ1RJT05fU0VMRUNUT1IpLmxlbmd0aCkgfHxcbiAgICAgIEJvb2xlYW4oJChzZWxlY3Rpb24uZ2V0Um5nKCkuZW5kQ29udGFpbmVyKS5wYXJlbnRzKFNQRUNJQUxfU0VDVElPTl9TRUxFQ1RPUikubGVuZ3RoKVxuICB9XG59IiwidGlueW1jZS5QbHVnaW5NYW5hZ2VyLmFkZCgncmFqZV9jcm9zc3JlZicsIGZ1bmN0aW9uIChlZGl0b3IsIHVybCkge1xuXG4gIC8vIEFkZCBhIGJ1dHRvbiB0aGF0IGhhbmRsZSB0aGUgaW5saW5lIGVsZW1lbnRcbiAgZWRpdG9yLmFkZEJ1dHRvbigncmFqZV9jcm9zc3JlZicsIHtcbiAgICB0aXRsZTogJ3JhamVfY3Jvc3NyZWYnLFxuICAgIGljb246ICdpY29uLWFuY2hvcicsXG4gICAgdG9vbHRpcDogJ0Nyb3NzLXJlZmVyZW5jZScsXG4gICAgZGlzYWJsZWRTdGF0ZVNlbGVjdG9yOiBgJHtESVNBQkxFX1NFTEVDVE9SX0lOTElORX0sOmhlYWRlcmAsXG5cbiAgICAvLyBCdXR0b24gYmVoYXZpb3VyXG4gICAgb25jbGljazogZnVuY3Rpb24gKCkge1xuXG4gICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcblxuICAgICAgbGV0IHJlZmVyZW5jZWFibGVMaXN0ID0ge1xuICAgICAgICBzZWN0aW9uczogY3Jvc3NyZWYuZ2V0QWxsUmVmZXJlbmNlYWJsZVNlY3Rpb25zKCksXG4gICAgICAgIHRhYmxlczogY3Jvc3NyZWYuZ2V0QWxsUmVmZXJlbmNlYWJsZVRhYmxlcygpLFxuICAgICAgICBmaWd1cmVzOiBjcm9zc3JlZi5nZXRBbGxSZWZlcmVuY2VhYmxlRmlndXJlcygpLFxuICAgICAgICBsaXN0aW5nczogY3Jvc3NyZWYuZ2V0QWxsUmVmZXJlbmNlYWJsZUxpc3RpbmdzKCksXG4gICAgICAgIGZvcm11bGFzOiBjcm9zc3JlZi5nZXRBbGxSZWZlcmVuY2VhYmxlRm9ybXVsYXMoKSxcbiAgICAgICAgcmVmZXJlbmNlczogY3Jvc3NyZWYuZ2V0QWxsUmVmZXJlbmNlYWJsZVJlZmVyZW5jZXMoKVxuICAgICAgfVxuXG4gICAgICBlZGl0b3Iud2luZG93TWFuYWdlci5vcGVuKHtcbiAgICAgICAgICB0aXRsZTogJ0Nyb3NzLXJlZmVyZW5jZSBlZGl0b3InLFxuICAgICAgICAgIHVybDogJ2pzL3JhamUtY29yZS9wbHVnaW4vcmFqZV9jcm9zc3JlZi5odG1sJyxcbiAgICAgICAgICB3aWR0aDogNTAwLFxuICAgICAgICAgIGhlaWdodDogODAwLFxuICAgICAgICAgIG9uQ2xvc2U6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBcbiAgICAgICAgICAgICAqIFRoaXMgYmVoYXZpb3VyIGlzIGNhbGxlZCB3aGVuIHVzZXIgcHJlc3MgXCJBREQgTkVXIFJFRkVSRU5DRVwiIFxuICAgICAgICAgICAgICogYnV0dG9uIGZyb20gdGhlIG1vZGFsXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGlmICh0aW55bWNlLmFjdGl2ZUVkaXRvci5jcmVhdGVOZXdSZWZlcmVuY2UpIHtcblxuICAgICAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICAgICAgICAvLyBHZXQgc3VjY2Vzc2l2ZSBiaWJsaW9lbnRyeSBpZFxuICAgICAgICAgICAgICAgIGxldCBpZCA9IGdldFN1Y2Nlc3NpdmVFbGVtZW50SWQoQklCTElPRU5UUllfU0VMRUNUT1IsIEJJQkxJT0VOVFJZX1NVRkZJWClcblxuICAgICAgICAgICAgICAgIC8vIENyZWF0ZSB0aGUgcmVmZXJlbmNlIHRoYXQgcG9pbnRzIHRvIHRoZSBuZXh0IGlkXG4gICAgICAgICAgICAgICAgY3Jvc3NyZWYuYWRkKGlkKVxuXG4gICAgICAgICAgICAgICAgLy8gQWRkIHRoZSBuZXh0IGJpYmxpb2VudHJ5XG4gICAgICAgICAgICAgICAgc2VjdGlvbi5hZGRCaWJsaW9lbnRyeShpZClcblxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgcmVmZXJlbmNlXG4gICAgICAgICAgICAgICAgY3Jvc3NyZWYudXBkYXRlKClcblxuICAgICAgICAgICAgICAgIC8vIE1vdmUgY2FyZXQgdG8gc3RhcnQgb2YgdGhlIG5ldyBiaWJsaW9lbnRyeSBlbGVtZW50XG4gICAgICAgICAgICAgICAgLy8gSXNzdWUgIzEwNSBGaXJlZm94ICsgQ2hyb21pdW1cbiAgICAgICAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2V0Q3Vyc29yTG9jYXRpb24oJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5kb20uZ2V0KGlkKSkuZmluZCgncCcpWzBdLCBmYWxzZSlcbiAgICAgICAgICAgICAgICBzY3JvbGxUbyhgJHtCSUJMSU9FTlRSWV9TRUxFQ1RPUn0jJHtpZH1gKVxuICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICAgIC8vIFNldCB2YXJpYWJsZSBudWxsIGZvciBzdWNjZXNzaXZlIHVzYWdlc1xuICAgICAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5jcmVhdGVOZXdSZWZlcmVuY2UgPSBudWxsXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVGhpcyBpcyBjYWxsZWQgaWYgYSBub3JtYWwgcmVmZXJlbmNlIGlzIHNlbGVjdGVkIGZyb20gbW9kYWxcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZWxzZSBpZiAodGlueW1jZS5hY3RpdmVFZGl0b3IucmVmZXJlbmNlKSB7XG5cbiAgICAgICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgICAgICAgLy8gQ3JlYXRlIHRoZSBlbXB0eSBhbmNob3IgYW5kIHVwZGF0ZSBpdHMgY29udGVudFxuICAgICAgICAgICAgICAgIGNyb3NzcmVmLmFkZCh0aW55bWNlLmFjdGl2ZUVkaXRvci5yZWZlcmVuY2UpXG4gICAgICAgICAgICAgICAgY3Jvc3NyZWYudXBkYXRlKClcblxuICAgICAgICAgICAgICAgIGxldCBzZWxlY3RlZE5vZGUgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG5cbiAgICAgICAgICAgICAgICAvLyBUaGlzIHNlbGVjdCB0aGUgbGFzdCBlbGVtZW50IChsYXN0IGJ5IG9yZGVyKSBhbmQgY29sbGFwc2UgdGhlIHNlbGVjdGlvbiBhZnRlciB0aGUgbm9kZVxuICAgICAgICAgICAgICAgIC8vICMxMDUgRmlyZWZveCArIENocm9taXVtXG4gICAgICAgICAgICAgICAgLy90aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2V0Q3Vyc29yTG9jYXRpb24oJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5kb20uc2VsZWN0KGBhW2hyZWY9XCIjJHt0aW55bWNlLmFjdGl2ZUVkaXRvci5yZWZlcmVuY2V9XCJdOmxhc3QtY2hpbGRgKSlbMF0sIGZhbHNlKVxuICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICAgIC8vIFNldCB2YXJpYWJsZSBudWxsIGZvciBzdWNjZXNzaXZlIHVzYWdlc1xuICAgICAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5yZWZlcmVuY2UgPSBudWxsXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIC8vIExpc3Qgb2YgYWxsIHJlZmVyZW5jZWFibGUgZWxlbWVudHNcbiAgICAgICAgcmVmZXJlbmNlYWJsZUxpc3QpXG4gICAgfVxuICB9KVxuXG4gIGNyb3NzcmVmID0ge1xuICAgIGdldEFsbFJlZmVyZW5jZWFibGVTZWN0aW9uczogZnVuY3Rpb24gKCkge1xuXG4gICAgICBsZXQgc2VjdGlvbnMgPSBbXVxuXG4gICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci4kKCdzZWN0aW9uJykuZWFjaChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgbGV0IGxldmVsID0gJydcblxuICAgICAgICBpZiAoISQodGhpcykuaXMoRU5ETk9URV9TRUxFQ1RPUikpIHtcblxuICAgICAgICAgIC8vIFNlY3Rpb25zIHdpdGhvdXQgcm9sZSBoYXZlIDphZnRlclxuICAgICAgICAgIGlmICghJCh0aGlzKS5hdHRyKCdyb2xlJykpIHtcblxuICAgICAgICAgICAgLy8gU2F2ZSBpdHMgZGVlcG5lc3NcbiAgICAgICAgICAgIGxldCBwYXJlbnRTZWN0aW9ucyA9ICQodGhpcykucGFyZW50c1VudGlsKCdib2R5JylcblxuICAgICAgICAgICAgaWYgKHBhcmVudFNlY3Rpb25zLmxlbmd0aCkge1xuXG4gICAgICAgICAgICAgIC8vIEl0ZXJhdGUgaXRzIHBhcmVudHMgYmFja3dhcmRzIChoaWdlciBmaXJzdClcbiAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IHBhcmVudFNlY3Rpb25zLmxlbmd0aDsgaS0tOyBpID4gMCkge1xuICAgICAgICAgICAgICAgIGxldCBzZWN0aW9uID0gJChwYXJlbnRTZWN0aW9uc1tpXSlcbiAgICAgICAgICAgICAgICBsZXZlbCArPSBgJHtzZWN0aW9uLnBhcmVudCgpLmNoaWxkcmVuKFNFQ1RJT05fU0VMRUNUT1IpLmluZGV4KHNlY3Rpb24pKzF9LmBcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBDdXJyZW50IGluZGV4XG4gICAgICAgICAgICBsZXZlbCArPSBgJHskKHRoaXMpLnBhcmVudCgpLmNoaWxkcmVuKFNFQ1RJT05fU0VMRUNUT1IpLmluZGV4KCQodGhpcykpKzF9LmBcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBzZWN0aW9ucy5wdXNoKHtcbiAgICAgICAgICAgIHJlZmVyZW5jZTogJCh0aGlzKS5hdHRyKCdpZCcpLFxuICAgICAgICAgICAgdGV4dDogJCh0aGlzKS5maW5kKCc6aGVhZGVyJykuZmlyc3QoKS50ZXh0KCksXG4gICAgICAgICAgICBsZXZlbDogbGV2ZWxcbiAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgICB9KVxuXG4gICAgICByZXR1cm4gc2VjdGlvbnNcbiAgICB9LFxuXG4gICAgZ2V0QWxsUmVmZXJlbmNlYWJsZVRhYmxlczogZnVuY3Rpb24gKCkge1xuICAgICAgbGV0IHRhYmxlcyA9IFtdXG5cbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLiQoJ2ZpZ3VyZTpoYXModGFibGUpJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRhYmxlcy5wdXNoKHtcbiAgICAgICAgICByZWZlcmVuY2U6ICQodGhpcykuYXR0cignaWQnKSxcbiAgICAgICAgICB0ZXh0OiAkKHRoaXMpLmZpbmQoJ2ZpZ2NhcHRpb24nKS50ZXh0KClcbiAgICAgICAgfSlcbiAgICAgIH0pXG5cbiAgICAgIHJldHVybiB0YWJsZXNcbiAgICB9LFxuXG4gICAgZ2V0QWxsUmVmZXJlbmNlYWJsZUxpc3RpbmdzOiBmdW5jdGlvbiAoKSB7XG4gICAgICBsZXQgbGlzdGluZ3MgPSBbXVxuXG4gICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci4kKCdmaWd1cmU6aGFzKHByZTpoYXMoY29kZSkpJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIGxpc3RpbmdzLnB1c2goe1xuICAgICAgICAgIHJlZmVyZW5jZTogJCh0aGlzKS5hdHRyKCdpZCcpLFxuICAgICAgICAgIHRleHQ6ICQodGhpcykuZmluZCgnZmlnY2FwdGlvbicpLnRleHQoKVxuICAgICAgICB9KVxuICAgICAgfSlcblxuICAgICAgcmV0dXJuIGxpc3RpbmdzXG4gICAgfSxcblxuICAgIGdldEFsbFJlZmVyZW5jZWFibGVGaWd1cmVzOiBmdW5jdGlvbiAoKSB7XG4gICAgICBsZXQgZmlndXJlcyA9IFtdXG5cbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLiQoRklHVVJFX0lNQUdFX1NFTEVDVE9SKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZmlndXJlcy5wdXNoKHtcbiAgICAgICAgICByZWZlcmVuY2U6ICQodGhpcykuYXR0cignaWQnKSxcbiAgICAgICAgICB0ZXh0OiAkKHRoaXMpLmZpbmQoJ2ZpZ2NhcHRpb24nKS50ZXh0KClcbiAgICAgICAgfSlcbiAgICAgIH0pXG5cbiAgICAgIHJldHVybiBmaWd1cmVzXG4gICAgfSxcblxuICAgIGdldEFsbFJlZmVyZW5jZWFibGVGb3JtdWxhczogZnVuY3Rpb24gKCkge1xuICAgICAgbGV0IGZvcm11bGFzID0gW11cblxuICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IuJChmb3JtdWxhYm94X3NlbGVjdG9yKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZm9ybXVsYXMucHVzaCh7XG4gICAgICAgICAgcmVmZXJlbmNlOiAkKHRoaXMpLnBhcmVudHMoRklHVVJFX1NFTEVDVE9SKS5hdHRyKCdpZCcpLFxuICAgICAgICAgIHRleHQ6IGBGb3JtdWxhICR7JCh0aGlzKS5wYXJlbnRzKEZJR1VSRV9TRUxFQ1RPUikuZmluZCgnc3Bhbi5jZ2VuJykudGV4dCgpfWBcbiAgICAgICAgfSlcbiAgICAgIH0pXG5cbiAgICAgIHJldHVybiBmb3JtdWxhc1xuICAgIH0sXG5cbiAgICBnZXRBbGxSZWZlcmVuY2VhYmxlUmVmZXJlbmNlczogZnVuY3Rpb24gKCkge1xuICAgICAgbGV0IHJlZmVyZW5jZXMgPSBbXVxuICAgICAgXG4gICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci4kKCdzZWN0aW9uW3JvbGU9ZG9jLWJpYmxpb2dyYXBoeV0gbGknKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmVmZXJlbmNlcy5wdXNoKHtcbiAgICAgICAgICByZWZlcmVuY2U6ICQodGhpcykuYXR0cignaWQnKSxcbiAgICAgICAgICB0ZXh0OiAkKHRoaXMpLnRleHQoKSxcbiAgICAgICAgICBsZXZlbDogJCh0aGlzKS5pbmRleCgpICsgMVxuICAgICAgICB9KVxuICAgICAgfSlcblxuICAgICAgcmV0dXJuIHJlZmVyZW5jZXNcbiAgICB9LFxuXG4gICAgYWRkOiBmdW5jdGlvbiAocmVmZXJlbmNlKSB7XG5cbiAgICAgIC8vIENyZWF0ZSB0aGUgZW1wdHkgcmVmZXJlbmNlIHdpdGggYSB3aGl0ZXNwYWNlIGF0IHRoZSBlbmRcbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZXRDb250ZW50KGA8YSBjb250ZW50ZWRpdGFibGU9XCJmYWxzZVwiIGhyZWY9XCIjJHtyZWZlcmVuY2V9XCI+Jm5ic3A7PC9hPiZuYnNwO2ApXG4gICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcbiAgICB9LFxuXG4gICAgdXBkYXRlOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgIC8vIFVwZGF0ZSB0aGUgcmVmZXJlbmNlIChpbiBzYXZlZCBjb250ZW50KVxuICAgICAgcmVmZXJlbmNlcygpXG5cbiAgICAgIC8vIFByZXZlbnQgYWRkaW5nIG9mIG5lc3RlZCBhIGFzIGZvb3Rub3Rlc1xuICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IuJCgnYT5zdXA+YScpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICAkKHRoaXMpLnBhcmVudCgpLmh0bWwoJCh0aGlzKS50ZXh0KCkpXG4gICAgICB9KVxuICAgIH1cbiAgfVxufSlcblxudGlueW1jZS5QbHVnaW5NYW5hZ2VyLmFkZCgncmFqZV9mb290bm90ZXMnLCBmdW5jdGlvbiAoZWRpdG9yLCB1cmwpIHtcblxuICBlZGl0b3IuYWRkQnV0dG9uKCdyYWplX2Zvb3Rub3RlcycsIHtcbiAgICB0aXRsZTogJ3JhamVfZm9vdG5vdGVzJyxcbiAgICBpY29uOiAnaWNvbi1mb290bm90ZXMnLFxuICAgIHRvb2x0aXA6ICdGb290bm90ZScsXG4gICAgZGlzYWJsZWRTdGF0ZVNlbGVjdG9yOiBgJHtESVNBQkxFX1NFTEVDVE9SX0lOTElORX0sOmhlYWRlcmAsXG5cbiAgICAvLyBCdXR0b24gYmVoYXZpb3VyXG4gICAgb25jbGljazogZnVuY3Rpb24gKCkge1xuXG4gICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgLy8gR2V0IHN1Y2Nlc3NpdmUgYmlibGlvZW50cnkgaWRcbiAgICAgICAgbGV0IHJlZmVyZW5jZSA9IGdldFN1Y2Nlc3NpdmVFbGVtZW50SWQoRU5ETk9URV9TRUxFQ1RPUiwgRU5ETk9URV9TVUZGSVgpXG5cbiAgICAgICAgLy8gQ3JlYXRlIHRoZSByZWZlcmVuY2UgdGhhdCBwb2ludHMgdG8gdGhlIG5leHQgaWRcbiAgICAgICAgY3Jvc3NyZWYuYWRkKHJlZmVyZW5jZSlcblxuICAgICAgICAvLyBBZGQgdGhlIG5leHQgYmlibGlvZW50cnlcbiAgICAgICAgc2VjdGlvbi5hZGRFbmRub3RlKHJlZmVyZW5jZSlcblxuICAgICAgICAvLyBVcGRhdGUgdGhlIHJlZmVyZW5jZVxuICAgICAgICBjcm9zc3JlZi51cGRhdGUoKVxuXG4gICAgICAgIC8vIE1vdmUgY2FyZXQgYXQgdGhlIGVuZCBvZiBwIGluIGxhc3QgaW5zZXJ0ZWQgZW5kbm90ZVxuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2V0Q3Vyc29yTG9jYXRpb24odGlueW1jZS5hY3RpdmVFZGl0b3IuZG9tLnNlbGVjdChgJHtFTkROT1RFX1NFTEVDVE9SfSMke3JlZmVyZW5jZX0+cGApWzBdLCAxKVxuICAgICAgfSlcbiAgICB9XG4gIH0pXG59KVxuXG5mdW5jdGlvbiByZWZlcmVuY2VzKCkge1xuXG4gIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuXG4gIC8qIFJlZmVyZW5jZXMgKi9cbiAgdGlueW1jZS5hY3RpdmVFZGl0b3IuJChcImFbaHJlZl1cIikuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCQudHJpbSgkKHRoaXMpLnRleHQoKSkgPT0gJycpIHtcbiAgICAgIHZhciBjdXJfaWQgPSAkKHRoaXMpLmF0dHIoXCJocmVmXCIpO1xuICAgICAgb3JpZ2luYWxfY29udGVudCA9ICQodGhpcykuaHRtbCgpXG4gICAgICBvcmlnaW5hbF9yZWZlcmVuY2UgPSBjdXJfaWRcbiAgICAgIHJlZmVyZW5jZWRfZWxlbWVudCA9ICQoY3VyX2lkKTtcblxuICAgICAgaWYgKHJlZmVyZW5jZWRfZWxlbWVudC5sZW5ndGggPiAwKSB7XG4gICAgICAgIHJlZmVyZW5jZWRfZWxlbWVudF9maWd1cmUgPSByZWZlcmVuY2VkX2VsZW1lbnQuZmluZChcbiAgICAgICAgICBmaWd1cmVib3hfc2VsZWN0b3JfaW1nICsgXCIsXCIgKyBmaWd1cmVib3hfc2VsZWN0b3Jfc3ZnKTtcbiAgICAgICAgcmVmZXJlbmNlZF9lbGVtZW50X3RhYmxlID0gcmVmZXJlbmNlZF9lbGVtZW50LmZpbmQodGFibGVib3hfc2VsZWN0b3JfdGFibGUpO1xuICAgICAgICByZWZlcmVuY2VkX2VsZW1lbnRfZm9ybXVsYSA9IHJlZmVyZW5jZWRfZWxlbWVudC5maW5kKFxuICAgICAgICAgIGZvcm11bGFib3hfc2VsZWN0b3JfaW1nICsgXCIsXCIgKyBmb3JtdWxhYm94X3NlbGVjdG9yX3NwYW4gKyBcIixcIiArIGZvcm11bGFib3hfc2VsZWN0b3JfbWF0aCArIFwiLFwiICsgZm9ybXVsYWJveF9zZWxlY3Rvcl9zdmcpO1xuICAgICAgICByZWZlcmVuY2VkX2VsZW1lbnRfbGlzdGluZyA9IHJlZmVyZW5jZWRfZWxlbWVudC5maW5kKGxpc3Rpbmdib3hfc2VsZWN0b3JfcHJlKTtcbiAgICAgICAgLyogU3BlY2lhbCBzZWN0aW9ucyAqL1xuICAgICAgICBpZiAoXG4gICAgICAgICAgJChcInNlY3Rpb25bcm9sZT1kb2MtYWJzdHJhY3RdXCIgKyBjdXJfaWQpLmxlbmd0aCA+IDAgfHxcbiAgICAgICAgICAkKFwic2VjdGlvbltyb2xlPWRvYy1iaWJsaW9ncmFwaHldXCIgKyBjdXJfaWQpLmxlbmd0aCA+IDAgfHxcbiAgICAgICAgICAkKFwic2VjdGlvbltyb2xlPWRvYy1lbmRub3Rlc11cIiArIGN1cl9pZCArIFwiLCBzZWN0aW9uW3JvbGU9ZG9jLWZvb3Rub3Rlc11cIiArIGN1cl9pZCkubGVuZ3RoID4gMCB8fFxuICAgICAgICAgICQoXCJzZWN0aW9uW3JvbGU9ZG9jLWFja25vd2xlZGdlbWVudHNdXCIgKyBjdXJfaWQpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAkKHRoaXMpLmh0bWwoXCI8c3BhbiBjbGFzcz1cXFwiY2dlblxcXCIgY29udGVudGVkaXRhYmxlPVxcXCJmYWxzZVxcXCIgIGRhdGEtcmFzaC1vcmlnaW5hbC1jb250ZW50PVxcXCJcIiArIG9yaWdpbmFsX2NvbnRlbnQgK1xuICAgICAgICAgICAgXCJcXFwiPlNlY3Rpb24gPHE+XCIgKyAkKGN1cl9pZCArIFwiID4gaDFcIikudGV4dCgpICsgXCI8L3E+PC9zcGFuPlwiKTtcbiAgICAgICAgICAvKiBCaWJsaW9ncmFwaGljIHJlZmVyZW5jZXMgKi9cbiAgICAgICAgfSBlbHNlIGlmICgkKGN1cl9pZCkucGFyZW50cyhcInNlY3Rpb25bcm9sZT1kb2MtYmlibGlvZ3JhcGh5XVwiKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgdmFyIGN1cl9jb3VudCA9ICQoY3VyX2lkKS5wcmV2QWxsKFwibGlcIikubGVuZ3RoICsgMTtcbiAgICAgICAgICAkKHRoaXMpLmh0bWwoXCI8c3BhbiBjbGFzcz1cXFwiY2dlblxcXCIgY29udGVudGVkaXRhYmxlPVxcXCJmYWxzZVxcXCIgZGF0YS1yYXNoLW9yaWdpbmFsLWNvbnRlbnQ9XFxcIlwiICsgb3JpZ2luYWxfY29udGVudCArXG4gICAgICAgICAgICBcIlxcXCIgdGl0bGU9XFxcIkJpYmxpb2dyYXBoaWMgcmVmZXJlbmNlIFwiICsgY3VyX2NvdW50ICsgXCI6IFwiICtcbiAgICAgICAgICAgICQoY3VyX2lkKS50ZXh0KCkucmVwbGFjZSgvXFxzKy9nLCBcIiBcIikudHJpbSgpICsgXCJcXFwiPltcIiArIGN1cl9jb3VudCArIFwiXTwvc3Bhbj5cIik7XG4gICAgICAgICAgLyogRm9vdG5vdGUgcmVmZXJlbmNlcyAoZG9jLWZvb3Rub3RlcyBhbmQgZG9jLWZvb3Rub3RlIGluY2x1ZGVkIGZvciBlYXNpbmcgYmFjayBjb21wYXRpYmlsaXR5KSAqL1xuICAgICAgICB9IGVsc2UgaWYgKCQoY3VyX2lkKS5wYXJlbnRzKFwic2VjdGlvbltyb2xlPWRvYy1lbmRub3Rlc10sIHNlY3Rpb25bcm9sZT1kb2MtZm9vdG5vdGVzXVwiKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgdmFyIGN1cl9jb250ZW50cyA9ICQodGhpcykucGFyZW50KCkuY29udGVudHMoKTtcbiAgICAgICAgICB2YXIgY3VyX2luZGV4ID0gY3VyX2NvbnRlbnRzLmluZGV4KCQodGhpcykpO1xuICAgICAgICAgIHZhciBwcmV2X3RtcCA9IG51bGw7XG4gICAgICAgICAgd2hpbGUgKGN1cl9pbmRleCA+IDAgJiYgIXByZXZfdG1wKSB7XG4gICAgICAgICAgICBjdXJfcHJldiA9IGN1cl9jb250ZW50c1tjdXJfaW5kZXggLSAxXTtcbiAgICAgICAgICAgIGlmIChjdXJfcHJldi5ub2RlVHlwZSAhPSAzIHx8ICQoY3VyX3ByZXYpLnRleHQoKS5yZXBsYWNlKC8gL2csICcnKSAhPSAnJykge1xuICAgICAgICAgICAgICBwcmV2X3RtcCA9IGN1cl9wcmV2O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgY3VyX2luZGV4LS07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciBwcmV2X2VsID0gJChwcmV2X3RtcCk7XG4gICAgICAgICAgdmFyIGN1cnJlbnRfaWQgPSAkKHRoaXMpLmF0dHIoXCJocmVmXCIpO1xuICAgICAgICAgIHZhciBmb290bm90ZV9lbGVtZW50ID0gJChjdXJyZW50X2lkKTtcbiAgICAgICAgICBpZiAoZm9vdG5vdGVfZWxlbWVudC5sZW5ndGggPiAwICYmXG4gICAgICAgICAgICBmb290bm90ZV9lbGVtZW50LnBhcmVudChcInNlY3Rpb25bcm9sZT1kb2MtZW5kbm90ZXNdLCBzZWN0aW9uW3JvbGU9ZG9jLWZvb3Rub3Rlc11cIikubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgdmFyIGNvdW50ID0gJChjdXJyZW50X2lkKS5wcmV2QWxsKFwic2VjdGlvblwiKS5sZW5ndGggKyAxO1xuICAgICAgICAgICAgaWYgKHByZXZfZWwuZmluZChcInN1cFwiKS5oYXNDbGFzcyhcImZuXCIpKSB7XG4gICAgICAgICAgICAgICQodGhpcykuYmVmb3JlKFwiPHN1cCBjbGFzcz1cXFwiY2dlblxcXCIgY29udGVudGVkaXRhYmxlPVxcXCJmYWxzZVxcXCIgZGF0YS1yYXNoLW9yaWdpbmFsLWNvbnRlbnQ9XFxcIlxcXCI+LDwvc3VwPlwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8qIFNUQVJUIFJlbW92ZWQgPGE+IGZyb20gPHN1cD4gKi9cbiAgICAgICAgICAgICQodGhpcykuaHRtbChcIjxzdXAgY2xhc3M9XFxcImZuIGNnZW5cXFwiIGNvbnRlbnRlZGl0YWJsZT1cXFwiZmFsc2VcXFwiIGRhdGEtcmFzaC1vcmlnaW5hbC1jb250ZW50PVxcXCJcIiArIG9yaWdpbmFsX2NvbnRlbnQgKyBcIlxcXCJcIiArXG4gICAgICAgICAgICAgIFwibmFtZT1cXFwiZm5fcG9pbnRlcl9cIiArIGN1cnJlbnRfaWQucmVwbGFjZShcIiNcIiwgXCJcIikgK1xuICAgICAgICAgICAgICBcIlxcXCIgdGl0bGU9XFxcIkZvb3Rub3RlIFwiICsgY291bnQgKyBcIjogXCIgK1xuICAgICAgICAgICAgICAkKGN1cnJlbnRfaWQpLnRleHQoKS5yZXBsYWNlKC9cXHMrL2csIFwiIFwiKS50cmltKCkgKyBcIlxcXCI+XCIgKyBjb3VudCArIFwiPC9zdXA+XCIpO1xuICAgICAgICAgICAgLyogRU5EIFJlbW92ZWQgPGE+IGZyb20gPHN1cD4gKi9cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJCh0aGlzKS5odG1sKFwiPHNwYW4gY2xhc3M9XFxcImVycm9yIGNnZW5cXFwiIGNvbnRlbnRlZGl0YWJsZT1cXFwiZmFsc2VcXFwiIGRhdGEtcmFzaC1vcmlnaW5hbC1jb250ZW50PVxcXCJcIiArIG9yaWdpbmFsX2NvbnRlbnQgK1xuICAgICAgICAgICAgICBcIlxcXCI+RVJSOiBmb290bm90ZSAnXCIgKyBjdXJyZW50X2lkLnJlcGxhY2UoXCIjXCIsIFwiXCIpICsgXCInIGRvZXMgbm90IGV4aXN0PC9zcGFuPlwiKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLyogQ29tbW9uIHNlY3Rpb25zICovXG4gICAgICAgIH0gZWxzZSBpZiAoJChcInNlY3Rpb25cIiArIGN1cl9pZCkubGVuZ3RoID4gMCkge1xuICAgICAgICAgIHZhciBjdXJfY291bnQgPSAkKGN1cl9pZCkuZmluZEhpZXJhcmNoaWNhbE51bWJlcihcbiAgICAgICAgICAgIFwic2VjdGlvbjpub3QoW3JvbGU9ZG9jLWFic3RyYWN0XSk6bm90KFtyb2xlPWRvYy1iaWJsaW9ncmFwaHldKTpcIiArXG4gICAgICAgICAgICBcIm5vdChbcm9sZT1kb2MtZW5kbm90ZXNdKTpub3QoW3JvbGU9ZG9jLWZvb3Rub3Rlc10pOm5vdChbcm9sZT1kb2MtYWNrbm93bGVkZ2VtZW50c10pXCIpO1xuICAgICAgICAgIGlmIChjdXJfY291bnQgIT0gbnVsbCAmJiBjdXJfY291bnQgIT0gXCJcIikge1xuICAgICAgICAgICAgJCh0aGlzKS5odG1sKFwiPHNwYW4gY2xhc3M9XFxcImNnZW5cXFwiIGNvbnRlbnRlZGl0YWJsZT1cXFwiZmFsc2VcXFwiIGRhdGEtcmFzaC1vcmlnaW5hbC1jb250ZW50PVxcXCJcIiArIG9yaWdpbmFsX2NvbnRlbnQgK1xuICAgICAgICAgICAgICBcIlxcXCI+U2VjdGlvbiBcIiArIGN1cl9jb3VudCArIFwiPC9zcGFuPlwiKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLyogUmVmZXJlbmNlIHRvIGZpZ3VyZSBib3hlcyAqL1xuICAgICAgICB9IGVsc2UgaWYgKHJlZmVyZW5jZWRfZWxlbWVudF9maWd1cmUubGVuZ3RoID4gMCkge1xuICAgICAgICAgIHZhciBjdXJfY291bnQgPSByZWZlcmVuY2VkX2VsZW1lbnRfZmlndXJlLmZpbmROdW1iZXIoZmlndXJlYm94X3NlbGVjdG9yKTtcbiAgICAgICAgICBpZiAoY3VyX2NvdW50ICE9IDApIHtcbiAgICAgICAgICAgICQodGhpcykuaHRtbChcIjxzcGFuIGNsYXNzPVxcXCJjZ2VuXFxcIiBjb250ZW50ZWRpdGFibGU9XFxcImZhbHNlXFxcIiBkYXRhLXJhc2gtb3JpZ2luYWwtY29udGVudD1cXFwiXCIgKyBvcmlnaW5hbF9jb250ZW50ICtcbiAgICAgICAgICAgICAgXCJcXFwiPkZpZ3VyZSBcIiArIGN1cl9jb3VudCArIFwiPC9zcGFuPlwiKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLyogUmVmZXJlbmNlIHRvIHRhYmxlIGJveGVzICovXG4gICAgICAgIH0gZWxzZSBpZiAocmVmZXJlbmNlZF9lbGVtZW50X3RhYmxlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICB2YXIgY3VyX2NvdW50ID0gcmVmZXJlbmNlZF9lbGVtZW50X3RhYmxlLmZpbmROdW1iZXIodGFibGVib3hfc2VsZWN0b3IpO1xuICAgICAgICAgIGlmIChjdXJfY291bnQgIT0gMCkge1xuICAgICAgICAgICAgJCh0aGlzKS5odG1sKFwiPHNwYW4gY2xhc3M9XFxcImNnZW5cXFwiIGNvbnRlbnRlZGl0YWJsZT1cXFwiZmFsc2VcXFwiIGRhdGEtcmFzaC1vcmlnaW5hbC1jb250ZW50PVxcXCJcIiArIG9yaWdpbmFsX2NvbnRlbnQgK1xuICAgICAgICAgICAgICBcIlxcXCI+VGFibGUgXCIgKyBjdXJfY291bnQgKyBcIjwvc3Bhbj5cIik7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8qIFJlZmVyZW5jZSB0byBmb3JtdWxhIGJveGVzICovXG4gICAgICAgIH0gZWxzZSBpZiAocmVmZXJlbmNlZF9lbGVtZW50X2Zvcm11bGEubGVuZ3RoID4gMCkge1xuICAgICAgICAgIHZhciBjdXJfY291bnQgPSByZWZlcmVuY2VkX2VsZW1lbnRfZm9ybXVsYS5maW5kTnVtYmVyKGZvcm11bGFib3hfc2VsZWN0b3IpO1xuICAgICAgICAgIGlmIChjdXJfY291bnQgIT0gMCkge1xuICAgICAgICAgICAgJCh0aGlzKS5odG1sKFwiPHNwYW4gY2xhc3M9XFxcImNnZW5cXFwiIGNvbnRlbnRlZGl0YWJsZT1cXFwiZmFsc2VcXFwiIGRhdGEtcmFzaC1vcmlnaW5hbC1jb250ZW50PVxcXCJcIiArIG9yaWdpbmFsX2NvbnRlbnQgK1xuICAgICAgICAgICAgICBcIlxcXCI+Rm9ybXVsYSBcIiArIGN1cl9jb3VudCArIFwiPC9zcGFuPlwiKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLyogUmVmZXJlbmNlIHRvIGxpc3RpbmcgYm94ZXMgKi9cbiAgICAgICAgfSBlbHNlIGlmIChyZWZlcmVuY2VkX2VsZW1lbnRfbGlzdGluZy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgdmFyIGN1cl9jb3VudCA9IHJlZmVyZW5jZWRfZWxlbWVudF9saXN0aW5nLmZpbmROdW1iZXIobGlzdGluZ2JveF9zZWxlY3Rvcik7XG4gICAgICAgICAgaWYgKGN1cl9jb3VudCAhPSAwKSB7XG4gICAgICAgICAgICAkKHRoaXMpLmh0bWwoXCI8c3BhbiBjbGFzcz1cXFwiY2dlblxcXCIgY29udGVudGVkaXRhYmxlPVxcXCJmYWxzZVxcXCIgZGF0YS1yYXNoLW9yaWdpbmFsLWNvbnRlbnQ9XFxcIlwiICsgb3JpZ2luYWxfY29udGVudCArXG4gICAgICAgICAgICAgIFwiXFxcIj5MaXN0aW5nIFwiICsgY3VyX2NvdW50ICsgXCI8L3NwYW4+XCIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAkKHRoaXMpLmh0bWwoXCI8c3BhbiBjbGFzcz1cXFwiZXJyb3IgY2dlblxcXCIgY29udGVudGVkaXRhYmxlPVxcXCJmYWxzZVxcXCIgZGF0YS1yYXNoLW9yaWdpbmFsLWNvbnRlbnQ9XFxcIlwiICsgb3JpZ2luYWxfY29udGVudCArXG4gICAgICAgICAgICBcIlxcXCI+RVJSOiByZWZlcmVuY2VkIGVsZW1lbnQgJ1wiICsgY3VyX2lkLnJlcGxhY2UoXCIjXCIsIFwiXCIpICtcbiAgICAgICAgICAgIFwiJyBoYXMgbm90IHRoZSBjb3JyZWN0IHR5cGUgKGl0IHNob3VsZCBiZSBlaXRoZXIgYSBmaWd1cmUsIGEgdGFibGUsIGEgZm9ybXVsYSwgYSBsaXN0aW5nLCBvciBhIHNlY3Rpb24pPC9zcGFuPlwiKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJCh0aGlzKS5yZXBsYWNlV2l0aChcIjxzcGFuIGNsYXNzPVxcXCJlcnJvciBjZ2VuXFxcIiBjb250ZW50ZWRpdGFibGU9XFxcImZhbHNlXFxcIiBkYXRhLXJhc2gtb3JpZ2luYWwtY29udGVudD1cXFwiXCIgKyBvcmlnaW5hbF9jb250ZW50ICtcbiAgICAgICAgICBcIlxcXCI+RVJSOiByZWZlcmVuY2VkIGVsZW1lbnQgJ1wiICsgY3VyX2lkLnJlcGxhY2UoXCIjXCIsIFwiXCIpICsgXCInIGRvZXMgbm90IGV4aXN0PC9zcGFuPlwiKTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuICAvKiAvRU5EIFJlZmVyZW5jZXMgKi9cbn1cblxuZnVuY3Rpb24gdXBkYXRlUmVmZXJlbmNlcygpIHtcblxuICBpZiAodGlueW1jZS5hY3RpdmVFZGl0b3IuJCgnc3Bhbi5jZ2VuW2RhdGEtcmFzaC1vcmlnaW5hbC1jb250ZW50XSxzdXAuY2dlbi5mbicpLmxlbmd0aCkge1xuXG4gICAgLy8gUmVzdG9yZSBhbGwgc2F2ZWQgY29udGVudFxuICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLiQoJ3NwYW4uY2dlbltkYXRhLXJhc2gtb3JpZ2luYWwtY29udGVudF0sc3VwLmNnZW4uZm4nKS5lYWNoKGZ1bmN0aW9uICgpIHtcblxuICAgICAgLy8gU2F2ZSBvcmlnaW5hbCBjb250ZW50IGFuZCByZWZlcmVuY2VcbiAgICAgIGxldCBvcmlnaW5hbF9jb250ZW50ID0gJCh0aGlzKS5hdHRyKCdkYXRhLXJhc2gtb3JpZ2luYWwtY29udGVudCcpXG4gICAgICBsZXQgb3JpZ2luYWxfcmVmZXJlbmNlID0gJCh0aGlzKS5wYXJlbnQoJ2EnKS5hdHRyKCdocmVmJylcblxuICAgICAgJCh0aGlzKS5wYXJlbnQoJ2EnKS5yZXBsYWNlV2l0aChgPGEgY29udGVudGVkaXRhYmxlPVwiZmFsc2VcIiBocmVmPVwiJHtvcmlnaW5hbF9yZWZlcmVuY2V9XCI+JHtvcmlnaW5hbF9jb250ZW50fTwvYT5gKVxuICAgIH0pXG4gICAgXG4gICAgcmVmZXJlbmNlcygpXG4gIH1cbn0iLCIvKipcbiAqIFRoaXMgc2NyaXB0IGNvbnRhaW5zIGFsbCBmaWd1cmUgYm94IGF2YWlsYWJsZSB3aXRoIFJBU0guXG4gKiBcbiAqIHBsdWdpbnM6XG4gKiAgcmFqZV90YWJsZVxuICogIHJhamVfZmlndXJlXG4gKiAgcmFqZV9mb3JtdWxhXG4gKiAgcmFqZV9saXN0aW5nXG4gKi9cbmxldCByZW1vdmVfbGlzdGluZyA9IDBcblxuLyoqXG4gKiBcbiAqIEBwYXJhbSB7Kn0gZm9ybXVsYVZhbHVlIFxuICogQHBhcmFtIHsqfSBjYWxsYmFjayBcbiAqL1xuZnVuY3Rpb24gb3BlbklubGluZUZvcm11bGFFZGl0b3IoZm9ybXVsYVZhbHVlKSB7XG4gIHRpbnltY2UuYWN0aXZlRWRpdG9yLndpbmRvd01hbmFnZXIub3Blbih7XG4gICAgICB0aXRsZTogJ01hdGggZm9ybXVsYSBlZGl0b3InLFxuICAgICAgdXJsOiAnanMvcmFqZS1jb3JlL3BsdWdpbi9yYWplX2Zvcm11bGEuaHRtbCcsXG4gICAgICB3aWR0aDogODAwLFxuICAgICAgaGVpZ2h0OiA1MDAsXG4gICAgICBvbkNsb3NlOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgbGV0IG91dHB1dCA9IHRpbnltY2UuYWN0aXZlRWRpdG9yLmZvcm11bGFfb3V0cHV0XG5cbiAgICAgICAgLy8gSWYgYXQgbGVhc3QgZm9ybXVsYSBpcyB3cml0dGVuXG4gICAgICAgIGlmIChvdXRwdXQgIT0gbnVsbCkge1xuXG4gICAgICAgICAgLy8gSWYgaGFzIGlkLCBSQUpFIG11c3QgdXBkYXRlIGl0XG4gICAgICAgICAgaWYgKG91dHB1dC5mb3JtdWxhX2lkKVxuICAgICAgICAgICAgaW5saW5lX2Zvcm11bGEudXBkYXRlKG91dHB1dC5mb3JtdWxhX3N2Zywgb3V0cHV0LmZvcm11bGFfaWQpXG5cbiAgICAgICAgICAvLyBPciBhZGQgaXQgbm9ybWFsbHlcbiAgICAgICAgICBlbHNlXG4gICAgICAgICAgICBpbmxpbmVfZm9ybXVsYS5hZGQob3V0cHV0LmZvcm11bGFfc3ZnKVxuXG4gICAgICAgICAgLy8gU2V0IGZvcm11bGEgbnVsbFxuICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLmZvcm11bGFfb3V0cHV0ID0gbnVsbFxuICAgICAgICB9XG5cbiAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iud2luZG93TWFuYWdlci5jbG9zZSgpXG4gICAgICB9XG4gICAgfSxcbiAgICBmb3JtdWxhVmFsdWVcbiAgKVxufVxuXG4vKipcbiAqIFxuICogQHBhcmFtIHsqfSBmb3JtdWxhVmFsdWUgXG4gKiBAcGFyYW0geyp9IGNhbGxiYWNrIFxuICovXG5mdW5jdGlvbiBvcGVuRm9ybXVsYUVkaXRvcihmb3JtdWxhVmFsdWUpIHtcbiAgdGlueW1jZS5hY3RpdmVFZGl0b3Iud2luZG93TWFuYWdlci5vcGVuKHtcbiAgICAgIHRpdGxlOiAnTWF0aCBmb3JtdWxhIGVkaXRvcicsXG4gICAgICB1cmw6ICdqcy9yYWplLWNvcmUvcGx1Z2luL3JhamVfZm9ybXVsYS5odG1sJyxcbiAgICAgIHdpZHRoOiA4MDAsXG4gICAgICBoZWlnaHQ6IDUwMCxcbiAgICAgIG9uQ2xvc2U6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgICBsZXQgb3V0cHV0ID0gdGlueW1jZS5hY3RpdmVFZGl0b3IuZm9ybXVsYV9vdXRwdXRcblxuICAgICAgICAvLyBJZiBhdCBsZWFzdCBmb3JtdWxhIGlzIHdyaXR0ZW5cbiAgICAgICAgaWYgKG91dHB1dCAhPSBudWxsKSB7XG5cbiAgICAgICAgICAvLyBJZiBoYXMgaWQsIFJBSkUgbXVzdCB1cGRhdGUgaXRcbiAgICAgICAgICBpZiAob3V0cHV0LmZvcm11bGFfaWQpXG4gICAgICAgICAgICBmb3JtdWxhLnVwZGF0ZShvdXRwdXQuZm9ybXVsYV9zdmcsIG91dHB1dC5mb3JtdWxhX2lkKVxuXG4gICAgICAgICAgLy8gT3IgYWRkIGl0IG5vcm1hbGx5XG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgZm9ybXVsYS5hZGQob3V0cHV0LmZvcm11bGFfc3ZnKVxuXG4gICAgICAgICAgLy8gU2V0IGZvcm11bGEgbnVsbFxuICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLmZvcm11bGFfb3V0cHV0ID0gbnVsbFxuICAgICAgICB9XG5cbiAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iud2luZG93TWFuYWdlci5jbG9zZSgpXG4gICAgICB9XG4gICAgfSxcbiAgICBmb3JtdWxhVmFsdWVcbiAgKVxufVxuXG4vKipcbiAqIFJhamVfdGFibGVcbiAqL1xudGlueW1jZS5QbHVnaW5NYW5hZ2VyLmFkZCgncmFqZV90YWJsZScsIGZ1bmN0aW9uIChlZGl0b3IpIHtcblxuICAvLyBBZGQgYSBidXR0b24gdGhhdCBoYW5kbGUgdGhlIGlubGluZSBlbGVtZW50XG4gIGVkaXRvci5hZGRCdXR0b24oJ3JhamVfdGFibGUnLCB7XG4gICAgdGl0bGU6ICdyYWplX3RhYmxlJyxcbiAgICBpY29uOiAnaWNvbi10YWJsZScsXG4gICAgdG9vbHRpcDogJ1RhYmxlJyxcbiAgICBkaXNhYmxlZFN0YXRlU2VsZWN0b3I6IERJU0FCTEVfU0VMRUNUT1JfRklHVVJFUyxcblxuICAgIC8vIEJ1dHRvbiBiZWhhdmlvdXJcbiAgICBvbmNsaWNrOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgIC8vIE9uIGNsaWNrIGEgZGlhbG9nIGlzIG9wZW5lZFxuICAgICAgZWRpdG9yLndpbmRvd01hbmFnZXIub3Blbih7XG4gICAgICAgIHRpdGxlOiAnU2VsZWN0IFRhYmxlIHNpemUnLFxuICAgICAgICBib2R5OiBbe1xuICAgICAgICAgIHR5cGU6ICd0ZXh0Ym94JyxcbiAgICAgICAgICBuYW1lOiAnd2lkdGgnLFxuICAgICAgICAgIGxhYmVsOiAnQ29sdW1ucydcbiAgICAgICAgfSwge1xuICAgICAgICAgIHR5cGU6ICd0ZXh0Ym94JyxcbiAgICAgICAgICBuYW1lOiAnaGVpZ3RoJyxcbiAgICAgICAgICBsYWJlbDogJ1Jvd3MnXG4gICAgICAgIH1dLFxuICAgICAgICBvblN1Ym1pdDogZnVuY3Rpb24gKGUpIHtcblxuICAgICAgICAgIC8vIEdldCB3aWR0aCBhbmQgaGVpZ3RoXG4gICAgICAgICAgdGFibGUuYWRkKGUuZGF0YS53aWR0aCwgZS5kYXRhLmhlaWd0aClcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9XG4gIH0pXG5cbiAgLy8gQmVjYXVzZSBzb21lIGJlaGF2aW91cnMgYXJlbid0IGFjY2VwdGVkLCBSQUpFIG11c3QgY2hlY2sgc2VsZWN0aW9uIGFuZCBhY2NlcHQgYmFja3NwYWNlLCBjYW5jIGFuZCBlbnRlciBwcmVzc1xuICBlZGl0b3Iub24oJ2tleURvd24nLCBmdW5jdGlvbiAoZSkge1xuXG4gICAgLy8gVE9ETyBpZiBpbnNpZGUgdGFibGVcblxuICAgIC8vIGtleUNvZGUgOCBpcyBiYWNrc3BhY2UsIDQ2IGlzIGNhbmNcbiAgICBpZiAoZS5rZXlDb2RlID09IDgpXG4gICAgICByZXR1cm4gaGFuZGxlRmlndXJlRGVsZXRlKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbilcblxuICAgIGlmIChlLmtleUNvZGUgPT0gNDYpXG4gICAgICByZXR1cm4gaGFuZGxlRmlndXJlQ2FuYyh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24pXG5cbiAgICAvLyBIYW5kbGUgZW50ZXIga2V5IGluIGZpZ2NhcHRpb25cbiAgICBpZiAoZS5rZXlDb2RlID09IDEzKVxuICAgICAgcmV0dXJuIGhhbmRsZUZpZ3VyZUVudGVyKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbilcblxuICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKClcbiAgfSlcblxuICAvLyBIYW5kbGUgc3RyYW5nZSBzdHJ1Y3R1cmFsIG1vZGlmaWNhdGlvbiBlbXB0eSBmaWd1cmVzIG9yIHdpdGggY2FwdGlvbiBhcyBmaXJzdCBjaGlsZFxuICBlZGl0b3Iub24oJ25vZGVDaGFuZ2UnLCBmdW5jdGlvbiAoKSB7XG4gICAgaGFuZGxlRmlndXJlQ2hhbmdlKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbilcbiAgfSlcblxuICB0YWJsZSA9IHtcblxuICAgIC8qKlxuICAgICAqIEFkZCB0aGUgbmV3IHRhYmxlICh3aXRoIGdpdmVuIHNpemUpIGF0IHRoZSBjYXJldCBwb3NpdGlvblxuICAgICAqL1xuICAgIGFkZDogZnVuY3Rpb24gKHdpZHRoLCBoZWlndGgpIHtcblxuICAgICAgLy8gR2V0IHRoZSByZWZlcmVuY2Ugb2YgdGhlIGN1cnJlbnQgc2VsZWN0ZWQgZWxlbWVudFxuICAgICAgbGV0IHNlbGVjdGVkRWxlbWVudCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcblxuICAgICAgLy8gR2V0IHRoZSByZWZlcmVuY2Ugb2YgdGhlIG5ldyBjcmVhdGVkIHRhYmxlXG4gICAgICBsZXQgbmV3VGFibGUgPSB0aGlzLmNyZWF0ZSh3aWR0aCwgaGVpZ3RoLCBnZXRTdWNjZXNzaXZlRWxlbWVudElkKEZJR1VSRV9UQUJMRV9TRUxFQ1RPUiwgVEFCTEVfU1VGRklYKSlcblxuICAgICAgLy8gQmVnaW4gYXRvbWljIFVORE8gbGV2ZWwgXG4gICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIHNlbGVjdGVkIGVsZW1lbnQgaXMgbm90IGVtcHR5LCBhbmQgYWRkIHRhYmxlIGFmdGVyXG4gICAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQudGV4dCgpLnRyaW0oKS5sZW5ndGggIT0gMCkge1xuXG4gICAgICAgICAgLy8gSWYgc2VsZWN0aW9uIGlzIGF0IHN0YXJ0IG9mIHRoZSBzZWxlY3RlZCBlbGVtZW50XG4gICAgICAgICAgaWYgKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRSbmcoKS5zdGFydE9mZnNldCA9PSAwKVxuICAgICAgICAgICAgc2VsZWN0ZWRFbGVtZW50LmJlZm9yZShuZXdUYWJsZSlcblxuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIHNlbGVjdGVkRWxlbWVudC5hZnRlcihuZXdUYWJsZSlcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIElmIHNlbGVjdGVkIGVsZW1lbnQgaXMgZW1wdHksIHJlcGxhY2UgaXQgd2l0aCB0aGUgbmV3IHRhYmxlXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBzZWxlY3RlZEVsZW1lbnQucmVwbGFjZVdpdGgobmV3VGFibGUpXG5cbiAgICAgICAgLy8gVXBkYXRlIGFsbCBjYXB0aW9ucyB3aXRoIFJBU0ggZnVuY3Rpb25cbiAgICAgICAgY2FwdGlvbnMoKVxuXG4gICAgICAgIC8vIFVwZGF0ZSBhbGwgY3Jvc3MtcmVmXG4gICAgICAgIHVwZGF0ZVJlZmVyZW5jZXMoKVxuXG4gICAgICAgIC8vIFNhdmUgdXBkYXRlcyBcbiAgICAgICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG4gICAgICB9KVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgdGhlIG5ldyB0YWJsZSB1c2luZyBwYXNzZWQgd2lkdGggYW5kIGhlaWdodFxuICAgICAqL1xuICAgIGNyZWF0ZTogZnVuY3Rpb24gKHdpZHRoLCBoZWlnaHQsIGlkKSB7XG5cbiAgICAgIC8vIElmIHdpZHRoIGFuZCBoZWlndGggYXJlIHBvc2l0aXZlXG4gICAgICB0cnkge1xuICAgICAgICBpZiAod2lkdGggPiAwICYmIGhlaWdodCA+IDApIHtcblxuICAgICAgICAgIC8vIENyZWF0ZSBmaWd1cmUgYW5kIHRhYmxlXG4gICAgICAgICAgbGV0IGZpZ3VyZSA9ICQoYDxmaWd1cmUgaWQ9XCIke2lkfVwiPjwvZmlndXJlPmApXG4gICAgICAgICAgbGV0IHRhYmxlID0gJChgPHRhYmxlPjwvdGFibGU+YClcblxuICAgICAgICAgIC8vIFBvcHVsYXRlIHdpdGggd2lkdGggJiBoZWlndGhcbiAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8PSBoZWlnaHQ7IGkrKykge1xuXG4gICAgICAgICAgICBsZXQgcm93ID0gJChgPHRyPjwvdHI+YClcbiAgICAgICAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgd2lkdGg7IHgrKykge1xuXG4gICAgICAgICAgICAgIGlmIChpID09IDApXG4gICAgICAgICAgICAgICAgcm93LmFwcGVuZChgPHRoPkhlYWRpbmcgY2VsbCAke3grMX08L3RoPmApXG5cbiAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIHJvdy5hcHBlbmQoYDx0ZD48cD5EYXRhIGNlbGwgJHt4KzF9PC9wPjwvdGQ+YClcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGFibGUuYXBwZW5kKHJvdylcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBmaWd1cmUuYXBwZW5kKHRhYmxlKVxuICAgICAgICAgIGZpZ3VyZS5hcHBlbmQoYDxmaWdjYXB0aW9uPkNhcHRpb24uPC9maWdjYXB0aW9uPmApXG5cbiAgICAgICAgICByZXR1cm4gZmlndXJlXG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2ggKGUpIHt9XG4gICAgfVxuICB9XG59KVxuXG4vKipcbiAqIFJhamVfZmlndXJlXG4gKi9cbnRpbnltY2UuUGx1Z2luTWFuYWdlci5hZGQoJ3JhamVfaW1hZ2UnLCBmdW5jdGlvbiAoZWRpdG9yLCB1cmwpIHtcblxuICAvLyBBZGQgYSBidXR0b24gdGhhdCBoYW5kbGUgdGhlIGlubGluZSBlbGVtZW50XG4gIGVkaXRvci5hZGRCdXR0b24oJ3JhamVfaW1hZ2UnLCB7XG4gICAgdGl0bGU6ICdyYWplX2ltYWdlJyxcbiAgICBpY29uOiAnaWNvbi1pbWFnZScsXG4gICAgdG9vbHRpcDogJ0ltYWdlIGJsb2NrJyxcbiAgICBkaXNhYmxlZFN0YXRlU2VsZWN0b3I6IERJU0FCTEVfU0VMRUNUT1JfRklHVVJFUyxcblxuICAgIC8vIEJ1dHRvbiBiZWhhdmlvdXJcbiAgICBvbmNsaWNrOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgIGxldCBmaWxlbmFtZSA9IHNlbGVjdEltYWdlKClcblxuICAgICAgaWYgKGZpbGVuYW1lICE9IG51bGwpXG4gICAgICAgIGltYWdlLmFkZChmaWxlbmFtZSwgZmlsZW5hbWUpXG4gICAgfVxuICB9KVxuXG4gIC8vIEJlY2F1c2Ugc29tZSBiZWhhdmlvdXJzIGFyZW4ndCBhY2NlcHRlZCwgUkFKRSBtdXN0IGNoZWNrIHNlbGVjdGlvbiBhbmQgYWNjZXB0IGJhY2tzcGFjZSwgY2FuYyBhbmQgZW50ZXIgcHJlc3NcbiAgZWRpdG9yLm9uKCdrZXlEb3duJywgZnVuY3Rpb24gKGUpIHtcblxuXG4gICAgLy8ga2V5Q29kZSA4IGlzIGJhY2tzcGFjZVxuICAgIGlmIChlLmtleUNvZGUgPT0gOClcbiAgICAgIHJldHVybiBoYW5kbGVGaWd1cmVEZWxldGUodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uKVxuXG4gICAgaWYgKGUua2V5Q29kZSA9PSA0NilcbiAgICAgIHJldHVybiBoYW5kbGVGaWd1cmVDYW5jKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbilcblxuICAgIC8vIEhhbmRsZSBlbnRlciBrZXkgaW4gZmlnY2FwdGlvblxuICAgIGlmIChlLmtleUNvZGUgPT0gMTMpXG4gICAgICByZXR1cm4gaGFuZGxlRmlndXJlRW50ZXIodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uKVxuXG4gIH0pXG5cbiAgaW1hZ2UgPSB7XG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBhZGQ6IGZ1bmN0aW9uICh1cmwsIGFsdCkge1xuXG4gICAgICAvLyBHZXQgdGhlIHJlZmVyZWNlIG9mIHRoZSBzZWxlY3RlZCBlbGVtZW50XG4gICAgICBsZXQgc2VsZWN0ZWRFbGVtZW50ID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuICAgICAgbGV0IG5ld0ZpZ3VyZSA9IHRoaXMuY3JlYXRlKHVybCwgYWx0LCBnZXRTdWNjZXNzaXZlRWxlbWVudElkKEZJR1VSRV9JTUFHRV9TRUxFQ1RPUiwgSU1BR0VfU1VGRklYKSlcblxuICAgICAgLy8gQmVnaW4gYXRvbWljIFVORE8gbGV2ZWwgXG4gICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIHNlbGVjdGVkIGVsZW1lbnQgaXMgbm90IGVtcHR5LCBhbmQgYWRkIHRhYmxlIGFmdGVyXG4gICAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQudGV4dCgpLnRyaW0oKS5sZW5ndGggIT0gMCkge1xuXG4gICAgICAgICAgLy8gSWYgc2VsZWN0aW9uIGlzIGF0IHN0YXJ0IG9mIHRoZSBzZWxlY3RlZCBlbGVtZW50XG4gICAgICAgICAgaWYgKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRSbmcoKS5zdGFydE9mZnNldCA9PSAwKVxuICAgICAgICAgICAgc2VsZWN0ZWRFbGVtZW50LmJlZm9yZShuZXdGaWd1cmUpXG5cbiAgICAgICAgICBlbHNlXG4gICAgICAgICAgICBzZWxlY3RlZEVsZW1lbnQuYWZ0ZXIobmV3RmlndXJlKVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gSWYgc2VsZWN0ZWQgZWxlbWVudCBpcyBlbXB0eSwgcmVwbGFjZSBpdCB3aXRoIHRoZSBuZXcgdGFibGVcbiAgICAgICAgZWxzZVxuICAgICAgICAgIHNlbGVjdGVkRWxlbWVudC5yZXBsYWNlV2l0aChuZXdGaWd1cmUpXG5cbiAgICAgICAgLy8gVXBkYXRlIGFsbCBjYXB0aW9ucyB3aXRoIFJBU0ggZnVuY3Rpb25cbiAgICAgICAgY2FwdGlvbnMoKVxuXG4gICAgICAgIC8vIFVwZGF0ZSBhbGwgY3Jvc3MtcmVmXG4gICAgICAgIHVwZGF0ZVJlZmVyZW5jZXMoKVxuXG4gICAgICAgIC8vIFNhdmUgdXBkYXRlcyBcbiAgICAgICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG4gICAgICB9KVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBjcmVhdGU6IGZ1bmN0aW9uICh1cmwsIGFsdCwgaWQpIHtcbiAgICAgIHJldHVybiAkKGA8ZmlndXJlIGlkPVwiJHtpZH1cIj48cD48aW1nIHNyYz1cIiR7dXJsfVwiICR7YWx0PydhbHQ9XCInK2FsdCsnXCInOicnfSAvPjwvcD48ZmlnY2FwdGlvbj5DYXB0aW9uLjwvZmlnY2FwdGlvbj48L2ZpZ3VyZT5gKVxuICAgIH1cbiAgfVxufSlcblxuLyoqXG4gKiBSYWplX2Zvcm11bGFcbiAqL1xudGlueW1jZS5QbHVnaW5NYW5hZ2VyLmFkZCgncmFqZV9mb3JtdWxhJywgZnVuY3Rpb24gKGVkaXRvciwgdXJsKSB7XG5cbiAgLy8gQWRkIGEgYnV0dG9uIHRoYXQgaGFuZGxlIHRoZSBpbmxpbmUgZWxlbWVudFxuICBlZGl0b3IuYWRkQnV0dG9uKCdyYWplX2Zvcm11bGEnLCB7XG4gICAgdGl0bGU6ICdyYWplX2Zvcm11bGEnLFxuICAgIGljb246ICdpY29uLWZvcm11bGEnLFxuICAgIHRvb2x0aXA6ICdGb3JtdWxhJyxcbiAgICBkaXNhYmxlZFN0YXRlU2VsZWN0b3I6IERJU0FCTEVfU0VMRUNUT1JfRklHVVJFUyxcblxuICAgIC8vIEJ1dHRvbiBiZWhhdmlvdXJcbiAgICBvbmNsaWNrOiBmdW5jdGlvbiAoKSB7XG4gICAgICBvcGVuRm9ybXVsYUVkaXRvcigpXG4gICAgfVxuICB9KVxuXG4gIC8vIEJlY2F1c2Ugc29tZSBiZWhhdmlvdXJzIGFyZW4ndCBhY2NlcHRlZCwgUkFKRSBtdXN0IGNoZWNrIHNlbGVjdGlvbiBhbmQgYWNjZXB0IGJhY2tzcGFjZSwgY2FuYyBhbmQgZW50ZXIgcHJlc3NcbiAgZWRpdG9yLm9uKCdrZXlEb3duJywgZnVuY3Rpb24gKGUpIHtcblxuICAgIGxldCBzZWxlY3RlZEVsZW1lbnQgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG5cbiAgICBpZiAoZm9ybXVsYS5jdXJzb3JJbkZvcm11bGEoc2VsZWN0ZWRFbGVtZW50KSkge1xuXG4gICAgICAvLyBrZXlDb2RlIDggaXMgYmFja3NwYWNlXG4gICAgICBpZiAoZS5rZXlDb2RlID09IDgpIHtcbiAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKVxuICAgICAgICByZXR1cm4gaGFuZGxlRmlndXJlRGVsZXRlKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbilcbiAgICAgIH1cblxuICAgICAgaWYgKGUua2V5Q29kZSA9PSA0Nikge1xuICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpXG4gICAgICAgIHJldHVybiBoYW5kbGVGaWd1cmVDYW5jKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbilcbiAgICAgIH1cblxuICAgICAgLy8gSGFuZGxlIGVudGVyIGtleSBpbiBmaWdjYXB0aW9uXG4gICAgICBpZiAoZS5rZXlDb2RlID09IDEzKSB7XG4gICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKClcbiAgICAgICAgcmV0dXJuIGhhbmRsZUZpZ3VyZUVudGVyKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbilcbiAgICAgIH1cblxuICAgICAgLy8gQmxvY2sgcHJpbnRhYmxlIGNoYXJzIGluIHBcbiAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQuaXMoJ3AnKSAmJiBjaGVja0lmUHJpbnRhYmxlQ2hhcihlLmtleUNvZGUpKSB7XG4gICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKClcbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICB9XG4gICAgfVxuICB9KVxuXG4gIGVkaXRvci5vbignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuICAgIGxldCBzZWxlY3RlZEVsZW1lbnQgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG5cbiAgICAvLyBPcGVuIGZvcm11bGEgZWRpdG9yIGNsaWNraW5nIG9uIG1hdGggZm9ybXVsYXNcbiAgICAvLyBPTmx5IGlmIHRoZSBjdXJyZW50IGVsZW1lbnQgdGhlIHNwYW4gd2l0aCBjb250ZW50ZWRpdGFibGU9XCJmYWxzZVwiXG4gICAgaWYgKHNlbGVjdGVkRWxlbWVudC5pcygnc3Bhbltjb250ZW50ZWRpdGFibGU9ZmFsc2VdJykgJiYgZm9ybXVsYS5jdXJzb3JJbkZvcm11bGEoc2VsZWN0ZWRFbGVtZW50KSkge1xuXG4gICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpXG5cbiAgICAgIGxldCBmaWd1cmUgPSBzZWxlY3RlZEVsZW1lbnRcblxuICAgICAgaWYgKCFzZWxlY3RlZEVsZW1lbnQuaXMoRklHVVJFX0ZPUk1VTEFfU0VMRUNUT1IpKVxuICAgICAgICBmaWd1cmUgPSBzZWxlY3RlZEVsZW1lbnQucGFyZW50cyhGSUdVUkVfRk9STVVMQV9TRUxFQ1RPUilcblxuICAgICAgb3BlbkZvcm11bGFFZGl0b3Ioe1xuICAgICAgICBmb3JtdWxhX3ZhbDogZmlndXJlLmZpbmQoJ3N2Z1tkYXRhLW1hdGgtb3JpZ2luYWwtaW5wdXRdJykuYXR0cignZGF0YS1tYXRoLW9yaWdpbmFsLWlucHV0JyksXG4gICAgICAgIGZvcm11bGFfaWQ6IGZpZ3VyZS5hdHRyKCdpZCcpXG4gICAgICB9KVxuICAgIH1cbiAgfSlcblxuICBmb3JtdWxhID0ge1xuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIGFkZDogZnVuY3Rpb24gKGZvcm11bGFfc3ZnKSB7XG5cbiAgICAgIGxldCBzZWxlY3RlZEVsZW1lbnQgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG4gICAgICBsZXQgaWQgPSBnZXRTdWNjZXNzaXZlRWxlbWVudElkKEZJR1VSRV9GT1JNVUxBX1NFTEVDVE9SLCBGT1JNVUxBX1NVRkZJWClcbiAgICAgIGxldCBuZXdGb3JtdWxhID0gdGhpcy5jcmVhdGUoZm9ybXVsYV9zdmcsIGlkKVxuXG4gICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIHNlbGVjdGVkIGVsZW1lbnQgaXMgbm90IGVtcHR5LCBhbmQgYWRkIHRoZSBuZXcgZm9ybXVsYSByaWdodCBhZnRlclxuICAgICAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LnRleHQoKS50cmltKCkubGVuZ3RoICE9IDApXG4gICAgICAgICAgc2VsZWN0ZWRFbGVtZW50LmFmdGVyKG5ld0Zvcm11bGEpXG5cbiAgICAgICAgLy8gSWYgc2VsZWN0ZWQgZWxlbWVudCBpcyBlbXB0eSwgcmVwbGFjZSBpdCB3aXRoIHRoZSBuZXcgZm9ybXVsYVxuICAgICAgICBlbHNlXG4gICAgICAgICAgc2VsZWN0ZWRFbGVtZW50LnJlcGxhY2VXaXRoKG5ld0Zvcm11bGEpXG5cbiAgICAgICAgLy8gU2F2ZSB1cGRhdGVzIFxuICAgICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcbiAgICAgICAgY2FwdGlvbnMoKVxuXG4gICAgICAgIG5ld0Zvcm11bGEgPSAkKGAjJHtpZH1gKVxuXG4gICAgICAgIGZvcm11bGEudXBkYXRlU3RydWN0dXJlKG5ld0Zvcm11bGEpXG5cbiAgICAgICAgLy8gQWRkIGEgbmV3IGVtcHR5IHAgYWZ0ZXIgdGhlIGZvcm11bGFcbiAgICAgICAgaWYgKCFuZXdGb3JtdWxhLm5leHQoKS5sZW5ndGgpXG4gICAgICAgICAgbmV3Rm9ybXVsYS5hZnRlcignPHA+PGJyLz48L3A+JylcblxuICAgICAgICAvLyBVcGRhdGUgYWxsIGNyb3NzLXJlZlxuICAgICAgICB1cGRhdGVSZWZlcmVuY2VzKClcblxuICAgICAgICAvLyBVcGRhdGUgUmVuZGVyZWQgUkFTSFxuICAgICAgICAvL3VwZGF0ZUlmcmFtZUZyb21TYXZlZENvbnRlbnQoKVxuXG4gICAgICAgIC8vIE1vdmUgdGhlIGNhcmV0IGF0IHRoZSBzdGFydCBvZiB0aGUgbmV4dCBlbGVtZW50XG4gICAgICAgIG1vdmVDYXJldCh0aW55bWNlLmFjdGl2ZUVkaXRvci5kb20uZ2V0TmV4dCh0aW55bWNlLmFjdGl2ZUVkaXRvci5kb20uZ2V0KGlkKSwgJyonKSwgdHJ1ZSlcbiAgICAgIH0pXG5cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgdXBkYXRlOiBmdW5jdGlvbiAoZm9ybXVsYV9zdmcsIGZvcm11bGFfaWQpIHtcblxuICAgICAgbGV0IHNlbGVjdGVkRmlndXJlID0gJChgIyR7Zm9ybXVsYV9pZH1gKVxuXG4gICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgc2VsZWN0ZWRGaWd1cmUuZmluZCgnc3ZnJykucmVwbGFjZVdpdGgoZm9ybXVsYV9zdmcpXG4gICAgICAgIC8vdXBkYXRlSWZyYW1lRnJvbVNhdmVkQ29udGVudCgpXG4gICAgICB9KVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBjcmVhdGU6IGZ1bmN0aW9uIChmb3JtdWxhX3N2ZywgaWQpIHtcbiAgICAgIHJldHVybiBgPGZpZ3VyZSBpZD1cIiR7aWR9XCI+PHA+PHNwYW4+JHtmb3JtdWxhX3N2Z1swXS5vdXRlckhUTUx9PC9zcGFuPjwvcD48L2ZpZ3VyZT5gXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIGN1cnNvckluRm9ybXVsYTogZnVuY3Rpb24gKHNlbGVjdGVkRWxlbWVudCkge1xuXG4gICAgICByZXR1cm4gKFxuXG4gICAgICAgIC8vIElmIHRoZSBzZWxlY3RlZCBlbGVtZW50IGlzIHRoZSBmb3JtdWxhIGZpZ3VyZVxuICAgICAgICAoc2VsZWN0ZWRFbGVtZW50LmlzKEZJR1VSRV9GT1JNVUxBX1NFTEVDVE9SKSkgfHxcblxuICAgICAgICAvLyBJZiB0aGUgc2VsZWN0ZWQgZWxlbWVudCBpcyBpbnNpZGUgdGhlIGZvcm11bGEgZmlndXJlXG4gICAgICAgIHNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKEZJR1VSRV9GT1JNVUxBX1NFTEVDVE9SKS5sZW5ndGgpID09IDEgPyB0cnVlIDogZmFsc2VcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgdXBkYXRlU3RydWN0dXJlOiBmdW5jdGlvbiAoZm9ybXVsYSkge1xuXG4gICAgICAvLyBBZGQgYSBub3QgZWRpdGFibGUgc3BhblxuICAgICAgbGV0IHBhcmFncmFwaCA9IGZvcm11bGEuY2hpbGRyZW4oJ3AnKVxuICAgICAgbGV0IHBhcmFncmFwaENvbnRlbnQgPSBwYXJhZ3JhcGguaHRtbCgpXG4gICAgICBwYXJhZ3JhcGguaHRtbChgPHNwYW4gY29udGVudGVkaXRhYmxlPVwiZmFsc2VcIj4ke3BhcmFncmFwaENvbnRlbnR9PC9zcGFuPmApXG4gICAgfVxuICB9XG59KVxuXG4vKipcbiAqIFJhamVfbGlzdGluZ1xuICovXG50aW55bWNlLlBsdWdpbk1hbmFnZXIuYWRkKCdyYWplX2xpc3RpbmcnLCBmdW5jdGlvbiAoZWRpdG9yLCB1cmwpIHtcblxuICAvLyBBZGQgYSBidXR0b24gdGhhdCBoYW5kbGUgdGhlIGlubGluZSBlbGVtZW50XG4gIGVkaXRvci5hZGRCdXR0b24oJ3JhamVfbGlzdGluZycsIHtcbiAgICB0aXRsZTogJ3JhamVfbGlzdGluZycsXG4gICAgaWNvbjogJ2ljb24tbGlzdGluZycsXG4gICAgdG9vbHRpcDogJ0xpc3RpbmcnLFxuICAgIGRpc2FibGVkU3RhdGVTZWxlY3RvcjogRElTQUJMRV9TRUxFQ1RPUl9GSUdVUkVTLFxuXG4gICAgLy8gQnV0dG9uIGJlaGF2aW91clxuICAgIG9uY2xpY2s6IGZ1bmN0aW9uICgpIHtcbiAgICAgIGxpc3RpbmcuYWRkKClcbiAgICB9XG4gIH0pXG5cblxuXG4gIC8vIEJlY2F1c2Ugc29tZSBiZWhhdmlvdXJzIGFyZW4ndCBhY2NlcHRlZCwgUkFKRSBtdXN0IGNoZWNrIHNlbGVjdGlvbiBhbmQgYWNjZXB0IGJhY2tzcGFjZSwgY2FuYyBhbmQgZW50ZXIgcHJlc3NcbiAgZWRpdG9yLm9uKCdrZXlEb3duJywgZnVuY3Rpb24gKGUpIHtcblxuICAgIC8vIE5PVEU6IHRoaXMgYmVodmFpb3VyIGlzIHRoZSBzYW1lIGZvciBjb2RlYmxvY2sgXG4gICAgbGV0IHNlbGVjdGVkRWxlbWVudCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcbiAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LnBhcmVudHMoJ3ByZTpoYXMoY29kZSknKS5sZW5ndGgpIHtcblxuXG4gICAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LmlzKCdjb2RlJykpIHtcblxuXG4gICAgICAgIC8vIEVOVEVSXG4gICAgICAgIGlmIChlLmtleUNvZGUgPT0gMTMpIHtcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgICByZXR1cm4gbGlzdGluZy5zZXRDb250ZW50KGBcXG5gKVxuICAgICAgICB9XG5cbiAgICAgICAgLy9UQUJcbiAgICAgICAgaWYgKGUua2V5Q29kZSA9PSA5KSB7XG4gICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgICAgcmV0dXJuIGxpc3Rpbmcuc2V0Q29udGVudChgXFx0YClcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoZS5rZXlDb2RlID09IDEzKVxuICAgICAgICByZXR1cm4gaGFuZGxlRmlndXJlRW50ZXIodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uKVxuXG4gICAgICAvLyBrZXlDb2RlIDggaXMgYmFja3NwYWNlXG4gICAgICBpZiAoZS5rZXlDb2RlID09IDgpXG4gICAgICAgIHJldHVybiBoYW5kbGVGaWd1cmVEZWxldGUodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uKVxuXG4gICAgICAvKlxuICAgICAgICAvLyBrZXlDb2RlIDggaXMgYmFja3NwYWNlXG4gICAgICAgIGlmIChlLmtleUNvZGUgPT0gOClcbiAgICAgICAgICByZXR1cm4gaGFuZGxlRmlndXJlRGVsZXRlKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbilcblxuICAgICAgICBpZiAoZS5rZXlDb2RlID09IDQ2KVxuICAgICAgICAgIHJldHVybiBoYW5kbGVGaWd1cmVDYW5jKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbilcblxuICAgICAgICAvLyBIYW5kbGUgZW50ZXIga2V5IGluIGZpZ2NhcHRpb25cbiAgICAgICAgaWYgKGUua2V5Q29kZSA9PSAxMylcbiAgICAgICAgICByZXR1cm4gaGFuZGxlRmlndXJlRW50ZXIodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uKVxuICAgICAgICAqL1xuICAgIH1cbiAgICAvKlxuICAgIGlmIChlLmtleUNvZGUgPT0gOSkge1xuICAgICAgaWYgKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5pc0NvbGxhcHNlZCgpICYmICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSkucGFyZW50cyhgY29kZSwke0ZJR1VSRV9TRUxFQ1RPUn1gKS5sZW5ndGgpIHtcbiAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLnNldENvbnRlbnQoJ1xcdCcpXG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChlLmtleUNvZGUgPT0gMzcpIHtcbiAgICAgIGxldCByYW5nZSA9IHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRSbmcoKVxuICAgICAgbGV0IHN0YXJ0Tm9kZSA9ICQocmFuZ2Uuc3RhcnRDb250YWluZXIpXG4gICAgICBpZiAoc3RhcnROb2RlLnBhcmVudCgpLmlzKCdjb2RlJykgJiYgKHN0YXJ0Tm9kZS5wYXJlbnQoKS5jb250ZW50cygpLmluZGV4KHN0YXJ0Tm9kZSkgPT0gMCAmJiByYW5nZS5zdGFydE9mZnNldCA9PSAxKSkge1xuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2V0Q3Vyc29yTG9jYXRpb24oc3RhcnROb2RlLnBhcmVudHMoRklHVVJFX1NFTEVDVE9SKS5wcmV2KCdwLDpoZWFkZXInKVswXSwgMSlcbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICB9XG4gICAgfSovXG4gIH0pXG5cbiAgbGlzdGluZyA9IHtcbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBhZGQ6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgbGV0IHNlbGVjdGVkRWxlbWVudCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcbiAgICAgIGxldCBuZXdMaXN0aW5nID0gdGhpcy5jcmVhdGUoZ2V0U3VjY2Vzc2l2ZUVsZW1lbnRJZChGSUdVUkVfTElTVElOR19TRUxFQ1RPUiwgTElTVElOR19TVUZGSVgpKVxuXG4gICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIHNlbGVjdGVkIHBhcmFncmFwaCBpcyBub3QgZW1wdHksIGFkZCB0aGUgbmV3IGxpc3RpbmcgcmlnaHQgYmVsb3dcbiAgICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC50ZXh0KCkudHJpbSgpLmxlbmd0aCAhPSAwKVxuICAgICAgICAgIHNlbGVjdGVkRWxlbWVudC5hZnRlcihuZXdMaXN0aW5nKVxuXG4gICAgICAgIC8vIElmIHNlbGVjdGVkIHBhcmFncmFwaCBpcyBlbXB0eSwgcmVwbGFjZSBpdCB3aXRoIHRoZSBuZXcgdGFibGVcbiAgICAgICAgZWxzZVxuICAgICAgICAgIHNlbGVjdGVkRWxlbWVudC5yZXBsYWNlV2l0aChuZXdMaXN0aW5nKVxuXG5cbiAgICAgICAgLy8gVXBkYXRlIGFsbCBjYXB0aW9ucyB3aXRoIFJBU0ggZnVuY3Rpb25cbiAgICAgICAgY2FwdGlvbnMoKVxuXG4gICAgICAgIC8vIE1vdmUgdGhlIGNhcmV0XG4gICAgICAgIHNlbGVjdFJhbmdlKG5ld0xpc3RpbmcuZmluZCgnY29kZScpWzBdLCAwKVxuXG4gICAgICAgIC8vIFVwZGF0ZSBhbGwgY3Jvc3MtcmVmXG4gICAgICAgIHVwZGF0ZVJlZmVyZW5jZXMoKVxuXG4gICAgICAgIC8vIFNhdmUgdXBkYXRlcyBcbiAgICAgICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG4gICAgICB9KVxuXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIGNyZWF0ZTogZnVuY3Rpb24gKGlkKSB7XG4gICAgICByZXR1cm4gJChgPGZpZ3VyZSBpZD1cIiR7aWR9XCI+PHByZT48Y29kZT4ke1pFUk9fU1BBQ0V9PC9jb2RlPjwvcHJlPjxmaWdjYXB0aW9uPkNhcHRpb24uPC9maWdjYXB0aW9uPjwvZmlndXJlPmApXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIHNldENvbnRlbnQ6IGZ1bmN0aW9uIChjaGFyKSB7XG4gICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2V0Q29udGVudChjaGFyKVxuICAgIH1cbiAgfVxufSlcblxuXG4vKipcbiAqIFxuICovXG50aW55bWNlLlBsdWdpbk1hbmFnZXIuYWRkKCdyYWplX2lubGluZV9mb3JtdWxhJywgZnVuY3Rpb24gKGVkaXRvciwgdXJsKSB7XG5cbiAgZWRpdG9yLmFkZEJ1dHRvbigncmFqZV9pbmxpbmVfZm9ybXVsYScsIHtcbiAgICBpY29uOiAnaWNvbi1pbmxpbmUtZm9ybXVsYScsXG4gICAgdG9vbHRpcDogJ0lubGluZSBmb3JtdWxhJyxcbiAgICBkaXNhYmxlZFN0YXRlU2VsZWN0b3I6IGAke0RJU0FCTEVfU0VMRUNUT1JfSU5MSU5FfSw6aGVhZGVyYCxcblxuICAgIC8vIEJ1dHRvbiBiZWhhdmlvdXJcbiAgICBvbmNsaWNrOiBmdW5jdGlvbiAoKSB7XG4gICAgICBvcGVuSW5saW5lRm9ybXVsYUVkaXRvcigpXG4gICAgfVxuICB9KVxuXG4gIGVkaXRvci5vbignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuICAgIGxldCBzZWxlY3RlZEVsZW1lbnQgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG5cbiAgICAvLyBPcGVuIGZvcm11bGEgZWRpdG9yIGNsaWNraW5nIG9uIG1hdGggZm9ybXVsYXNcbiAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LmNoaWxkcmVuKCdzdmdbcm9sZT1tYXRoXScpLmxlbmd0aCkge1xuXG4gICAgICBvcGVuSW5saW5lRm9ybXVsYUVkaXRvcih7XG4gICAgICAgIGZvcm11bGFfdmFsOiBzZWxlY3RlZEVsZW1lbnQuY2hpbGRyZW4oJ3N2Z1tyb2xlPW1hdGhdJykuYXR0cignZGF0YS1tYXRoLW9yaWdpbmFsLWlucHV0JyksXG4gICAgICAgIGZvcm11bGFfaWQ6IHNlbGVjdGVkRWxlbWVudC5hdHRyKCdpZCcpXG4gICAgICB9KVxuICAgIH1cbiAgfSlcblxuICBpbmxpbmVfZm9ybXVsYSA9IHtcbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBhZGQ6IGZ1bmN0aW9uIChmb3JtdWxhX3N2Zykge1xuXG4gICAgICBsZXQgc2VsZWN0ZWRFbGVtZW50ID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuICAgICAgbGV0IG5ld0Zvcm11bGEgPSB0aGlzLmNyZWF0ZShmb3JtdWxhX3N2ZywgZ2V0U3VjY2Vzc2l2ZUVsZW1lbnRJZChGSUdVUkVfRk9STVVMQV9TRUxFQ1RPUiwgRk9STVVMQV9TVUZGSVgpKVxuXG4gICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLnNldENvbnRlbnQobmV3Rm9ybXVsYSlcblxuICAgICAgICAvLyBTYXZlIHVwZGF0ZXMgXG4gICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuXG4gICAgICAgIGNhcHRpb25zKClcblxuICAgICAgICAvLyBVcGRhdGUgYWxsIGNyb3NzLXJlZlxuICAgICAgICB1cGRhdGVSZWZlcmVuY2VzKClcblxuICAgICAgICAvLyBVcGRhdGUgUmVuZGVyZWQgUkFTSFxuICAgICAgICAvL3VwZGF0ZUlmcmFtZUZyb21TYXZlZENvbnRlbnQoKVxuICAgICAgfSlcblxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICB1cGRhdGU6IGZ1bmN0aW9uIChmb3JtdWxhX3N2ZywgZm9ybXVsYV9pZCkge1xuXG4gICAgICBsZXQgc2VsZWN0ZWRGaWd1cmUgPSAkKGAjJHtmb3JtdWxhX2lkfWApXG5cbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICBzZWxlY3RlZEZpZ3VyZS5maW5kKCdzdmcnKS5yZXBsYWNlV2l0aChmb3JtdWxhX3N2ZylcbiAgICAgICAgLy91cGRhdGVJZnJhbWVGcm9tU2F2ZWRDb250ZW50KClcbiAgICAgIH0pXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIGNyZWF0ZTogZnVuY3Rpb24gKGZvcm11bGFfc3ZnLCBpZCkge1xuICAgICAgcmV0dXJuIGA8c3BhbiBpZD1cIiR7aWR9XCIgY29udGVudGVkaXRhYmxlPVwiZmFsc2VcIj4ke2Zvcm11bGFfc3ZnWzBdLm91dGVySFRNTH08L3NwYW4+YFxuICAgIH1cbiAgfVxufSlcblxuLyoqXG4gKiBSYWplIGNvZGVibG9ja1xuICovXG50aW55bWNlLlBsdWdpbk1hbmFnZXIuYWRkKCdyYWplX2NvZGVibG9jaycsIGZ1bmN0aW9uIChlZGl0b3IsIHVybCkge1xuXG4gIC8vIEFkZCBhIGJ1dHRvbiB0aGF0IGhhbmRsZSB0aGUgaW5saW5lIGVsZW1lbnRcbiAgZWRpdG9yLmFkZEJ1dHRvbigncmFqZV9jb2RlYmxvY2snLCB7XG4gICAgdGl0bGU6ICdyYWplX2NvZGVibG9jaycsXG4gICAgaWNvbjogJ2ljb24tYmxvY2stY29kZScsXG4gICAgdG9vbHRpcDogJ0Jsb2NrIGNvZGUnLFxuICAgIGRpc2FibGVkU3RhdGVTZWxlY3RvcjogYCR7RElTQUJMRV9TRUxFQ1RPUl9GSUdVUkVTfSxjb2RlLHByZWAsXG5cbiAgICAvLyBCdXR0b24gYmVoYXZpb3VyXG4gICAgb25jbGljazogZnVuY3Rpb24gKCkge1xuICAgICAgYmxvY2tjb2RlLmFkZCgpXG4gICAgfVxuICB9KVxuXG4gIGJsb2NrY29kZSA9IHtcbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBhZGQ6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgbGV0IHNlbGVjdGVkRWxlbWVudCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcbiAgICAgIGxldCBibG9ja0NvZGUgPSB0aGlzLmNyZWF0ZShnZXRTdWNjZXNzaXZlRWxlbWVudElkKEZJR1VSRV9MSVNUSU5HX1NFTEVDVE9SLCBMSVNUSU5HX1NVRkZJWCkpXG5cbiAgICAgIGlmICghc2VsZWN0ZWRFbGVtZW50LnBhcmVudHMoJ3ByZSxjb2RlJykubGVuZ3RoKSB7XG5cbiAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIHNlbGVjdGVkIHBhcmFncmFwaCBpcyBub3QgZW1wdHksIGFkZCB0aGUgbmV3IGxpc3RpbmcgcmlnaHQgYmVsb3dcbiAgICAgICAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LnRleHQoKS50cmltKCkubGVuZ3RoICE9IDApXG4gICAgICAgICAgICBzZWxlY3RlZEVsZW1lbnQuYWZ0ZXIoYmxvY2tDb2RlKVxuXG4gICAgICAgICAgLy8gSWYgc2VsZWN0ZWQgcGFyYWdyYXBoIGlzIGVtcHR5LCByZXBsYWNlIGl0IHdpdGggdGhlIG5ldyB0YWJsZVxuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIHNlbGVjdGVkRWxlbWVudC5yZXBsYWNlV2l0aChibG9ja0NvZGUpXG5cbiAgICAgICAgICAvLyBVcGRhdGUgYWxsIGNhcHRpb25zIHdpdGggUkFTSCBmdW5jdGlvblxuICAgICAgICAgIGNhcHRpb25zKClcblxuICAgICAgICAgIC8vIE1vdmUgdGhlIGNhcmV0XG4gICAgICAgICAgc2VsZWN0UmFuZ2UoYmxvY2tDb2RlLmZpbmQoJ2NvZGUnKVswXSwgMClcblxuICAgICAgICAgIC8vIFNhdmUgdXBkYXRlcyBcbiAgICAgICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgY3JlYXRlOiBmdW5jdGlvbiAoaWQpIHtcbiAgICAgIHJldHVybiAkKGA8cHJlPjxjb2RlPiR7WkVST19TUEFDRX08L2NvZGU+PC9wcmU+YClcbiAgICB9XG4gIH1cbn0pXG5cbi8qKlxuICogUmFqZSBxdW90ZWJsb2NrXG4gKi9cbnRpbnltY2UuUGx1Z2luTWFuYWdlci5hZGQoJ3JhamVfcXVvdGVibG9jaycsIGZ1bmN0aW9uIChlZGl0b3IsIHVybCkge1xuXG4gIC8vIEFkZCBhIGJ1dHRvbiB0aGF0IGhhbmRsZSB0aGUgaW5saW5lIGVsZW1lbnRcbiAgZWRpdG9yLmFkZEJ1dHRvbigncmFqZV9xdW90ZWJsb2NrJywge1xuICAgIHRpdGxlOiAncmFqZV9xdW90ZWJsb2NrJyxcbiAgICBpY29uOiAnaWNvbi1ibG9jay1xdW90ZScsXG4gICAgdG9vbHRpcDogJ0Jsb2NrIHF1b3RlJyxcbiAgICBkaXNhYmxlZFN0YXRlU2VsZWN0b3I6IGAke0RJU0FCTEVfU0VMRUNUT1JfRklHVVJFU30sYmxvY2txdW90ZWAsXG5cbiAgICAvLyBCdXR0b24gYmVoYXZpb3VyXG4gICAgb25jbGljazogZnVuY3Rpb24gKCkge1xuICAgICAgYmxvY2txdW90ZS5hZGQoKVxuICAgIH1cbiAgfSlcblxuICBlZGl0b3Iub24oJ2tleURvd24nLCBmdW5jdGlvbiAoZSkge1xuXG5cbiAgICBsZXQgc2VsZWN0ZWRFbGVtZW50ID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuICAgIGlmIChzZWxlY3RlZEVsZW1lbnQuaXMoJ3AnKSAmJiBzZWxlY3RlZEVsZW1lbnQucGFyZW50KCkuaXMoJ2Jsb2NrcXVvdGUnKSkge1xuXG4gICAgICAvL0VOVEVSXG4gICAgICBpZiAoZS5rZXlDb2RlID09IDEzKSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKVxuXG4gICAgICAgIC8vIEV4aXQgZnJvbSB0aGUgYmxvY2txdW90ZSBpZiB0aGUgY3VycmVudCBwIGlzIGVtcHR5XG4gICAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQudGV4dCgpLnRyaW0oKS5sZW5ndGggPT0gMClcbiAgICAgICAgICByZXR1cm4gYmxvY2txdW90ZS5leGl0KClcblxuICAgICAgICBibG9ja3F1b3RlLmFkZFBhcmFncmFwaCgpXG4gICAgICB9XG4gICAgfVxuICB9KVxuXG4gIGJsb2NrcXVvdGUgPSB7XG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgYWRkOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgIGxldCBzZWxlY3RlZEVsZW1lbnQgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG4gICAgICBsZXQgYmxvY2tRdW90ZSA9IHRoaXMuY3JlYXRlKGdldFN1Y2Nlc3NpdmVFbGVtZW50SWQoRklHVVJFX0xJU1RJTkdfU0VMRUNUT1IsIExJU1RJTkdfU1VGRklYKSlcblxuICAgICAgaWYgKCFzZWxlY3RlZEVsZW1lbnQucGFyZW50cygncHJlLGNvZGUnKS5sZW5ndGgpIHtcblxuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICAvLyBDaGVjayBpZiB0aGUgc2VsZWN0ZWQgcGFyYWdyYXBoIGlzIG5vdCBlbXB0eSwgYWRkIHRoZSBuZXcgbGlzdGluZyByaWdodCBiZWxvd1xuICAgICAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQudGV4dCgpLnRyaW0oKS5sZW5ndGggIT0gMClcbiAgICAgICAgICAgIHNlbGVjdGVkRWxlbWVudC5hZnRlcihibG9ja1F1b3RlKVxuXG4gICAgICAgICAgLy8gSWYgc2VsZWN0ZWQgcGFyYWdyYXBoIGlzIGVtcHR5LCByZXBsYWNlIGl0IHdpdGggdGhlIG5ldyB0YWJsZVxuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIHNlbGVjdGVkRWxlbWVudC5yZXBsYWNlV2l0aChibG9ja1F1b3RlKVxuXG4gICAgICAgICAgLy8gVXBkYXRlIGFsbCBjYXB0aW9ucyB3aXRoIFJBU0ggZnVuY3Rpb25cbiAgICAgICAgICBjYXB0aW9ucygpXG5cbiAgICAgICAgICAvLyBNb3ZlIHRoZSBjYXJldFxuICAgICAgICAgIG1vdmVDYXJldChibG9ja1F1b3RlWzBdKVxuXG4gICAgICAgICAgLy8gU2F2ZSB1cGRhdGVzIFxuICAgICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuICAgICAgICB9KVxuICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBjcmVhdGU6IGZ1bmN0aW9uIChpZCkge1xuICAgICAgcmV0dXJuICQoYDxibG9ja3F1b3RlPjxwPiR7WkVST19TUEFDRX08L3A+PC9ibG9ja3F1b3RlPmApXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIGdldExhc3ROb3RFbXB0eU5vZGU6IGZ1bmN0aW9uIChub2Rlcykge1xuXG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG5vZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmICgobm9kZXNbaV0ubm9kZVR5cGUgPT0gMyB8fCBub2Rlc1tpXS50YWdOYW1lID09ICdicicpICYmICFub2Rlc1tpXS5sZW5ndGgpXG4gICAgICAgICAgbm9kZXMuc3BsaWNlKGksIDEpXG4gICAgICB9XG5cbiAgICAgIHJldHVybiBub2Rlc1tub2Rlcy5sZW5ndGggLSAxXVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBhZGRQYXJhZ3JhcGg6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgY29uc3QgQlIgPSAnPGJyPidcblxuICAgICAgLy8gR2V0IHRoZSByZWZlcmVuY2VzIG9mIHRoZSBleGlzdGluZyBlbGVtZW50XG4gICAgICBsZXQgcGFyYWdyYXBoID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuXG4gICAgICAvLyBQbGFjZWhvbGRlciB0ZXh0IG9mIHRoZSBuZXcgbGlcbiAgICAgIGxldCB0ZXh0ID0gQlJcbiAgICAgIGxldCB0ZXh0Tm9kZXMgPSBwYXJhZ3JhcGguY29udGVudHMoKVxuXG4gICAgICAvLyBJZiB0aGVyZSBpcyBqdXN0IG9uZSBub2RlIHdyYXBwZWQgaW5zaWRlIHRoZSBwYXJhZ3JhcGhcbiAgICAgIGlmICh0ZXh0Tm9kZXMubGVuZ3RoID09IDEpIHtcblxuICAgICAgICAvLyBHZXQgdGhlIHN0YXJ0IG9mZnNldCBhbmQgdGV4dCBvZiB0aGUgY3VycmVudCBsaVxuICAgICAgICBsZXQgc3RhcnRPZmZzZXQgPSB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Um5nKCkuc3RhcnRPZmZzZXRcbiAgICAgICAgbGV0IHdob2xlVGV4dCA9IHBhcmFncmFwaC50ZXh0KClcblxuICAgICAgICAvLyBJZiB0aGUgY3Vyc29yIGlzbid0IGF0IHRoZSBlbmQgYnV0IGl0J3MgaW4gdGhlIG1pZGRsZVxuICAgICAgICAvLyBHZXQgdGhlIHJlbWFpbmluZyB0ZXh0IGZyb20gdGhlIGN1cnNvciB0byB0aGUgZW5kXG4gICAgICAgIGlmIChzdGFydE9mZnNldCAhPSB3aG9sZVRleHQubGVuZ3RoKVxuICAgICAgICAgIHRleHQgPSB3aG9sZVRleHQuc3Vic3RyaW5nKHN0YXJ0T2Zmc2V0LCB3aG9sZVRleHQubGVuZ3RoKVxuXG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgdGV4dCBvZiB0aGUgY3VycmVudCBsaVxuICAgICAgICAgIHBhcmFncmFwaC50ZXh0KHdob2xlVGV4dC5zdWJzdHJpbmcoMCwgc3RhcnRPZmZzZXQpKVxuXG4gICAgICAgICAgaWYgKCFwYXJhZ3JhcGgudGV4dCgpLmxlbmd0aClcbiAgICAgICAgICAgIHBhcmFncmFwaC5odG1sKEJSKVxuXG4gICAgICAgICAgLy8gQ3JlYXRlIGFuZCBhZGQgdGhlIG5ldyBsaVxuICAgICAgICAgIGxldCBuZXdQYXJhZ3JhcGggPSAkKGA8cD4ke3RleHR9PC9wPmApXG4gICAgICAgICAgcGFyYWdyYXBoLmFmdGVyKG5ld1BhcmFncmFwaClcblxuICAgICAgICAgIC8vIE1vdmUgdGhlIGNhcmV0IHRvIHRoZSBuZXcgbGlcbiAgICAgICAgICBtb3ZlQ2FyZXQobmV3UGFyYWdyYXBoWzBdLCB0cnVlKVxuXG4gICAgICAgICAgLy8gVXBkYXRlIHRoZSBjb250ZW50XG4gICAgICAgICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG4gICAgICAgIH0pXG4gICAgICB9XG5cbiAgICAgIC8vIEluc3RlYWQgaWYgdGhlcmUgYXJlIG11bHRpcGxlIG5vZGVzIGluc2lkZSB0aGUgcGFyYWdyYXBoXG4gICAgICBlbHNlIHtcblxuICAgICAgICAvLyBJc3RhbnRpYXRlIHRoZSByYW5nZSB0byBiZSBzZWxlY3RlZFxuICAgICAgICBsZXQgcmFuZ2UgPSBkb2N1bWVudC5jcmVhdGVSYW5nZSgpXG5cbiAgICAgICAgLy8gU3RhcnQgdGhlIHJhbmdlIGZyb20gdGhlIHNlbGVjdGVkIG5vZGUgYW5kIG9mZnNldCBhbmQgZW5kcyBpdCBhdCB0aGUgZW5kIG9mIHRoZSBsYXN0IG5vZGVcbiAgICAgICAgcmFuZ2Uuc2V0U3RhcnQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldFJuZygpLnN0YXJ0Q29udGFpbmVyLCB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Um5nKCkuc3RhcnRPZmZzZXQpXG4gICAgICAgIHJhbmdlLnNldEVuZCh0aGlzLmdldExhc3ROb3RFbXB0eU5vZGUodGV4dE5vZGVzKSwgMSlcblxuICAgICAgICAvLyBTZWxlY3QgdGhlIHJhbmdlXG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZXRSbmcocmFuZ2UpXG5cbiAgICAgICAgLy8gU2F2ZSB0aGUgaHRtbCBjb250ZW50XG4gICAgICAgIHdob2xlVGV4dCA9IHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRDb250ZW50KClcblxuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICBwYXJhZ3JhcGguaHRtbChwYXJhZ3JhcGguaHRtbCgpLnJlcGxhY2Uod2hvbGVUZXh0LCAnJykpXG5cbiAgICAgICAgICBpZiAoIXBhcmFncmFwaC50ZXh0KCkubGVuZ3RoKVxuICAgICAgICAgICAgcGFyYWdyYXBoLmh0bWwoQlIpXG5cbiAgICAgICAgICAvLyBDcmVhdGUgYW5kIGFkZCB0aGUgbmV3IGxpXG4gICAgICAgICAgbGV0IG5ld1BhcmFncmFwaCA9ICQoYDxwPiR7d2hvbGVUZXh0fTwvcD5gKVxuICAgICAgICAgIHBhcmFncmFwaC5hZnRlcihuZXdQYXJhZ3JhcGgpXG5cbiAgICAgICAgICAvLyBNb3ZlIHRoZSBjYXJldCB0byB0aGUgbmV3IGxpXG4gICAgICAgICAgbW92ZUNhcmV0KG5ld1BhcmFncmFwaFswXSwgdHJ1ZSlcblxuICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgY29udGVudFxuICAgICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuICAgICAgICB9KVxuICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBleGl0OiBmdW5jdGlvbiAoKSB7XG4gICAgICBsZXQgcGFyYWdyYXBoID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuICAgICAgbGV0IGJsb2NrcXVvdGUgPSBwYXJhZ3JhcGgucGFyZW50KClcblxuICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIHBhcmFncmFwaC5yZW1vdmUoKVxuXG4gICAgICAgIGlmICghYmxvY2txdW90ZS5uZXh0KCkubGVuZ3RoKSB7XG4gICAgICAgICAgYmxvY2txdW90ZS5hZnRlcigkKGA8cD48YnIvPjwvcD5gKSlcbiAgICAgICAgfVxuXG4gICAgICAgIG1vdmVDYXJldChibG9ja3F1b3RlLm5leHQoKVswXSlcblxuICAgICAgfSlcbiAgICB9XG4gIH1cbn0pXG5cbi8qKlxuICogVXBkYXRlIHRhYmxlIGNhcHRpb25zIHdpdGggYSBSQVNIIGZ1bmNpb24gXG4gKi9cbmZ1bmN0aW9uIGNhcHRpb25zKCkge1xuXG4gIC8qIENhcHRpb25zICovXG4gIHRpbnltY2UuYWN0aXZlRWRpdG9yLiQoZmlndXJlYm94X3NlbGVjdG9yKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY3VyX2NhcHRpb24gPSAkKHRoaXMpLnBhcmVudHMoXCJmaWd1cmVcIikuZmluZChcImZpZ2NhcHRpb25cIik7XG4gICAgdmFyIGN1cl9udW1iZXIgPSAkKHRoaXMpLmZpbmROdW1iZXJSYWplKGZpZ3VyZWJveF9zZWxlY3Rvcik7XG4gICAgY3VyX2NhcHRpb24uZmluZCgnc3Ryb25nJykucmVtb3ZlKCk7XG4gICAgY3VyX2NhcHRpb24uaHRtbChcIjxzdHJvbmcgY2xhc3M9XFxcImNnZW5cXFwiIGRhdGEtcmFzaC1vcmlnaW5hbC1jb250ZW50PVxcXCJcXFwiIGNvbnRlbnRlZGl0YWJsZT1cXFwiZmFsc2VcXFwiPkZpZ3VyZSBcIiArIGN1cl9udW1iZXIgK1xuICAgICAgXCIuIDwvc3Ryb25nPlwiICsgY3VyX2NhcHRpb24uaHRtbCgpKTtcbiAgfSk7XG4gIHRpbnltY2UuYWN0aXZlRWRpdG9yLiQodGFibGVib3hfc2VsZWN0b3IpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgIHZhciBjdXJfY2FwdGlvbiA9ICQodGhpcykucGFyZW50cyhcImZpZ3VyZVwiKS5maW5kKFwiZmlnY2FwdGlvblwiKTtcbiAgICB2YXIgY3VyX251bWJlciA9ICQodGhpcykuZmluZE51bWJlclJhamUodGFibGVib3hfc2VsZWN0b3IpO1xuICAgIGN1cl9jYXB0aW9uLmZpbmQoJ3N0cm9uZycpLnJlbW92ZSgpO1xuICAgIGN1cl9jYXB0aW9uLmh0bWwoXCI8c3Ryb25nIGNsYXNzPVxcXCJjZ2VuXFxcIiBkYXRhLXJhc2gtb3JpZ2luYWwtY29udGVudD1cXFwiXFxcIiBjb250ZW50ZWRpdGFibGU9XFxcImZhbHNlXFxcIiA+VGFibGUgXCIgKyBjdXJfbnVtYmVyICtcbiAgICAgIFwiLiA8L3N0cm9uZz5cIiArIGN1cl9jYXB0aW9uLmh0bWwoKSk7XG4gIH0pO1xuICB0aW55bWNlLmFjdGl2ZUVkaXRvci4kKGZvcm11bGFib3hfc2VsZWN0b3IpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgIHZhciBjdXJfY2FwdGlvbiA9ICQodGhpcykucGFyZW50cyhcImZpZ3VyZVwiKS5maW5kKFwicFwiKTtcbiAgICB2YXIgY3VyX251bWJlciA9ICQodGhpcykuZmluZE51bWJlclJhamUoZm9ybXVsYWJveF9zZWxlY3Rvcik7XG5cbiAgICBpZiAoY3VyX2NhcHRpb24uZmluZCgnc3Bhbi5jZ2VuJykubGVuZ3RoKSB7XG4gICAgICBjdXJfY2FwdGlvbi5maW5kKCdzcGFuLmNnZW4nKS5yZW1vdmUoKTtcbiAgICAgIGN1cl9jYXB0aW9uLmZpbmQoJ3NwYW5bY29udGVudGVkaXRhYmxlXScpLmFwcGVuZChcIjxzcGFuIGNsYXNzPVxcXCJjZ2VuXFxcIiBkYXRhLXJhc2gtb3JpZ2luYWwtY29udGVudD1cXFwiXFxcIiA+IChcIiArIGN1cl9udW1iZXIgKyBcIik8L3NwYW4+XCIpXG4gICAgfSBlbHNlXG4gICAgICBjdXJfY2FwdGlvbi5odG1sKGN1cl9jYXB0aW9uLmh0bWwoKSArIFwiPHNwYW4gY2xhc3M9XFxcImNnZW5cXFwiIGRhdGEtcmFzaC1vcmlnaW5hbC1jb250ZW50PVxcXCJcXFwiID4gKFwiICtcbiAgICAgICAgY3VyX251bWJlciArIFwiKTwvc3Bhbj5cIik7XG4gIH0pO1xuICB0aW55bWNlLmFjdGl2ZUVkaXRvci4kKGxpc3Rpbmdib3hfc2VsZWN0b3IpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgIHZhciBjdXJfY2FwdGlvbiA9ICQodGhpcykucGFyZW50cyhcImZpZ3VyZVwiKS5maW5kKFwiZmlnY2FwdGlvblwiKTtcbiAgICB2YXIgY3VyX251bWJlciA9ICQodGhpcykuZmluZE51bWJlclJhamUobGlzdGluZ2JveF9zZWxlY3Rvcik7XG4gICAgY3VyX2NhcHRpb24uZmluZCgnc3Ryb25nJykucmVtb3ZlKCk7XG4gICAgY3VyX2NhcHRpb24uaHRtbChcIjxzdHJvbmcgY2xhc3M9XFxcImNnZW5cXFwiIGRhdGEtcmFzaC1vcmlnaW5hbC1jb250ZW50PVxcXCJcXFwiIGNvbnRlbnRlZGl0YWJsZT1cXFwiZmFsc2VcXFwiPkxpc3RpbmcgXCIgKyBjdXJfbnVtYmVyICtcbiAgICAgIFwiLiA8L3N0cm9uZz5cIiArIGN1cl9jYXB0aW9uLmh0bWwoKSk7XG4gIH0pO1xuICAvKiAvRU5EIENhcHRpb25zICovXG59XG5cbi8qKlxuICogXG4gKiBAcGFyYW0geyp9IHNlbCA9PiB0aW55bWNlIHNlbGVjdGlvblxuICogXG4gKiBNYWlubHkgaXQgY2hlY2tzIHdoZXJlIHNlbGVjdGlvbiBzdGFydHMgYW5kIGVuZHMgdG8gYmxvY2sgdW5hbGxvd2VkIGRlbGV0aW9uXG4gKiBJbiBzYW1lIGZpZ3VyZSBhcmVuJ3QgYmxvY2tlZCwgdW5sZXNzIHNlbGVjdGlvbiBzdGFydCBPUiBlbmQgaW5zaWRlIGZpZ2NhcHRpb24gKG5vdCBib3RoKVxuICovXG5mdW5jdGlvbiBoYW5kbGVGaWd1cmVEZWxldGUoc2VsKSB7XG5cbiAgdHJ5IHtcblxuICAgIC8vIEdldCByZWZlcmVuY2Ugb2Ygc3RhcnQgYW5kIGVuZCBub2RlXG4gICAgbGV0IHN0YXJ0Tm9kZSA9ICQoc2VsLmdldFJuZygpLnN0YXJ0Q29udGFpbmVyKVxuICAgIGxldCBzdGFydE5vZGVQYXJlbnQgPSBzdGFydE5vZGUucGFyZW50cyhGSUdVUkVfU0VMRUNUT1IpXG5cbiAgICBsZXQgZW5kTm9kZSA9ICQoc2VsLmdldFJuZygpLmVuZENvbnRhaW5lcilcbiAgICBsZXQgZW5kTm9kZVBhcmVudCA9IGVuZE5vZGUucGFyZW50cyhGSUdVUkVfU0VMRUNUT1IpXG5cbiAgICAvLyBJZiBhdCBsZWFzdCBzZWxlY3Rpb24gc3RhcnQgb3IgZW5kIGlzIGluc2lkZSB0aGUgZmlndXJlXG4gICAgaWYgKHN0YXJ0Tm9kZVBhcmVudC5sZW5ndGggfHwgZW5kTm9kZVBhcmVudC5sZW5ndGgpIHtcblxuICAgICAgLy8gSWYgc2VsZWN0aW9uIHdyYXBzIGVudGlyZWx5IGEgZmlndXJlIGZyb20gdGhlIHN0YXJ0IG9mIGZpcnN0IGVsZW1lbnQgKHRoIGluIHRhYmxlKSBhbmQgc2VsZWN0aW9uIGVuZHNcbiAgICAgIGlmIChlbmROb2RlLnBhcmVudHMoJ2ZpZ2NhcHRpb24nKS5sZW5ndGgpIHtcblxuICAgICAgICBsZXQgY29udGVudHMgPSBlbmROb2RlLnBhcmVudCgpLmNvbnRlbnRzKClcbiAgICAgICAgaWYgKHN0YXJ0Tm9kZS5pcyhGSUdVUkVfU0VMRUNUT1IpICYmIGNvbnRlbnRzLmluZGV4KGVuZE5vZGUpID09IGNvbnRlbnRzLmxlbmd0aCAtIDEgJiYgc2VsLmdldFJuZygpLmVuZE9mZnNldCA9PSBlbmROb2RlLnRleHQoKS5sZW5ndGgpIHtcbiAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICAgIC8vIE1vdmUgY3Vyc29yIGF0IHRoZSBwcmV2aW91cyBlbGVtZW50IGFuZCByZW1vdmUgZmlndXJlXG4gICAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5mb2N1cygpXG4gICAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2V0Q3Vyc29yTG9jYXRpb24oc3RhcnROb2RlLnByZXYoKVswXSwgMSlcbiAgICAgICAgICAgIHN0YXJ0Tm9kZS5yZW1vdmUoKVxuXG4gICAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIElmIHNlbGVjdGlvbiBkb2Vzbid0IHN0YXJ0IGFuZCBlbmQgaW4gdGhlIHNhbWUgZmlndXJlLCBidXQgb25lIGJlZXR3ZW4gc3RhcnQgb3IgZW5kIGlzIGluc2lkZSB0aGUgZmlnY2FwdGlvbiwgbXVzdCBibG9ja1xuICAgICAgaWYgKHN0YXJ0Tm9kZS5wYXJlbnRzKCdmaWdjYXB0aW9uJykubGVuZ3RoICE9IGVuZE5vZGUucGFyZW50cygnZmlnY2FwdGlvbicpLmxlbmd0aCAmJiAoc3RhcnROb2RlLnBhcmVudHMoJ2ZpZ2NhcHRpb24nKS5sZW5ndGggfHwgZW5kTm9kZS5wYXJlbnRzKCdmaWdjYXB0aW9uJykubGVuZ3RoKSlcbiAgICAgICAgcmV0dXJuIGZhbHNlXG5cbiAgICAgIC8vIElmIHRoZSBmaWd1cmUgaXMgbm90IHRoZSBzYW1lLCBtdXN0IGJsb2NrXG4gICAgICAvLyBCZWNhdXNlIGEgc2VsZWN0aW9uIGNhbiBzdGFydCBpbiBmaWd1cmVYIGFuZCBlbmQgaW4gZmlndXJlWVxuICAgICAgaWYgKChzdGFydE5vZGVQYXJlbnQuYXR0cignaWQnKSAhPSBlbmROb2RlUGFyZW50LmF0dHIoJ2lkJykpKVxuICAgICAgICByZXR1cm4gZmFsc2VcblxuICAgICAgLy8gSWYgY3Vyc29yIGlzIGF0IHN0YXJ0IG9mIGNvZGUgcHJldmVudFxuICAgICAgaWYgKHN0YXJ0Tm9kZS5wYXJlbnRzKEZJR1VSRV9TRUxFQ1RPUikuZmluZCgncHJlJykubGVuZ3RoKSB7XG5cbiAgICAgICAgLy8gSWYgYXQgdGhlIHN0YXJ0IG9mIHByZT5jb2RlLCBwcmVzc2luZyAydGltZXMgYmFja3NwYWNlIHdpbGwgcmVtb3ZlIGV2ZXJ5dGhpbmcgXG4gICAgICAgIGlmIChzdGFydE5vZGUucGFyZW50KCkuaXMoJ2NvZGUnKSAmJiAoc3RhcnROb2RlLnBhcmVudCgpLmNvbnRlbnRzKCkuaW5kZXgoc3RhcnROb2RlKSA9PSAwICYmIHNlbC5nZXRSbmcoKS5zdGFydE9mZnNldCA9PSAxKSkge1xuICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHN0YXJ0Tm9kZS5wYXJlbnRzKEZJR1VSRV9TRUxFQ1RPUikucmVtb3ZlKClcbiAgICAgICAgICB9KVxuICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICB9XG5cblxuICAgICAgICBpZiAoc3RhcnROb2RlLnBhcmVudCgpLmlzKCdwcmUnKSAmJiBzZWwuZ2V0Um5nKCkuc3RhcnRPZmZzZXQgPT0gMClcbiAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZVxuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbn1cblxuLyoqXG4gKiBcbiAqIEBwYXJhbSB7Kn0gc2VsIFxuICovXG5mdW5jdGlvbiBoYW5kbGVGaWd1cmVDYW5jKHNlbCkge1xuXG4gIC8vIEdldCByZWZlcmVuY2Ugb2Ygc3RhcnQgYW5kIGVuZCBub2RlXG4gIGxldCBzdGFydE5vZGUgPSAkKHNlbC5nZXRSbmcoKS5zdGFydENvbnRhaW5lcilcbiAgbGV0IHN0YXJ0Tm9kZVBhcmVudCA9IHN0YXJ0Tm9kZS5wYXJlbnRzKEZJR1VSRV9TRUxFQ1RPUilcblxuICBsZXQgZW5kTm9kZSA9ICQoc2VsLmdldFJuZygpLmVuZENvbnRhaW5lcilcbiAgbGV0IGVuZE5vZGVQYXJlbnQgPSBlbmROb2RlLnBhcmVudHMoRklHVVJFX1NFTEVDVE9SKVxuXG4gIC8vIElmIGF0IGxlYXN0IHNlbGVjdGlvbiBzdGFydCBvciBlbmQgaXMgaW5zaWRlIHRoZSBmaWd1cmVcbiAgaWYgKHN0YXJ0Tm9kZVBhcmVudC5sZW5ndGggfHwgZW5kTm9kZVBhcmVudC5sZW5ndGgpIHtcblxuICAgIC8vIElmIHNlbGVjdGlvbiBkb2Vzbid0IHN0YXJ0IGFuZCBlbmQgaW4gdGhlIHNhbWUgZmlndXJlLCBidXQgb25lIGJlZXR3ZW4gc3RhcnQgb3IgZW5kIGlzIGluc2lkZSB0aGUgZmlnY2FwdGlvbiwgbXVzdCBibG9ja1xuICAgIGlmIChzdGFydE5vZGUucGFyZW50cygnZmlnY2FwdGlvbicpLmxlbmd0aCAhPSBlbmROb2RlLnBhcmVudHMoJ2ZpZ2NhcHRpb24nKS5sZW5ndGggJiYgKHN0YXJ0Tm9kZS5wYXJlbnRzKCdmaWdjYXB0aW9uJykubGVuZ3RoIHx8IGVuZE5vZGUucGFyZW50cygnZmlnY2FwdGlvbicpLmxlbmd0aCkpXG4gICAgICByZXR1cm4gZmFsc2VcblxuICAgIC8vIElmIHRoZSBmaWd1cmUgaXMgbm90IHRoZSBzYW1lLCBtdXN0IGJsb2NrXG4gICAgLy8gQmVjYXVzZSBhIHNlbGVjdGlvbiBjYW4gc3RhcnQgaW4gZmlndXJlWCBhbmQgZW5kIGluIGZpZ3VyZVlcbiAgICBpZiAoKHN0YXJ0Tm9kZVBhcmVudC5hdHRyKCdpZCcpICE9IGVuZE5vZGVQYXJlbnQuYXR0cignaWQnKSkpXG4gICAgICByZXR1cm4gZmFsc2VcblxuICB9XG5cbiAgLy8gVGhpcyBhbGdvcml0aG0gZG9lc24ndCB3b3JrIGlmIGNhcmV0IGlzIGluIGVtcHR5IHRleHQgZWxlbWVudFxuXG4gIC8vIEN1cnJlbnQgZWxlbWVudCBjYW4gYmUgb3IgdGV4dCBvciBwXG4gIGxldCBwYXJhZ3JhcGggPSBzdGFydE5vZGUuaXMoJ3AnKSA/IHN0YXJ0Tm9kZSA6IHN0YXJ0Tm9kZS5wYXJlbnRzKCdwJykuZmlyc3QoKVxuICAvLyBTYXZlIGFsbCBjaGxkcmVuIG5vZGVzICh0ZXh0IGluY2x1ZGVkKVxuICBsZXQgcGFyYWdyYXBoQ29udGVudCA9IHBhcmFncmFwaC5jb250ZW50cygpXG5cbiAgLy8gSWYgbmV4dCB0aGVyZSBpcyBhIGZpZ3VyZVxuICBpZiAocGFyYWdyYXBoLm5leHQoKS5pcyhGSUdVUkVfU0VMRUNUT1IpKSB7XG5cbiAgICBpZiAoZW5kTm9kZVswXS5ub2RlVHlwZSA9PSAzKSB7XG5cbiAgICAgIC8vIElmIHRoZSBlbmQgbm9kZSBpcyBhIHRleHQgaW5zaWRlIGEgc3Ryb25nLCBpdHMgaW5kZXggd2lsbCBiZSAtMS5cbiAgICAgIC8vIEluIHRoaXMgY2FzZSB0aGUgZWRpdG9yIG11c3QgaXRlcmF0ZSB1bnRpbCBpdCBmYWNlIGEgaW5saW5lIGVsZW1lbnRcbiAgICAgIGlmIChwYXJhZ3JhcGhDb250ZW50LmluZGV4KGVuZE5vZGUpID09IC0xKSAvLyYmIHBhcmFncmFwaC5wYXJlbnRzKFNFQ1RJT05fU0VMRUNUT1IpLmxlbmd0aClcbiAgICAgICAgZW5kTm9kZSA9IGVuZE5vZGUucGFyZW50KClcblxuICAgICAgLy8gSWYgaW5kZXggb2YgdGhlIGlubGluZSBlbGVtZW50IGlzIGVxdWFsIG9mIGNoaWxkcmVuIG5vZGUgbGVuZ3RoXG4gICAgICAvLyBBTkQgdGhlIGN1cnNvciBpcyBhdCB0aGUgbGFzdCBwb3NpdGlvblxuICAgICAgLy8gUmVtb3ZlIHRoZSBuZXh0IGZpZ3VyZSBpbiBvbmUgdW5kbyBsZXZlbFxuICAgICAgaWYgKHBhcmFncmFwaENvbnRlbnQuaW5kZXgoZW5kTm9kZSkgKyAxID09IHBhcmFncmFwaENvbnRlbnQubGVuZ3RoICYmIHBhcmFncmFwaENvbnRlbnQubGFzdCgpLnRleHQoKS5sZW5ndGggPT0gc2VsLmdldFJuZygpLmVuZE9mZnNldCkge1xuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgcGFyYWdyYXBoLm5leHQoKS5yZW1vdmUoKVxuICAgICAgICB9KVxuICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdHJ1ZVxufVxuXG4vKipcbiAqIFxuICogQHBhcmFtIHsqfSBzZWwgPT4gdGlueW1jZSBzZWxlY3Rpb25cbiAqIFxuICogQWRkIGEgcGFyYWdyYXBoIGFmdGVyIHRoZSBmaWd1cmVcbiAqL1xuZnVuY3Rpb24gaGFuZGxlRmlndXJlRW50ZXIoc2VsKSB7XG5cbiAgbGV0IHNlbGVjdGVkRWxlbWVudCA9ICQoc2VsLmdldE5vZGUoKSlcbiAgaWYgKHNlbGVjdGVkRWxlbWVudC5pcygnZmlnY2FwdGlvbicpIHx8IChzZWxlY3RlZEVsZW1lbnQucGFyZW50cyhGSUdVUkVfU0VMRUNUT1IpLmxlbmd0aCAmJiBzZWxlY3RlZEVsZW1lbnQuaXMoJ3AnKSkpIHtcblxuICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgLy9hZGQgYSBuZXcgcGFyYWdyYXBoIGFmdGVyIHRoZSBmaWd1cmVcbiAgICAgIHNlbGVjdGVkRWxlbWVudC5wYXJlbnQoRklHVVJFX1NFTEVDVE9SKS5hZnRlcignPHA+PGJyLz48L3A+JylcblxuICAgICAgLy9tb3ZlIGNhcmV0IGF0IHRoZSBzdGFydCBvZiBuZXcgcFxuICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLnNldEN1cnNvckxvY2F0aW9uKHNlbGVjdGVkRWxlbWVudC5wYXJlbnQoRklHVVJFX1NFTEVDVE9SKVswXS5uZXh0U2libGluZywgMClcbiAgICB9KVxuICAgIHJldHVybiBmYWxzZVxuICB9IGVsc2UgaWYgKHNlbGVjdGVkRWxlbWVudC5pcygndGgnKSlcbiAgICByZXR1cm4gZmFsc2VcbiAgcmV0dXJuIHRydWVcbn1cblxuLyoqXG4gKiBcbiAqIEBwYXJhbSB7Kn0gc2VsID0+IHRpbnltY2Ugc2VsZWN0aW9uXG4gKi9cbmZ1bmN0aW9uIGhhbmRsZUZpZ3VyZUNoYW5nZSgpIHtcblxuICAvLyBJZiByYXNoLWdlbmVyYXRlZCBzZWN0aW9uIGlzIGRlbGV0ZSwgcmUtYWRkIGl0XG4gIGlmICgkKCdmaWdjYXB0aW9uOm5vdCg6aGFzKHN0cm9uZykpJykubGVuZ3RoKSB7XG4gICAgY2FwdGlvbnMoKVxuICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuICB9XG59IiwiLyoqXG4gKiByYWplX2lubGluZV9jb2RlIHBsdWdpbiBSQUpFXG4gKi9cblxuLyoqXG4gKiBcbiAqL1xubGV0IGlubGluZSA9IHtcblxuICAvKipcbiAgICogXG4gICAqL1xuICBoYW5kbGU6IGZ1bmN0aW9uICh0eXBlKSB7XG4gICAgbGV0IHNlbGVjdGVkRWxlbWVudCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcblxuICAgIC8vIElmIHRoZXJlIGlzbid0IGFueSBpbmxpbmUgY29kZVxuICAgIGlmICghc2VsZWN0ZWRFbGVtZW50LmlzKHR5cGUpICYmICFzZWxlY3RlZEVsZW1lbnQucGFyZW50cyh0eXBlKS5sZW5ndGgpIHtcblxuICAgICAgbGV0IHRleHQgPSBaRVJPX1NQQUNFXG5cbiAgICAgIC8vIENoZWNrIGlmIHRoZSBzZWxlY3Rpb24gc3RhcnRzIGFuZCBlbmRzIGluIHRoZSBzYW1lIHBhcmFncmFwaFxuICAgICAgaWYgKCF0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uaXNDb2xsYXBzZWQoKSkge1xuXG4gICAgICAgIGxldCBzdGFydE5vZGUgPSB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0U3RhcnQoKVxuICAgICAgICBsZXQgZW5kTm9kZSA9IHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRFbmQoKVxuXG4gICAgICAgIC8vIE5vdGlmeSB0aGUgZXJyb3IgYW5kIGV4aXRcbiAgICAgICAgaWYgKHN0YXJ0Tm9kZSAhPSBlbmROb2RlKSB7XG4gICAgICAgICAgbm90aWZ5KElOTElORV9FUlJPUlMsICdlcnJvcicsIDMwMDApXG4gICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgIH1cblxuICAgICAgICAvLyBTYXZlIHRoZSBzZWxlY3RlZCBjb250ZW50IGFzIHRleHRcbiAgICAgICAgdGV4dCArPSB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Q29udGVudCgpXG4gICAgICB9XG5cbiAgICAgIC8vIFVwZGF0ZSB0aGUgY3VycmVudCBzZWxlY3Rpb24gd2l0aCBjb2RlIGVsZW1lbnRcbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAvLyBHZXQgdGhlIGluZGV4IG9mIHRoZSBjdXJyZW50IHNlbGVjdGVkIG5vZGVcbiAgICAgICAgbGV0IHByZXZpb3VzTm9kZUluZGV4ID0gc2VsZWN0ZWRFbGVtZW50LmNvbnRlbnRzKCkuaW5kZXgoJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Um5nKCkuc3RhcnRDb250YWluZXIpKVxuXG4gICAgICAgIC8vIEFkZCBjb2RlIGVsZW1lbnRcbiAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLnNldENvbnRlbnQoYDwke3R5cGV9PiR7dGV4dH08LyR7dHlwZX0+JHsodHlwZSA9PSAncScgPyBaRVJPX1NQQUNFIDogJycpfWApXG4gICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuXG4gICAgICAgIC8vIE1vdmUgY2FyZXQgYXQgdGhlIGVuZCBvZiB0aGUgc3VjY2Vzc2l2ZSBub2RlIG9mIHByZXZpb3VzIHNlbGVjdGVkIG5vZGVcbiAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLnNldEN1cnNvckxvY2F0aW9uKHNlbGVjdGVkRWxlbWVudC5jb250ZW50cygpW3ByZXZpb3VzTm9kZUluZGV4ICsgMV0sIDEpXG4gICAgICB9KVxuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogXG4gICAqL1xuICBleGl0OiBmdW5jdGlvbiAoKSB7XG4gICAgLy8gR2V0IHRoZSBjdXJyZW50IG5vZGUgaW5kZXgsIHJlbGF0aXZlIHRvIGl0cyBwYXJlbnRcbiAgICBsZXQgc2VsZWN0ZWRFbGVtZW50ID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuICAgIGxldCBwYXJlbnRDb250ZW50ID0gc2VsZWN0ZWRFbGVtZW50LnBhcmVudCgpLmNvbnRlbnRzKClcbiAgICBsZXQgaW5kZXggPSBwYXJlbnRDb250ZW50LmluZGV4KHNlbGVjdGVkRWxlbWVudClcblxuICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgLy8gQ2hlY2sgaWYgdGhlIGN1cnJlbnQgbm9kZSBoYXMgYSB0ZXh0IGFmdGVyXG4gICAgICBpZiAodHlwZW9mIHBhcmVudENvbnRlbnRbaW5kZXggKyAxXSAhPSAndW5kZWZpbmVkJyAmJiAkKHBhcmVudENvbnRlbnRbaW5kZXggKyAxXSkuaXMoJ3RleHQnKSkge1xuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2V0Q3Vyc29yTG9jYXRpb24ocGFyZW50Q29udGVudFtpbmRleCArIDFdLCAwKVxuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2V0Q29udGVudChaRVJPX1NQQUNFKVxuICAgICAgfVxuXG4gICAgICAvLyBJZiB0aGUgbm9kZSBoYXNuJ3QgdGV4dCBhZnRlciwgcmFqZSBoYXMgdG8gYWRkIGl0XG4gICAgICBlbHNlIHtcbiAgICAgICAgc2VsZWN0ZWRFbGVtZW50LmFmdGVyKFpFUk9fU1BBQ0UpXG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZXRDdXJzb3JMb2NhdGlvbihwYXJlbnRDb250ZW50W2luZGV4ICsgMV0sIDApXG4gICAgICB9XG4gICAgfSlcbiAgfSxcblxuICAvKipcbiAgICogXG4gICAqL1xuICByZXBsYWNlVGV4dDogZnVuY3Rpb24gKGNoYXIpIHtcblxuICAgIGxldCBzZWxlY3RlZEVsZW1lbnQgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG4gICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAvLyBTZXQgdGhlIG5ldyBjaGFyIGFuZCBvdmVyd3JpdGUgY3VycmVudCB0ZXh0XG4gICAgICBzZWxlY3RlZEVsZW1lbnQuaHRtbChjaGFyKVxuXG4gICAgICAvLyBNb3ZlIHRoZSBjYXJldCBhdCB0aGUgZW5kIG9mIGN1cnJlbnQgdGV4dFxuICAgICAgbGV0IGNvbnRlbnQgPSBzZWxlY3RlZEVsZW1lbnQuY29udGVudHMoKVxuICAgICAgbW92ZUNhcmV0KGNvbnRlbnRbY29udGVudC5sZW5ndGggLSAxXSlcbiAgICB9KVxuICB9XG59XG5cbi8qKlxuICogXG4gKi9cbnRpbnltY2UuUGx1Z2luTWFuYWdlci5hZGQoJ3JhamVfaW5saW5lQ29kZScsIGZ1bmN0aW9uIChlZGl0b3IsIHVybCkge1xuXG4gIGNvbnN0IENPREUgPSAnY29kZSdcblxuICAvLyBBZGQgYSBidXR0b24gdGhhdCBvcGVucyBhIHdpbmRvd1xuICBlZGl0b3IuYWRkQnV0dG9uKCdyYWplX2lubGluZUNvZGUnLCB7XG4gICAgdGl0bGU6ICdpbmxpbmVfY29kZScsXG4gICAgaWNvbjogJ2ljb24taW5saW5lLWNvZGUnLFxuICAgIHRvb2x0aXA6ICdJbmxpbmUgY29kZScsXG4gICAgZGlzYWJsZWRTdGF0ZVNlbGVjdG9yOiBESVNBQkxFX1NFTEVDVE9SX0lOTElORSxcblxuICAgIC8vIEJ1dHRvbiBiZWhhdmlvdXJcbiAgICBvbmNsaWNrOiBmdW5jdGlvbiAoKSB7XG4gICAgICBpbmxpbmUuaGFuZGxlKENPREUpXG4gICAgfVxuICB9KVxuXG4gIGVkaXRvci5vbigna2V5RG93bicsIGZ1bmN0aW9uIChlKSB7XG5cblxuICAgIC8vIENoZWNrIGlmIHRoZSBzZWxlY3RlZCBlbGVtZW50IGlzIGEgQ09ERSB0aGF0IGlzbid0IGluc2lkZSBhIEZJR1VSRSBvciBQUkVcbiAgICBsZXQgc2VsZWN0ZWRFbGVtZW50ID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuICAgIGlmIChzZWxlY3RlZEVsZW1lbnQuaXMoJ2NvZGUnKSAmJiAhc2VsZWN0ZWRFbGVtZW50LnBhcmVudHMoRklHVVJFX1NFTEVDVE9SKS5sZW5ndGggJiYgIXNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKCdwcmUnKS5sZW5ndGgpIHtcblxuICAgICAgLy8gQ2hlY2sgaWYgRU5URVIgaXMgcHJlc3NlZFxuICAgICAgaWYgKGUua2V5Q29kZSA9PSAxMykge1xuXG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpXG4gICAgICAgIGlubGluZS5leGl0KClcbiAgICAgIH1cblxuICAgICAgLy9DaGVjayBpZiBhIFBSSU5UQUJMRSBDSEFSIGlzIHByZXNzZWRcbiAgICAgIGlmIChjaGVja0lmUHJpbnRhYmxlQ2hhcihlLmtleUNvZGUpKSB7XG5cbiAgICAgICAgLy8gSWYgdGhlIGZpcnN0IGNoYXIgaXMgWkVST19TUEFDRSBhbmQgdGhlIGNvZGUgaGFzIG5vIGNoYXJcbiAgICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC50ZXh0KCkubGVuZ3RoID09IDIgJiYgYCYjJHtzZWxlY3RlZEVsZW1lbnQudGV4dCgpLmNoYXJDb2RlQXQoMCl9O2AgPT0gWkVST19TUEFDRSkge1xuXG4gICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKVxuICAgICAgICAgIGlubGluZS5yZXBsYWNlVGV4dChlLmtleSlcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfSlcbn0pXG5cbi8qKlxuICogIElubGluZSBxdW90ZSBwbHVnaW4gUkFKRVxuICovXG50aW55bWNlLlBsdWdpbk1hbmFnZXIuYWRkKCdyYWplX2lubGluZVF1b3RlJywgZnVuY3Rpb24gKGVkaXRvciwgdXJsKSB7XG5cbiAgY29uc3QgUSA9ICdxJ1xuXG4gIC8vIEFkZCBhIGJ1dHRvbiB0aGF0IGhhbmRsZSB0aGUgaW5saW5lIGVsZW1lbnRcbiAgZWRpdG9yLmFkZEJ1dHRvbigncmFqZV9pbmxpbmVRdW90ZScsIHtcbiAgICB0aXRsZTogJ2lubGluZV9xdW90ZScsXG4gICAgaWNvbjogJ2ljb24taW5saW5lLXF1b3RlJyxcbiAgICB0b29sdGlwOiAnSW5saW5lIHF1b3RlJyxcbiAgICBkaXNhYmxlZFN0YXRlU2VsZWN0b3I6IERJU0FCTEVfU0VMRUNUT1JfSU5MSU5FLFxuXG4gICAgLy8gQnV0dG9uIGJlaGF2aW91clxuICAgIG9uY2xpY2s6IGZ1bmN0aW9uICgpIHtcbiAgICAgIGlubGluZS5oYW5kbGUoJ3EnKVxuICAgIH1cbiAgfSlcblxuICBlZGl0b3Iub24oJ2tleURvd24nLCBmdW5jdGlvbiAoZSkge1xuXG4gICAgLy8gQ2hlY2sgaWYgdGhlIHNlbGVjdGVkIGVsZW1lbnQgaXMgYSBDT0RFIHRoYXQgaXNuJ3QgaW5zaWRlIGEgRklHVVJFIG9yIFBSRVxuICAgIGxldCBzZWxlY3RlZEVsZW1lbnQgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG4gICAgaWYgKHNlbGVjdGVkRWxlbWVudC5pcygncScpKSB7XG5cbiAgICAgIC8vIENoZWNrIGlmIEVOVEVSIGlzIHByZXNzZWRcbiAgICAgIGlmIChlLmtleUNvZGUgPT0gMTMpIHtcblxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKVxuICAgICAgICBpbmxpbmUuZXhpdCgpXG4gICAgICB9XG5cbiAgICAgIC8vIENoZWNrIGlmIGEgUFJJTlRBQkxFIENIQVIgaXMgcHJlc3NlZFxuICAgICAgaWYgKGNoZWNrSWZQcmludGFibGVDaGFyKGUua2V5Q29kZSkpIHtcblxuICAgICAgICAvLyBJZiB0aGUgZmlyc3QgY2hhciBpcyBaRVJPX1NQQUNFIGFuZCB0aGUgY29kZSBoYXMgbm8gY2hhclxuICAgICAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LnRleHQoKS5sZW5ndGggPT0gMSAmJiBgJiMke3NlbGVjdGVkRWxlbWVudC50ZXh0KCkuY2hhckNvZGVBdCgwKX07YCA9PSBaRVJPX1NQQUNFKSB7XG5cbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpXG4gICAgICAgICAgaW5saW5lLnJlcGxhY2VUZXh0KGUua2V5KVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9KVxufSlcblxuLyoqXG4gKiBcbiAqL1xudGlueW1jZS5QbHVnaW5NYW5hZ2VyLmFkZCgncmFqZV9leHRlcm5hbExpbmsnLCBmdW5jdGlvbiAoZWRpdG9yLCB1cmwpIHtcblxuICBlZGl0b3IuYWRkQnV0dG9uKCdyYWplX2V4dGVybmFsTGluaycsIHtcbiAgICB0aXRsZTogJ2V4dGVybmFsX2xpbmsnLFxuICAgIGljb246ICdpY29uLWV4dGVybmFsLWxpbmsnLFxuICAgIHRvb2x0aXA6ICdFeHRlcm5hbCBsaW5rJyxcbiAgICBkaXNhYmxlZFN0YXRlU2VsZWN0b3I6IERJU0FCTEVfU0VMRUNUT1JfSU5MSU5FLFxuXG4gICAgLy8gQnV0dG9uIGJlaGF2aW91clxuICAgIG9uY2xpY2s6IGZ1bmN0aW9uICgpIHt9XG4gIH0pXG5cblxuICBsZXQgbGluayA9IHtcbiAgICBhZGQ6IGZ1bmN0aW9uICgpIHtcblxuICAgIH1cbiAgfVxufSlcblxuLyoqXG4gKiBcbiAqL1xudGlueW1jZS5QbHVnaW5NYW5hZ2VyLmFkZCgncmFqZV9pbmxpbmVGaWd1cmUnLCBmdW5jdGlvbiAoZWRpdG9yLCB1cmwpIHtcbiAgZWRpdG9yLmFkZEJ1dHRvbigncmFqZV9pbmxpbmVGaWd1cmUnLCB7XG4gICAgdGV4dDogJ2lubGluZV9maWd1cmUnLFxuICAgIHRvb2x0aXA6ICdJbmxpbmUgcXVvdGUnLFxuICAgIGRpc2FibGVkU3RhdGVTZWxlY3RvcjogRElTQUJMRV9TRUxFQ1RPUl9JTkxJTkUsXG5cbiAgICAvLyBCdXR0b24gYmVoYXZpb3VyXG4gICAgb25jbGljazogZnVuY3Rpb24gKCkge31cbiAgfSlcbn0pIiwidGlueW1jZS5QbHVnaW5NYW5hZ2VyLmFkZCgncmFqZV9saXN0cycsIGZ1bmN0aW9uIChlZGl0b3IsIHVybCkge1xuXG4gIGNvbnN0IE9MID0gJ29sJ1xuICBjb25zdCBVTCA9ICd1bCdcblxuICBlZGl0b3IuYWRkQnV0dG9uKCdyYWplX29sJywge1xuICAgIHRpdGxlOiAncmFqZV9vbCcsXG4gICAgaWNvbjogJ2ljb24tb2wnLFxuICAgIHRvb2x0aXA6ICdPcmRlcmVkIGxpc3QnLFxuICAgIGRpc2FibGVkU3RhdGVTZWxlY3RvcjogRElTQUJMRV9TRUxFQ1RPUl9GSUdVUkVTLFxuXG4gICAgLy8gQnV0dG9uIGJlaGF2aW91clxuICAgIG9uY2xpY2s6IGZ1bmN0aW9uICgpIHtcbiAgICAgIGxpc3QuYWRkKE9MKVxuICAgIH1cbiAgfSlcblxuICBlZGl0b3IuYWRkQnV0dG9uKCdyYWplX3VsJywge1xuICAgIHRpdGxlOiAncmFqZV91bCcsXG4gICAgaWNvbjogJ2ljb24tdWwnLFxuICAgIHRvb2x0aXA6ICdVbm9yZGVyZWQgbGlzdCcsXG4gICAgZGlzYWJsZWRTdGF0ZVNlbGVjdG9yOiBESVNBQkxFX1NFTEVDVE9SX0ZJR1VSRVMsXG5cbiAgICAvLyBCdXR0b24gYmVoYXZpb3VyXG4gICAgb25jbGljazogZnVuY3Rpb24gKCkge1xuICAgICAgbGlzdC5hZGQoVUwpXG4gICAgfVxuICB9KVxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGVkaXRvci5vbigna2V5RG93bicsIGZ1bmN0aW9uIChlKSB7XG5cblxuICAgIC8vIENoZWNrIGlmIHRoZSBzZWxlY3RlZCBlbGVtZW50IGlzIGEgUCBpbnNpZGUgYSBsaXN0IChPTCwgVUwpXG4gICAgbGV0IHNlbGVjdGVkRWxlbWVudCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcbiAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LmlzKCdwJykgJiYgKHNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKCd1bCcpLmxlbmd0aCB8fCBzZWxlY3RlZEVsZW1lbnQucGFyZW50cygnbGknKS5sZW5ndGgpKSB7XG5cblxuICAgICAgLyoqXG4gICAgICAgKiBDaGVjayBpZiBDTUQrRU5URVIgb3IgQ1RSTCtFTlRFUiBhcmUgcHJlc3NlZFxuICAgICAgICovXG4gICAgICBpZiAoKGUubWV0YUtleSB8fCBlLmN0cmxLZXkpICYmIGUua2V5Q29kZSA9PSAxMykge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgbGlzdC5hZGRQYXJhZ3JhcGgoKVxuICAgICAgfVxuXG4gICAgICAvKipcbiAgICAgICAqIENoZWNrIGlmIFNISUZUK1RBQiBpcyBwcmVzc2VkXG4gICAgICAgKi9cbiAgICAgIGVsc2UgaWYgKGUuc2hpZnRLZXkgJiYgZS5rZXlDb2RlID09IDkpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgIGxpc3QuZGVOZXN0KClcbiAgICAgIH1cblxuICAgICAgLyoqXG4gICAgICAgKiBDaGVjayBpZiBFTlRFUiBpcyBwcmVzc2VkXG4gICAgICAgKi9cbiAgICAgIGVsc2UgaWYgKGUua2V5Q29kZSA9PSAxMykge1xuXG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKVxuXG4gICAgICAgIC8vIENoZWNrIGlmIHRoZSBzZWxlY3Rpb24gaXMgY29sbGFwc2VkXG4gICAgICAgIGlmICh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uaXNDb2xsYXBzZWQoKSkge1xuXG4gICAgICAgICAgaWYgKCFzZWxlY3RlZEVsZW1lbnQudGV4dCgpLnRyaW0oKS5sZW5ndGgpIHtcblxuICAgICAgICAgICAgLy8gRGUgbmVzdFxuICAgICAgICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKCd1bCxvbCcpLmxlbmd0aCA+IDEpXG4gICAgICAgICAgICAgIGxpc3QuZGVOZXN0KClcblxuICAgICAgICAgICAgLy8gUmVtb3ZlIHRoZSBlbXB0eSBMSVxuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICBsaXN0LnJlbW92ZUxpc3RJdGVtKClcblxuICAgICAgICAgIH0gZWxzZVxuICAgICAgICAgICAgbGlzdC5hZGRMaXN0SXRlbSgpXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLyoqXG4gICAgICAgKiBDaGVjayBpZiBUQUIgaXMgcHJlc3NlZFxuICAgICAgICovXG4gICAgICBlbHNlIGlmIChlLmtleUNvZGUgPT0gOSkge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgbGlzdC5uZXN0KClcbiAgICAgIH1cbiAgICB9XG4gIH0pXG5cblxuICAvKipcbiAgICogXG4gICAqL1xuICBsZXQgbGlzdCA9IHtcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIGFkZDogZnVuY3Rpb24gKHR5cGUpIHtcblxuICAgICAgLy8gR2V0IHRoZSBjdXJyZW50IGVsZW1lbnQgXG4gICAgICBsZXQgc2VsZWN0ZWRFbGVtZW50ID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuICAgICAgbGV0IHRleHQgPSAnPGJyPidcblxuICAgICAgLy8gSWYgdGhlIGN1cnJlbnQgZWxlbWVudCBoYXMgdGV4dCwgc2F2ZSBpdFxuICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC50ZXh0KCkudHJpbSgpLmxlbmd0aCA+IDApXG4gICAgICAgIHRleHQgPSBzZWxlY3RlZEVsZW1lbnQudGV4dCgpLnRyaW0oKVxuXG4gICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgbGV0IG5ld0xpc3QgPSAkKGA8JHt0eXBlfT48bGk+PHA+JHt0ZXh0fTwvcD48L2xpPjwvJHt0eXBlfT5gKVxuXG4gICAgICAgIC8vIEFkZCB0aGUgbmV3IGVsZW1lbnRcbiAgICAgICAgc2VsZWN0ZWRFbGVtZW50LnJlcGxhY2VXaXRoKG5ld0xpc3QpXG5cbiAgICAgICAgLy8gU2F2ZSBjaGFuZ2VzXG4gICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuXG4gICAgICAgIC8vIE1vdmUgdGhlIGN1cnNvclxuICAgICAgICBtb3ZlQ2FyZXQobmV3TGlzdC5maW5kKCdwJylbMF0sIGZhbHNlKVxuICAgICAgfSlcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgYWRkTGlzdEl0ZW06IGZ1bmN0aW9uICgpIHtcblxuICAgICAgY29uc3QgQlIgPSAnPGJyPidcblxuICAgICAgLy8gR2V0IHRoZSByZWZlcmVuY2VzIG9mIHRoZSBleGlzdGluZyBlbGVtZW50XG4gICAgICBsZXQgcCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcbiAgICAgIGxldCBsaXN0SXRlbSA9IHAucGFyZW50KCdsaScpXG5cbiAgICAgIC8vIFBsYWNlaG9sZGVyIHRleHQgb2YgdGhlIG5ldyBsaVxuICAgICAgbGV0IG5ld1RleHQgPSBCUlxuICAgICAgbGV0IG5vZGVzID0gcC5jb250ZW50cygpXG5cbiAgICAgIC8vIElmIHRoZXJlIGlzIGp1c3Qgb25lIG5vZGUgd3JhcHBlZCBpbnNpZGUgdGhlIHBhcmFncmFwaFxuICAgICAgaWYgKG5vZGVzLmxlbmd0aCA9PSAxKSB7XG5cbiAgICAgICAgLy8gR2V0IHRoZSBzdGFydCBvZmZzZXQgYW5kIHRleHQgb2YgdGhlIGN1cnJlbnQgbGlcbiAgICAgICAgbGV0IHN0YXJ0T2Zmc2V0ID0gdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldFJuZygpLnN0YXJ0T2Zmc2V0XG4gICAgICAgIGxldCBwVGV4dCA9IHAudGV4dCgpXG5cbiAgICAgICAgLy8gSWYgdGhlIGN1cnNvciBpc24ndCBhdCB0aGUgZW5kXG4gICAgICAgIGlmIChzdGFydE9mZnNldCAhPSBwVGV4dC5sZW5ndGgpIHtcblxuICAgICAgICAgIC8vIEdldCB0aGUgcmVtYWluaW5nIHRleHRcbiAgICAgICAgICBuZXdUZXh0ID0gcFRleHQuc3Vic3RyaW5nKHN0YXJ0T2Zmc2V0LCBwVGV4dC5sZW5ndGgpXG4gICAgICAgIH1cblxuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICAvLyBVcGRhdGUgdGhlIHRleHQgb2YgdGhlIGN1cnJlbnQgbGlcbiAgICAgICAgICBwLnRleHQocFRleHQuc3Vic3RyaW5nKDAsIHN0YXJ0T2Zmc2V0KSlcblxuICAgICAgICAgIGlmICghcC50ZXh0KCkubGVuZ3RoKVxuICAgICAgICAgICAgcC5odG1sKEJSKVxuXG4gICAgICAgICAgLy8gQ3JlYXRlIGFuZCBhZGQgdGhlIG5ldyBsaVxuICAgICAgICAgIGxldCBuZXdMaXN0SXRlbSA9ICQoYDxsaT48cD4ke25ld1RleHR9PC9wPjwvbGk+YClcbiAgICAgICAgICBsaXN0SXRlbS5hZnRlcihuZXdMaXN0SXRlbSlcblxuICAgICAgICAgIC8vIE1vdmUgdGhlIGNhcmV0IHRvIHRoZSBuZXcgbGlcbiAgICAgICAgICBtb3ZlQ2FyZXQobmV3TGlzdEl0ZW1bMF0sIHRydWUpXG5cbiAgICAgICAgICAvLyBVcGRhdGUgdGhlIGNvbnRlbnRcbiAgICAgICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcbiAgICAgICAgfSlcbiAgICAgIH1cblxuICAgICAgLy8gSW5zdGVhZCBpZiB0aGVyZSBhcmUgbXVsdGlwbGUgbm9kZXMgaW5zaWRlIHRoZSBwYXJhZ3JhcGhcbiAgICAgIGVsc2Uge1xuXG4gICAgICAgIC8vIElzdGFudGlhdGUgdGhlIHJhbmdlIHRvIGJlIHNlbGVjdGVkXG4gICAgICAgIGxldCByYW5nZSA9IGRvY3VtZW50LmNyZWF0ZVJhbmdlKClcblxuICAgICAgICAvLyBTdGFydCB0aGUgcmFuZ2UgZnJvbSB0aGUgc2VsZWN0ZWQgbm9kZSBhbmQgb2Zmc2V0IGFuZCBlbmRzIGl0IGF0IHRoZSBlbmQgb2YgdGhlIGxhc3Qgbm9kZVxuICAgICAgICByYW5nZS5zZXRTdGFydCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Um5nKCkuc3RhcnRDb250YWluZXIsIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRSbmcoKS5zdGFydE9mZnNldClcbiAgICAgICAgcmFuZ2Uuc2V0RW5kKHRoaXMuZ2V0TGFzdE5vdEVtcHR5Tm9kZShub2RlcyksIDEpXG5cbiAgICAgICAgLy8gU2VsZWN0IHRoZSByYW5nZVxuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2V0Um5nKHJhbmdlKVxuXG4gICAgICAgIC8vIFNhdmUgdGhlIGh0bWwgY29udGVudFxuICAgICAgICBuZXdUZXh0ID0gdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldENvbnRlbnQoKVxuXG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgIHAuaHRtbChwLmh0bWwoKS5yZXBsYWNlKG5ld1RleHQsICcnKSlcblxuICAgICAgICAgIGlmICghcC50ZXh0KCkubGVuZ3RoKVxuICAgICAgICAgICAgcC5odG1sKEJSKVxuXG4gICAgICAgICAgLy8gQ3JlYXRlIGFuZCBhZGQgdGhlIG5ldyBsaVxuICAgICAgICAgIGxldCBuZXdMaXN0SXRlbSA9ICQoYDxsaT48cD4ke25ld1RleHR9PC9wPjwvbGk+YClcbiAgICAgICAgICBsaXN0SXRlbS5hZnRlcihuZXdMaXN0SXRlbSlcblxuICAgICAgICAgIC8vIE1vdmUgdGhlIGNhcmV0IHRvIHRoZSBuZXcgbGlcbiAgICAgICAgICBtb3ZlQ2FyZXQobmV3TGlzdEl0ZW1bMF0sIHRydWUpXG5cbiAgICAgICAgICAvLyBVcGRhdGUgdGhlIGNvbnRlbnRcbiAgICAgICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgZ2V0TGFzdE5vdEVtcHR5Tm9kZTogZnVuY3Rpb24gKG5vZGVzKSB7XG5cbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbm9kZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKG5vZGVzW2ldLm5vZGVUeXBlID09IDMgJiYgIW5vZGVzW2ldLmxlbmd0aClcbiAgICAgICAgICBub2Rlcy5zcGxpY2UoaSwgMSlcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG5vZGVzW25vZGVzLmxlbmd0aCAtIDFdXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIHJlbW92ZUxpc3RJdGVtOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgIC8vIEdldCB0aGUgc2VsZWN0ZWQgbGlzdEl0ZW1cbiAgICAgIGxldCBsaXN0SXRlbSA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSkucGFyZW50KCdsaScpXG5cbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAvLyBBZGQgYSBlbXB0eSBwYXJhZ3JhcGggYWZ0ZXIgdGhlIGxpc3RcbiAgICAgICAgbGV0IG5ld1AgPSAkKCc8cD48YnI+PC9wPicpXG4gICAgICAgIGxpc3RJdGVtLnBhcmVudCgpLmFmdGVyKG5ld1ApXG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIGxpc3QgaGFzIGV4YWN0bHkgb25lIGNoaWxkIHJlbW92ZSB0aGUgbGlzdFxuICAgICAgICBpZiAobGlzdEl0ZW0ucGFyZW50KCkuY2hpbGRyZW4oJ2xpJykubGVuZ3RoID09IDEpIHtcbiAgICAgICAgICBsZXQgbGlzdCA9IGxpc3RJdGVtLnBhcmVudCgpXG4gICAgICAgICAgbGlzdC5yZW1vdmUoKVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gSWYgdGhlIGxpc3QgaGFzIG1vcmUgY2hpbGRyZW4gcmVtb3ZlIHRoZSBzZWxlY3RlZCBjaGlsZFxuICAgICAgICBlbHNlXG4gICAgICAgICAgbGlzdEl0ZW0ucmVtb3ZlKClcblxuICAgICAgICBtb3ZlQ2FyZXQobmV3UFswXSlcblxuICAgICAgICAvLyBVcGRhdGUgdGhlIGNvbnRlbnRcbiAgICAgICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG4gICAgICB9KVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBuZXN0OiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgIGxldCBwID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuICAgICAgbGV0IGxpc3RJdGVtID0gcC5wYXJlbnQoJ2xpJylcblxuICAgICAgLy8gQ2hlY2sgaWYgdGhlIGN1cnJlbnQgbGkgaGFzIGF0IGxlYXN0IG9uZSBwcmV2aW91cyBlbGVtZW50XG4gICAgICBpZiAobGlzdEl0ZW0ucHJldkFsbCgpLmxlbmd0aCA+IDApIHtcblxuICAgICAgICAvLyBDcmVhdGUgdGhlIG5ldyBsaXN0XG4gICAgICAgIGxldCB0ZXh0ID0gJzxicj4nXG5cbiAgICAgICAgaWYgKHAudGV4dCgpLnRyaW0oKS5sZW5ndGgpXG4gICAgICAgICAgdGV4dCA9IHAudGV4dCgpLnRyaW0oKVxuXG4gICAgICAgIC8vIEdldCB0eXBlIG9mIHRoZSBwYXJlbnQgbGlzdFxuICAgICAgICBsZXQgdHlwZSA9IGxpc3RJdGVtLnBhcmVudCgpWzBdLnRhZ05hbWUudG9Mb3dlckNhc2UoKVxuXG4gICAgICAgIC8vIENyZWF0ZSB0aGUgbmV3IG5lc3RlZCBsaXN0XG4gICAgICAgIGxldCBuZXdMaXN0SXRlbSA9ICQobGlzdEl0ZW1bMF0ub3V0ZXJIVE1MKVxuXG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgIC8vIElmIHRoZSBwcmV2aW91cyBlbGVtZW50IGhhcyBhIGxpc3RcbiAgICAgICAgICBpZiAobGlzdEl0ZW0ucHJldigpLmZpbmQoJ3VsLG9sJykubGVuZ3RoKVxuICAgICAgICAgICAgbGlzdEl0ZW0ucHJldigpLmZpbmQoJ3VsLG9sJykuYXBwZW5kKG5ld0xpc3RJdGVtKVxuXG4gICAgICAgICAgLy8gQWRkIHRoZSBuZXcgbGlzdCBpbnNpZGUgdGhlIHByZXZpb3VzIGxpXG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBuZXdMaXN0SXRlbSA9ICQoYDwke3R5cGV9PiR7bmV3TGlzdEl0ZW1bMF0ub3V0ZXJIVE1MfTwvJHt0eXBlfT5gKVxuICAgICAgICAgICAgbGlzdEl0ZW0ucHJldigpLmFwcGVuZChuZXdMaXN0SXRlbSlcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBsaXN0SXRlbS5yZW1vdmUoKVxuXG4gICAgICAgICAgLy8gTW92ZSB0aGUgY2FyZXQgYXQgdGhlIGVuZCBvZiB0aGUgbmV3IHAgXG4gICAgICAgICAgbW92ZUNhcmV0KG5ld0xpc3RJdGVtLmZpbmQoJ3AnKVswXSlcblxuICAgICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuICAgICAgICB9KVxuICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBkZU5lc3Q6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgbGV0IGxpc3RJdGVtID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKS5wYXJlbnQoJ2xpJylcbiAgICAgIGxldCBsaXN0ID0gbGlzdEl0ZW0ucGFyZW50KClcblxuICAgICAgLy8gQ2hlY2sgaWYgdGhlIGN1cnJlbnQgbGlzdCBoYXMgYXQgbGVhc3QgYW5vdGhlciBsaXN0IGFzIHBhcmVudFxuICAgICAgaWYgKGxpc3RJdGVtLnBhcmVudHMoJ3VsLG9sJykubGVuZ3RoID4gMSkge1xuXG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgIC8vIEdldCBhbGwgbGk6IGN1cnJlbnQgYW5kIGlmIHRoZXJlIGFyZSBzdWNjZXNzaXZlXG4gICAgICAgICAgbGV0IG5leHRMaSA9IFtsaXN0SXRlbV1cbiAgICAgICAgICBpZiAobGlzdEl0ZW0ubmV4dEFsbCgpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGxpc3RJdGVtLm5leHRBbGwoKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgbmV4dExpLnB1c2goJCh0aGlzKSlcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gTW92ZSBhbGwgbGkgb3V0IGZyb20gdGhlIG5lc3RlZCBsaXN0XG4gICAgICAgICAgZm9yIChsZXQgaSA9IG5leHRMaS5sZW5ndGggLSAxOyBpID4gLTE7IGktLSkge1xuICAgICAgICAgICAgbmV4dExpW2ldLnJlbW92ZSgpXG4gICAgICAgICAgICBsaXN0LnBhcmVudCgpLmFmdGVyKG5leHRMaVtpXSlcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBJZiBlbXB0eSByZW1vdmUgdGhlIGxpc3RcbiAgICAgICAgICBpZiAoIWxpc3QuY2hpbGRyZW4oJ2xpJykubGVuZ3RoKVxuICAgICAgICAgICAgbGlzdC5yZW1vdmUoKVxuXG4gICAgICAgICAgLy8gTW92ZSB0aGUgY2FyZXQgYXQgdGhlIGVuZFxuICAgICAgICAgIG1vdmVDYXJldChsaXN0SXRlbS5maW5kKCdwJylbMF0pXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIGFkZFBhcmFncmFwaDogZnVuY3Rpb24gKCkge1xuXG4gICAgICAvLyBHZXQgcmVmZXJlbmNlcyBvZiBjdXJyZW50IHBcbiAgICAgIGxldCBwID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuICAgICAgbGV0IHN0YXJ0T2Zmc2V0ID0gdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldFJuZygpLnN0YXJ0T2Zmc2V0XG4gICAgICBsZXQgcFRleHQgPSBwLnRleHQoKS50cmltKClcblxuICAgICAgbGV0IHRleHQgPSAnPGJyPidcblxuICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIC8vIElmIHRoZSBFTlRFUiBicmVha3MgcFxuICAgICAgICBpZiAoc3RhcnRPZmZzZXQgIT0gcFRleHQubGVuZ3RoKSB7XG5cbiAgICAgICAgICAvLyBVcGRhdGUgdGhlIHRleHQgb2YgdGhlIGN1cnJlbnQgbGlcbiAgICAgICAgICBwLnRleHQocFRleHQuc3Vic3RyaW5nKDAsIHN0YXJ0T2Zmc2V0KSlcblxuICAgICAgICAgIC8vIEdldCB0aGUgcmVtYWluaW5nIHRleHRcbiAgICAgICAgICB0ZXh0ID0gcFRleHQuc3Vic3RyaW5nKHN0YXJ0T2Zmc2V0LCBwVGV4dC5sZW5ndGgpXG4gICAgICAgIH1cblxuICAgICAgICAvLyBDcmVhdGUgYW5kIGFkZCB0aGUgZWxlbWVudFxuICAgICAgICBsZXQgbmV3UCA9ICQoYDxwPiR7dGV4dH08L3A+YClcbiAgICAgICAgcC5hZnRlcihuZXdQKVxuXG4gICAgICAgIG1vdmVDYXJldChuZXdQWzBdLCB0cnVlKVxuICAgICAgfSlcbiAgICB9XG4gIH1cbn0pIiwiLyoqXG4gKiBcbiAqL1xuXG5mdW5jdGlvbiBvcGVuTWV0YWRhdGFEaWFsb2coKSB7XG4gIHRpbnltY2UuYWN0aXZlRWRpdG9yLndpbmRvd01hbmFnZXIub3Blbih7XG4gICAgdGl0bGU6ICdFZGl0IG1ldGFkYXRhJyxcbiAgICB1cmw6ICdqcy9yYWplLWNvcmUvcGx1Z2luL3JhamVfbWV0YWRhdGEuaHRtbCcsXG4gICAgd2lkdGg6IDk1MCxcbiAgICBoZWlnaHQ6IDgwMCxcbiAgICBvbkNsb3NlOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgIGlmICh0aW55bWNlLmFjdGl2ZUVkaXRvci51cGRhdGVkX21ldGFkYXRhICE9IG51bGwpIHtcblxuICAgICAgICBtZXRhZGF0YS51cGRhdGUodGlueW1jZS5hY3RpdmVFZGl0b3IudXBkYXRlZF9tZXRhZGF0YSlcblxuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51cGRhdGVkX21ldGFkYXRhID09IG51bGxcbiAgICAgIH1cblxuICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iud2luZG93TWFuYWdlci5jbG9zZSgpXG4gICAgfVxuICB9LCBtZXRhZGF0YS5nZXRBbGxNZXRhZGF0YSgpKVxufVxuXG50aW55bWNlLlBsdWdpbk1hbmFnZXIuYWRkKCdyYWplX21ldGFkYXRhJywgZnVuY3Rpb24gKGVkaXRvciwgdXJsKSB7XG5cbiAgLy8gQWRkIGEgYnV0dG9uIHRoYXQgaGFuZGxlIHRoZSBpbmxpbmUgZWxlbWVudFxuICBlZGl0b3IuYWRkQnV0dG9uKCdyYWplX21ldGFkYXRhJywge1xuICAgIHRleHQ6ICdNZXRhZGF0YScsXG4gICAgaWNvbjogZmFsc2UsXG4gICAgdG9vbHRpcDogJ0VkaXQgbWV0YWRhdGEnLFxuXG4gICAgLy8gQnV0dG9uIGJlaGF2aW91clxuICAgIG9uY2xpY2s6IGZ1bmN0aW9uICgpIHtcbiAgICAgIG9wZW5NZXRhZGF0YURpYWxvZygpXG4gICAgfVxuICB9KVxuXG4gIGVkaXRvci5vbignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuICAgIGlmICgkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpLmlzKEhFQURFUl9TRUxFQ1RPUikpXG4gICAgICBvcGVuTWV0YWRhdGFEaWFsb2coKVxuICB9KVxuXG4gIG1ldGFkYXRhID0ge1xuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgZ2V0QWxsTWV0YWRhdGE6IGZ1bmN0aW9uICgpIHtcbiAgICAgIGxldCBoZWFkZXIgPSAkKEhFQURFUl9TRUxFQ1RPUilcbiAgICAgIGxldCBzdWJ0aXRsZSA9IGhlYWRlci5maW5kKCdoMS50aXRsZSA+IHNtYWxsJykudGV4dCgpXG4gICAgICBsZXQgZGF0YSA9IHtcbiAgICAgICAgc3VidGl0bGU6IHN1YnRpdGxlLFxuICAgICAgICB0aXRsZTogaGVhZGVyLmZpbmQoJ2gxLnRpdGxlJykudGV4dCgpLnJlcGxhY2Uoc3VidGl0bGUsICcnKSxcbiAgICAgICAgYXV0aG9yczogbWV0YWRhdGEuZ2V0QXV0aG9ycyhoZWFkZXIpLFxuICAgICAgICBjYXRlZ29yaWVzOiBtZXRhZGF0YS5nZXRDYXRlZ29yaWVzKGhlYWRlciksXG4gICAgICAgIGtleXdvcmRzOiBtZXRhZGF0YS5nZXRLZXl3b3JkcyhoZWFkZXIpXG4gICAgICB9XG5cbiAgICAgIHJldHVybiBkYXRhXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIGdldEF1dGhvcnM6IGZ1bmN0aW9uIChoZWFkZXIpIHtcbiAgICAgIGxldCBhdXRob3JzID0gW11cblxuICAgICAgaGVhZGVyLmZpbmQoJ2FkZHJlc3MubGVhZC5hdXRob3JzJykuZWFjaChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgLy8gR2V0IGFsbCBhZmZpbGlhdGlvbnNcbiAgICAgICAgbGV0IGFmZmlsaWF0aW9ucyA9IFtdXG4gICAgICAgICQodGhpcykuZmluZCgnc3BhbicpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGFmZmlsaWF0aW9ucy5wdXNoKCQodGhpcykudGV4dCgpKVxuICAgICAgICB9KVxuXG4gICAgICAgIC8vIHB1c2ggc2luZ2xlIGF1dGhvclxuICAgICAgICBhdXRob3JzLnB1c2goe1xuICAgICAgICAgIG5hbWU6ICQodGhpcykuY2hpbGRyZW4oJ3N0cm9uZy5hdXRob3JfbmFtZScpLnRleHQoKSxcbiAgICAgICAgICBlbWFpbDogJCh0aGlzKS5maW5kKCdjb2RlLmVtYWlsID4gYScpLnRleHQoKSxcbiAgICAgICAgICBhZmZpbGlhdGlvbnM6IGFmZmlsaWF0aW9uc1xuICAgICAgICB9KVxuICAgICAgfSlcblxuICAgICAgcmV0dXJuIGF1dGhvcnNcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgZ2V0Q2F0ZWdvcmllczogZnVuY3Rpb24gKGhlYWRlcikge1xuICAgICAgbGV0IGNhdGVnb3JpZXMgPSBbXVxuXG4gICAgICBoZWFkZXIuZmluZCgncC5hY21fc3ViamVjdF9jYXRlZ29yaWVzID4gY29kZScpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICBjYXRlZ29yaWVzLnB1c2goJCh0aGlzKS50ZXh0KCkpXG4gICAgICB9KVxuXG4gICAgICByZXR1cm4gY2F0ZWdvcmllc1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBnZXRLZXl3b3JkczogZnVuY3Rpb24gKGhlYWRlcikge1xuICAgICAgbGV0IGtleXdvcmRzID0gW11cblxuICAgICAgaGVhZGVyLmZpbmQoJ3VsLmxpc3QtaW5saW5lID4gbGkgPiBjb2RlJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIGtleXdvcmRzLnB1c2goJCh0aGlzKS50ZXh0KCkpXG4gICAgICB9KVxuXG4gICAgICByZXR1cm4ga2V5d29yZHNcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgdXBkYXRlOiBmdW5jdGlvbiAodXBkYXRlZE1ldGFkYXRhKSB7XG5cbiAgICAgICQoJ2hlYWQgbWV0YVtwcm9wZXJ0eV0sIGhlYWQgbGlua1twcm9wZXJ0eV0sIGhlYWQgbWV0YVtuYW1lXScpLnJlbW92ZSgpXG5cbiAgICAgIGxldCBjdXJyZW50TWV0YWRhdGEgPSBtZXRhZGF0YS5nZXRBbGxNZXRhZGF0YSgpXG5cbiAgICAgIC8vIFVwZGF0ZSB0aXRsZSBhbmQgc3VidGl0bGVcbiAgICAgIGlmICh1cGRhdGVkTWV0YWRhdGEudGl0bGUgIT0gY3VycmVudE1ldGFkYXRhLnRpdGxlIHx8IHVwZGF0ZWRNZXRhZGF0YS5zdWJ0aXRsZSAhPSBjdXJyZW50TWV0YWRhdGEuc3VidGl0bGUpIHtcbiAgICAgICAgbGV0IHRleHQgPSB1cGRhdGVkTWV0YWRhdGEudGl0bGVcblxuICAgICAgICBpZiAodXBkYXRlZE1ldGFkYXRhLnN1YnRpdGxlLnRyaW0oKS5sZW5ndGgpXG4gICAgICAgICAgdGV4dCArPSBgIC0tICR7dXBkYXRlZE1ldGFkYXRhLnN1YnRpdGxlfWBcblxuICAgICAgICAkKCd0aXRsZScpLnRleHQodGV4dClcbiAgICAgIH1cblxuICAgICAgbGV0IGFmZmlsaWF0aW9uc0NhY2hlID0gW11cblxuICAgICAgdXBkYXRlZE1ldGFkYXRhLmF1dGhvcnMuZm9yRWFjaChmdW5jdGlvbiAoYXV0aG9yKSB7XG5cbiAgICAgICAgJCgnaGVhZCcpLmFwcGVuZChgPG1ldGEgYWJvdXQ9XCJtYWlsdG86JHthdXRob3IuZW1haWx9XCIgdHlwZW9mPVwic2NoZW1hOlBlcnNvblwiIHByb3BlcnR5PVwic2NoZW1hOm5hbWVcIiBuYW1lPVwiZGMuY3JlYXRvclwiIGNvbnRlbnQ9XCIke2F1dGhvci5uYW1lfVwiPmApXG4gICAgICAgICQoJ2hlYWQnKS5hcHBlbmQoYDxtZXRhIGFib3V0PVwibWFpbHRvOiR7YXV0aG9yLmVtYWlsfVwiIHByb3BlcnR5PVwic2NoZW1hOmVtYWlsXCIgY29udGVudD1cIiR7YXV0aG9yLmVtYWlsfVwiPmApXG5cbiAgICAgICAgYXV0aG9yLmFmZmlsaWF0aW9ucy5mb3JFYWNoKGZ1bmN0aW9uIChhZmZpbGlhdGlvbikge1xuXG4gICAgICAgICAgLy8gTG9vayB1cCBmb3IgYWxyZWFkeSBleGlzdGluZyBhZmZpbGlhdGlvblxuICAgICAgICAgIGxldCB0b0FkZCA9IHRydWVcbiAgICAgICAgICBsZXQgaWRcblxuICAgICAgICAgIGFmZmlsaWF0aW9uc0NhY2hlLmZvckVhY2goZnVuY3Rpb24gKGFmZmlsaWF0aW9uQ2FjaGUpIHtcbiAgICAgICAgICAgIGlmIChhZmZpbGlhdGlvbkNhY2hlLmNvbnRlbnQgPT0gYWZmaWxpYXRpb24pIHtcbiAgICAgICAgICAgICAgdG9BZGQgPSBmYWxzZVxuICAgICAgICAgICAgICBpZCA9IGFmZmlsaWF0aW9uQ2FjaGUuaWRcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KVxuXG4gICAgICAgICAgLy8gSWYgdGhlcmUgaXMgbm8gZXhpc3RpbmcgYWZmaWxpYXRpb24sIGFkZCBpdFxuICAgICAgICAgIGlmICh0b0FkZCkge1xuICAgICAgICAgICAgbGV0IGdlbmVyYXRlZElkID0gYCNhZmZpbGlhdGlvbl8ke2FmZmlsaWF0aW9uc0NhY2hlLmxlbmd0aCsxfWBcbiAgICAgICAgICAgIGFmZmlsaWF0aW9uc0NhY2hlLnB1c2goe1xuICAgICAgICAgICAgICBpZDogZ2VuZXJhdGVkSWQsXG4gICAgICAgICAgICAgIGNvbnRlbnQ6IGFmZmlsaWF0aW9uXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgaWQgPSBnZW5lcmF0ZWRJZFxuICAgICAgICAgIH1cblxuICAgICAgICAgICQoJ2hlYWQnKS5hcHBlbmQoYDxsaW5rIGFib3V0PVwibWFpbHRvOiR7YXV0aG9yLmVtYWlsfVwiIHByb3BlcnR5PVwic2NoZW1hOmFmZmlsaWF0aW9uXCIgaHJlZj1cIiR7aWR9XCI+YClcbiAgICAgICAgfSlcbiAgICAgIH0pXG5cbiAgICAgIGFmZmlsaWF0aW9uc0NhY2hlLmZvckVhY2goZnVuY3Rpb24gKGFmZmlsaWF0aW9uQ2FjaGUpIHtcbiAgICAgICAgJCgnaGVhZCcpLmFwcGVuZChgPG1ldGEgYWJvdXQ9XCIke2FmZmlsaWF0aW9uQ2FjaGUuaWR9XCIgdHlwZW9mPVwic2NoZW1hOk9yZ2FuaXphdGlvblwiIHByb3BlcnR5PVwic2NoZW1hOm5hbWVcIiBjb250ZW50PVwiJHthZmZpbGlhdGlvbkNhY2hlLmNvbnRlbnR9XCI+YClcbiAgICAgIH0pXG5cbiAgICAgIHVwZGF0ZWRNZXRhZGF0YS5jYXRlZ29yaWVzLmZvckVhY2goZnVuY3Rpb24oY2F0ZWdvcnkpe1xuICAgICAgICAkKCdoZWFkJykuYXBwZW5kKGA8bWV0YSBuYW1lPVwiZGN0ZXJtcy5zdWJqZWN0XCIgY29udGVudD1cIiR7Y2F0ZWdvcnl9XCIvPmApXG4gICAgICB9KVxuXG4gICAgICB1cGRhdGVkTWV0YWRhdGEua2V5d29yZHMuZm9yRWFjaChmdW5jdGlvbihrZXl3b3JkKXtcbiAgICAgICAgJCgnaGVhZCcpLmFwcGVuZChgPG1ldGEgcHJvcGVydHk9XCJwcmlzbTprZXl3b3JkXCIgY29udGVudD1cIiR7a2V5d29yZH1cIi8+YClcbiAgICAgIH0pXG5cbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLiQoJ2JvZHknKS5hZGRIZWFkZXJIVE1MKClcbiAgICAgIHNldE5vbkVkaXRhYmxlSGVhZGVyKClcblxuICAgICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG4gICAgfVxuICB9XG5cbn0pIiwidGlueW1jZS5QbHVnaW5NYW5hZ2VyLmFkZCgncmFqZV9zYXZlJywgZnVuY3Rpb24gKGVkaXRvciwgdXJsKSB7XG5cbiAgc2F2ZU1hbmFnZXIgPSB7XG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBpbml0U2F2ZTogZnVuY3Rpb24gKCkge1xuICAgICAgLy8gUmV0dXJuIHRoZSBtZXNzYWdlIGZvciB0aGUgYmFja2VuZFxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdGl0bGU6IHNhdmVNYW5hZ2VyLmdldFRpdGxlKCksXG4gICAgICAgIGRvY3VtZW50OiBzYXZlTWFuYWdlci5nZXREZXJhc2hlZEFydGljbGUoKVxuICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBzYXZlQXM6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgLy8gU2VuZCBtZXNzYWdlIHRvIHRoZSBiYWNrZW5kXG4gICAgICBzYXZlQXNBcnRpY2xlKHNhdmVNYW5hZ2VyLmluaXRTYXZlKCkpXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIHNhdmU6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgLy8gU2VuZCBtZXNzYWdlIHRvIHRoZSBiYWNrZW5kXG4gICAgICBzYXZlQXJ0aWNsZShzYXZlTWFuYWdlci5pbml0U2F2ZSgpKVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm4gdGhlIFJBU0ggYXJ0aWNsZSByZW5kZXJlZCAod2l0aG91dCB0aW55bWNlKVxuICAgICAqL1xuICAgIGdldERlcmFzaGVkQXJ0aWNsZTogZnVuY3Rpb24gKCkge1xuXG4gICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcblxuICAgICAgLy8gU2F2ZSBodG1sIHJlZmVyZW5jZXNcbiAgICAgIGxldCBhcnRpY2xlID0gJCgnaHRtbCcpLmNsb25lKClcbiAgICAgIGxldCB0aW55bWNlU2F2ZWRDb250ZW50ID0gYXJ0aWNsZS5maW5kKCcjcmFqZV9yb290JylcblxuICAgICAgYXJ0aWNsZS5yZW1vdmVBdHRyKCdjbGFzcycpXG5cbiAgICAgIC8vcmVwbGFjZSBib2R5IHdpdGggdGhlIHJpZ2h0IG9uZSAodGhpcyBhY3Rpb24gcmVtb3ZlIHRpbnltY2UpXG4gICAgICBhcnRpY2xlLmZpbmQoJ2JvZHknKS5odG1sKHRpbnltY2VTYXZlZENvbnRlbnQuaHRtbCgpKVxuICAgICAgYXJ0aWNsZS5maW5kKCdib2R5JykucmVtb3ZlQXR0cignc3R5bGUnKVxuICAgICAgYXJ0aWNsZS5maW5kKCdib2R5JykucmVtb3ZlQXR0cignY2xhc3MnKVxuXG4gICAgICAvL3JlbW92ZSBhbGwgc3R5bGUgYW5kIGxpbmsgdW4tbmVlZGVkIGZyb20gdGhlIGhlYWRcbiAgICAgIGFydGljbGUuZmluZCgnaGVhZCcpLmNoaWxkcmVuKCdzdHlsZVt0eXBlPVwidGV4dC9jc3NcIl0nKS5yZW1vdmUoKVxuICAgICAgYXJ0aWNsZS5maW5kKCdoZWFkJykuY2hpbGRyZW4oJ2xpbmtbaWRdJykucmVtb3ZlKClcblxuICAgICAgLy8gSWYgdGhlIHBsdWdpbiByYWplX2Fubm90YXRpb25zIGlzIGFkZGVkIHRvIHRpbnltY2UgXG4gICAgICBpZiAodHlwZW9mIHRpbnltY2UuYWN0aXZlRWRpdG9yLnBsdWdpbnMucmFqZV9hbm5vdGF0aW9ucyAhPSB1bmRlZmluZWQpXG4gICAgICAgIGFydGljbGUgPSB1cGRhdGVBbm5vdGF0aW9uc09uU2F2ZShhcnRpY2xlKVxuXG4gICAgICAvLyBFeGVjdXRlIGRlcmFzaCAocmVwbGFjZSBhbGwgY2dlbiBlbGVtZW50cyB3aXRoIGl0cyBvcmlnaW5hbCBjb250ZW50KVxuICAgICAgYXJ0aWNsZS5maW5kKCcqW2RhdGEtcmFzaC1vcmlnaW5hbC1jb250ZW50XScpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICBsZXQgb3JpZ2luYWxDb250ZW50ID0gJCh0aGlzKS5hdHRyKCdkYXRhLXJhc2gtb3JpZ2luYWwtY29udGVudCcpXG4gICAgICAgICQodGhpcykucmVwbGFjZVdpdGgob3JpZ2luYWxDb250ZW50KVxuICAgICAgfSlcblxuICAgICAgYXJ0aWNsZS5maW5kKCcqW2RhdGEtcmFzaC1vcmlnaW5hbC1wYXJlbnQtY29udGVudF0nKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbGV0IG9yaWdpbmFsQ29udGVudCA9ICQodGhpcykuYXR0cignZGF0YS1yYXNoLW9yaWdpbmFsLXBhcmVudC1jb250ZW50JylcbiAgICAgICAgJCh0aGlzKS5wYXJlbnQoKS5yZXBsYWNlV2l0aChvcmlnaW5hbENvbnRlbnQpXG4gICAgICB9KVxuXG4gICAgICAvLyBFeGVjdXRlIGRlcmFzaCBjaGFuZ2luZyB0aGUgd3JhcHBlclxuICAgICAgYXJ0aWNsZS5maW5kKCcqW2RhdGEtcmFzaC1vcmlnaW5hbC13cmFwcGVyXScpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICBsZXQgY29udGVudCA9ICQodGhpcykuaHRtbCgpXG4gICAgICAgIGxldCB3cmFwcGVyID0gJCh0aGlzKS5hdHRyKCdkYXRhLXJhc2gtb3JpZ2luYWwtd3JhcHBlcicpXG4gICAgICAgICQodGhpcykucmVwbGFjZVdpdGgoYDwke3dyYXBwZXJ9PiR7Y29udGVudH08LyR7d3JhcHBlcn0+YClcbiAgICAgIH0pXG5cbiAgICAgIC8vIFJlbW92ZSB0YXJnZXQgZnJvbSBUaW55TUNFIGxpbmtcbiAgICAgIGFydGljbGUuZmluZCgnYVt0YXJnZXRdJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICQodGhpcykucmVtb3ZlQXR0cigndGFyZ2V0JylcbiAgICAgIH0pXG5cbiAgICAgIC8vIFJlbW92ZSBjb250ZW50ZWRpdGFibGUgZnJvbSBUaW55TUNFIGxpbmtcbiAgICAgIGFydGljbGUuZmluZCgnYVtjb250ZW50ZWRpdGFibGVdJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICQodGhpcykucmVtb3ZlQXR0cignY29udGVudGVkaXRhYmxlJylcbiAgICAgIH0pXG5cbiAgICAgIC8vIFJlbW92ZSBub3QgYWxsb3dlZCBzcGFuIGVsbWVudHMgaW5zaWRlIHRoZSBmb3JtdWxhLCBpbmxpbmVfZm9ybXVsYVxuICAgICAgYXJ0aWNsZS5maW5kKGAke0ZJR1VSRV9GT1JNVUxBX1NFTEVDVE9SfSwke0lOTElORV9GT1JNVUxBX1NFTEVDVE9SfWApLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICAkKHRoaXMpLmNoaWxkcmVuKCdwJykuaHRtbCgkKHRoaXMpLmZpbmQoJ3NwYW5bY29udGVudGVkaXRhYmxlXScpLmh0bWwoKSlcbiAgICAgIH0pXG5cbiAgICAgIGFydGljbGUuZmluZChgJHtGSUdVUkVfRk9STVVMQV9TRUxFQ1RPUn0sJHtJTkxJTkVfRk9STVVMQV9TRUxFQ1RPUn1gKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbGV0IHN2ZyA9ICQodGhpcykuZmluZCgnc3ZnW2RhdGEtbWF0aG1sXScpXG4gICAgICAgIGlmIChzdmcubGVuZ3RoKSB7XG5cbiAgICAgICAgICAkKHRoaXMpLmF0dHIoREFUQV9NQVRIX09SSUdJTkFMX0lOUFVULCBzdmcuYXR0cihEQVRBX01BVEhfT1JJR0lOQUxfSU5QVVQpKVxuICAgICAgICAgICQodGhpcykuY2hpbGRyZW4oJ3AnKS5odG1sKHN2Zy5hdHRyKCdkYXRhLW1hdGhtbCcpKVxuICAgICAgICB9XG4gICAgICB9KVxuXG4gICAgICAvLyBSZXBsYWNlIHRib2R5IHdpdGggaXRzIGNvbnRlbnQgI1xuICAgICAgYXJ0aWNsZS5maW5kKCd0Ym9keScpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICAkKHRoaXMpLnJlcGxhY2VXaXRoKCQodGhpcykuaHRtbCgpKVxuICAgICAgfSlcblxuICAgICAgcmV0dXJuIGA8IURPQ1RZUEUgaHRtbD4ke25ldyBYTUxTZXJpYWxpemVyKCkuc2VyaWFsaXplVG9TdHJpbmcoYXJ0aWNsZVswXSl9YFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm4gdGhlIHRpdGxlIFxuICAgICAqL1xuICAgIGdldFRpdGxlOiBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gJCgndGl0bGUnKS50ZXh0KClcbiAgICB9LFxuXG4gIH1cbn0pIiwiY29uc3Qgbm90X2Fubm90YWJsZV9lbGVtZW50cyA9IGAke05PTl9FRElUQUJMRV9IRUFERVJfU0VMRUNUT1J9LCR7U0lERUJBUl9BTk5PVEFUSU9OfSwke0lOTElORV9GT1JNVUxBX1NFTEVDVE9SfWBcbmNvbnN0IGFubm90YXRvclBvcHVwU2VsZWN0b3IgPSAnI2Fubm90YXRvclBvcHVwJ1xuY29uc3QgYW5ub3RhdG9yRm9ybVBvcHVwU2VsZWN0b3IgPSAnI2Fubm90YXRvckZvcm1Qb3B1cCdcbmNvbnN0IGNvbW1lbnRpbmcgPSAnY29tbWVudGluZydcblxudGlueW1jZS5QbHVnaW5NYW5hZ2VyLmFkZCgncmFqZV9hbm5vdGF0aW9ucycsIGZ1bmN0aW9uIChlZGl0b3IpIHtcblxuICBlZGl0b3Iub24oJ2NsaWNrJywgZSA9PiB7XG5cbiAgICBsZXQgY2xpY2tlZEVsZW1lbnQgPSAkKGUuc3JjRWxlbWVudClcblxuICAgIC8vIENsb3NlIGFubm90YXRvckZvcm1Qb3B1cCBpZiB0aGUgdXNlciBjbGljayBzb21ld2hlcmUgZWxzZVxuICAgIGlmICgkKGFubm90YXRvckZvcm1Qb3B1cFNlbGVjdG9yKS5pcygnOnZpc2libGUnKSAmJiAoIWNsaWNrZWRFbGVtZW50LmlzKGFubm90YXRvckZvcm1Qb3B1cFNlbGVjdG9yKSB8fCAhY2xpY2tlZEVsZW1lbnQucGFyZW50cyhhbm5vdGF0b3JGb3JtUG9wdXBTZWxlY3RvcikubGVuZ3RoKSlcbiAgICAgIGhpZGVBbm5vdGF0aW9uRm9ybVBvcHVwKClcbiAgfSlcblxuICBlZGl0b3Iub24oJ01vdXNlVXAnLCBlID0+IHtcblxuICAgIGhpZGVBbm5vdGF0aW9uUG9wdXAoKVxuXG4gICAgLy8gSWYgdGhlIHNlbGVjdGlvbiBpcyBub3QgY29sbGFwc2VkIGFuZCB0aGUgZWxlbWVudCBzZWxlY3RlZCBpcyBhbiBcImFubm90YWJsZSBlbGVtZW50XCJcbiAgICBpZiAoIXRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5pc0NvbGxhcHNlZCgpICYmICEkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpLmlzKG5vdF9hbm5vdGFibGVfZWxlbWVudHMpKVxuICAgICAgaGFuZGxlQW5ub3RhdGlvbihlKVxuICB9KVxuXG4gIGVkaXRvci5vbignaW5pdCcsICgpID0+IHtcblxuICAgIC8vIFRoaXMgaXMgbmVlZGVkIGJlY2F1c2UgdGlueW1jZSBjaGFuZ2VzIFwiYXBwbGljYXRpb25cIiBpbiBcIm1jZS1hcHBsaWNhdGlvblwiXG4gICAgZWRpdG9yLiQobWNlX3NlbWFudGljX2Fubm90YXRpb25fc2VsZWN0b3IpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgJCh0aGlzKS5hdHRyKCd0eXBlJywgJ2FwcGxpY2F0aW9uL2xkK2pzb24nKVxuICAgIH0pXG5cbiAgICBBbm5vdGF0aW9uQ29udGV4dC5yZW5kZXIoKVxuXG4gICAgZWRpdG9yLiQodG9nZ2xlX2Fubm90YXRpb25fc2VsZWN0b3IpLm9uKCdjbGljaycsIGZ1bmN0aW9uICgpIHtcbiAgICAgIEFubm90YXRpb25Db250ZXh0LnRvZ2dsZUFubm90YXRpb24oKVxuICAgIH0pXG5cbiAgICBlZGl0b3IuJCh0b2dnbGVfc2lkZWJhcl9zZWxlY3Rvcikub24oJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xuICAgICAgQW5ub3RhdGlvbkNvbnRleHQudG9nZ2xlQW5ub3RhdGlvblRvb2xiYXIoKVxuICAgIH0pXG4gIH0pXG5cbiAgZWRpdG9yLm9uKCdrZXlEb3duJywgZnVuY3Rpb24gKGUpIHtcblxuICAgIGxldCBmb2N1c0VsZW1lbnQgPSBlZGl0b3IuJChlZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcblxuICAgIC8qKlxuICAgICAqIEZpcmVzIGlmIEJBQ0tTUEFDRSBvciBDQU5DIGFyZSBwcmVzc2VkXG4gICAgICovXG4gICAgaWYgKGUua2V5Q29kZSA9PSA4IHx8IGUua2V5Q29kZSA9PSA0Nikge1xuXG4gICAgICBoaWRlQW5ub3RhdGlvblBvcHVwKClcblxuICAgICAgaWYgKGVkaXRvci5zZWxlY3Rpb24uZ2V0Q29udGVudCgpLmluZGV4T2YoJ2RhdGEtcmFzaC1hbm5vdGF0aW9uLXR5cGUnKSAhPSAtMSkge1xuXG4gICAgICAgIC8vVE9ETyB1c2UgYSBmdW5jdGlvblxuICAgICAgICBlZGl0b3IuZXhlY0NvbW1hbmQoREVMRVRFX0NNRClcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG5cbiAgICAgICAgQU5OT1RBVElPTlMuZm9yRWFjaChhbm5vdGF0aW9uID0+IHtcblxuICAgICAgICAgIC8vIFJlbW92ZSB0aGUgc2NyaXB0IG9mIHRoZSBhbm5vdGF0aW9uXG4gICAgICAgICAgaWYgKGVkaXRvci4kKGFubm90YXRpb24ubm90ZV9zZWxlY3RvcikubGVuZ3RoID09IDApXG4gICAgICAgICAgICBlZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICBlZGl0b3IuJChgJHtzZW1hbnRpY19hbm5vdGF0aW9uX3NlbGVjdG9yfVtpZD0ke2Fubm90YXRpb24uaWR9XWApLnJlbW92ZSgpXG4gICAgICAgICAgICAgIGFubm90YXRpb24ucmVtb3ZlKClcbiAgICAgICAgICAgICAgQU5OT1RBVElPTlMuZGVsZXRlKGFubm90YXRpb24uaWQpXG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChmb2N1c0VsZW1lbnQuaXMoYW5ub3RhdGlvbl93cmFwcGVyX3NlbGVjdG9yKSkge1xuXG4gICAgICAvKipcbiAgICAgICAqIEZpcmVzIGlmIEJBQ0tTUEFDRSBvciBDQU5DIGFyZSBwcmVzc2VkXG4gICAgICAgKi9cbiAgICAgIGlmIChlLmtleUNvZGUgPT0gMTMpIHtcblxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgaW5saW5lLmV4aXQoKVxuICAgICAgfVxuXG4gICAgICAvL1RPRE8gY2hlY2sgd2hlbiB0aGUgZW50aXJlIHNlbGVjdGlvbiBpcyByZW1vdmVkXG4gICAgICAvKipcbiAgICAgICAqIEZpcmVzIGlmIEJBQ0tTUEFDRSBvciBDQU5DIGFyZSBwcmVzc2VkXG4gICAgICAgKi9cbiAgICAgIGlmIChlLmtleUNvZGUgPT0gOCB8fCBlLmtleUNvZGUgPT0gNDYpIHtcblxuICAgICAgICAvL1RPRE8gdXNlIGEgZnVuY3Rpb25cbiAgICAgICAgZWRpdG9yLmV4ZWNDb21tYW5kKERFTEVURV9DTUQpXG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKVxuXG4gICAgICAgIEFOTk9UQVRJT05TLmZvckVhY2goYW5ub3RhdGlvbiA9PiB7XG5cbiAgICAgICAgICAvLyBSZW1vdmUgdGhlIHNjcmlwdCBvZiB0aGUgYW5ub3RhdGlvblxuICAgICAgICAgIGlmIChlZGl0b3IuJChhbm5vdGF0aW9uLm5vdGVfc2VsZWN0b3IpLmxlbmd0aCA9PSAwKVxuICAgICAgICAgICAgZWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgZWRpdG9yLiQoYCR7c2VtYW50aWNfYW5ub3RhdGlvbl9zZWxlY3Rvcn1baWQ9JHthbm5vdGF0aW9uLmlkfV1gKS5yZW1vdmUoKVxuICAgICAgICAgICAgICBhbm5vdGF0aW9uLnJlbW92ZSgpXG4gICAgICAgICAgICAgIEFOTk9UQVRJT05TLmRlbGV0ZShhbm5vdGF0aW9uLmlkKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9XG4gIH0pXG5cbiAgZWRpdG9yLm9uKCdrZXlQcmVzcycsIGZ1bmN0aW9uICgpIHtcblxuICAgIGhpZGVBbm5vdGF0aW9uUG9wdXAoKVxuICB9KVxuXG4gIGVkaXRvci5vbignRXhlY0NvbW1hbmQnLCBmdW5jdGlvbiAoZSkge1xuXG4gICAgZWRpdG9yLiQodG9nZ2xlX2Fubm90YXRpb25fc2VsZWN0b3IpLm9uKCdjbGljaycsIGZ1bmN0aW9uICgpIHtcbiAgICAgIEFubm90YXRpb25Db250ZXh0LnRvZ2dsZUFubm90YXRpb24oKVxuICAgIH0pXG5cbiAgICBlZGl0b3IuJCh0b2dnbGVfc2lkZWJhcl9zZWxlY3Rvcikub24oJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xuICAgICAgQW5ub3RhdGlvbkNvbnRleHQudG9nZ2xlQW5ub3RhdGlvblRvb2xiYXIoKVxuICAgIH0pXG5cbiAgICBBTk5PVEFUSU9OUy5mb3JFYWNoKGFubm90YXRpb24gPT4gYW5ub3RhdGlvbi5zZXRFdmVudHMoKSlcblxuICAgIC8vaWYgKGUuY29tbWFuZCA9PSBVTkRPX0NNRCB8fCBlLmNvbW1hbmQgPT0gUkVET19DTUQpIHsgfVxuICB9KVxufSlcblxuLyoqXG4gKiBcbiAqL1xuaGFuZGxlQW5ub3RhdGlvbiA9IGUgPT4ge1xuXG4gIGlmICh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Q29udGVudCgpLmluZGV4T2YoJ2ltZycpID4gMClcbiAgICBnbG9iYWwuc2VsZWN0aW9uRXJyb3IgPSBBTk5PVEFUSU9OX0VSUk9SX0lNQUdFX1NFTEVDVEVEXG5cbiAgLy8gU2hvdyB0aGUgcG9wdXBcbiAgc2hvd0Fubm90YXRpb25Qb3B1cChlLmNsaWVudFgsIGUuY2xpZW50WSlcbn1cblxuLyoqXG4gKiBcbiAqL1xuY3JlYXRlQW5ub3RhdGlvbkNvbW1lbnRpbmcgPSB0ZXh0ID0+IHtcblxuICBjb25zdCBjcmVhdG9yID0gaXBjUmVuZGVyZXIuc2VuZFN5bmMoJ2dldFNldHRpbmdzJykudXNlcm5hbWVcblxuICBjb25zdCBzZWxlY3Rpb24gPSB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb25cblxuICBjb25zdCByYW5nZSA9IHNlbGVjdGlvbi5nZXRSbmcoKVxuXG4gIGNvbnN0IHJhbmdlU3RhcnRPZmZzZXQgPSByYW5nZS5zdGFydE9mZnNldFxuICBjb25zdCByYW5nZUVuZE9mZnNldCA9IHJhbmdlLmVuZE9mZnNldFxuXG4gIGNvbnN0IG5leHRJZCA9IEFubm90YXRpb25Db250ZXh0LmdldE5leHRBbm5vdGF0aW9uSWQoKVxuXG4gIGNvbnN0IHN0YXJ0Q3NzU2VsZWN0b3IgPSBBbm5vdGF0aW9uQ29udGV4dC5nZXRDc3NTZWxlY3RvcigkKHNlbGVjdGlvbi5nZXRTdGFydCgpKSlcbiAgY29uc3Qgc3RhcnRPZmZzZXQgPSBBbm5vdGF0aW9uQ29udGV4dC5nZXRPZmZzZXQocmFuZ2Uuc3RhcnRDb250YWluZXIsIHJhbmdlU3RhcnRPZmZzZXQsIHN0YXJ0Q3NzU2VsZWN0b3IpXG5cbiAgY29uc3QgZW5kQ3NzU2VsZWN0b3IgPSBBbm5vdGF0aW9uQ29udGV4dC5nZXRDc3NTZWxlY3RvcigkKHNlbGVjdGlvbi5nZXRFbmQoKSkpXG4gIGNvbnN0IGVuZE9mZnNldCA9IEFubm90YXRpb25Db250ZXh0LmdldE9mZnNldChyYW5nZS5lbmRDb250YWluZXIsIHJhbmdlRW5kT2Zmc2V0LCBlbmRDc3NTZWxlY3RvcilcblxuICBjb25zdCBkYXRhID0ge1xuICAgIFwiaWRcIjogbmV4dElkLFxuICAgIFwiQGNvbnRlbnh0XCI6IFwiaHR0cDovL3d3dy53My5vcmcvbnMvYW5uby5qc29ubGRcIixcbiAgICBcImNyZWF0ZWRcIjogRGF0ZS5ub3coKSArICgtKG5ldyBEYXRlKCkuZ2V0VGltZXpvbmVPZmZzZXQoKSAqIDYwMDAwKSksXG4gICAgXCJib2R5VmFsdWVcIjogdGV4dCxcbiAgICBcImNyZWF0b3JcIjogY3JlYXRvcixcbiAgICBcIk1vdGl2YXRpb25cIjogY29tbWVudGluZyxcbiAgICBcInRhcmdldFwiOiB7XG4gICAgICBcInNlbGVjdG9yXCI6IHtcbiAgICAgICAgXCJzdGFydFNlbGVjdG9yXCI6IHtcbiAgICAgICAgICBcIkB0eXBlXCI6IFwiQ3NzU2VsZWN0b3JcIixcbiAgICAgICAgICBcIkB2YWx1ZVwiOiBzdGFydENzc1NlbGVjdG9yXG4gICAgICAgIH0sXG4gICAgICAgIFwiZW5kU2VsZWN0b3JcIjoge1xuICAgICAgICAgIFwiQHR5cGVcIjogXCJDc3NTZWxlY3RvclwiLFxuICAgICAgICAgIFwiQHZhbHVlXCI6IGVuZENzc1NlbGVjdG9yXG4gICAgICAgIH0sXG4gICAgICAgIFwic3RhcnRcIjoge1xuICAgICAgICAgIFwiQHR5cGVcIjogXCJEYXRhUG9zaXRpb25TZWxlY3RvclwiLFxuICAgICAgICAgIFwiQHZhbHVlXCI6IHN0YXJ0T2Zmc2V0XG4gICAgICAgIH0sXG4gICAgICAgIFwiZW5kXCI6IHtcbiAgICAgICAgICBcIkB0eXBlXCI6IFwiRGF0YVBvc2l0aW9uU2VsZWN0b3JcIixcbiAgICAgICAgICBcIkB2YWx1ZVwiOiBlbmRPZmZzZXRcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLiQoJ2JvZHknKS5hcHBlbmQoYDxzY3JpcHQgaWQ9XCIke25leHRJZH1cIiB0eXBlPVwiYXBwbGljYXRpb24vbGQranNvblwiPiR7SlNPTi5zdHJpbmdpZnkoZGF0YSwgbnVsbCwgMikgfTwvc2NyaXB0PmApXG4gICAgQW5ub3RhdGlvbkNvbnRleHQuY2xlYXJBbm5vdGF0aW9ucygpXG4gICAgQW5ub3RhdGlvbkNvbnRleHQucmVuZGVyKClcbiAgfSlcbn1cblxuLyoqXG4gKiBcbiAqL1xuY3JlYXRlQW5ub3RhdGlvblJlcGx5aW5nID0gKHRleHQsIHRhcmdldElkKSA9PiB7XG5cbiAgY29uc3QgY3JlYXRvciA9IGlwY1JlbmRlcmVyLnNlbmRTeW5jKCdnZXRTZXR0aW5ncycpLnVzZXJuYW1lXG4gIGNvbnN0IG5leHRJZCA9IEFubm90YXRpb25Db250ZXh0LmdldE5leHRBbm5vdGF0aW9uSWQoKVxuXG4gIGNvbnN0IGRhdGEgPSB7XG4gICAgXCJpZFwiOiBuZXh0SWQsXG4gICAgXCJAY29udGVueHRcIjogXCJodHRwOi8vd3d3LnczLm9yZy9ucy9hbm5vLmpzb25sZFwiLFxuICAgIFwiY3JlYXRlZFwiOiBEYXRlLm5vdygpICsgKC0obmV3IERhdGUoKS5nZXRUaW1lem9uZU9mZnNldCgpICogNjAwMDApKSxcbiAgICBcImJvZHlWYWx1ZVwiOiB0ZXh0LFxuICAgIFwiY3JlYXRvclwiOiBjcmVhdG9yLFxuICAgIFwiTW90aXZhdGlvblwiOiByZXBseWluZyxcbiAgICBcInRhcmdldFwiOiB0YXJnZXRJZFxuICB9XG5cbiAgLy8gQWRkIHRoZSBuZXcgYW5ub3RhdGlvbiB3aXRob3V0IGNsZWFyaW5nIGV2ZXJ5dGhpbmdcbiAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgdGlueW1jZS5hY3RpdmVFZGl0b3IuJCgnYm9keScpLmFwcGVuZChgPHNjcmlwdCBpZD1cIiR7bmV4dElkfVwiIHR5cGU9XCJhcHBsaWNhdGlvbi9sZCtqc29uXCI+JHtKU09OLnN0cmluZ2lmeShkYXRhLCBudWxsLCAyKSB9PC9zY3JpcHQ+YClcbiAgICBBbm5vdGF0aW9uQ29udGV4dC5yZW5kZXJTaW5nbGUobmV4dElkLCBkYXRhKVxuICB9KVxufVxuXG4vKipcbiAqIFxuICovXG5zaG93QW5ub3RhdGlvblBvcHVwID0gKHgsIHkpID0+IHtcblxuICBsZXQgYW5ub3RhdG9yUG9wdXAgPSAkKGBcbiAgICA8ZGl2IGlkPSdhbm5vdGF0b3JQb3B1cCc+XG4gICAgICA8ZGl2IGNsYXNzPVwiYW5ub3RhdG9yUG9wdXBfYXJyb3dcIj48L2Rpdj5cbiAgICAgIDxzcGFuIGNsYXNzPVwiZ2x5cGhpY29uIGdseXBoaWNvbi1wZW5jaWxcIiBhcmlhLWhpZGRlbj1cInRydWVcIj48L3NwYW4+XG4gICAgPC9kaXY+YClcblxuICBhbm5vdGF0b3JQb3B1cC5jc3Moe1xuICAgIHRvcDogeSAtIDIwLFxuICAgIGxlZnQ6IHggLSAxOC41XG4gIH0pXG5cbiAgYW5ub3RhdG9yUG9wdXAub24oJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xuICAgIHNob3dBbm5vdGF0aW9uRm9ybVBvcHVwKClcbiAgfSlcblxuICBhbm5vdGF0b3JQb3B1cC5hcHBlbmRUbygnYm9keScpXG59XG5cbi8qKlxuICogXG4gKi9cbnNob3dBbm5vdGF0aW9uRm9ybVBvcHVwID0gKCkgPT4ge1xuXG4gIGlmIChnbG9iYWwuc2VsZWN0aW9uRXJyb3IpIHtcbiAgICBnbG9iYWwuc2VsZWN0aW9uRXJyb3IgPSBudWxsXG4gICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmNvbGxhcHNlKClcbiAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5mb2N1cygpXG4gICAgaGlkZUFubm90YXRpb25Qb3B1cCgpXG4gICAgcmV0dXJuIG5vdGlmeShBTk5PVEFUSU9OX0VSUk9SX0lNQUdFX1NFTEVDVEVELCAnZXJyb3InKVxuICB9XG5cblxuICBsZXQgYW5ub3RhdG9yRm9ybVBvcHVwID0gJChgXG4gICAgPGRpdiBpZD1cImFubm90YXRvckZvcm1Qb3B1cFwiPlxuICAgICAgPHRleHRhcmVhIGNsYXNzPVwiZm9ybS1jb250cm9sXCIgcm93cz1cIjNcIj48L3RleHRhcmVhPlxuICAgICAgPGRpdiBjbGFzcz1cImFubm90YXRvckZvcm1Qb3B1cF9mb290ZXJcIj5cbiAgICAgICAgPGEgaWQ9XCJhbm5vdGF0b3JGb3JtUG9wdXBfc2F2ZVwiIGNsYXNzPVwiYnRuIGJ0bi1zdWNjZXNzIGJ0bi14c1wiPkFubm90YXRlPC9hPlxuICAgICAgPC9kaXY+XG4gICAgPC9kaXY+XG4gIGApXG5cbiAgYW5ub3RhdG9yRm9ybVBvcHVwLmFwcGVuZFRvKCdib2R5JylcblxuICBhbm5vdGF0b3JGb3JtUG9wdXAuY3NzKHtcbiAgICB0b3A6ICQoYW5ub3RhdG9yUG9wdXBTZWxlY3Rvcikub2Zmc2V0KCkudG9wIC0gYW5ub3RhdG9yRm9ybVBvcHVwLmhlaWdodCgpIC8gMiAtIDIwLFxuICAgIGxlZnQ6ICQoYW5ub3RhdG9yUG9wdXBTZWxlY3Rvcikub2Zmc2V0KCkubGVmdFxuICB9KVxuXG4gICQoYCR7YW5ub3RhdG9yRm9ybVBvcHVwU2VsZWN0b3J9IGEuYnRuLXN1Y2Nlc3NgKS5vbignY2xpY2snLCBmdW5jdGlvbiAoKSB7XG5cbiAgICBjcmVhdGVBbm5vdGF0aW9uQ29tbWVudGluZygkKGAke2Fubm90YXRvckZvcm1Qb3B1cFNlbGVjdG9yfT50ZXh0YXJlYWApLnZhbCgpLCBjb21tZW50aW5nKVxuICAgIGhpZGVBbm5vdGF0aW9uRm9ybVBvcHVwKClcbiAgfSlcblxuICAvLyBIaWRlIHRoZSBsYXN0IGFubm90YXRpb24gcG9wdXBcbiAgaGlkZUFubm90YXRpb25Qb3B1cCgpXG5cbiAgJChgJHthbm5vdGF0b3JGb3JtUG9wdXBTZWxlY3Rvcn0+dGV4dGFyZWFgKS5mb2N1cygpXG5cbn1cblxuLyoqXG4gKiBcbiAqL1xuaGlkZUFubm90YXRpb25Gb3JtUG9wdXAgPSAoKSA9PiB7XG4gICQoYW5ub3RhdG9yRm9ybVBvcHVwU2VsZWN0b3IpLnJlbW92ZSgpXG59XG5cbi8qKlxuICogXG4gKi9cbmhpZGVBbm5vdGF0aW9uUG9wdXAgPSAoKSA9PiB7XG4gICQoYW5ub3RhdG9yUG9wdXBTZWxlY3RvcikucmVtb3ZlKClcbn1cblxuLyoqXG4gKiBcbiAqL1xudXBkYXRlQW5ub3RhdGlvbnNPblNhdmUgPSBhcnRpY2xlID0+IHtcblxuICAvKipcbiAgICogXG4gICAqIEBwYXJhbSB7SlF1ZXJ5IG9iamVjdH0gbm9kZSBcbiAgICogQHBhcmFtIHtJbnRlZ2VyfSBvZmZzZXQgb3B0aW9uYWwsIGl0J3MgbmVlZGVkIGZvciB0aGUgZW5kaW5nIG9mZnNldFxuICAgKi9cbiAgY29uc3QgZ2V0T2Zmc2V0ID0gKG5vZGUsIG9mZnNldCA9IDApID0+IHtcblxuICAgIG5vZGUgPSBub2RlWzBdLnByZXZpb3VzU2libGluZ1xuXG4gICAgd2hpbGUgKG5vZGUgIT0gbnVsbCkge1xuXG4gICAgICBpZiAobm9kZS5ub2RlVHlwZSA9PSAzKVxuICAgICAgICBvZmZzZXQgKz0gbm9kZS5sZW5ndGhcbiAgICAgIGVsc2VcbiAgICAgICAgb2Zmc2V0ICs9IG5vZGUuaW5uZXJUZXh0Lmxlbmd0aFxuXG4gICAgICBub2RlID0gbm9kZS5wcmV2aW91c1NpYmxpbmdcbiAgICB9XG5cbiAgICByZXR1cm4gb2Zmc2V0XG4gIH1cblxuICAvLyBHZXQgYWxsIGFubm90YXRpb24gc2NyaXB0c1xuICBhcnRpY2xlLmZpbmQoJ3NjcmlwdFt0eXBlPVwiYXBwbGljYXRpb24vbGQranNvblwiXScpLmVhY2goZnVuY3Rpb24gKCkge1xuXG4gICAgLy9UT0RPIHVwZGF0ZSBhbHNvIHRoZSBNYXAoKVxuICAgIGxldCBqc29uID0gSlNPTi5wYXJzZSgkKHRoaXMpLmh0bWwoKSlcblxuICAgIGlmIChqc29uLk1vdGl2YXRpb24gPT0gY29tbWVudGluZykge1xuXG4gICAgICAvLyBHZXQgYW5ub3RhdGlvblxuICAgICAgbGV0IGFubm90YXRpb24gPSBBTk5PVEFUSU9OUy5nZXQoanNvbi5pZClcblxuICAgICAgLy8gR2V0IHRoZSBsaXN0IG9mIGhpZ2hsaWdodGVkIGFubm90YXRpb25zXG4gICAgICBjb25zdCBmaXJzdCA9IHRpbnltY2UuYWN0aXZlRWRpdG9yLiQoYW5ub3RhdGlvbi5ub3RlX3NlbGVjdG9yKS5maXJzdCgpXG4gICAgICBjb25zdCBsYXN0ID0gdGlueW1jZS5hY3RpdmVFZGl0b3IuJChhbm5vdGF0aW9uLm5vdGVfc2VsZWN0b3IpLmxhc3QoKVxuXG4gICAgICAvLyBVcGRhdGUgYm90aCBzdGFydCBhbmQgZW5kIG9mZnNldHMsIHRoZSBlbmRpbmcgb2Zmc2V0IGhhcyBhbHNvIHRoZSBjdXJybnQgbGVuZ3RoXG4gICAgICBqc29uLnRhcmdldC5zZWxlY3Rvci5zdGFydFsnQHZhbHVlJ10gPSBnZXRPZmZzZXQoZmlyc3QpXG4gICAgICBqc29uLnRhcmdldC5zZWxlY3Rvci5lbmRbJ0B2YWx1ZSddID0gZ2V0T2Zmc2V0KGxhc3QsIGxhc3QudGV4dCgpLmxlbmd0aClcblxuICAgICAgLy8gVXBkYXRlIGJvdGggc3RhcnQgYW5kIGVuZCBzZWxlY3RvcnMgd2l0aCB0aGUgcmlnaHQgeHBhdGhcbiAgICAgIGpzb24udGFyZ2V0LnNlbGVjdG9yLnN0YXJ0U2VsZWN0b3JbJ0B2YWx1ZSddID0gQW5ub3RhdGlvbkNvbnRleHQuZ2V0Q3NzU2VsZWN0b3IoZmlyc3QpXG4gICAgICBqc29uLnRhcmdldC5zZWxlY3Rvci5lbmRTZWxlY3RvclsnQHZhbHVlJ10gPSBBbm5vdGF0aW9uQ29udGV4dC5nZXRDc3NTZWxlY3RvcihsYXN0KVxuXG4gICAgICAkKHRoaXMpLmh0bWwoSlNPTi5zdHJpbmdpZnkoanNvbiwgbnVsbCwgMikpXG4gICAgfVxuICB9KVxuXG4gIC8vIENoYW5nZSBkYXRhLXJhc2gtb3JpZ2luYWxbLXBhcmVudF0tY29udGVudFxuICBjb25zdCBjb250ZW50ID0gJ2RhdGEtcmFzaC1vcmlnaW5hbC1jb250ZW50J1xuICBjb25zdCBwYXJlbnQgPSAnZGF0YS1yYXNoLW9yaWdpbmFsLXBhcmVudC1jb250ZW50J1xuICBsZXQgYXR0cmlidXRlXG5cbiAgYXJ0aWNsZS5maW5kKGFubm90YXRpb25fd3JhcHBlcl9zZWxlY3RvcikuZWFjaChmdW5jdGlvbiAoKSB7XG5cbiAgICBpZiAoJCh0aGlzKS5hdHRyKGNvbnRlbnQpKVxuICAgICAgYXR0cmlidXRlID0gY29udGVudFxuXG4gICAgaWYgKCQodGhpcykuYXR0cihwYXJlbnQpKVxuICAgICAgYXR0cmlidXRlID0gcGFyZW50XG5cbiAgICAkKHRoaXMpLmF0dHIoYXR0cmlidXRlLCAkKHRoaXMpLmh0bWwoKSlcbiAgfSlcblxuICByZXR1cm4gYXJ0aWNsZVxufSJdfQ==

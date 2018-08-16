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
          updateIframeFromSavedContent()
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
    let selection = tinymce.activeEditor.selection

    let startNode = $(selection.getRng().startContainer)
    let endNode = $(selection.getRng().endContainer)

    if ((section.cursorInSection(selection) || section.cursorInSpecialSection(selection))) {

      // Block special chars in special elements
      if (checkIfSpecialChar(e.keyCode) &&
        (startNode.parents(SPECIAL_SECTION_SELECTOR).length || endNode.parents(SPECIAL_SECTION_SELECTOR).length) &&
        (startNode.parents('h1').length > 0 || endNode.parents('h1').length > 0)) {

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

              tinymce.activeEditor.execCommand('delete')
              section.updateBibliographySection()
              updateReferences()

              // update iframe
              updateIframeFromSavedContent()
            })

            return false
          }

          // If the selection contains the entire bibliography section
          if (selectionContent.containsBibliography(selection)) {

            e.stopImmediatePropagation()

            tinymce.activeEditor.undoManager.transact(function () {

              // Execute normal delete
              $(BIBLIOGRAPHY_SELECTOR).remove()
              updateReferences()

              // Update iframe and restore selection
              updateIframeFromSavedContent()
            })

            return false
          }

          // Restructure the entire body if the section isn't collapsed and not inside a special section
          if (!section.cursorInSpecialSection(selection)) {
            e.stopImmediatePropagation()
            section.manageDelete()
          }
        }

        // If the section is collapsed
        if (tinymce.activeEditor.selection.isCollapsed()) {

          // If the selection is inside a special section
          if (section.cursorInSpecialSection(selection)) {

            // Remove special section if the cursor is at the beginning
            if ((startNode.parents('h1').length || startNode.is('h1')) && tinymce.activeEditor.selection.getRng().startOffset == 0) {

              e.stopImmediatePropagation()
              section.deleteSpecialSection(selectedElement)
              return false
            }

            // if the cursor is at the beginning of a empty p inside its biblioentry, remove it and update the references
            if (selectionContent.isAtBeginningOfEmptyBiblioentry(selection)) {

              e.stopImmediatePropagation()

              tinymce.activeEditor.undoManager.transact(function () {

                // Execute normal delete
                tinymce.activeEditor.execCommand('delete')
                tinymce.triggerSave()
                updateReferences()

                // Update iframe and restore selection
                updateIframeFromSavedContent()
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

                else {
                  tinymce.activeEditor.execCommand('delete')
                  tinymce.triggerSave()
                }

                updateReferences()

                // Update iframe and restore selection
                updateIframeFromSavedContent()
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
          if (selectedElement.attr('data-mce-caret') == 'before'){
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
  },

  /**
   * 
   */
  deleteSpecialSection: function (selectedElement) {

    tinymce.activeEditor.undoManager.transact(function () {

      // Remove the section and update 
      selectedElement.parent(SPECIAL_SECTION_SELECTOR).remove()
      tinymce.triggerSave()

      // Update references
      updateReferences()
      updateIframeFromSavedContent()
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

      $('section').each(function () {

        let level = ''

        if (!$(this).is(ENDNOTE_SELECTOR)) {

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
        }
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

      $(FIGURE_IMAGE_SELECTOR).each(function () {
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

  if ($('span.cgen[data-rash-original-content],sup.cgen.fn').length) {

    // Restore all saved content
    $('span.cgen[data-rash-original-content],sup.cgen.fn').each(function () {

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

/**
 * 
 * @param {*} formulaValue 
 * @param {*} callback 
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

        // Update all cross-ref
        updateReferences()

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

        // Update all cross-ref
        updateReferences()

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
        updateIframeFromSavedContent()

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
        updateIframeFromSavedContent()
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

        // Save updates 
        tinymce.triggerSave()

        // Update all captions with RASH function
        captions()

        // Move the caret
        selectRange(newListing.find('code')[0], 0)

        // Update all cross-ref
        updateReferences()

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

    if (cur_caption.find('span.cgen').length) {
      cur_caption.find('span.cgen').remove();
      cur_caption.find('span[contenteditable]').append("<span class=\"cgen\" data-rash-original-content=\"\" > (" + cur_number + ")</span>")
    } else
      cur_caption.html(cur_caption.html() + "<span class=\"cgen\" data-rash-original-content=\"\" > (" +
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
const creator = 'spino9330'
const annotationWrapper = 'span[data-rash-annotation-type]'

tinymce.PluginManager.add('raje_annotations', function (editor, url) {

  editor.on('click', e => {

    let clickedElement = $(e.srcElement)

    if (clickedElement.parents(SIDEBAR_ANNOTATION).length) {

      if (clickedElement.is('span#toggleAnnotations') || clickedElement.parent().is('span#toggleAnnotations'))
        rash.toggleAnnotations()

      if (clickedElement.is('span#toggleSidebar') || clickedElement.parent().is('span#toggleSidebar'))
        rash.toggleSidebar()

      if (clickedElement.is('span[data-rash-annotation-id]'))
        rash.showAnnotation(clickedElement.attr('title').split(','))

      updateIframeFromSavedContent()
    }

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
createAnnotation = (text, creator) => {

  const selection = tinymce.activeEditor.selection
  const range = selection.getRng()
  const lastAnnotation = Annotation.getLastAnnotation()

  const startXPath = Annotation.getXPath($(selection.getStart()))
  const startOffset = Annotation.getOffset(range.startContainer, range.startOffset, startXPath)

  const endXPath = Annotation.getXPath($(selection.getEnd()))
  const endOffset = Annotation.getOffset(range.endContainer, range.endOffset, endXPath)

  const data = {
    "id": lastAnnotation.id,
    "@contenxt": "http://www.w3.org/ns/anno.jsonld",
    "created": Date.now(),
    "bodyValue": text,
    "creator": creator,
    "Motivation": commenting,
    "target": {
      "selector": {
        "startSelector": {
          "@type": "XPathSelector",
          "@value": startXPath
        },
        "endSelector": {
          "@type": "XPathSelector",
          "@value": endXPath
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

  // The adding of the script is inside a undo level
  tinymce.activeEditor.undoManager.transact(function () {

    $('#raje_root').append(`<script id="${data.id}" type="application/ld+json">${JSON.stringify(data, null, 2) }</script>`)
    rash.clearAnnotations()
    rash.renderAnnotations()
    updateIframeFromSavedContent()
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
    createAnnotation($(`${annotatorFormPopupSelector}>textarea`).val(), creator)
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

    // Change the offsets and the selectors
    let json = JSON.parse($(this).html())

    // Get the id of the current annotation
    const id = json.id

    // Get the list of highlighted annotations
    const first = $(`span.cgen.annotation_hilight[data-rash-annotation-id="${id}"]`).first()
    const last = $(`span.cgen.annotation_hilight[data-rash-annotation-id="${id}"]`).last()

    // Update both start and end offsets, the ending offset has also the currnt length
    json.target.selector.start['@value'] = getOffset(first)
    json.target.selector.end['@value'] = getOffset(last, last.text().length)

    // Update both start and end selectors with the right xpath
    json.target.selector.startSelector['@value'] = Annotation.getXPath(first)
    json.target.selector.endSelector['@value'] = Annotation.getXPath(last)

    $(this).html(JSON.stringify(json, null, 2))
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluaXQuanMiLCIwX3JhamVfY29uc3RhbnRzLmpzIiwiMV9yYWplX3NlY3Rpb24uanMiLCIyX3JhamVfY3Jvc3NyZWYuanMiLCIzX3JhamVfZmlndXJlcy5qcyIsIjRfcmFqZV9pbmxpbmVzLmpzIiwiNV9yYWplX2xpc3RzLmpzIiwiNl9yYWplX21ldGFkYXRhLmpzIiwiN19yYWplX3NhdmUuanMiLCI4X3JhamVfYW5ub3RhdGlvbnMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2p0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcC9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM1WEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDOW9DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDck9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2hYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDeExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDckhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImNvcmUuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIFxuICogSW5pdGlsaXplIFRpbnlNQ0UgZWRpdG9yIHdpdGggYWxsIHJlcXVpcmVkIG9wdGlvbnNcbiAqL1xuXG4vLyBJbnZpc2libGUgc3BhY2UgY29uc3RhbnRzXG5jb25zdCBaRVJPX1NQQUNFID0gJyYjODIwMzsnXG5jb25zdCBSQUpFX1NFTEVDVE9SID0gJ2JvZHkjdGlueW1jZSdcblxuLy8gU2VsZWN0b3IgY29uc3RhbnRzICh0byBtb3ZlIGluc2lkZSBhIG5ldyBjb25zdCBmaWxlKVxuY29uc3QgSEVBREVSX1NFTEVDVE9SID0gJ2hlYWRlci5wYWdlLWhlYWRlci5jb250YWluZXIuY2dlbidcbmNvbnN0IEZJUlNUX0hFQURJTkcgPSBgJHtSQUpFX1NFTEVDVE9SfT5zZWN0aW9uOmZpcnN0PmgxOmZpcnN0YFxuXG5jb25zdCBEQVRBX01BVEhfT1JJR0lOQUxfSU5QVVQgPSAnZGF0YS1tYXRoLW9yaWdpbmFsLWlucHV0J1xuY29uc3QgVElOWU1DRV9UT09MQkFSX0hFSUdUSCA9IDc2XG5cbmxldCBpcGNSZW5kZXJlciwgd2ViRnJhbWVcblxuaWYgKGhhc0JhY2tlbmQpIHtcblxuICBpcGNSZW5kZXJlciA9IHJlcXVpcmUoJ2VsZWN0cm9uJykuaXBjUmVuZGVyZXJcbiAgd2ViRnJhbWUgPSByZXF1aXJlKCdlbGVjdHJvbicpLndlYkZyYW1lXG5cbiAgLyoqXG4gICAqIEluaXRpbGlzZSBUaW55TUNFIFxuICAgKi9cbiAgJChkb2N1bWVudCkucmVhZHkoZnVuY3Rpb24gKCkge1xuXG4gICAgLy8gT3ZlcnJpZGUgdGhlIG1hcmdpbiBib3R0b24gZ2l2ZW4gYnkgUkFTSCBmb3IgdGhlIGZvb3RlclxuICAgICQoJ2JvZHknKS5jc3Moe1xuICAgICAgJ21hcmdpbi1ib3R0b20nOiAwXG4gICAgfSlcblxuICAgIC8vaGlkZSBmb290ZXJcbiAgICAkKCdmb290ZXIuZm9vdGVyJykucmVtb3ZlKClcblxuICAgIC8vYXR0YWNoIHdob2xlIGJvZHkgaW5zaWRlIGEgcGxhY2Vob2xkZXIgZGl2XG4gICAgJCgnYm9keScpLmh0bWwoYDxkaXYgaWQ9XCJyYWplX3Jvb3RcIj4keyQoJ2JvZHknKS5odG1sKCl9PC9kaXY+YClcblxuICAgIC8vIFxuICAgIHNldE5vbkVkaXRhYmxlSGVhZGVyKClcblxuICAgIC8vXG4gICAgbWF0aG1sMnN2Z0FsbEZvcm11bGFzKClcblxuICAgIHRpbnltY2UuaW5pdCh7XG5cbiAgICAgIC8vIFNlbGVjdCB0aGUgZWxlbWVudCB0byB3cmFwXG4gICAgICBzZWxlY3RvcjogJyNyYWplX3Jvb3QnLFxuXG4gICAgICAvLyBTZXQgd2luZG93IHNpemVcbiAgICAgIGhlaWdodDogd2luZG93LmlubmVySGVpZ2h0IC0gVElOWU1DRV9UT09MQkFSX0hFSUdUSCxcblxuICAgICAgLy8gU2V0IHRoZSBzdHlsZXMgb2YgdGhlIGNvbnRlbnQgd3JhcHBlZCBpbnNpZGUgdGhlIGVsZW1lbnRcbiAgICAgIGNvbnRlbnRfY3NzOiBbJ2Nzcy9ib290c3RyYXAubWluLmNzcycsICdjc3MvcmFzaC5jc3MnLCAnY3NzL3JhamUtY29yZS5jc3MnXSxcblxuICAgICAgLy8gU2V0IHBsdWdpbnMgW3RhYmxlIGltYWdlIGxpbmsgY29kZXNhbXBsZV1cbiAgICAgIHBsdWdpbnM6IFwic2VhcmNocmVwbGFjZSByYWplX2lubGluZUZpZ3VyZSBmdWxsc2NyZWVuIHJhamVfZXh0ZXJuYWxMaW5rIHJhamVfaW5saW5lQ29kZSByYWplX2lubGluZVF1b3RlIHJhamVfc2VjdGlvbiAgbm9uZWRpdGFibGUgcmFqZV9pbWFnZSByYWplX3F1b3RlYmxvY2sgcmFqZV9jb2RlYmxvY2sgcmFqZV90YWJsZSByYWplX2xpc3RpbmcgcmFqZV9pbmxpbmVfZm9ybXVsYSByYWplX2Zvcm11bGEgcmFqZV9jcm9zc3JlZiByYWplX2Zvb3Rub3RlcyByYWplX21ldGFkYXRhIHJhamVfbGlzdHMgcmFqZV9zYXZlIHJhamVfYW5ub3RhdGlvbnMgc3BlbGxjaGVja2VyIHBhc3RlIHRhYmxlIGxpbmtcIixcblxuICAgICAgLy8gUmVtb3ZlIG1lbnViYXJcbiAgICAgIG1lbnViYXI6IGZhbHNlLFxuXG4gICAgICAvLyBDdXN0b20gdG9vbGJhclxuICAgICAgdG9vbGJhcjogJ3VuZG8gcmVkbyBib2xkIGl0YWxpYyBsaW5rIHN1cGVyc2NyaXB0IHN1YnNjcmlwdCByYWplX2lubGluZUNvZGUgcmFqZV9pbmxpbmVRdW90ZSByYWplX2lubGluZV9mb3JtdWxhIHJhamVfY3Jvc3NyZWYgcmFqZV9mb290bm90ZXMgfCByYWplX29sIHJhamVfdWwgcmFqZV9jb2RlYmxvY2sgcmFqZV9xdW90ZWJsb2NrIHJhamVfdGFibGUgcmFqZV9pbWFnZSByYWplX2xpc3RpbmcgcmFqZV9mb3JtdWxhIHwgc2VhcmNocmVwbGFjZSBzcGVsbGNoZWNrZXIgfCByYWplX3NlY3Rpb24gcmFqZV9tZXRhZGF0YSByYWplX3NhdmUnLFxuXG4gICAgICBzcGVsbGNoZWNrZXJfY2FsbGJhY2s6IGZ1bmN0aW9uIChtZXRob2QsIHRleHQsIHN1Y2Nlc3MsIGZhaWx1cmUpIHtcbiAgICAgICAgdGlueW1jZS51dGlsLkpTT05SZXF1ZXN0LnNlbmRSUEMoe1xuICAgICAgICAgIHVybDogXCJzcGVsbGNoZWNrZXIucGhwXCIsXG4gICAgICAgICAgbWV0aG9kOiBcInNwZWxsY2hlY2tcIixcbiAgICAgICAgICBwYXJhbXM6IHtcbiAgICAgICAgICAgIGxhbmc6IHRoaXMuZ2V0TGFuZ3VhZ2UoKSxcbiAgICAgICAgICAgIHdvcmRzOiB0ZXh0Lm1hdGNoKHRoaXMuZ2V0V29yZENoYXJQYXR0ZXJuKCkpXG4gICAgICAgICAgfSxcbiAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICBzdWNjZXNzKHJlc3VsdCk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBlcnJvcjogZnVuY3Rpb24gKGVycm9yLCB4aHIpIHtcbiAgICAgICAgICAgIGZhaWx1cmUoXCJTcGVsbGNoZWNrIGVycm9yOiBcIiArIGVycm9yKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSxcblxuICAgICAgc3BlbGxjaGVja2VyX2xhbmd1YWdlczogJycsXG5cbiAgICAgIC8vIFNldCBkZWZhdWx0IHRhcmdldFxuICAgICAgZGVmYXVsdF9saW5rX3RhcmdldDogXCJfYmxhbmtcIixcblxuICAgICAgLy8gUHJlcGVuZCBwcm90b2NvbCBpZiB0aGUgbGluayBzdGFydHMgd2l0aCB3d3dcbiAgICAgIGxpbmtfYXNzdW1lX2V4dGVybmFsX3RhcmdldHM6IHRydWUsXG5cbiAgICAgIC8vIEhpZGUgdGFyZ2V0IGxpc3RcbiAgICAgIHRhcmdldF9saXN0OiBmYWxzZSxcblxuICAgICAgLy8gSGlkZSB0aXRsZVxuICAgICAgbGlua190aXRsZTogZmFsc2UsXG5cbiAgICAgIC8vIFJlbW92ZSBcInBvd2VyZWQgYnkgdGlueW1jZVwiXG4gICAgICBicmFuZGluZzogZmFsc2UsXG5cbiAgICAgIC8vIFByZXZlbnQgYXV0byBiciBvbiBlbGVtZW50IGluc2VydFxuICAgICAgYXBwbHlfc291cmNlX2Zvcm1hdHRpbmc6IGZhbHNlLFxuXG4gICAgICAvLyBQcmV2ZW50IG5vbiBlZGl0YWJsZSBvYmplY3QgcmVzaXplXG4gICAgICBvYmplY3RfcmVzaXppbmc6IGZhbHNlLFxuXG4gICAgICAvLyBVcGRhdGUgdGhlIHRhYmxlIHBvcG92ZXIgbGF5b3V0XG4gICAgICB0YWJsZV90b29sYmFyOiBcInRhYmxlaW5zZXJ0cm93YmVmb3JlIHRhYmxlaW5zZXJ0cm93YWZ0ZXIgdGFibGVkZWxldGVyb3cgfCB0YWJsZWluc2VydGNvbGJlZm9yZSB0YWJsZWluc2VydGNvbGFmdGVyIHRhYmxlZGVsZXRlY29sXCIsXG5cbiAgICAgIGltYWdlX2FkdnRhYjogdHJ1ZSxcblxuICAgICAgcGFzdGVfYmxvY2tfZHJvcDogdHJ1ZSxcblxuICAgICAgZXh0ZW5kZWRfdmFsaWRfZWxlbWVudHM6IFwic3ZnWypdLGRlZnNbKl0scGF0dGVyblsqXSxkZXNjWypdLG1ldGFkYXRhWypdLGdbKl0sbWFza1sqXSxwYXRoWypdLGxpbmVbKl0sbWFya2VyWypdLHJlY3RbKl0sY2lyY2xlWypdLGVsbGlwc2VbKl0scG9seWdvblsqXSxwb2x5bGluZVsqXSxsaW5lYXJHcmFkaWVudFsqXSxyYWRpYWxHcmFkaWVudFsqXSxzdG9wWypdLGltYWdlWypdLHZpZXdbKl0sdGV4dFsqXSx0ZXh0UGF0aFsqXSx0aXRsZVsqXSx0c3BhblsqXSxnbHlwaFsqXSxzeW1ib2xbKl0sc3dpdGNoWypdLHVzZVsqXVwiLFxuXG4gICAgICBmb3JtdWxhOiB7XG4gICAgICAgIHBhdGg6ICdub2RlX21vZHVsZXMvdGlueW1jZS1mb3JtdWxhLydcbiAgICAgIH0sXG5cbiAgICAgIGNsZWFudXBfb25fc3RhcnR1cDogZmFsc2UsXG4gICAgICB0cmltX3NwYW5fZWxlbWVudHM6IGZhbHNlLFxuICAgICAgdmVyaWZ5X2h0bWw6IGZhbHNlLFxuICAgICAgY2xlYW51cDogZmFsc2UsXG4gICAgICBjb252ZXJ0X3VybHM6IGZhbHNlLFxuXG4gICAgICAvLyBTZXR1cCBmdWxsIHNjcmVlbiBvbiBpbml0XG4gICAgICBzZXR1cDogZnVuY3Rpb24gKGVkaXRvcikge1xuXG4gICAgICAgIGxldCBwYXN0ZUJvb2ttYXJrXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFxuICAgICAgICAgKi9cbiAgICAgICAgZWRpdG9yLm9uKCdpbml0JywgZnVuY3Rpb24gKGUpIHtcblxuICAgICAgICAgIGVkaXRvci5leGVjQ29tbWFuZCgnbWNlRnVsbFNjcmVlbicpXG5cbiAgICAgICAgICAvLyBNb3ZlIGNhcmV0IGF0IHRoZSBmaXJzdCBoMSBlbGVtZW50IG9mIG1haW4gc2VjdGlvblxuICAgICAgICAgIC8vIE9yIHJpZ2h0IGFmdGVyIGhlYWRpbmdcbiAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2V0Q3Vyc29yTG9jYXRpb24odGlueW1jZS5hY3RpdmVFZGl0b3IuZG9tLnNlbGVjdChGSVJTVF9IRUFESU5HKVswXSwgMClcbiAgICAgICAgfSlcblxuICAgICAgICAvKipcbiAgICAgICAgICogXG4gICAgICAgICAqL1xuICAgICAgICBlZGl0b3Iub24oJ2tleURvd24nLCBmdW5jdGlvbiAoZSkge1xuXG4gICAgICAgICAgLy8gUHJldmVudCBzaGlmdCtlbnRlclxuICAgICAgICAgIGlmIChlLmtleUNvZGUgPT0gMTMgJiYgZS5zaGlmdEtleSlcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKVxuXG4gICAgICAgICAgaWYgKGUua2V5Q29kZSA9PSA4NiAmJiBlLm1ldGFLZXkpIHtcblxuICAgICAgICAgICAgaWYgKCQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSkuaXMoJ3ByZScpKSB7XG5cbiAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKClcblxuICAgICAgICAgICAgICBwYXN0ZUJvb2ttYXJrID0gdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldEJvb2ttYXJrKClcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICAgIFxuICAgICAgICAvKipcbiAgICAgICAgICogXG4gICAgICAgICAqL1xuICAgICAgICBlZGl0b3Iub24oJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcblxuICAgICAgICAgIC8vIERvbid0IGNhcHR1cmUgdGhlIGNsaWNrIG9mIHRoZSBzaWRlYmFyIGFubm90YXRpb25cbiAgICAgICAgICBpZiAoISQoZS5zcmNFbGVtZW50KS5wYXJlbnRzKFNJREVCQVJfQU5OT1RBVElPTikubGVuZ3RoKVxuXG4gICAgICAgICAgICAvLyBDYXB0dXJlIHRoZSB0cmlwbGUgY2xpY2sgZXZlbnRcbiAgICAgICAgICAgIGlmIChlLmRldGFpbCA9PSAzKSB7XG5cbiAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKClcblxuICAgICAgICAgICAgICBsZXQgd3JhcHBlciA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldFJuZygpLnN0YXJ0Q29udGFpbmVyKS5wYXJlbnRzKCdwLGZpZ2NhcHRpb24sOmhlYWRlcicpLmZpcnN0KClcbiAgICAgICAgICAgICAgbGV0IHN0YXJ0Q29udGFpbmVyID0gd3JhcHBlclswXVxuICAgICAgICAgICAgICBsZXQgZW5kQ29udGFpbmVyID0gd3JhcHBlclswXVxuICAgICAgICAgICAgICBsZXQgcmFuZ2UgPSBkb2N1bWVudC5jcmVhdGVSYW5nZSgpXG5cbiAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIHdyYXBwZXIgaGFzIG1vcmUgdGV4dCBub2RlIGluc2lkZVxuICAgICAgICAgICAgICBpZiAod3JhcHBlci5jb250ZW50cygpLmxlbmd0aCA+IDEpIHtcblxuICAgICAgICAgICAgICAgIC8vIElmIHRoZSBmaXJzdCB0ZXh0IG5vZGUgaXMgYSBub3QgZWRpdGFibGUgc3Ryb25nLCB0aGUgc2VsZWN0aW9uIG11c3Qgc3RhcnQgd2l0aCB0aGUgc2Vjb25kIGVsZW1lbnRcbiAgICAgICAgICAgICAgICBpZiAod3JhcHBlci5jb250ZW50cygpLmZpcnN0KCkuaXMoJ3N0cm9uZ1tjb250ZW50ZWRpdGFibGU9ZmFsc2VdJykpXG4gICAgICAgICAgICAgICAgICBzdGFydENvbnRhaW5lciA9IHdyYXBwZXIuY29udGVudHMoKVsxXVxuXG4gICAgICAgICAgICAgICAgLy8gSW4gdGhpcyBjYXNlIHRoZSBlbmRDb250YWluZXIgd2lsbCBiZSB0aGUgbGFzdCB0ZXh0IG5vZGVcbiAgICAgICAgICAgICAgICBlbmRDb250YWluZXIgPSB3cmFwcGVyLmNvbnRlbnRzKCkubGFzdCgpWzBdXG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICByYW5nZS5zZXRTdGFydChzdGFydENvbnRhaW5lciwgMClcblxuICAgICAgICAgICAgICBpZiAod3JhcHBlci5pcygnZmlnY2FwdGlvbicpKVxuICAgICAgICAgICAgICAgIHJhbmdlLnNldEVuZChlbmRDb250YWluZXIsIGVuZENvbnRhaW5lci5sZW5ndGgpXG5cbiAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIHJhbmdlLnNldEVuZChlbmRDb250YWluZXIsIDEpXG5cbiAgICAgICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLnNldFJuZyhyYW5nZSlcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9KVxuXG4gICAgICAgIC8vIFByZXZlbnQgc3BhbiBcbiAgICAgICAgZWRpdG9yLm9uKCdub2RlQ2hhbmdlJywgZnVuY3Rpb24gKGUpIHtcblxuICAgICAgICAgIGxldCBzZWxlY3RlZEVsZW1lbnQgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG5cbiAgICAgICAgICAvLyBNb3ZlIGNhcmV0IHRvIGZpcnN0IGhlYWRpbmcgaWYgaXMgYWZ0ZXIgb3IgYmVmb3JlIG5vdCBlZGl0YWJsZSBoZWFkZXJcbiAgICAgICAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LmlzKCdwJykgJiYgKHNlbGVjdGVkRWxlbWVudC5uZXh0KCkuaXMoSEVBREVSX1NFTEVDVE9SKSB8fCAoc2VsZWN0ZWRFbGVtZW50LnByZXYoKS5pcyhIRUFERVJfU0VMRUNUT1IpICYmIHRpbnltY2UuYWN0aXZlRWRpdG9yLmRvbS5zZWxlY3QoRklSU1RfSEVBRElORykubGVuZ3RoKSkpXG4gICAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2V0Q3Vyc29yTG9jYXRpb24odGlueW1jZS5hY3RpdmVFZGl0b3IuZG9tLnNlbGVjdChGSVJTVF9IRUFESU5HKVswXSwgMClcblxuICAgICAgICAgIC8vIElmIHRoZSBjdXJyZW50IGVsZW1lbnQgaXNuJ3QgaW5zaWRlIGhlYWRlciwgb25seSBpbiBzZWN0aW9uIHRoaXMgaXMgcGVybWl0dGVkXG4gICAgICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKCdzZWN0aW9uJykubGVuZ3RoKSB7XG5cbiAgICAgICAgICAgIC8qXG4gICAgICAgICAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LmlzKCdzcGFuI19tY2VfY2FyZXRbZGF0YS1tY2UtYm9ndXNdJykgfHwgc2VsZWN0ZWRFbGVtZW50LnBhcmVudCgpLmlzKCdzcGFuI19tY2VfY2FyZXRbZGF0YS1tY2UtYm9ndXNdJykpIHtcblxuICAgICAgICAgICAgICAvLyBSZW1vdmUgc3BhbiBub3JtYWxseSBjcmVhdGVkIHdpdGggYm9sZFxuICAgICAgICAgICAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LnBhcmVudCgpLmlzKCdzcGFuI19tY2VfY2FyZXRbZGF0YS1tY2UtYm9ndXNdJykpXG4gICAgICAgICAgICAgICAgc2VsZWN0ZWRFbGVtZW50ID0gc2VsZWN0ZWRFbGVtZW50LnBhcmVudCgpXG5cbiAgICAgICAgICAgICAgbGV0IGJtID0gdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldEJvb2ttYXJrKClcbiAgICAgICAgICAgICAgc2VsZWN0ZWRFbGVtZW50LnJlcGxhY2VXaXRoKHNlbGVjdGVkRWxlbWVudC5odG1sKCkpXG4gICAgICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5tb3ZlVG9Cb29rbWFyayhibSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICovXG4gICAgICAgICAgfVxuICAgICAgICAgIHVwZGF0ZURvY3VtZW50U3RhdGUoKVxuICAgICAgICB9KVxuXG4gICAgICAgIC8vIFVwZGF0ZSBzYXZlZCBjb250ZW50IG9uIHVuZG8gYW5kIHJlZG8gZXZlbnRzXG4gICAgICAgIGVkaXRvci5vbignVW5kbycsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG4gICAgICAgIH0pXG5cbiAgICAgICAgZWRpdG9yLm9uKCdSZWRvJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcbiAgICAgICAgfSlcblxuICAgICAgICBlZGl0b3Iub24oJ1Bhc3RlJywgZnVuY3Rpb24gKGUpIHtcblxuICAgICAgICAgIGxldCB0YXJnZXQgPSAkKGUudGFyZ2V0KVxuXG4gICAgICAgICAgLy8gSWYgdGhlIHBhc3RlIGV2ZW50IGlzIGNhbGxlZCBpbnNpZGUgYSBsaXN0aW5nXG4gICAgICAgICAgaWYgKHBhc3RlQm9va21hcmsgJiYgdGFyZ2V0LnBhcmVudHMoJ2ZpZ3VyZTpoYXMocHJlOmhhcyhjb2RlKSknKS5sZW5ndGgpIHtcblxuICAgICAgICAgICAgbGV0IGRhdGEgPSBlLmNsaXBib2FyZERhdGEuZ2V0RGF0YSgnVGV4dCcpXG5cbiAgICAgICAgICAgIC8vIFJlc3RvcmUgdGhlIHNlbGVjdGlvbiBzYXZlZCBvbiBjbWQrdlxuICAgICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLm1vdmVUb0Jvb2ttYXJrKHBhc3RlQm9va21hcmspXG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgY29udGVudFxuICAgICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLnNldENvbnRlbnQoZS5jbGlwYm9hcmREYXRhLmdldERhdGEoJ1RleHQnKSlcblxuICAgICAgICAgICAgcGFzdGVCb29rbWFyayA9IG51bGxcbiAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICB9LFxuICAgIH0pXG4gIH0pXG5cbiAgLyoqXG4gICAqIE9wZW4gYW5kIGNsb3NlIHRoZSBoZWFkaW5ncyBkcm9wZG93blxuICAgKi9cbiAgJCh3aW5kb3cpLmxvYWQoZnVuY3Rpb24gKCkge1xuXG4gICAgLy8gT3BlbiBhbmQgY2xvc2UgbWVudSBoZWFkaW5ncyBOw6RpdmUgd2F5XG4gICAgJChgZGl2W2FyaWEtbGFiZWw9J2hlYWRpbmcnXWApLmZpbmQoJ2J1dHRvbicpLnRyaWdnZXIoJ2NsaWNrJylcbiAgICAkKGBkaXZbYXJpYS1sYWJlbD0naGVhZGluZyddYCkuZmluZCgnYnV0dG9uJykudHJpZ2dlcignY2xpY2snKVxuICB9KVxuXG5cbiAgLyoqXG4gICAqIFVwZGF0ZSBjb250ZW50IGluIHRoZSBpZnJhbWUsIHdpdGggdGhlIG9uZSBzdG9yZWQgYnkgdGlueW1jZVxuICAgKiBBbmQgc2F2ZS9yZXN0b3JlIHRoZSBzZWxlY3Rpb25cbiAgICovXG4gIGZ1bmN0aW9uIHVwZGF0ZUlmcmFtZUZyb21TYXZlZENvbnRlbnQoKSB7XG5cbiAgICAvLyBTYXZlIHRoZSBib29rbWFyayBcbiAgICBsZXQgYm9va21hcmsgPSB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Qm9va21hcmsoMiwgdHJ1ZSlcblxuICAgIC8vIFVwZGF0ZSBpZnJhbWUgY29udGVudFxuICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNldENvbnRlbnQoJCgnI3JhamVfcm9vdCcpLmh0bWwoKSlcblxuICAgIC8vIFJlc3RvcmUgdGhlIGJvb2ttYXJrIFxuICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5tb3ZlVG9Cb29rbWFyayhib29rbWFyaylcbiAgfVxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGZ1bmN0aW9uIHVwZGF0ZUlmcmFtZUZyb21TYXZlZENvbnRlbnRXaXRob3V0VW5kbygpIHtcblxuICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLmlnbm9yZShmdW5jdGlvbiAoKSB7XG4gICAgICAvLyBTYXZlIHRoZSBib29rbWFyayBcbiAgICAgIGxldCBib29rbWFyayA9IHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRCb29rbWFyaygyLCB0cnVlKVxuXG4gICAgICAvLyBVcGRhdGUgaWZyYW1lIGNvbnRlbnRcbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNldENvbnRlbnQoJCgnI3JhamVfcm9vdCcpLmh0bWwoKSlcblxuICAgICAgLy8gUmVzdG9yZSB0aGUgYm9va21hcmsgXG4gICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24ubW92ZVRvQm9va21hcmsoYm9va21hcmspXG4gICAgfSlcbiAgfVxuXG4gIC8qKlxuICAgKiBBY2NlcHQgYSBqcyBvYmplY3QgdGhhdCBleGlzdHMgaW4gZnJhbWVcbiAgICogQHBhcmFtIHsqfSBlbGVtZW50IFxuICAgKi9cbiAgZnVuY3Rpb24gbW92ZUNhcmV0KGVsZW1lbnQsIHRvU3RhcnQpIHtcbiAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2VsZWN0KGVsZW1lbnQsIHRydWUpXG4gICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmNvbGxhcHNlKHRvU3RhcnQpXG5cbiAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5mb2N1cygpXG4gIH1cblxuICAvKipcbiAgICogXG4gICAqL1xuICBmdW5jdGlvbiBzZWxlY3RSYW5nZShzdGFydENvbnRhaW5lciwgc3RhcnRPZmZzZXQsIGVuZENvbnRhaW5lciwgZW5kT2Zmc2V0KSB7XG5cbiAgICBsZXQgcmFuZ2UgPSBkb2N1bWVudC5jcmVhdGVSYW5nZSgpXG4gICAgcmFuZ2Uuc2V0U3RhcnQoc3RhcnRDb250YWluZXIsIHN0YXJ0T2Zmc2V0KVxuXG4gICAgLy8gSWYgdGhlc2UgcHJvcGVydGllcyBhcmUgbm90IGluIHRoZSBzaWduYXR1cmUgdXNlIHRoZSBzdGFydFxuICAgIGlmICghZW5kQ29udGFpbmVyICYmICFlbmRPZmZzZXQpIHtcbiAgICAgIGVuZENvbnRhaW5lciA9IHN0YXJ0Q29udGFpbmVyXG4gICAgICBlbmRPZmZzZXQgPSBzdGFydE9mZnNldFxuICAgIH1cblxuICAgIHJhbmdlLnNldEVuZChlbmRDb250YWluZXIsIGVuZE9mZnNldClcbiAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2V0Um5nKHJhbmdlKVxuICB9XG5cbiAgLyoqXG4gICAqIFxuICAgKiBAcGFyYW0geyp9IGVsZW1lbnQgXG4gICAqL1xuICBmdW5jdGlvbiBtb3ZlQ3Vyc29yVG9FbmQoZWxlbWVudCkge1xuXG4gICAgbGV0IGhlYWRpbmcgPSBlbGVtZW50XG4gICAgbGV0IG9mZnNldCA9IDBcblxuICAgIGlmIChoZWFkaW5nLmNvbnRlbnRzKCkubGVuZ3RoKSB7XG5cbiAgICAgIGhlYWRpbmcgPSBoZWFkaW5nLmNvbnRlbnRzKCkubGFzdCgpXG5cbiAgICAgIC8vIElmIHRoZSBsYXN0IG5vZGUgaXMgYSBzdHJvbmcsZW0scSBldGMuIHdlIGhhdmUgdG8gdGFrZSBpdHMgdGV4dCBcbiAgICAgIGlmIChoZWFkaW5nWzBdLm5vZGVUeXBlICE9IDMpXG4gICAgICAgIGhlYWRpbmcgPSBoZWFkaW5nLmNvbnRlbnRzKCkubGFzdCgpXG5cbiAgICAgIG9mZnNldCA9IGhlYWRpbmdbMF0ud2hvbGVUZXh0Lmxlbmd0aFxuICAgIH1cblxuICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLmZvY3VzKClcbiAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2V0Q3Vyc29yTG9jYXRpb24oaGVhZGluZ1swXSwgb2Zmc2V0KVxuICB9XG5cbiAgLyoqXG4gICAqIFxuICAgKiBAcGFyYW0geyp9IGVsZW1lbnQgXG4gICAqL1xuICBmdW5jdGlvbiBtb3ZlQ3Vyc29yVG9TdGFydChlbGVtZW50KSB7XG5cbiAgICBsZXQgaGVhZGluZyA9IGVsZW1lbnRcbiAgICBsZXQgb2Zmc2V0ID0gMFxuXG4gICAgdGlueW1jZS5hY3RpdmVFZGl0b3IuZm9jdXMoKVxuICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZXRDdXJzb3JMb2NhdGlvbihoZWFkaW5nWzBdLCBvZmZzZXQpXG4gIH1cblxuXG4gIC8qKlxuICAgKiBDcmVhdGUgY3VzdG9tIGludG8gbm90aWZpY2F0aW9uXG4gICAqIEBwYXJhbSB7Kn0gdGV4dCBcbiAgICogQHBhcmFtIHsqfSB0aW1lb3V0IFxuICAgKi9cbiAgZnVuY3Rpb24gbm90aWZ5KHRleHQsIHR5cGUsIHRpbWVvdXQpIHtcblxuICAgIGlmICh0aW55bWNlLmFjdGl2ZUVkaXRvci5ub3RpZmljYXRpb25NYW5hZ2VyLmdldE5vdGlmaWNhdGlvbnMoKS5sZW5ndGgpXG4gICAgICB0b3AudGlueW1jZS5hY3RpdmVFZGl0b3Iubm90aWZpY2F0aW9uTWFuYWdlci5jbG9zZSgpXG5cbiAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5ub3RpZmljYXRpb25NYW5hZ2VyLm9wZW4oe1xuICAgICAgdGV4dDogdGV4dCxcbiAgICAgIHR5cGU6IHR5cGUgPyB0eXBlIDogJ2luZm8nLFxuICAgICAgdGltZW91dDogMzAwMFxuICAgIH0pXG4gIH1cblxuICAvKipcbiAgICogXG4gICAqIEBwYXJhbSB7Kn0gZWxlbWVudFNlbGVjdG9yIFxuICAgKi9cbiAgZnVuY3Rpb24gc2Nyb2xsVG8oZWxlbWVudFNlbGVjdG9yKSB7XG4gICAgJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5nZXRCb2R5KCkpLmZpbmQoZWxlbWVudFNlbGVjdG9yKS5nZXQoMCkuc2Nyb2xsSW50b1ZpZXcoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGZ1bmN0aW9uIGdldFN1Y2Nlc3NpdmVFbGVtZW50SWQoZWxlbWVudFNlbGVjdG9yLCBTVUZGSVgpIHtcblxuICAgIGxldCBsYXN0SWQgPSAwXG5cbiAgICAkKGVsZW1lbnRTZWxlY3RvcikuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICBsZXQgY3VycmVudElkID0gcGFyc2VJbnQoJCh0aGlzKS5hdHRyKCdpZCcpLnJlcGxhY2UoU1VGRklYLCAnJykpXG4gICAgICBsYXN0SWQgPSBjdXJyZW50SWQgPiBsYXN0SWQgPyBjdXJyZW50SWQgOiBsYXN0SWRcbiAgICB9KVxuXG4gICAgcmV0dXJuIGAke1NVRkZJWH0ke2xhc3RJZCsxfWBcbiAgfVxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGZ1bmN0aW9uIGhlYWRpbmdEaW1lbnNpb24oKSB7XG4gICAgJCgnaDEsaDIsaDMsaDQsaDUsaDYnKS5lYWNoKGZ1bmN0aW9uICgpIHtcblxuICAgICAgaWYgKCEkKHRoaXMpLnBhcmVudHMoSEVBREVSX1NFTEVDVE9SKS5sZW5ndGgpIHtcbiAgICAgICAgdmFyIGNvdW50ZXIgPSAwO1xuICAgICAgICAkKHRoaXMpLnBhcmVudHMoXCJzZWN0aW9uXCIpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGlmICgkKHRoaXMpLmNoaWxkcmVuKFwiaDEsaDIsaDMsaDQsaDUsaDZcIikubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY291bnRlcisrO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgICQodGhpcykucmVwbGFjZVdpdGgoXCI8aFwiICsgY291bnRlciArIFwiIGRhdGEtcmFzaC1vcmlnaW5hbC13cmFwcGVyPVxcXCJoMVxcXCIgPlwiICsgJCh0aGlzKS5odG1sKCkgKyBcIjwvaFwiICsgY291bnRlciArIFwiPlwiKVxuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFxuICAgKi9cbiAgZnVuY3Rpb24gY2hlY2tJZlByaW50YWJsZUNoYXIoa2V5Y29kZSkge1xuXG4gICAgcmV0dXJuIChrZXljb2RlID4gNDcgJiYga2V5Y29kZSA8IDU4KSB8fCAvLyBudW1iZXIga2V5c1xuICAgICAgKGtleWNvZGUgPT0gMzIgfHwga2V5Y29kZSA9PSAxMykgfHwgLy8gc3BhY2ViYXIgJiByZXR1cm4ga2V5KHMpIChpZiB5b3Ugd2FudCB0byBhbGxvdyBjYXJyaWFnZSByZXR1cm5zKVxuICAgICAgKGtleWNvZGUgPiA2NCAmJiBrZXljb2RlIDwgOTEpIHx8IC8vIGxldHRlciBrZXlzXG4gICAgICAoa2V5Y29kZSA+IDk1ICYmIGtleWNvZGUgPCAxMTIpIHx8IC8vIG51bXBhZCBrZXlzXG4gICAgICAoa2V5Y29kZSA+IDE4NSAmJiBrZXljb2RlIDwgMTkzKSB8fCAvLyA7PSwtLi9gIChpbiBvcmRlcilcbiAgICAgIChrZXljb2RlID4gMjE4ICYmIGtleWNvZGUgPCAyMjMpOyAvLyBbXFxdJyAoaW4gb3JkZXIpXG4gIH1cblxuICAvKipcbiAgICogXG4gICAqL1xuICBmdW5jdGlvbiBjaGVja0lmU3BlY2lhbENoYXIoa2V5Y29kZSkge1xuXG4gICAgcmV0dXJuIChrZXljb2RlID4gNDcgJiYga2V5Y29kZSA8IDU4KSB8fCAvLyBudW1iZXIga2V5c1xuICAgICAgKGtleWNvZGUgPiA5NSAmJiBrZXljb2RlIDwgMTEyKSB8fCAvLyBudW1wYWQga2V5c1xuICAgICAgKGtleWNvZGUgPiAxODUgJiYga2V5Y29kZSA8IDE5MykgfHwgLy8gOz0sLS4vYCAoaW4gb3JkZXIpXG4gICAgICAoa2V5Y29kZSA+IDIxOCAmJiBrZXljb2RlIDwgMjIzKVxuICB9XG5cbiAgLyoqXG4gICAqIFxuICAgKi9cbiAgZnVuY3Rpb24gbWFya1RpbnlNQ0UoKSB7XG4gICAgJCgnZGl2W2lkXj1tY2V1X10nKS5hdHRyKCdkYXRhLXJhc2gtb3JpZ2luYWwtY29udGVudCcsICcnKVxuICB9XG5cbiAgLyoqXG4gICAqIFxuICAgKi9cbiAgZnVuY3Rpb24gc2V0Tm9uRWRpdGFibGVIZWFkZXIoKSB7XG4gICAgJChIRUFERVJfU0VMRUNUT1IpLmFkZENsYXNzKCdtY2VOb25FZGl0YWJsZScpXG4gICAgJChTSURFQkFSX0FOTk9UQVRJT04pLmFkZENsYXNzKCdtY2VOb25FZGl0YWJsZScpXG4gIH1cblxuICAvKipcbiAgICogXG4gICAqL1xuICBmdW5jdGlvbiBjaGVja0lmQXBwKCkge1xuICAgIHJldHVybiBpcGNSZW5kZXJlci5zZW5kU3luYygnaXNBcHBTeW5jJylcbiAgfVxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGZ1bmN0aW9uIHNlbGVjdEltYWdlKCkge1xuICAgIHJldHVybiBpcGNSZW5kZXJlci5zZW5kU3luYygnc2VsZWN0SW1hZ2VTeW5jJylcbiAgfVxuXG4gIC8qKlxuICAgKiBTZW5kIGEgbWVzc2FnZSB0byB0aGUgYmFja2VuZCwgbm90aWZ5IHRoZSBzdHJ1Y3R1cmFsIGNoYW5nZVxuICAgKiBcbiAgICogSWYgdGhlIGRvY3VtZW50IGlzIGRyYWZ0IHN0YXRlID0gdHJ1ZVxuICAgKiBJZiB0aGUgZG9jdW1lbnQgaXMgc2F2ZWQgc3RhdGUgPSBmYWxzZVxuICAgKi9cbiAgZnVuY3Rpb24gdXBkYXRlRG9jdW1lbnRTdGF0ZSgpIHtcblxuICAgIC8vIEdldCB0aGUgSWZyYW1lIGNvbnRlbnQgbm90IGluIHhtbCBcbiAgICBsZXQgSnF1ZXJ5SWZyYW1lID0gJChgPGRpdj4ke3RpbnltY2UuYWN0aXZlRWRpdG9yLmdldENvbnRlbnQoKX08L2Rpdj5gKVxuICAgIGxldCBKcXVlcnlTYXZlZENvbnRlbnQgPSAkKGAjcmFqZV9yb290YClcblxuICAgIC8vIFRydWUgaWYgdGhleSdyZSBkaWZmZXJlbnQsIEZhbHNlIGlzIHRoZXkncmUgZXF1YWxcbiAgICBpcGNSZW5kZXJlci5zZW5kKCd1cGRhdGVEb2N1bWVudFN0YXRlJywgSnF1ZXJ5SWZyYW1lLmh0bWwoKSAhPSBKcXVlcnlTYXZlZENvbnRlbnQuaHRtbCgpKVxuICB9XG5cbiAgLyoqXG4gICAqIFxuICAgKi9cbiAgZnVuY3Rpb24gc2F2ZUFzQXJ0aWNsZShvcHRpb25zKSB7XG4gICAgcmV0dXJuIGlwY1JlbmRlcmVyLnNlbmQoJ3NhdmVBc0FydGljbGUnLCBvcHRpb25zKVxuICB9XG5cbiAgLyoqXG4gICAqIFxuICAgKi9cbiAgZnVuY3Rpb24gc2F2ZUFydGljbGUob3B0aW9ucykge1xuICAgIHJldHVybiBpcGNSZW5kZXJlci5zZW5kKCdzYXZlQXJ0aWNsZScsIG9wdGlvbnMpXG4gIH1cblxuICAvKipcbiAgICogXG4gICAqL1xuICBmdW5jdGlvbiBtYXRobWwyc3ZnQWxsRm9ybXVsYXMoKSB7XG5cbiAgICAvLyBGb3IgZWFjaCBmaWd1cmUgZm9ybXVsYVxuICAgICQoJ2ZpZ3VyZVtpZF49XCJmb3JtdWxhX1wiXScpLmVhY2goZnVuY3Rpb24gKCkge1xuXG4gICAgICAvLyBHZXQgdGhlIGlkXG4gICAgICBsZXQgaWQgPSAkKHRoaXMpLmF0dHIoJ2lkJylcbiAgICAgIGxldCBhc2NpaU1hdGggPSAkKHRoaXMpLmF0dHIoREFUQV9NQVRIX09SSUdJTkFMX0lOUFVUKVxuICAgICAgJCh0aGlzKS5yZW1vdmVBdHRyKERBVEFfTUFUSF9PUklHSU5BTF9JTlBVVClcblxuICAgICAgTWF0aEpheC5IdWIuUXVldWUoXG5cbiAgICAgICAgLy8gUHJvY2VzcyB0aGUgZm9ybXVsYSBieSBpZFxuICAgICAgICBbXCJUeXBlc2V0XCIsIE1hdGhKYXguSHViLCBpZF0sXG4gICAgICAgIGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgIC8vIEdldCB0aGUgZWxlbWVudCwgc3ZnIGFuZCBtYXRobWwgY29udGVudFxuICAgICAgICAgIGxldCBmaWd1cmVGb3JtdWxhID0gJChgIyR7aWR9YClcbiAgICAgICAgICBsZXQgc3ZnQ29udGVudCA9IGZpZ3VyZUZvcm11bGEuZmluZCgnc3ZnJylcbiAgICAgICAgICBsZXQgbW1sQ29udGVudCA9IGZpZ3VyZUZvcm11bGEuZmluZCgnc2NyaXB0W3R5cGU9XCJtYXRoL21tbFwiXScpLmh0bWwoKVxuXG4gICAgICAgICAgLy8gQWRkIHRoZSByb2xlXG4gICAgICAgICAgc3ZnQ29udGVudC5hdHRyKCdyb2xlJywgJ21hdGgnKVxuICAgICAgICAgIHN2Z0NvbnRlbnQuYXR0cignZGF0YS1tYXRobWwnLCBtbWxDb250ZW50KVxuXG4gICAgICAgICAgLy8gQWRkIHRoZSBhc2NpaW1hdGggaW5wdXQgaWYgZXhpc3RzXG4gICAgICAgICAgaWYgKHR5cGVvZiBhc2NpaU1hdGggIT0gJ3VuZGVmaW5lZCcpXG4gICAgICAgICAgICBzdmdDb250ZW50LmF0dHIoREFUQV9NQVRIX09SSUdJTkFMX0lOUFVULCBhc2NpaU1hdGgpXG5cbiAgICAgICAgICAvLyBVcGRhdGUgdGhlIGZpZ3VyZSBjb250ZW50IGFuZCBpdHMgY2FwdGlvblxuICAgICAgICAgIGZpZ3VyZUZvcm11bGEuaHRtbChgPHA+PHNwYW4+JHtzdmdDb250ZW50WzBdLm91dGVySFRNTH08L3NwYW4+PC9wPmApXG4gICAgICAgICAgY2FwdGlvbnMoKVxuXG4gICAgICAgICAgZm9ybXVsYS51cGRhdGVTdHJ1Y3R1cmUoZmlndXJlRm9ybXVsYSlcblxuICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgY29udGVudCBhbmQgY2xlYXIgdGhlIHdob2xlIHVuZG8gbGV2ZWxzIHNldFxuICAgICAgICAgIHVwZGF0ZUlmcmFtZUZyb21TYXZlZENvbnRlbnQoKVxuICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLmNsZWFyKClcbiAgICAgICAgfVxuICAgICAgKVxuICAgIH0pXG4gIH1cblxuICAvKiogKi9cbiAgc2VsZWN0aW9uQ29udGVudCA9IHtcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIGNvbnRhaW5zQmlibGlvZ3JhcGh5OiBmdW5jdGlvbiAoc2VsZWN0aW9uKSB7XG5cbiAgICAgIGxldCBybmcgPSBzZWxlY3Rpb24uZ2V0Um5nKClcblxuICAgICAgLy8gU2F2ZSB0aGUgc3RhcnRpbmcgZWxlbWVudFxuICAgICAgbGV0IHN0YXJ0ID0gcm5nLnN0YXJ0Q29udGFpbmVyXG4gICAgICBsZXQgc3RhcnROb2RlID0gJChzdGFydC5ub2RlVHlwZSA9PSAzID8gc3RhcnQucGFyZW50Tm9kZSA6IHN0YXJ0KVxuXG4gICAgICAvLyBTYXZlIHRoZSBlbmRpbmcgZWxlbWVudFxuICAgICAgbGV0IGVuZCA9IHJuZy5lbmRDb250YWluZXJcbiAgICAgIGxldCBlbmROb2RlID0gJChlbmQubm9kZVR5cGUgPT0gMyA/IGVuZC5wYXJlbnROb2RlIDogZW5kKVxuXG4gICAgICAvLyBDb250cm9scyBpZiB0aGUgc2VsZWN0aW9uIGhhcyB0aGUgYmlibGlvZ3JhcGh5IGluc2lkZVxuICAgICAgcmV0dXJuICgkKHJuZy5jb21tb25BbmNlc3RvckNvbnRhaW5lcikuZmluZChCSUJMSU9HUkFQSFlfU0VMRUNUT1IpLmxlbmd0aCAmJlxuICAgICAgICAgICghc3RhcnROb2RlLmlzKGAke0JJQkxJT0dSQVBIWV9TRUxFQ1RPUn0gPiBoMWApIHx8XG4gICAgICAgICAgICAhZW5kTm9kZS5pcyhgJHtCSUJMSU9HUkFQSFlfU0VMRUNUT1J9ID4gaDFgKSkpIHx8XG5cbiAgICAgICAgLy8gT3IgaWYgdGhlIHNlbGVjdGlvbiBpcyB0aGUgYmlibGlvZ3JhcGh5XG4gICAgICAgICgkKHJuZy5jb21tb25BbmNlc3RvckNvbnRhaW5lcikuaXMoQklCTElPR1JBUEhZX1NFTEVDVE9SKSAmJlxuICAgICAgICAgIChzdGFydE5vZGUuaXMoJ2gxJykgJiYgcm5nLnN0YXJ0T2Zmc2V0ID09IDApICYmXG4gICAgICAgICAgKGVuZE5vZGUuaXMoJ3AnKSAmJiBybmcuZW5kT2Zmc2V0ID09IGVuZC5sZW5ndGgpKVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBpc0F0QmVnaW5uaW5nT2ZFbXB0eUJpYmxpb2VudHJ5OiBmdW5jdGlvbiAoc2VsZWN0aW9uKSB7XG5cbiAgICAgIGxldCBybmcgPSBzZWxlY3Rpb24uZ2V0Um5nKClcblxuICAgICAgLy8gU2F2ZSB0aGUgc3RhcnRpbmcgZWxlbWVudFxuICAgICAgbGV0IHN0YXJ0ID0gcm5nLnN0YXJ0Q29udGFpbmVyXG4gICAgICBsZXQgc3RhcnROb2RlID0gJChzdGFydC5ub2RlVHlwZSA9PSAzID8gc3RhcnQucGFyZW50Tm9kZSA6IHN0YXJ0KVxuXG4gICAgICAvLyBTYXZlIHRoZSBlbmRpbmcgZWxlbWVudFxuICAgICAgbGV0IGVuZCA9IHJuZy5lbmRDb250YWluZXJcbiAgICAgIGxldCBlbmROb2RlID0gJChlbmQubm9kZVR5cGUgPT0gMyA/IGVuZC5wYXJlbnROb2RlIDogZW5kKVxuXG4gICAgICByZXR1cm4gKHJuZy5jb21tb25BbmNlc3RvckNvbnRhaW5lci5ub2RlVHlwZSA9PSAzIHx8ICQocm5nLmNvbW1vbkFuY2VzdG9yQ29udGFpbmVyKS5pcyhgJHtCSUJMSU9FTlRSWV9TRUxFQ1RPUn0gPiBwYCkpICYmXG4gICAgICAgIChzdGFydE5vZGUuaXMoZW5kTm9kZSkgJiYgc3RhcnROb2RlLmlzKGAke0JJQkxJT0VOVFJZX1NFTEVDVE9SfSA+IHBgKSkgJiZcbiAgICAgICAgKHJuZy5zdGFydE9mZnNldCA9PSBybmcuZW5kT2Zmc2V0ICYmIHJuZy5zdGFydE9mZnNldCA9PSAwKVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBpc0F0QmVnaW5uaW5nT2ZFbXB0eUVuZG5vdGU6IGZ1bmN0aW9uIChzZWxlY3Rpb24pIHtcblxuICAgICAgbGV0IHJuZyA9IHNlbGVjdGlvbi5nZXRSbmcoKVxuXG4gICAgICAvLyBTYXZlIHRoZSBzdGFydGluZyBlbGVtZW50XG4gICAgICBsZXQgc3RhcnQgPSBybmcuc3RhcnRDb250YWluZXJcbiAgICAgIGxldCBzdGFydE5vZGUgPSAkKHN0YXJ0Lm5vZGVUeXBlID09IDMgPyBzdGFydC5wYXJlbnROb2RlIDogc3RhcnQpXG5cbiAgICAgIC8vIFNhdmUgdGhlIGVuZGluZyBlbGVtZW50XG4gICAgICBsZXQgZW5kID0gcm5nLmVuZENvbnRhaW5lclxuICAgICAgbGV0IGVuZE5vZGUgPSAkKGVuZC5ub2RlVHlwZSA9PSAzID8gZW5kLnBhcmVudE5vZGUgOiBlbmQpXG5cbiAgICAgIHJldHVybiAoJChybmcuY29tbW9uQW5jZXN0b3JDb250YWluZXIpLnBhcmVudCgpLmlzKEVORE5PVEVfU0VMRUNUT1IpICYmIHN0YXJ0Tm9kZS5pcyhlbmROb2RlKSAmJiBzdGFydE5vZGUuaXMoYCR7RU5ETk9URV9TRUxFQ1RPUn0gPiBwOmZpcnN0LWNoaWxkYCkpICYmXG4gICAgICAgICgocm5nLnN0YXJ0T2Zmc2V0ID09IHJuZy5lbmRPZmZzZXQgJiYgcm5nLnN0YXJ0T2Zmc2V0ID09IDApIHx8ICgvXFxyfFxcbi8uZXhlYyhzdGFydC5pbm5lclRleHQpICE9IG51bGwpKVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBjb250YWluc0JpYmxpb2VudHJpZXM6IGZ1bmN0aW9uIChzZWxlY3Rpb24pIHtcblxuICAgICAgbGV0IHJuZyA9IHNlbGVjdGlvbi5nZXRSbmcoKVxuXG4gICAgICAvLyBTYXZlIHRoZSBzdGFydGluZyBlbGVtZW50XG4gICAgICBsZXQgc3RhcnQgPSBybmcuc3RhcnRDb250YWluZXJcbiAgICAgIGxldCBzdGFydE5vZGUgPSAkKHN0YXJ0Lm5vZGVUeXBlID09IDMgPyBzdGFydC5wYXJlbnROb2RlIDogc3RhcnQpXG5cbiAgICAgIC8vIFNhdmUgdGhlIGVuZGluZyBlbGVtZW50XG4gICAgICBsZXQgZW5kID0gcm5nLmVuZENvbnRhaW5lclxuICAgICAgbGV0IGVuZE5vZGUgPSAkKGVuZC5ub2RlVHlwZSA9PSAzID8gZW5kLnBhcmVudE5vZGUgOiBlbmQpXG5cbiAgICAgIC8vIENoZWNrIGlmIHRoZSBzZWxlY3Rpb24gY29udGFpbnMgbW9yZSB0aGFuIG9uZSBiaWJsaW9lbnRyeVxuICAgICAgcmV0dXJuICgkKHJuZy5jb21tb25BbmNlc3RvckNvbnRhaW5lcikuaXMoYCR7QklCTElPR1JBUEhZX1NFTEVDVE9SfSA+IHVsYCkgfHwgJChybmcuY29tbW9uQW5jZXN0b3JDb250YWluZXIpLmlzKEJJQkxJT0dSQVBIWV9TRUxFQ1RPUikpICYmXG4gICAgICAgIChCb29sZWFuKHN0YXJ0Tm9kZS5wYXJlbnQoQklCTElPRU5UUllfU0VMRUNUT1IpLmxlbmd0aCkgfHwgc3RhcnROb2RlLmlzKCdoMScpKSAmJlxuICAgICAgICBCb29sZWFuKGVuZE5vZGUucGFyZW50cyhCSUJMSU9FTlRSWV9TRUxFQ1RPUikubGVuZ3RoKVxuICAgIH0sXG4gIH1cblxuICAvKipcbiAgICogU3RhcnQgdGhlIHNhdmUgYXMgcHJvY2VzcyBnZXR0aW5nIHRoZSBkYXRhIGFuZCBzZW5kaW5nIGl0XG4gICAqIHRvIHRoZSBtYWluIHByb2Nlc3NcbiAgICovXG4gIGlwY1JlbmRlcmVyLm9uKCdleGVjdXRlU2F2ZUFzJywgKGV2ZW50LCBkYXRhKSA9PiB7XG4gICAgc2F2ZU1hbmFnZXIuc2F2ZUFzKClcbiAgfSlcblxuICAvKipcbiAgICogU3RhcnQgdGhlIHNhdmUgcHJvY2VzcyBnZXR0aW5nIHRoZSBkYXRhIGFuZCBzZW5kaW5nIGl0XG4gICAqIHRvIHRoZSBtYWluIHByb2Nlc3NcbiAgICovXG4gIGlwY1JlbmRlcmVyLm9uKCdleGVjdXRlU2F2ZScsIChldmVudCwgZGF0YSkgPT4ge1xuICAgIHNhdmVNYW5hZ2VyLnNhdmUoKVxuICB9KVxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGlwY1JlbmRlcmVyLm9uKCdub3RpZnknLCAoZXZlbnQsIGRhdGEpID0+IHtcbiAgICBub3RpZnkoZGF0YS50ZXh0LCBkYXRhLnR5cGUsIGRhdGEudGltZW91dClcbiAgfSlcblxuICAvKipcbiAgICogXG4gICAqL1xuICBpcGNSZW5kZXJlci5vbigndXBkYXRlQ29udGVudCcsIChldmVudCwgZGF0YSkgPT4ge1xuICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuICB9KVxuXG4gIGN1cnNvciA9IHtcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIGlzSW5zaWRlSGVhZGluZzogZnVuY3Rpb24gKHNlbGVjdGlvbikge1xuXG4gICAgICBsZXQgcm5nID0gc2VsZWN0aW9uLmdldFJuZygpXG5cbiAgICAgIC8vIFNhdmUgdGhlIHN0YXJ0aW5nIGVsZW1lbnRcbiAgICAgIGxldCBzdGFydCA9IHJuZy5zdGFydENvbnRhaW5lclxuICAgICAgbGV0IHN0YXJ0Tm9kZSA9ICQoc3RhcnQubm9kZVR5cGUgPT0gMyA/IHN0YXJ0LnBhcmVudE5vZGUgOiBzdGFydClcblxuICAgICAgLy8gU2F2ZSB0aGUgZW5kaW5nIGVsZW1lbnRcbiAgICAgIGxldCBlbmQgPSBybmcuZW5kQ29udGFpbmVyXG4gICAgICBsZXQgZW5kTm9kZSA9ICQoZW5kLm5vZGVUeXBlID09IDMgPyBlbmQucGFyZW50Tm9kZSA6IGVuZClcblxuICAgICAgLy8gQ2hlY2sgaWYgdGhlIHNlbGVjdGlvbiBjb250YWlucyBtb3JlIHRoYW4gb25lIGJpYmxpb2VudHJ5XG4gICAgICByZXR1cm4gJChybmcuY29tbW9uQW5jZXN0b3JDb250YWluZXIpLmlzKCc6aGVhZGVyJykgJiZcbiAgICAgICAgJChybmcuY29tbW9uQW5jZXN0b3JDb250YWluZXIpLnRleHQoKS50cmltKCkubGVuZ3RoICE9IHJuZy5zdGFydE9mZnNldFxuICAgIH0sXG5cbiAgICBpc0luc2lkZVRhYmxlOiBmdW5jdGlvbiAoc2VsZWN0aW9uKSB7XG5cbiAgICAgIGxldCBybmcgPSBzZWxlY3Rpb24uZ2V0Um5nKClcblxuICAgICAgLy8gU2F2ZSB0aGUgc3RhcnRpbmcgZWxlbWVudFxuICAgICAgbGV0IHN0YXJ0ID0gcm5nLnN0YXJ0Q29udGFpbmVyXG4gICAgICBsZXQgc3RhcnROb2RlID0gJChzdGFydC5ub2RlVHlwZSA9PSAzID8gc3RhcnQucGFyZW50Tm9kZSA6IHN0YXJ0KVxuXG4gICAgICAvLyBTYXZlIHRoZSBlbmRpbmcgZWxlbWVudFxuICAgICAgbGV0IGVuZCA9IHJuZy5lbmRDb250YWluZXJcbiAgICAgIGxldCBlbmROb2RlID0gJChlbmQubm9kZVR5cGUgPT0gMyA/IGVuZC5wYXJlbnROb2RlIDogZW5kKVxuXG4gICAgICAvLyBDaGVjayBpZiB0aGUgc2VsZWN0aW9uIGNvbnRhaW5zIG1vcmUgdGhhbiBvbmUgYmlibGlvZW50cnlcbiAgICAgIHJldHVybiAoJChybmcuY29tbW9uQW5jZXN0b3JDb250YWluZXIpLmlzKEZJR1VSRV9UQUJMRV9TRUxFQ1RPUikgfHwgJChybmcuY29tbW9uQW5jZXN0b3JDb250YWluZXIpLnBhcmVudHMoRklHVVJFX1RBQkxFX1NFTEVDVE9SKS5sZW5ndGgpICYmXG4gICAgICAgICQocm5nLmNvbW1vbkFuY2VzdG9yQ29udGFpbmVyKS50ZXh0KCkudHJpbSgpLmxlbmd0aCAhPSBybmcuc3RhcnRPZmZzZXRcbiAgICB9XG4gIH1cbn0iLCJjb25zdCBOT05fRURJVEFCTEVfSEVBREVSX1NFTEVDVE9SID0gJ2hlYWRlci5wYWdlLWhlYWRlci5jb250YWluZXIuY2dlbidcbmNvbnN0IEJJQkxJT0VOVFJZX1NVRkZJWCA9ICdiaWJsaW9lbnRyeV8nXG5jb25zdCBFTkROT1RFX1NVRkZJWCA9ICdlbmRub3RlXydcblxuY29uc3QgQklCTElPR1JBUEhZX1NFTEVDVE9SID0gJ3NlY3Rpb25bcm9sZT1kb2MtYmlibGlvZ3JhcGh5XSdcbmNvbnN0IEJJQkxJT0VOVFJZX1NFTEVDVE9SID0gJ2xpW3JvbGU9ZG9jLWJpYmxpb2VudHJ5XSdcblxuY29uc3QgRU5ETk9URVNfU0VMRUNUT1IgPSAnc2VjdGlvbltyb2xlPWRvYy1lbmRub3Rlc10nXG5jb25zdCBFTkROT1RFX1NFTEVDVE9SID0gJ3NlY3Rpb25bcm9sZT1kb2MtZW5kbm90ZV0nXG5cbmNvbnN0IEFCU1RSQUNUX1NFTEVDVE9SID0gJ3NlY3Rpb25bcm9sZT1kb2MtYWJzdHJhY3RdJ1xuY29uc3QgQUNLTk9XTEVER0VNRU5UU19TRUxFQ1RPUiA9ICdzZWN0aW9uW3JvbGU9ZG9jLWFja25vd2xlZGdlbWVudHNdJ1xuXG5jb25zdCBNQUlOX1NFQ1RJT05fU0VMRUNUT1IgPSAnZGl2I3JhamVfcm9vdCA+IHNlY3Rpb246bm90KFtyb2xlXSknXG5jb25zdCBTRUNUSU9OX1NFTEVDVE9SID0gJ3NlY3Rpb246bm90KFtyb2xlXSknXG5jb25zdCBTUEVDSUFMX1NFQ1RJT05fU0VMRUNUT1IgPSAnc2VjdGlvbltyb2xlXSdcblxuY29uc3QgTUVOVV9TRUxFQ1RPUiA9ICdkaXZbaWRePW1jZXVfXVtpZCQ9LWJvZHldW3JvbGU9bWVudV0nXG5cbmNvbnN0IERBVEFfVVBHUkFERSA9ICdkYXRhLXVwZ3JhZGUnXG5jb25zdCBEQVRBX0RPV05HUkFERSA9ICdkYXRhLWRvd25ncmFkZSdcblxuY29uc3QgSEVBRElORyA9ICdIZWFkaW5nICdcblxuY29uc3QgSEVBRElOR19UUkFTRk9STUFUSU9OX0ZPUkJJRERFTiA9ICdFcnJvciwgeW91IGNhbm5vdCB0cmFuc2Zvcm0gdGhlIGN1cnJlbnQgaGVhZGVyIGluIHRoaXMgd2F5ISdcblxuY29uc3QgRElTQUJMRV9TRUxFQ1RPUl9GSUdVUkVTID0gJ2ZpZ3VyZSAqLCBoMSwgaDIsIGgzLCBoNCwgaDUsIGg2LCcgKyBCSUJMSU9HUkFQSFlfU0VMRUNUT1JcblxuY29uc3QgRklHVVJFX1NFTEVDVE9SID0gJ2ZpZ3VyZVtpZF0nXG5cbmNvbnN0IEZJR1VSRV9UQUJMRV9TRUxFQ1RPUiA9IGAke0ZJR1VSRV9TRUxFQ1RPUn06aGFzKHRhYmxlKWBcbmNvbnN0IFRBQkxFX1NVRkZJWCA9ICd0YWJsZV8nXG5cbmNvbnN0IEZJR1VSRV9JTUFHRV9TRUxFQ1RPUiA9IGAke0ZJR1VSRV9TRUxFQ1RPUn06aGFzKGltZzpub3QoW3JvbGU9bWF0aF0pKWBcbmNvbnN0IElNQUdFX1NVRkZJWCA9ICdpbWdfJ1xuXG5jb25zdCBGSUdVUkVfRk9STVVMQV9TRUxFQ1RPUiA9IGAke0ZJR1VSRV9TRUxFQ1RPUn06aGFzKHN2Z1tyb2xlPW1hdGhdKWBcbmNvbnN0IElOTElORV9GT1JNVUxBX1NFTEVDVE9SID0gYHNwYW46aGFzKHN2Z1tyb2xlPW1hdGhdKWBcbmNvbnN0IEZPUk1VTEFfU1VGRklYID0gJ2Zvcm11bGFfJ1xuXG5jb25zdCBGSUdVUkVfTElTVElOR19TRUxFQ1RPUiA9IGAke0ZJR1VSRV9TRUxFQ1RPUn06aGFzKHByZTpoYXMoY29kZSkpYFxuY29uc3QgTElTVElOR19TVUZGSVggPSAnbGlzdGluZ18nXG5cbmNvbnN0IERJU0FCTEVfU0VMRUNUT1JfSU5MSU5FID0gJ3RhYmxlLCBpbWcsIHByZSwgY29kZSdcblxuY29uc3QgU0lERUJBUl9BTk5PVEFUSU9OID0gJ2FzaWRlI2Fubm90YXRpb25zJ1xuXG5jb25zdCBJTkxJTkVfRVJST1JTID0gJ0Vycm9yLCBJbmxpbmUgZWxlbWVudHMgY2FuIGJlIE9OTFkgY3JlYXRlZCBpbnNpZGUgdGhlIHNhbWUgcGFyYWdyYXBoJ1xuXG4iLCIvKipcbiAqIFJBU0ggc2VjdGlvbiBwbHVnaW4gUkFKRVxuICovXG5cbnRpbnltY2UuUGx1Z2luTWFuYWdlci5hZGQoJ3JhamVfc2VjdGlvbicsIGZ1bmN0aW9uIChlZGl0b3IsIHVybCkge1xuXG4gIGxldCByYWplX3NlY3Rpb25fZmxhZyA9IGZhbHNlXG4gIGxldCByYWplX3N0b3JlZF9zZWxlY3Rpb25cblxuICBlZGl0b3IuYWRkQnV0dG9uKCdyYWplX3NlY3Rpb24nLCB7XG4gICAgdHlwZTogJ21lbnVidXR0b24nLFxuICAgIHRleHQ6ICdIZWFkaW5ncycsXG4gICAgdGl0bGU6ICdoZWFkaW5nJyxcbiAgICBpY29uczogZmFsc2UsXG5cbiAgICAvLyBTZWN0aW9ucyBzdWIgbWVudVxuICAgIG1lbnU6IFt7XG4gICAgICB0ZXh0OiBgJHtIRUFESU5HfTEuYCxcbiAgICAgIG9uY2xpY2s6IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIHNlY3Rpb24uYWRkT3JEb3duVXBncmFkZShlLCAxKVxuICAgICAgfVxuICAgIH0sIHtcbiAgICAgIHRleHQ6IGAke0hFQURJTkd9MS4xLmAsXG4gICAgICBvbmNsaWNrOiBmdW5jdGlvbiAoZSkge1xuICAgICAgICBzZWN0aW9uLmFkZE9yRG93blVwZ3JhZGUoZSwgMilcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICB0ZXh0OiBgJHtIRUFESU5HfTEuMS4xLmAsXG4gICAgICBvbmNsaWNrOiBmdW5jdGlvbiAoZSkge1xuICAgICAgICBzZWN0aW9uLmFkZE9yRG93blVwZ3JhZGUoZSwgMylcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICB0ZXh0OiBgJHtIRUFESU5HfTEuMS4xLjEuYCxcbiAgICAgIG9uY2xpY2s6IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIHNlY3Rpb24uYWRkT3JEb3duVXBncmFkZShlLCA0KVxuICAgICAgfVxuICAgIH0sIHtcbiAgICAgIHRleHQ6IGAke0hFQURJTkd9MS4xLjEuMS4xLmAsXG4gICAgICBvbmNsaWNrOiBmdW5jdGlvbiAoZSkge1xuICAgICAgICBzZWN0aW9uLmFkZE9yRG93blVwZ3JhZGUoZSwgNSlcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICB0ZXh0OiBgJHtIRUFESU5HfTEuMS4xLjEuMS4xLmAsXG4gICAgICBvbmNsaWNrOiBmdW5jdGlvbiAoZSkge1xuICAgICAgICBzZWN0aW9uLmFkZE9yRG93blVwZ3JhZGUoZSwgNilcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICB0ZXh0OiAnU3BlY2lhbCcsXG4gICAgICBtZW51OiBbe1xuICAgICAgICAgIHRleHQ6ICdBYnN0cmFjdCcsXG4gICAgICAgICAgb25jbGljazogZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgICBzZWN0aW9uLmFkZEFic3RyYWN0KClcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICB0ZXh0OiAnQWNrbm93bGVkZ2VtZW50cycsXG4gICAgICAgICAgb25jbGljazogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VjdGlvbi5hZGRBY2tub3dsZWRnZW1lbnRzKClcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICB0ZXh0OiAnUmVmZXJlbmNlcycsXG4gICAgICAgICAgb25jbGljazogZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcblxuICAgICAgICAgICAgLy8gT25seSBpZiBiaWJsaW9ncmFwaHkgc2VjdGlvbiBkb2Vzbid0IGV4aXN0c1xuICAgICAgICAgICAgaWYgKCEkKEJJQkxJT0dSQVBIWV9TRUxFQ1RPUikubGVuZ3RoKSB7XG5cbiAgICAgICAgICAgICAgLy8gVE9ETyBjaGFuZ2UgaGVyZVxuICAgICAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgLy8gQWRkIG5ldyBiaWJsaW9lbnRyeVxuICAgICAgICAgICAgICAgIHNlY3Rpb24uYWRkQmlibGlvZW50cnkoKVxuXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIGlmcmFtZVxuICAgICAgICAgICAgICAgIHVwZGF0ZUlmcmFtZUZyb21TYXZlZENvbnRlbnQoKVxuXG4gICAgICAgICAgICAgICAgLy9tb3ZlIGNhcmV0IGFuZCBzZXQgZm9jdXMgdG8gYWN0aXZlIGFkaXRvciAjMTA1XG4gICAgICAgICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLnNlbGVjdCh0aW55bWNlLmFjdGl2ZUVkaXRvci5kb20uc2VsZWN0KGAke0JJQkxJT0VOVFJZX1NFTEVDVE9SfTpsYXN0LWNoaWxkYClbMF0sIHRydWUpXG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9IGVsc2VcbiAgICAgICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLnNlbGVjdCh0aW55bWNlLmFjdGl2ZUVkaXRvci5kb20uc2VsZWN0KGAke0JJQkxJT0dSQVBIWV9TRUxFQ1RPUn0+aDFgKVswXSlcblxuICAgICAgICAgICAgc2Nyb2xsVG8oYCR7QklCTElPRU5UUllfU0VMRUNUT1J9Omxhc3QtY2hpbGRgKVxuXG4gICAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5mb2N1cygpXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICBdXG4gICAgfV1cbiAgfSlcblxuICBlZGl0b3Iub24oJ2tleURvd24nLCBmdW5jdGlvbiAoZSkge1xuXG4gICAgLy8gaW5zdGFuY2Ugb2YgdGhlIHNlbGVjdGVkIGVsZW1lbnRcbiAgICBsZXQgc2VsZWN0ZWRFbGVtZW50ID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuICAgIGxldCBzZWxlY3Rpb24gPSB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb25cblxuICAgIGxldCBzdGFydE5vZGUgPSAkKHNlbGVjdGlvbi5nZXRSbmcoKS5zdGFydENvbnRhaW5lcilcbiAgICBsZXQgZW5kTm9kZSA9ICQoc2VsZWN0aW9uLmdldFJuZygpLmVuZENvbnRhaW5lcilcblxuICAgIGlmICgoc2VjdGlvbi5jdXJzb3JJblNlY3Rpb24oc2VsZWN0aW9uKSB8fCBzZWN0aW9uLmN1cnNvckluU3BlY2lhbFNlY3Rpb24oc2VsZWN0aW9uKSkpIHtcblxuICAgICAgLy8gQmxvY2sgc3BlY2lhbCBjaGFycyBpbiBzcGVjaWFsIGVsZW1lbnRzXG4gICAgICBpZiAoY2hlY2tJZlNwZWNpYWxDaGFyKGUua2V5Q29kZSkgJiZcbiAgICAgICAgKHN0YXJ0Tm9kZS5wYXJlbnRzKFNQRUNJQUxfU0VDVElPTl9TRUxFQ1RPUikubGVuZ3RoIHx8IGVuZE5vZGUucGFyZW50cyhTUEVDSUFMX1NFQ1RJT05fU0VMRUNUT1IpLmxlbmd0aCkgJiZcbiAgICAgICAgKHN0YXJ0Tm9kZS5wYXJlbnRzKCdoMScpLmxlbmd0aCA+IDAgfHwgZW5kTm9kZS5wYXJlbnRzKCdoMScpLmxlbmd0aCA+IDApKSB7XG5cbiAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKVxuICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgIH1cblxuICAgICAgLyoqXG4gICAgICAgKiBDaGVjayBpZiBCQUNLU1BBQ0Ugb3IgQ0FOQyBhcmUgcHJlc3NlZFxuICAgICAgICovXG4gICAgICBpZiAoZS5rZXlDb2RlID09IDggfHwgZS5rZXlDb2RlID09IDQ2KSB7XG5cbiAgICAgICAgLy8gSWYgdGhlIHNlY3Rpb24gaXNuJ3QgY29sbGFwc2VkXG4gICAgICAgIGlmICghdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmlzQ29sbGFwc2VkKCkpIHtcblxuICAgICAgICAgIC8vIElmIHRoZSBzZWxlY3Rpb24gY29udGFpbnMgYXQgbGVhc3QgYSBiaWJsaW9lbnRyeVxuICAgICAgICAgIGlmIChzZWxlY3Rpb25Db250ZW50LmNvbnRhaW5zQmlibGlvZW50cmllcyhzZWxlY3Rpb24pKSB7XG5cbiAgICAgICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKClcblxuICAgICAgICAgICAgLy8gQm90aCBkZWxldGUgZXZlbnQgYW5kIHVwZGF0ZSBhcmUgc3RvcmVkIGluIGEgc2luZ2xlIHVuZG8gbGV2ZWxcbiAgICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5leGVjQ29tbWFuZCgnZGVsZXRlJylcbiAgICAgICAgICAgICAgc2VjdGlvbi51cGRhdGVCaWJsaW9ncmFwaHlTZWN0aW9uKClcbiAgICAgICAgICAgICAgdXBkYXRlUmVmZXJlbmNlcygpXG5cbiAgICAgICAgICAgICAgLy8gdXBkYXRlIGlmcmFtZVxuICAgICAgICAgICAgICB1cGRhdGVJZnJhbWVGcm9tU2F2ZWRDb250ZW50KClcbiAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIElmIHRoZSBzZWxlY3Rpb24gY29udGFpbnMgdGhlIGVudGlyZSBiaWJsaW9ncmFwaHkgc2VjdGlvblxuICAgICAgICAgIGlmIChzZWxlY3Rpb25Db250ZW50LmNvbnRhaW5zQmlibGlvZ3JhcGh5KHNlbGVjdGlvbikpIHtcblxuICAgICAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKVxuXG4gICAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICAgICAgLy8gRXhlY3V0ZSBub3JtYWwgZGVsZXRlXG4gICAgICAgICAgICAgICQoQklCTElPR1JBUEhZX1NFTEVDVE9SKS5yZW1vdmUoKVxuICAgICAgICAgICAgICB1cGRhdGVSZWZlcmVuY2VzKClcblxuICAgICAgICAgICAgICAvLyBVcGRhdGUgaWZyYW1lIGFuZCByZXN0b3JlIHNlbGVjdGlvblxuICAgICAgICAgICAgICB1cGRhdGVJZnJhbWVGcm9tU2F2ZWRDb250ZW50KClcbiAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIFJlc3RydWN0dXJlIHRoZSBlbnRpcmUgYm9keSBpZiB0aGUgc2VjdGlvbiBpc24ndCBjb2xsYXBzZWQgYW5kIG5vdCBpbnNpZGUgYSBzcGVjaWFsIHNlY3Rpb25cbiAgICAgICAgICBpZiAoIXNlY3Rpb24uY3Vyc29ySW5TcGVjaWFsU2VjdGlvbihzZWxlY3Rpb24pKSB7XG4gICAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpXG4gICAgICAgICAgICBzZWN0aW9uLm1hbmFnZURlbGV0ZSgpXG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gSWYgdGhlIHNlY3Rpb24gaXMgY29sbGFwc2VkXG4gICAgICAgIGlmICh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uaXNDb2xsYXBzZWQoKSkge1xuXG4gICAgICAgICAgLy8gSWYgdGhlIHNlbGVjdGlvbiBpcyBpbnNpZGUgYSBzcGVjaWFsIHNlY3Rpb25cbiAgICAgICAgICBpZiAoc2VjdGlvbi5jdXJzb3JJblNwZWNpYWxTZWN0aW9uKHNlbGVjdGlvbikpIHtcblxuICAgICAgICAgICAgLy8gUmVtb3ZlIHNwZWNpYWwgc2VjdGlvbiBpZiB0aGUgY3Vyc29yIGlzIGF0IHRoZSBiZWdpbm5pbmdcbiAgICAgICAgICAgIGlmICgoc3RhcnROb2RlLnBhcmVudHMoJ2gxJykubGVuZ3RoIHx8IHN0YXJ0Tm9kZS5pcygnaDEnKSkgJiYgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldFJuZygpLnN0YXJ0T2Zmc2V0ID09IDApIHtcblxuICAgICAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpXG4gICAgICAgICAgICAgIHNlY3Rpb24uZGVsZXRlU3BlY2lhbFNlY3Rpb24oc2VsZWN0ZWRFbGVtZW50KVxuICAgICAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gaWYgdGhlIGN1cnNvciBpcyBhdCB0aGUgYmVnaW5uaW5nIG9mIGEgZW1wdHkgcCBpbnNpZGUgaXRzIGJpYmxpb2VudHJ5LCByZW1vdmUgaXQgYW5kIHVwZGF0ZSB0aGUgcmVmZXJlbmNlc1xuICAgICAgICAgICAgaWYgKHNlbGVjdGlvbkNvbnRlbnQuaXNBdEJlZ2lubmluZ09mRW1wdHlCaWJsaW9lbnRyeShzZWxlY3Rpb24pKSB7XG5cbiAgICAgICAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKVxuXG4gICAgICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgICAgICAgIC8vIEV4ZWN1dGUgbm9ybWFsIGRlbGV0ZVxuICAgICAgICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLmV4ZWNDb21tYW5kKCdkZWxldGUnKVxuICAgICAgICAgICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuICAgICAgICAgICAgICAgIHVwZGF0ZVJlZmVyZW5jZXMoKVxuXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIGlmcmFtZSBhbmQgcmVzdG9yZSBzZWxlY3Rpb25cbiAgICAgICAgICAgICAgICB1cGRhdGVJZnJhbWVGcm9tU2F2ZWRDb250ZW50KClcbiAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gaWYgdGhlIGN1cnNvciBpcyBhdCB0aGUgYmVnaW5uaW5nIG9mIHRoZSBmaXJzdCBlbXB0eSBwIGluc2lkZSBhIGZvb3Rub3RlLCByZW1vdmUgaXQgYW5kIHVwZGF0ZSB0aGUgcmVmZXJlbmNlc1xuICAgICAgICAgICAgaWYgKHNlbGVjdGlvbkNvbnRlbnQuaXNBdEJlZ2lubmluZ09mRW1wdHlFbmRub3RlKHNlbGVjdGlvbikpIHtcblxuICAgICAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpXG5cbiAgICAgICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgICAgICAgbGV0IGVuZG5vdGUgPSBzZWxlY3RlZEVsZW1lbnQucGFyZW50cyhFTkROT1RFX1NFTEVDVE9SKVxuXG4gICAgICAgICAgICAgICAgLy8gSWYgdGhlIGN1cnJlbnQgZW5kbm90ZSBpcyB0aGUgbGFzdCBvbmUgcmVtb3ZlIHRoZSBlbnRpcmUgZm9vdG5vdGVzIHNlY3Rpb25cbiAgICAgICAgICAgICAgICBpZiAoIWVuZG5vdGUucHJldihFTkROT1RFX1NFTEVDVE9SKS5sZW5ndGggJiYgIWVuZG5vdGUubmV4dChFTkROT1RFX1NFTEVDVE9SKS5sZW5ndGgpXG4gICAgICAgICAgICAgICAgICAkKEVORE5PVEVTX1NFTEVDVE9SKS5yZW1vdmUoKVxuXG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5leGVjQ29tbWFuZCgnZGVsZXRlJylcbiAgICAgICAgICAgICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHVwZGF0ZVJlZmVyZW5jZXMoKVxuXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIGlmcmFtZSBhbmQgcmVzdG9yZSBzZWxlY3Rpb25cbiAgICAgICAgICAgICAgICB1cGRhdGVJZnJhbWVGcm9tU2F2ZWRDb250ZW50KClcbiAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBQcmV2ZW50IHJlbW92ZSBmcm9tIGhlYWRlclxuICAgICAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LmlzKE5PTl9FRElUQUJMRV9IRUFERVJfU0VMRUNUT1IpIHx8XG4gICAgICAgICAgKHNlbGVjdGVkRWxlbWVudC5hdHRyKCdkYXRhLW1jZS1jYXJldCcpID09ICdhZnRlcicgJiYgc2VsZWN0ZWRFbGVtZW50LnBhcmVudCgpLmlzKFJBSkVfU0VMRUNUT1IpKSB8fFxuICAgICAgICAgIChzZWxlY3RlZEVsZW1lbnQuYXR0cignZGF0YS1tY2UtY2FyZXQnKSAmJiBzZWxlY3RlZEVsZW1lbnQucGFyZW50KCkuaXMoUkFKRV9TRUxFQ1RPUikpID09ICdiZWZvcmUnKVxuICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgfVxuXG4gICAgICAvKipcbiAgICAgICAqIENoZWNrIGlmIEVOVEVSIGlzIHByZXNzZWRcbiAgICAgICAqL1xuICAgICAgaWYgKGUua2V5Q29kZSA9PSAxMykge1xuXG4gICAgICAgIC8vIFdoZW4gZW50ZXIgaXMgcHJlc3NlZCBpbnNpZGUgYW4gaGVhZGVyLCBub3QgYXQgdGhlIGVuZCBvZiBpdFxuICAgICAgICBpZiAoY3Vyc29yLmlzSW5zaWRlSGVhZGluZyhzZWxlY3Rpb24pKSB7XG4gICAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKVxuICAgICAgICAgIHNlY3Rpb24uYWRkV2l0aEVudGVyKClcbiAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgICAgfVxuICBcbiAgICAgICAgLy8gSWYgc2VsZWN0aW9uIGlzIGJlZm9yZS9hZnRlciBoZWFkZXJcbiAgICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC5pcygncCcpKSB7XG4gIFxuICAgICAgICAgIC8vIEJsb2NrIGVudGVyIGJlZm9yZSBoZWFkZXJcbiAgICAgICAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LmF0dHIoJ2RhdGEtbWNlLWNhcmV0JykgPT0gJ2JlZm9yZScpe1xuICAgICAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgICAgfVxuICBcbiAgXG4gICAgICAgICAgLy8gQWRkIG5ldyBzZWN0aW9uIGFmdGVyIGhlYWRlclxuICAgICAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQuYXR0cignZGF0YS1tY2UtY2FyZXQnKSA9PSAnYWZ0ZXInKSB7XG4gICAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpXG4gICAgICAgICAgICBzZWN0aW9uLmFkZCgxKVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gIFxuICAgICAgICAvLyBJZiBlbnRlciBpcyBwcmVzc2VkIGluc2lkZSBiaWJsaW9ncmFwaHkgc2VsZWN0b3JcbiAgICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKEJJQkxJT0dSQVBIWV9TRUxFQ1RPUikubGVuZ3RoKSB7XG4gIFxuICAgICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuICBcbiAgICAgICAgICBsZXQgaWQgPSBnZXRTdWNjZXNzaXZlRWxlbWVudElkKEJJQkxJT0VOVFJZX1NFTEVDVE9SLCBCSUJMSU9FTlRSWV9TVUZGSVgpXG4gIFxuICAgICAgICAgIC8vIFByZXNzaW5nIGVudGVyIGluIGgxIHdpbGwgYWRkIGEgbmV3IGJpYmxpb2VudHJ5IGFuZCBjYXJldCByZXBvc2l0aW9uXG4gICAgICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC5pcygnaDEnKSkge1xuICBcbiAgICAgICAgICAgIHNlY3Rpb24uYWRkQmlibGlvZW50cnkoaWQpXG4gICAgICAgICAgICB1cGRhdGVJZnJhbWVGcm9tU2F2ZWRDb250ZW50KClcbiAgICAgICAgICB9XG4gIFxuICAgICAgICAgIC8vIElmIHNlbGVjdGVkIGVsZW1lbnQgaXMgaW5zaWRlIHRleHRcbiAgICAgICAgICBlbHNlIGlmIChzZWxlY3RlZEVsZW1lbnQuaXMoJ3AnKSlcbiAgICAgICAgICAgIHNlY3Rpb24uYWRkQmlibGlvZW50cnkoaWQsIG51bGwsIHNlbGVjdGVkRWxlbWVudC5wYXJlbnQoJ2xpJykpXG4gIFxuICBcbiAgICAgICAgICAvLyBJZiBzZWxlY3RlZCBlbGVtZW50IGlzIHdpdGhvdXQgdGV4dFxuICAgICAgICAgIGVsc2UgaWYgKHNlbGVjdGVkRWxlbWVudC5pcygnbGknKSlcbiAgICAgICAgICAgIHNlY3Rpb24uYWRkQmlibGlvZW50cnkoaWQsIG51bGwsIHNlbGVjdGVkRWxlbWVudClcbiAgXG4gICAgICAgICAgLy8gTW92ZSBjYXJldCAjMTA1XG4gICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLnNldEN1cnNvckxvY2F0aW9uKHRpbnltY2UuYWN0aXZlRWRpdG9yLmRvbS5zZWxlY3QoYCR7QklCTElPRU5UUllfU0VMRUNUT1J9IyR7aWR9ID4gcGApWzBdLCBmYWxzZSlcbiAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgICAgfVxuICBcbiAgICAgICAgLy8gQWRkaW5nIHNlY3Rpb25zIHdpdGggc2hvcnRjdXRzICNcbiAgICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC5pcygncCcpICYmIHNlbGVjdGVkRWxlbWVudC50ZXh0KCkudHJpbSgpLnN1YnN0cmluZygwLCAxKSA9PSAnIycpIHtcbiAgXG4gICAgICAgICAgbGV0IGxldmVsID0gc2VjdGlvbi5nZXRMZXZlbEZyb21IYXNoKHNlbGVjdGVkRWxlbWVudC50ZXh0KCkudHJpbSgpKVxuICAgICAgICAgIGxldCBkZWVwbmVzcyA9ICQoc2VsZWN0ZWRFbGVtZW50KS5wYXJlbnRzVW50aWwoUkFKRV9TRUxFQ1RPUikubGVuZ3RoIC0gbGV2ZWwgKyAxXG4gIFxuICAgICAgICAgIC8vIEluc2VydCBzZWN0aW9uIG9ubHkgaWYgY2FyZXQgaXMgaW5zaWRlIGFic3RyYWN0IHNlY3Rpb24sIGFuZCB1c2VyIGlzIGdvaW5nIHRvIGluc2VydCBhIHN1YiBzZWN0aW9uXG4gICAgICAgICAgLy8gT1IgdGhlIGN1cnNvciBpc24ndCBpbnNpZGUgb3RoZXIgc3BlY2lhbCBzZWN0aW9uc1xuICAgICAgICAgIC8vIEFORCBzZWxlY3RlZEVsZW1lbnQgaXNuJ3QgaW5zaWRlIGEgZmlndXJlXG4gICAgICAgICAgaWYgKCgoc2VsZWN0ZWRFbGVtZW50LnBhcmVudHMoQUJTVFJBQ1RfU0VMRUNUT1IpLmxlbmd0aCAmJiBkZWVwbmVzcyA+IDApIHx8ICFzZWxlY3RlZEVsZW1lbnQucGFyZW50cyhTUEVDSUFMX1NFQ1RJT05fU0VMRUNUT1IpLmxlbmd0aCkgJiYgIXNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKEZJR1VSRV9TRUxFQ1RPUikubGVuZ3RoKSB7XG4gIFxuICAgICAgICAgICAgc2VjdGlvbi5hZGQobGV2ZWwsIHNlbGVjdGVkRWxlbWVudC50ZXh0KCkuc3Vic3RyaW5nKGxldmVsKS50cmltKCkpXG4gICAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH0pXG5cbiAgZWRpdG9yLm9uKCdOb2RlQ2hhbmdlJywgZnVuY3Rpb24gKGUpIHtcbiAgICBzZWN0aW9uLnVwZGF0ZVNlY3Rpb25Ub29sYmFyKClcbiAgfSlcbn0pXG5cbnNlY3Rpb24gPSB7XG5cbiAgLyoqXG4gICAqIEZ1bmN0aW9uIGNhbGxlZCB3aGVuIGEgbmV3IHNlY3Rpb24gbmVlZHMgdG8gYmUgYXR0YWNoZWQsIHdpdGggYnV0dG9uc1xuICAgKi9cbiAgYWRkOiBmdW5jdGlvbiAobGV2ZWwsIHRleHQpIHtcblxuICAgIC8vIFNlbGVjdCBjdXJyZW50IG5vZGVcbiAgICBsZXQgc2VsZWN0ZWRFbGVtZW50ID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuXG4gICAgLy8gQ3JlYXRlIHRoZSBzZWN0aW9uXG4gICAgbGV0IG5ld1NlY3Rpb24gPSB0aGlzLmNyZWF0ZSh0ZXh0ICE9IG51bGwgPyB0ZXh0IDogc2VsZWN0ZWRFbGVtZW50Lmh0bWwoKS50cmltKCksIGxldmVsKVxuXG4gICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAvLyBDaGVjayB3aGF0IGtpbmQgb2Ygc2VjdGlvbiBuZWVkcyB0byBiZSBpbnNlcnRlZFxuICAgICAgaWYgKHNlY3Rpb24ubWFuYWdlU2VjdGlvbihzZWxlY3RlZEVsZW1lbnQsIG5ld1NlY3Rpb24sIGxldmVsID8gbGV2ZWwgOiBzZWxlY3RlZEVsZW1lbnQucGFyZW50c1VudGlsKFJBSkVfU0VMRUNUT1IpLmxlbmd0aCkpIHtcblxuICAgICAgICAvLyBSZW1vdmUgdGhlIHNlbGVjdGVkIHNlY3Rpb25cbiAgICAgICAgc2VsZWN0ZWRFbGVtZW50LnJlbW92ZSgpXG5cbiAgICAgICAgLy8gSWYgdGhlIG5ldyBoZWFkaW5nIGhhcyB0ZXh0IG5vZGVzLCB0aGUgb2Zmc2V0IHdvbid0IGJlIDAgKGFzIG5vcm1hbCkgYnV0IGluc3RlYWQgaXQnbGwgYmUgbGVuZ3RoIG9mIG5vZGUgdGV4dFxuICAgICAgICBtb3ZlQ2FyZXQobmV3U2VjdGlvbi5maW5kKCc6aGVhZGVyJykuZmlyc3QoKVswXSlcblxuICAgICAgICAvLyBVcGRhdGUgZWRpdG9yIGNvbnRlbnRcbiAgICAgICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG4gICAgICB9XG4gICAgfSlcbiAgfSxcblxuICAvKipcbiAgICogXG4gICAqL1xuICBhZGRPckRvd25VcGdyYWRlOiBmdW5jdGlvbiAoZSwgbGV2ZWwpIHtcblxuICAgIGxldCBzZWxlY3RlZE1lbnVJdGVtID0gJChlLnRhcmdldCkucGFyZW50KCcubWNlLW1lbnUtaXRlbScpXG5cbiAgICBpZiAoc2VsZWN0ZWRNZW51SXRlbS5hdHRyKERBVEFfVVBHUkFERSkpXG4gICAgICByZXR1cm4gdGhpcy51cGdyYWRlKClcblxuICAgIGlmIChzZWxlY3RlZE1lbnVJdGVtLmF0dHIoREFUQV9ET1dOR1JBREUpKVxuICAgICAgcmV0dXJuIHRoaXMuZG93bmdyYWRlKClcblxuICAgIHJldHVybiB0aGlzLmFkZChsZXZlbClcbiAgfSxcblxuICAvKipcbiAgICogRnVuY3Rpb24gY2FsbGVkIHdoZW4gYSBuZXcgc2VjdGlvbiBuZWVkcyB0byBiZSBhdHRhY2hlZCwgd2l0aCBidXR0b25zXG4gICAqL1xuICBhZGRXaXRoRW50ZXI6IGZ1bmN0aW9uICgpIHtcblxuICAgIC8vIFNlbGVjdCBjdXJyZW50IG5vZGVcbiAgICBsZXQgc2VsZWN0ZWRFbGVtZW50ID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuXG4gICAgLy8gSWYgdGhlIHNlY3Rpb24gaXNuJ3Qgc3BlY2lhbFxuICAgIGlmICghc2VsZWN0ZWRFbGVtZW50LnBhcmVudCgpLmF0dHIoJ3JvbGUnKSkge1xuXG4gICAgICBsZXZlbCA9IHNlbGVjdGVkRWxlbWVudC5wYXJlbnRzVW50aWwoUkFKRV9TRUxFQ1RPUikubGVuZ3RoXG5cbiAgICAgIC8vIENyZWF0ZSB0aGUgc2VjdGlvblxuICAgICAgbGV0IG5ld1NlY3Rpb24gPSB0aGlzLmNyZWF0ZShzZWxlY3RlZEVsZW1lbnQudGV4dCgpLnRyaW0oKS5zdWJzdHJpbmcodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldFJuZygpLnN0YXJ0T2Zmc2V0KSwgbGV2ZWwpXG5cbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAvLyBDaGVjayB3aGF0IGtpbmQgb2Ygc2VjdGlvbiBuZWVkcyB0byBiZSBpbnNlcnRlZFxuICAgICAgICBzZWN0aW9uLm1hbmFnZVNlY3Rpb24oc2VsZWN0ZWRFbGVtZW50LCBuZXdTZWN0aW9uLCBsZXZlbClcblxuICAgICAgICAvLyBSZW1vdmUgdGhlIHNlbGVjdGVkIHNlY3Rpb25cbiAgICAgICAgc2VsZWN0ZWRFbGVtZW50Lmh0bWwoc2VsZWN0ZWRFbGVtZW50LnRleHQoKS50cmltKCkuc3Vic3RyaW5nKDAsIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRSbmcoKS5zdGFydE9mZnNldCkpXG5cbiAgICAgICAgbW92ZUNhcmV0KG5ld1NlY3Rpb24uZmluZCgnOmhlYWRlcicpLmZpcnN0KClbMF0sIHRydWUpXG5cbiAgICAgICAgLy8gVXBkYXRlIGVkaXRvclxuICAgICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcbiAgICAgIH0pXG4gICAgfSBlbHNlXG4gICAgICBub3RpZnkoJ0Vycm9yLCBoZWFkZXJzIG9mIHNwZWNpYWwgc2VjdGlvbnMgKGFic3RyYWN0LCBhY2tub3dsZWRtZW50cykgY2Fubm90IGJlIHNwbGl0dGVkJywgJ2Vycm9yJywgNDAwMClcbiAgfSxcblxuICAvKipcbiAgICogR2V0IHRoZSBsYXN0IGluc2VydGVkIGlkXG4gICAqL1xuICBnZXROZXh0SWQ6IGZ1bmN0aW9uICgpIHtcbiAgICBsZXQgaWQgPSAwXG4gICAgJCgnc2VjdGlvbltpZF0nKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgIGlmICgkKHRoaXMpLmF0dHIoJ2lkJykuaW5kZXhPZignc2VjdGlvbicpID4gLTEpIHtcbiAgICAgICAgbGV0IGN1cnJJZCA9IHBhcnNlSW50KCQodGhpcykuYXR0cignaWQnKS5yZXBsYWNlKCdzZWN0aW9uJywgJycpKVxuICAgICAgICBpZCA9IGlkID4gY3VycklkID8gaWQgOiBjdXJySWRcbiAgICAgIH1cbiAgICB9KVxuICAgIHJldHVybiBgc2VjdGlvbiR7aWQrMX1gXG4gIH0sXG5cbiAgLyoqXG4gICAqIFJldHJpZXZlIGFuZCB0aGVuIHJlbW92ZSBldmVyeSBzdWNjZXNzaXZlIGVsZW1lbnRzIFxuICAgKi9cbiAgZ2V0U3VjY2Vzc2l2ZUVsZW1lbnRzOiBmdW5jdGlvbiAoZWxlbWVudCwgZGVlcG5lc3MpIHtcblxuICAgIGxldCBzdWNjZXNzaXZlRWxlbWVudHMgPSAkKCc8ZGl2PjwvZGl2PicpXG5cbiAgICB3aGlsZSAoZGVlcG5lc3MgPj0gMCkge1xuXG4gICAgICBpZiAoZWxlbWVudC5uZXh0QWxsKCc6bm90KC5mb290ZXIpJykpIHtcblxuICAgICAgICAvLyBJZiB0aGUgZGVlcG5lc3MgaXMgMCwgb25seSBwYXJhZ3JhcGggYXJlIHNhdmVkIChub3Qgc2VjdGlvbnMpXG4gICAgICAgIGlmIChkZWVwbmVzcyA9PSAwKSB7XG4gICAgICAgICAgLy8gU3VjY2Vzc2l2ZSBlbGVtZW50cyBjYW4gYmUgcCBvciBmaWd1cmVzXG4gICAgICAgICAgc3VjY2Vzc2l2ZUVsZW1lbnRzLmFwcGVuZChlbGVtZW50Lm5leHRBbGwoYHAsJHtGSUdVUkVfU0VMRUNUT1J9YCkpXG4gICAgICAgICAgZWxlbWVudC5uZXh0QWxsKCkucmVtb3ZlKGBwLCR7RklHVVJFX1NFTEVDVE9SfWApXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc3VjY2Vzc2l2ZUVsZW1lbnRzLmFwcGVuZChlbGVtZW50Lm5leHRBbGwoKSlcbiAgICAgICAgICBlbGVtZW50Lm5leHRBbGwoKS5yZW1vdmUoKVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGVsZW1lbnQgPSBlbGVtZW50LnBhcmVudCgnc2VjdGlvbicpXG4gICAgICBkZWVwbmVzcy0tXG4gICAgfVxuXG4gICAgcmV0dXJuICQoc3VjY2Vzc2l2ZUVsZW1lbnRzLmh0bWwoKSlcbiAgfSxcblxuICAvKipcbiAgICogXG4gICAqL1xuICBnZXRMZXZlbEZyb21IYXNoOiBmdW5jdGlvbiAodGV4dCkge1xuXG4gICAgbGV0IGxldmVsID0gMFxuICAgIHRleHQgPSB0ZXh0LnN1YnN0cmluZygwLCB0ZXh0Lmxlbmd0aCA+PSA2ID8gNiA6IHRleHQubGVuZ3RoKVxuXG4gICAgd2hpbGUgKHRleHQubGVuZ3RoID4gMCkge1xuXG4gICAgICBpZiAodGV4dC5zdWJzdHJpbmcodGV4dC5sZW5ndGggLSAxKSA9PSAnIycpXG4gICAgICAgIGxldmVsKytcblxuICAgICAgICB0ZXh0ID0gdGV4dC5zdWJzdHJpbmcoMCwgdGV4dC5sZW5ndGggLSAxKVxuICAgIH1cblxuICAgIHJldHVybiBsZXZlbFxuICB9LFxuXG4gIC8qKlxuICAgKiBSZXR1cm4gSlFldXJ5IG9iamVjdCB0aGF0IHJlcHJlc2VudCB0aGUgc2VjdGlvblxuICAgKi9cbiAgY3JlYXRlOiBmdW5jdGlvbiAodGV4dCwgbGV2ZWwpIHtcbiAgICAvLyBDcmVhdGUgdGhlIHNlY3Rpb25cblxuICAgIC8vIFRyaW0gd2hpdGUgc3BhY2VzIGFuZCBhZGQgemVyb19zcGFjZSBjaGFyIGlmIG5vdGhpbmcgaXMgaW5zaWRlXG5cbiAgICBpZiAodHlwZW9mIHRleHQgIT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgdGV4dCA9IHRleHQudHJpbSgpXG4gICAgICBpZiAodGV4dC5sZW5ndGggPT0gMClcbiAgICAgICAgdGV4dCA9IFwiPGJyPlwiXG4gICAgfSBlbHNlXG4gICAgICB0ZXh0ID0gXCI8YnI+XCJcblxuICAgIHJldHVybiAkKGA8c2VjdGlvbiBpZD1cIiR7dGhpcy5nZXROZXh0SWQoKX1cIj48aCR7bGV2ZWx9IGRhdGEtcmFzaC1vcmlnaW5hbC13cmFwcGVyPVwiaDFcIj4ke3RleHR9PC9oJHtsZXZlbH0+PC9zZWN0aW9uPmApXG4gIH0sXG5cbiAgLyoqXG4gICAqIENoZWNrIHdoYXQga2luZCBvZiBzZWN0aW9uIG5lZWRzIHRvIGJlIGFkZGVkLCBhbmQgcHJlY2VlZFxuICAgKi9cbiAgbWFuYWdlU2VjdGlvbjogZnVuY3Rpb24gKHNlbGVjdGVkRWxlbWVudCwgbmV3U2VjdGlvbiwgbGV2ZWwpIHtcblxuICAgIGxldCBkZWVwbmVzcyA9ICQoc2VsZWN0ZWRFbGVtZW50KS5wYXJlbnRzVW50aWwoUkFKRV9TRUxFQ1RPUikubGVuZ3RoIC0gbGV2ZWwgKyAxXG5cbiAgICBpZiAoZGVlcG5lc3MgPj0gMCkge1xuXG4gICAgICAvLyBCbG9jayBpbnNlcnQgc2VsZWN0aW9uIGlmIGNhcmV0IGlzIGluc2lkZSBzcGVjaWFsIHNlY3Rpb24sIGFuZCB1c2VyIGlzIGdvaW5nIHRvIGluc2VydCBhIHN1YiBzZWN0aW9uXG4gICAgICBpZiAoKHNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKFNQRUNJQUxfU0VDVElPTl9TRUxFQ1RPUikubGVuZ3RoICYmIGRlZXBuZXNzICE9IDEpIHx8IChzZWxlY3RlZEVsZW1lbnQucGFyZW50cyhBQ0tOT1dMRURHRU1FTlRTX1NFTEVDVE9SKS5sZW5ndGggJiZcbiAgICAgICAgICBzZWxlY3RlZEVsZW1lbnQucGFyZW50cyhCSUJMSU9HUkFQSFlfU0VMRUNUT1IpICYmXG4gICAgICAgICAgc2VsZWN0ZWRFbGVtZW50LnBhcmVudHMoRU5ETk9URVNfU0VMRUNUT1IpKSlcbiAgICAgICAgcmV0dXJuIGZhbHNlXG5cbiAgICAgIC8vIEdldCBkaXJlY3QgcGFyZW50IGFuZCBhbmNlc3RvciByZWZlcmVuY2VcbiAgICAgIGxldCBzdWNjZXNzaXZlRWxlbWVudHMgPSB0aGlzLmdldFN1Y2Nlc3NpdmVFbGVtZW50cyhzZWxlY3RlZEVsZW1lbnQsIGRlZXBuZXNzKVxuXG4gICAgICBpZiAoc3VjY2Vzc2l2ZUVsZW1lbnRzLmxlbmd0aClcbiAgICAgICAgbmV3U2VjdGlvbi5hcHBlbmQoc3VjY2Vzc2l2ZUVsZW1lbnRzKVxuXG4gICAgICAvLyBDQVNFOiBzdWIgc2VjdGlvblxuICAgICAgaWYgKGRlZXBuZXNzID09IDApXG4gICAgICAgIHNlbGVjdGVkRWxlbWVudC5hZnRlcihuZXdTZWN0aW9uKVxuXG4gICAgICAvLyBDQVNFOiBzaWJsaW5nIHNlY3Rpb25cbiAgICAgIGVsc2UgaWYgKGRlZXBuZXNzID09IDEpXG4gICAgICAgIHNlbGVjdGVkRWxlbWVudC5wYXJlbnQoJ3NlY3Rpb24nKS5hZnRlcihuZXdTZWN0aW9uKVxuXG4gICAgICAvLyBDQVNFOiBhbmNlc3RvciBzZWN0aW9uIGF0IGFueSB1cGxldmVsXG4gICAgICBlbHNlXG4gICAgICAgICQoc2VsZWN0ZWRFbGVtZW50LnBhcmVudHMoJ3NlY3Rpb24nKVtkZWVwbmVzcyAtIDFdKS5hZnRlcihuZXdTZWN0aW9uKVxuXG4gICAgICBoZWFkaW5nRGltZW5zaW9uKClcblxuICAgICAgcmV0dXJuIHRydWVcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIFxuICAgKi9cbiAgdXBncmFkZTogZnVuY3Rpb24gKCkge1xuXG4gICAgbGV0IHNlbGVjdGVkRWxlbWVudCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcblxuICAgIGlmIChzZWxlY3RlZEVsZW1lbnQuaXMoJzpoZWFkZXInKSkge1xuXG4gICAgICAvLyBHZXQgdGhlIHJlZmVyZW5jZXMgb2Ygc2VsZWN0ZWQgYW5kIHBhcmVudCBzZWN0aW9uXG4gICAgICBsZXQgc2VsZWN0ZWRTZWN0aW9uID0gc2VsZWN0ZWRFbGVtZW50LnBhcmVudChTRUNUSU9OX1NFTEVDVE9SKVxuICAgICAgbGV0IHBhcmVudFNlY3Rpb24gPSBzZWxlY3RlZFNlY3Rpb24ucGFyZW50KFNFQ1RJT05fU0VMRUNUT1IpXG5cbiAgICAgIC8vIElmIHRoZXJlIGlzIGEgcGFyZW50IHNlY3Rpb24gdXBncmFkZSBpcyBhbGxvd2VkXG4gICAgICBpZiAocGFyZW50U2VjdGlvbi5sZW5ndGgpIHtcblxuICAgICAgICAvLyBFdmVyeXRoaW5nIGluIGhlcmUsIGlzIGFuIGF0b21pYyB1bmRvIGxldmVsXG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgIC8vIFNhdmUgdGhlIHNlY3Rpb24gYW5kIGRldGFjaFxuICAgICAgICAgIGxldCBib2R5U2VjdGlvbiA9ICQoc2VsZWN0ZWRTZWN0aW9uWzBdLm91dGVySFRNTClcbiAgICAgICAgICBzZWxlY3RlZFNlY3Rpb24uZGV0YWNoKClcblxuICAgICAgICAgIC8vIFVwZGF0ZSBkaW1lbnNpb24gYW5kIG1vdmUgdGhlIHNlY3Rpb24gb3V0XG4gICAgICAgICAgcGFyZW50U2VjdGlvbi5hZnRlcihib2R5U2VjdGlvbilcblxuICAgICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuICAgICAgICAgIGhlYWRpbmdEaW1lbnNpb24oKVxuICAgICAgICAgIHVwZGF0ZUlmcmFtZUZyb21TYXZlZENvbnRlbnQoKVxuICAgICAgICB9KVxuICAgICAgfVxuXG4gICAgICAvLyBOb3RpZnkgZXJyb3JcbiAgICAgIGVsc2VcbiAgICAgICAgbm90aWZ5KEhFQURJTkdfVFJBU0ZPUk1BVElPTl9GT1JCSURERU4sICdlcnJvcicsIDIwMDApXG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGRvd25ncmFkZTogZnVuY3Rpb24gKCkge1xuXG4gICAgbGV0IHNlbGVjdGVkRWxlbWVudCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcblxuICAgIGlmIChzZWxlY3RlZEVsZW1lbnQuaXMoJ2gxLGgyLGgzLGg0LGg1LGg2JykpIHtcbiAgICAgIC8vIEdldCB0aGUgcmVmZXJlbmNlcyBvZiBzZWxlY3RlZCBhbmQgc2libGluZyBzZWN0aW9uXG4gICAgICBsZXQgc2VsZWN0ZWRTZWN0aW9uID0gc2VsZWN0ZWRFbGVtZW50LnBhcmVudChTRUNUSU9OX1NFTEVDVE9SKVxuICAgICAgbGV0IHNpYmxpbmdTZWN0aW9uID0gc2VsZWN0ZWRTZWN0aW9uLnByZXYoU0VDVElPTl9TRUxFQ1RPUilcblxuICAgICAgLy8gSWYgdGhlcmUgaXMgYSBwcmV2aW91cyBzaWJsaW5nIHNlY3Rpb24gZG93bmdyYWRlIGlzIGFsbG93ZWRcbiAgICAgIGlmIChzaWJsaW5nU2VjdGlvbi5sZW5ndGgpIHtcblxuICAgICAgICAvLyBFdmVyeXRoaW5nIGluIGhlcmUsIGlzIGFuIGF0b21pYyB1bmRvIGxldmVsXG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgIC8vIFNhdmUgdGhlIHNlY3Rpb24gYW5kIGRldGFjaFxuICAgICAgICAgIGxldCBib2R5U2VjdGlvbiA9ICQoc2VsZWN0ZWRTZWN0aW9uWzBdLm91dGVySFRNTClcbiAgICAgICAgICBzZWxlY3RlZFNlY3Rpb24uZGV0YWNoKClcblxuICAgICAgICAgIC8vIFVwZGF0ZSBkaW1lbnNpb24gYW5kIG1vdmUgdGhlIHNlY3Rpb24gb3V0XG4gICAgICAgICAgc2libGluZ1NlY3Rpb24uYXBwZW5kKGJvZHlTZWN0aW9uKVxuXG4gICAgICAgICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG4gICAgICAgICAgLy8gUmVmcmVzaCB0aW55bWNlIGNvbnRlbnQgYW5kIHNldCB0aGUgaGVhZGluZyBkaW1lbnNpb25cbiAgICAgICAgICBoZWFkaW5nRGltZW5zaW9uKClcbiAgICAgICAgICB1cGRhdGVJZnJhbWVGcm9tU2F2ZWRDb250ZW50KClcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBOb3RpZnkgZXJyb3JcbiAgICBlbHNlXG4gICAgICBub3RpZnkoSEVBRElOR19UUkFTRk9STUFUSU9OX0ZPUkJJRERFTiwgJ2Vycm9yJywgMjAwMClcbiAgfSxcblxuICAvKipcbiAgICogXG4gICAqL1xuICBhZGRBYnN0cmFjdDogZnVuY3Rpb24gKCkge1xuXG4gICAgaWYgKCEkKEFCU1RSQUNUX1NFTEVDVE9SKS5sZW5ndGgpIHtcblxuICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIC8vIFRoaXMgc2VjdGlvbiBjYW4gb25seSBiZSBwbGFjZWQgYWZ0ZXIgbm9uIGVkaXRhYmxlIGhlYWRlclxuICAgICAgICAkKE5PTl9FRElUQUJMRV9IRUFERVJfU0VMRUNUT1IpLmFmdGVyKGA8c2VjdGlvbiBpZD1cImRvYy1hYnN0cmFjdFwiIHJvbGU9XCJkb2MtYWJzdHJhY3RcIj48aDE+QWJzdHJhY3Q8L2gxPjwvc2VjdGlvbj5gKVxuXG4gICAgICAgIHVwZGF0ZUlmcmFtZUZyb21TYXZlZENvbnRlbnQoKVxuICAgICAgfSlcbiAgICB9XG5cbiAgICAvL21vdmUgY2FyZXQgYW5kIHNldCBmb2N1cyB0byBhY3RpdmUgYWRpdG9yICMxMDVcbiAgICBtb3ZlQ2FyZXQodGlueW1jZS5hY3RpdmVFZGl0b3IuZG9tLnNlbGVjdChgJHtBQlNUUkFDVF9TRUxFQ1RPUn0gPiBoMWApWzBdKVxuICAgIHNjcm9sbFRvKEFCU1RSQUNUX1NFTEVDVE9SKVxuICB9LFxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGFkZEFja25vd2xlZGdlbWVudHM6IGZ1bmN0aW9uICgpIHtcblxuICAgIGlmICghJChBQ0tOT1dMRURHRU1FTlRTX1NFTEVDVE9SKS5sZW5ndGgpIHtcblxuICAgICAgbGV0IGFjayA9ICQoYDxzZWN0aW9uIGlkPVwiZG9jLWFja25vd2xlZGdlbWVudHNcIiByb2xlPVwiZG9jLWFja25vd2xlZGdlbWVudHNcIj48aDE+QWNrbm93bGVkZ2VtZW50czwvaDE+PC9zZWN0aW9uPmApXG5cbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAvLyBJbnNlcnQgdGhpcyBzZWN0aW9uIGFmdGVyIGxhc3Qgbm9uIHNwZWNpYWwgc2VjdGlvbiBcbiAgICAgICAgLy8gT1IgYWZ0ZXIgYWJzdHJhY3Qgc2VjdGlvbiBcbiAgICAgICAgLy8gT1IgYWZ0ZXIgbm9uIGVkaXRhYmxlIGhlYWRlclxuICAgICAgICBpZiAoJChNQUlOX1NFQ1RJT05fU0VMRUNUT1IpLmxlbmd0aClcbiAgICAgICAgICAkKE1BSU5fU0VDVElPTl9TRUxFQ1RPUikubGFzdCgpLmFmdGVyKGFjaylcblxuICAgICAgICBlbHNlIGlmICgkKEFCU1RSQUNUX1NFTEVDVE9SKS5sZW5ndGgpXG4gICAgICAgICAgJChBQlNUUkFDVF9TRUxFQ1RPUikuYWZ0ZXIoYWNrKVxuXG4gICAgICAgIGVsc2VcbiAgICAgICAgICAkKE5PTl9FRElUQUJMRV9IRUFERVJfU0VMRUNUT1IpLmFmdGVyKGFjaylcblxuICAgICAgICB1cGRhdGVJZnJhbWVGcm9tU2F2ZWRDb250ZW50KClcbiAgICAgIH0pXG4gICAgfVxuXG4gICAgLy9tb3ZlIGNhcmV0IGFuZCBzZXQgZm9jdXMgdG8gYWN0aXZlIGFkaXRvciAjMTA1XG4gICAgbW92ZUNhcmV0KHRpbnltY2UuYWN0aXZlRWRpdG9yLmRvbS5zZWxlY3QoYCR7QUNLTk9XTEVER0VNRU5UU19TRUxFQ1RPUn0gPiBoMWApWzBdKVxuICAgIHNjcm9sbFRvKEFDS05PV0xFREdFTUVOVFNfU0VMRUNUT1IpXG4gIH0sXG5cbiAgLyoqXG4gICAqIFRoaXMgbWV0aG9kIGlzIHRoZSBtYWluIG9uZS4gSXQncyBjYWxsZWQgYmVjYXVzZSBhbGwgdGltZXMgdGhlIGludGVudCBpcyB0byBhZGQgYSBuZXcgYmlibGlvZW50cnkgKHNpbmdsZSByZWZlcmVuY2UpXG4gICAqIFRoZW4gaXQgY2hlY2tzIGlmIGlzIG5lY2Vzc2FyeSB0byBhZGQgdGhlIGVudGlyZSA8c2VjdGlvbj4gb3Igb25seSB0aGUgbWlzc2luZyA8dWw+XG4gICAqL1xuICBhZGRCaWJsaW9lbnRyeTogZnVuY3Rpb24gKGlkLCB0ZXh0LCBsaXN0SXRlbSkge1xuXG4gICAgLy8gQWRkIGJpYmxpb2dyYXBoeSBzZWN0aW9uIGlmIG5vdCBleGlzdHNcbiAgICBpZiAoISQoQklCTElPR1JBUEhZX1NFTEVDVE9SKS5sZW5ndGgpIHtcblxuICAgICAgbGV0IGJpYmxpb2dyYXBoeSA9ICQoYDxzZWN0aW9uIGlkPVwiZG9jLWJpYmxpb2dyYXBoeVwiIHJvbGU9XCJkb2MtYmlibGlvZ3JhcGh5XCI+PGgxPlJlZmVyZW5jZXM8L2gxPjx1bD48L3VsPjwvc2VjdGlvbj5gKVxuXG4gICAgICAvLyBUaGlzIHNlY3Rpb24gaXMgYWRkZWQgYWZ0ZXIgYWNrbm93bGVkZ2VtZW50cyBzZWN0aW9uXG4gICAgICAvLyBPUiBhZnRlciBsYXN0IG5vbiBzcGVjaWFsIHNlY3Rpb25cbiAgICAgIC8vIE9SIGFmdGVyIGFic3RyYWN0IHNlY3Rpb25cbiAgICAgIC8vIE9SIGFmdGVyIG5vbiBlZGl0YWJsZSBoZWFkZXIgXG4gICAgICBpZiAoJChBQ0tOT1dMRURHRU1FTlRTX1NFTEVDVE9SKS5sZW5ndGgpXG4gICAgICAgICQoQUNLTk9XTEVER0VNRU5UU19TRUxFQ1RPUikuYWZ0ZXIoYmlibGlvZ3JhcGh5KVxuXG4gICAgICBlbHNlIGlmICgkKE1BSU5fU0VDVElPTl9TRUxFQ1RPUikubGVuZ3RoKVxuICAgICAgICAkKE1BSU5fU0VDVElPTl9TRUxFQ1RPUikubGFzdCgpLmFmdGVyKGJpYmxpb2dyYXBoeSlcblxuICAgICAgZWxzZSBpZiAoJChBQlNUUkFDVF9TRUxFQ1RPUikubGVuZ3RoKVxuICAgICAgICAkKEFCU1RSQUNUX1NFTEVDVE9SKS5hZnRlcihiaWJsaW9ncmFwaHkpXG5cbiAgICAgIGVsc2VcbiAgICAgICAgJChOT05fRURJVEFCTEVfSEVBREVSX1NFTEVDVE9SKS5hZnRlcihiaWJsaW9ncmFwaHkpXG5cbiAgICB9XG5cbiAgICAvLyBBZGQgdWwgaW4gYmlibGlvZ3JhcGh5IHNlY3Rpb24gaWYgbm90IGV4aXN0c1xuICAgIGlmICghJChCSUJMSU9HUkFQSFlfU0VMRUNUT1IpLmZpbmQoJ3VsJykubGVuZ3RoKVxuICAgICAgJChCSUJMSU9HUkFQSFlfU0VMRUNUT1IpLmFwcGVuZCgnPHVsPjwvdWw+JylcblxuICAgIC8vIElGIGlkIGFuZCB0ZXh0IGFyZW4ndCBwYXNzZWQgYXMgcGFyYW1ldGVycywgdGhlc2UgY2FuIGJlIHJldHJpZXZlZCBvciBpbml0IGZyb20gaGVyZVxuICAgIGlkID0gKGlkKSA/IGlkIDogZ2V0U3VjY2Vzc2l2ZUVsZW1lbnRJZChCSUJMSU9FTlRSWV9TRUxFQ1RPUiwgQklCTElPRU5UUllfU1VGRklYKVxuICAgIHRleHQgPSB0ZXh0ID8gdGV4dCA6ICc8YnIvPidcblxuICAgIGxldCBuZXdJdGVtID0gJChgPGxpIHJvbGU9XCJkb2MtYmlibGlvZW50cnlcIiBpZD1cIiR7aWR9XCI+PHA+JHt0ZXh0fTwvcD48L2xpPmApXG5cbiAgICAvLyBBcHBlbmQgbmV3IGxpIHRvIHVsIGF0IGxhc3QgcG9zaXRpb25cbiAgICAvLyBPUiBpbnNlcnQgdGhlIG5ldyBsaSByaWdodCBhZnRlciB0aGUgY3VycmVudCBvbmVcbiAgICBpZiAoIWxpc3RJdGVtKVxuICAgICAgJChgJHtCSUJMSU9HUkFQSFlfU0VMRUNUT1J9IHVsYCkuYXBwZW5kKG5ld0l0ZW0pXG5cbiAgICBlbHNlXG4gICAgICBsaXN0SXRlbS5hZnRlcihuZXdJdGVtKVxuICB9LFxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIHVwZGF0ZUJpYmxpb2dyYXBoeVNlY3Rpb246IGZ1bmN0aW9uICgpIHtcblxuICAgIC8vIFN5bmNocm9uaXplIGlmcmFtZSBhbmQgc3RvcmVkIGNvbnRlbnRcbiAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcblxuICAgIC8vIFJlbW92ZSBhbGwgc2VjdGlvbnMgd2l0aG91dCBwIGNoaWxkXG4gICAgJChgJHtCSUJMSU9FTlRSWV9TRUxFQ1RPUn06bm90KDpoYXMocCkpYCkuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAkKHRoaXMpLnJlbW92ZSgpXG4gICAgfSlcbiAgfSxcblxuICAvKipcbiAgICogXG4gICAqL1xuICBhZGRFbmRub3RlOiBmdW5jdGlvbiAoaWQpIHtcblxuICAgIC8vIEFkZCB0aGUgc2VjdGlvbiBpZiBpdCBub3QgZXhpc3RzXG4gICAgaWYgKCEkKEVORE5PVEVfU0VMRUNUT1IpLmxlbmd0aCkge1xuXG4gICAgICBsZXQgZW5kbm90ZXMgPSAkKGA8c2VjdGlvbiBpZD1cImRvYy1lbmRub3Rlc1wiIHJvbGU9XCJkb2MtZW5kbm90ZXNcIj48aDEgZGF0YS1yYXNoLW9yaWdpbmFsLWNvbnRlbnQ9XCJcIj5Gb290bm90ZXM8L2gxPjwvc2VjdGlvbj5gKVxuXG4gICAgICAvLyBJbnNlcnQgdGhpcyBzZWN0aW9uIGFmdGVyIGJpYmxpb2dyYXBoeSBzZWN0aW9uXG4gICAgICAvLyBPUiBhZnRlciBhY2tub3dsZWRnZW1lbnRzIHNlY3Rpb25cbiAgICAgIC8vIE9SIGFmdGVyIG5vbiBzcGVjaWFsIHNlY3Rpb24gc2VsZWN0b3JcbiAgICAgIC8vIE9SIGFmdGVyIGFic3RyYWN0IHNlY3Rpb25cbiAgICAgIC8vIE9SIGFmdGVyIG5vbiBlZGl0YWJsZSBoZWFkZXIgXG4gICAgICBpZiAoJChCSUJMSU9HUkFQSFlfU0VMRUNUT1IpLmxlbmd0aClcbiAgICAgICAgJChCSUJMSU9HUkFQSFlfU0VMRUNUT1IpLmFmdGVyKGVuZG5vdGVzKVxuXG4gICAgICBlbHNlIGlmICgkKEFDS05PV0xFREdFTUVOVFNfU0VMRUNUT1IpLmxlbmd0aClcbiAgICAgICAgJChBQ0tOT1dMRURHRU1FTlRTX1NFTEVDVE9SKS5hZnRlcihlbmRub3RlcylcblxuICAgICAgZWxzZSBpZiAoJChNQUlOX1NFQ1RJT05fU0VMRUNUT1IpLmxlbmd0aClcbiAgICAgICAgJChNQUlOX1NFQ1RJT05fU0VMRUNUT1IpLmxhc3QoKS5hZnRlcihlbmRub3RlcylcblxuICAgICAgZWxzZSBpZiAoJChBQlNUUkFDVF9TRUxFQ1RPUikubGVuZ3RoKVxuICAgICAgICAkKEFCU1RSQUNUX1NFTEVDVE9SKS5hZnRlcihlbmRub3RlcylcblxuICAgICAgZWxzZVxuICAgICAgICAkKE5PTl9FRElUQUJMRV9IRUFERVJfU0VMRUNUT1IpLmFmdGVyKGVuZG5vdGVzKVxuICAgIH1cblxuICAgIC8vIENyZWF0ZSBhbmQgYXBwZW5kIHRoZSBuZXcgZW5kbm90ZVxuICAgIGxldCBlbmRub3RlID0gJChgPHNlY3Rpb24gcm9sZT1cImRvYy1lbmRub3RlXCIgaWQ9XCIke2lkfVwiPjxwPjxici8+PC9wPjwvc2VjdGlvbj5gKVxuICAgICQoRU5ETk9URVNfU0VMRUNUT1IpLmFwcGVuZChlbmRub3RlKVxuICB9LFxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIHVwZGF0ZVNlY3Rpb25Ub29sYmFyOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAvLyBEcm9wZG93biBtZW51IHJlZmVyZW5jZVxuICAgIGxldCBtZW51ID0gJChNRU5VX1NFTEVDVE9SKVxuXG4gICAgaWYgKG1lbnUubGVuZ3RoKSB7XG4gICAgICBzZWN0aW9uLnJlc3RvcmVTZWN0aW9uVG9vbGJhcihtZW51KVxuXG4gICAgICAvLyBTYXZlIGN1cnJlbnQgc2VsZWN0ZWQgZWxlbWVudFxuICAgICAgbGV0IHNlbGVjdGVkRWxlbWVudCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldFJuZygpLnN0YXJ0Q29udGFpbmVyKVxuXG4gICAgICBpZiAoc2VsZWN0ZWRFbGVtZW50WzBdLm5vZGVUeXBlID09IDMpXG4gICAgICAgIHNlbGVjdGVkRWxlbWVudCA9IHNlbGVjdGVkRWxlbWVudC5wYXJlbnQoKVxuXG4gICAgICAvLyBJZiBjdXJyZW50IGVsZW1lbnQgaXMgcFxuICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC5pcygncCcpIHx8IHNlbGVjdGVkRWxlbWVudC5wYXJlbnQoKS5pcygncCcpKSB7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgY2FyZXQgaXMgaW5zaWRlIHNwZWNpYWwgc2VjdGlvblxuICAgICAgICAvLyBJbiB0aGlzIGNhc2UgZW5hYmxlIG9ubHkgZmlyc3QgbWVudWl0ZW0gaWYgY2FyZXQgaXMgaW4gYWJzdHJhY3RcbiAgICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKFNQRUNJQUxfU0VDVElPTl9TRUxFQ1RPUikubGVuZ3RoKSB7XG5cbiAgICAgICAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LnBhcmVudHMoQUJTVFJBQ1RfU0VMRUNUT1IpLmxlbmd0aClcbiAgICAgICAgICAgIG1lbnUuY2hpbGRyZW4oYDpsdCgxKWApLnJlbW92ZUNsYXNzKCdtY2UtZGlzYWJsZWQnKVxuXG4gICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgIH1cblxuICAgICAgICAvLyBHZXQgZGVlcG5lc3Mgb2YgdGhlIHNlY3Rpb25cbiAgICAgICAgbGV0IGRlZXBuZXNzID0gc2VsZWN0ZWRFbGVtZW50LnBhcmVudHMoU0VDVElPTl9TRUxFQ1RPUikubGVuZ3RoICsgMVxuXG4gICAgICAgIC8vIFJlbW92ZSBkaXNhYmxpbmcgY2xhc3Mgb24gZmlyc3Qge2RlZXBuZXNzfSBtZW51IGl0ZW1zXG4gICAgICAgIG1lbnUuY2hpbGRyZW4oYDpsdCgke2RlZXBuZXNzfSlgKS5yZW1vdmVDbGFzcygnbWNlLWRpc2FibGVkJylcblxuICAgICAgICAvLyBHZXQgdGhlIHNlY3Rpb24gbGlzdCBhbmQgdXBkYXRlIHRoZSBkcm9wZG93biB3aXRoIHRoZSByaWdodCB0ZXh0c1xuICAgICAgICBsZXQgbGlzdCA9IHNlY3Rpb24uZ2V0QW5jZXN0b3JTZWN0aW9uc0xpc3Qoc2VsZWN0ZWRFbGVtZW50KVxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8PSBsaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgbWVudS5jaGlsZHJlbihgOmVxKCR7aX0pYCkuZmluZCgnc3Bhbi5tY2UtdGV4dCcpLnRleHQobGlzdFtpXSlcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBFbmFibGUgb25seSBmb3IgdXBncmFkZS9kb3duZ3JhZGVcbiAgICAgIGVsc2UgaWYgKCFzZWxlY3RlZEVsZW1lbnQucGFyZW50cyhTUEVDSUFMX1NFQ1RJT05fU0VMRUNUT1IpLmxlbmd0aCAmJiBzZWxlY3RlZEVsZW1lbnQuaXMoJ2gxLGgyLGgzJykpIHtcblxuICAgICAgICAvLyBHZXQgdGhlIHNlbGVjdGVkIHNlY3Rpb25cbiAgICAgICAgbGV0IHNlbGVjdGVkU2VjdGlvbiA9IHNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKFNFQ1RJT05fU0VMRUNUT1IpLmZpcnN0KClcblxuICAgICAgICAvLyBHZXQgdGhlIG51bWJlciBvZiB0aGUgaGVhZGluZyAoZWcuIEgxID0+IDEsIEgyID0+IDIpXG4gICAgICAgIGxldCBpbmRleCA9IHBhcnNlSW50KHNlbGVjdGVkRWxlbWVudC5wcm9wKCd0YWdOYW1lJykudG9Mb3dlckNhc2UoKS5yZXBsYWNlKCdoJywgJycpKVxuXG4gICAgICAgIC8vIEdldCB0aGUgZGVlcG5lc3Mgb2YgdGhlIHNlY3Rpb24gKGVnLiAxIGlmIGlzIGEgbWFpbiBzZWN0aW9uLCAyIGlmIGlzIGEgc3Vic2VjdGlvbilcbiAgICAgICAgbGV0IGRlZXBuZXNzID0gc2VsZWN0ZWRFbGVtZW50LnBhcmVudHMoU0VDVElPTl9TRUxFQ1RPUikubGVuZ3RoXG5cbiAgICAgICAgLy8gR2V0IHRoZSBsaXN0IG9mIHRleHRzIHRoYXQgYXJlIGJlZVxuICAgICAgICBsZXQgbGlzdCA9IHNlY3Rpb24uZ2V0QW5jZXN0b3JTZWN0aW9uc0xpc3Qoc2VsZWN0ZWRFbGVtZW50KVxuXG4gICAgICAgIC8vIFRoZSB0ZXh0IGluZGV4IGluIGxpc3RcbiAgICAgICAgbGV0IGkgPSBkZWVwbmVzcyAtIGluZGV4XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIGN1cnJlbnQgc2VjdGlvbiBoYXMgYSBwcmV2aW91cyBzZWN0aW9uIFxuICAgICAgICAvLyBJbiB0aGlzIGNhc2UgdGhlIHVwZ3JhZGUgaXMgcGVybWl0dGVkXG4gICAgICAgIGlmIChzZWxlY3RlZFNlY3Rpb24ucHJldigpLmlzKFNFQ1RJT05fU0VMRUNUT1IpKSB7XG5cbiAgICAgICAgICAvLyBtZW51IGl0ZW0gaW5zaWRlIHRoZSBkcm9wZG93blxuICAgICAgICAgIGxldCBtZW51SXRlbSA9IG1lbnUuY2hpbGRyZW4oYDplcSgke2luZGV4fSlgKVxuXG4gICAgICAgICAgbGV0IHRtcCA9IGxpc3RbaW5kZXhdLnJlcGxhY2UoSEVBRElORywgJycpXG4gICAgICAgICAgdG1wID0gdG1wLnNwbGl0KCcuJylcbiAgICAgICAgICB0bXBbaW5kZXggLSAxXSA9IHBhcnNlSW50KHRtcFtpbmRleCAtIDFdKSAtIDFcblxuICAgICAgICAgIGxldCB0ZXh0ID0gSEVBRElORyArIHRtcC5qb2luKCcuJylcblxuICAgICAgICAgIG1lbnVJdGVtLmZpbmQoJ3NwYW4ubWNlLXRleHQnKS50ZXh0KHRleHQpXG4gICAgICAgICAgbWVudUl0ZW0ucmVtb3ZlQ2xhc3MoJ21jZS1kaXNhYmxlZCcpXG4gICAgICAgICAgbWVudUl0ZW0uYXR0cihEQVRBX0RPV05HUkFERSwgdHJ1ZSlcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGlmIHRoZSBjdXJyZW50IHNlY3Rpb24gaGFzIGEgcGFyZW50XG4gICAgICAgIC8vIEluIHRoaXMgY2FzZSB0aGUgdXBncmFkZSBpcyBwZXJtaXR0ZWRcbiAgICAgICAgaWYgKHNlbGVjdGVkU2VjdGlvbi5wYXJlbnQoU0VDVElPTl9TRUxFQ1RPUikubGVuZ3RoKSB7XG5cbiAgICAgICAgICBpbmRleCA9IGluZGV4IC0gMlxuXG4gICAgICAgICAgLy8gbWVudSBpdGVtIGluc2lkZSB0aGUgZHJvcGRvd25cbiAgICAgICAgICBsZXQgbWVudUl0ZW0gPSBtZW51LmNoaWxkcmVuKGA6ZXEoJHtpbmRleH0pYClcbiAgICAgICAgICBtZW51SXRlbS5maW5kKCdzcGFuLm1jZS10ZXh0JykudGV4dChsaXN0W2luZGV4XSlcbiAgICAgICAgICBtZW51SXRlbS5yZW1vdmVDbGFzcygnbWNlLWRpc2FibGVkJylcbiAgICAgICAgICBtZW51SXRlbS5hdHRyKERBVEFfVVBHUkFERSwgdHJ1ZSlcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBEaXNhYmxlIGluIGFueSBvdGhlciBjYXNlc1xuICAgICAgZWxzZVxuICAgICAgICBtZW51LmNoaWxkcmVuKCc6Z3QoMTApJykuYWRkQ2xhc3MoJ21jZS1kaXNhYmxlZCcpXG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGdldEFuY2VzdG9yU2VjdGlvbnNMaXN0OiBmdW5jdGlvbiAoc2VsZWN0ZWRFbGVtZW50KSB7XG5cbiAgICBsZXQgcHJlSGVhZGVycyA9IFtdXG4gICAgbGV0IGxpc3QgPSBbXVxuICAgIGxldCBwYXJlbnRTZWN0aW9ucyA9IHNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKCdzZWN0aW9uJylcblxuICAgIC8vIFNhdmUgaW5kZXggb2YgYWxsIHBhcmVudCBzZWN0aW9uc1xuICAgIGZvciAobGV0IGkgPSBwYXJlbnRTZWN0aW9ucy5sZW5ndGg7IGkgPiAwOyBpLS0pIHtcbiAgICAgIGxldCBlbGVtID0gJChwYXJlbnRTZWN0aW9uc1tpIC0gMV0pXG4gICAgICBsZXQgaW5kZXggPSBlbGVtLnBhcmVudCgpLmNoaWxkcmVuKFNFQ1RJT05fU0VMRUNUT1IpLmluZGV4KGVsZW0pICsgMVxuICAgICAgcHJlSGVhZGVycy5wdXNoKGluZGV4KVxuICAgIH1cblxuICAgIC8vIFVwZGF0ZSB0ZXh0IG9mIGFsbCBtZW51IGl0ZW1cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8PSBwcmVIZWFkZXJzLmxlbmd0aDsgaSsrKSB7XG5cbiAgICAgIGxldCB0ZXh0ID0gSEVBRElOR1xuXG4gICAgICAvLyBVcGRhdGUgdGV4dCBiYXNlZCBvbiBzZWN0aW9uIHN0cnVjdHVyZVxuICAgICAgaWYgKGkgIT0gcHJlSGVhZGVycy5sZW5ndGgpIHtcbiAgICAgICAgZm9yIChsZXQgeCA9IDA7IHggPD0gaTsgeCsrKVxuICAgICAgICAgIHRleHQgKz0gYCR7cHJlSGVhZGVyc1t4XSArICh4ID09IGkgPyAxIDogMCl9LmBcbiAgICAgIH1cblxuICAgICAgLy8gSW4gdGhpcyBjYXNlIHJhamUgY2hhbmdlcyB0ZXh0IG9mIG5leHQgc3ViIGhlYWRpbmdcbiAgICAgIGVsc2Uge1xuICAgICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IGk7IHgrKylcbiAgICAgICAgICB0ZXh0ICs9IGAke3ByZUhlYWRlcnNbeF19LmBcblxuICAgICAgICB0ZXh0ICs9ICcxLidcbiAgICAgIH1cblxuICAgICAgbGlzdC5wdXNoKHRleHQpXG4gICAgfVxuXG4gICAgcmV0dXJuIGxpc3RcbiAgfSxcblxuICAvKipcbiAgICogUmVzdG9yZSBub3JtYWwgdGV4dCBpbiBzZWN0aW9uIHRvb2xiYXIgYW5kIGRpc2FibGUgYWxsXG4gICAqL1xuICByZXN0b3JlU2VjdGlvblRvb2xiYXI6IGZ1bmN0aW9uIChtZW51KSB7XG5cbiAgICBsZXQgY250ID0gMVxuXG4gICAgbWVudS5jaGlsZHJlbignOmx0KDYpJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICBsZXQgdGV4dCA9IEhFQURJTkdcblxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjbnQ7IGkrKylcbiAgICAgICAgdGV4dCArPSBgMS5gXG5cbiAgICAgIC8vIFJlbW92ZSBkYXRhIGVsZW1lbnRzXG4gICAgICAkKHRoaXMpLnJlbW92ZUF0dHIoREFUQV9VUEdSQURFKVxuICAgICAgJCh0aGlzKS5yZW1vdmVBdHRyKERBVEFfRE9XTkdSQURFKVxuXG4gICAgICAkKHRoaXMpLmZpbmQoJ3NwYW4ubWNlLXRleHQnKS50ZXh0KHRleHQpXG4gICAgICAkKHRoaXMpLmFkZENsYXNzKCdtY2UtZGlzYWJsZWQnKVxuXG4gICAgICBjbnQrK1xuICAgIH0pXG5cbiAgICAvLyBFbmFibGUgdXBncmFkZS9kb3duZ3JhZGUgbGFzdCB0aHJlZSBtZW51IGl0ZW1zXG4gICAgbWVudS5jaGlsZHJlbignOmd0KDEwKScpLnJlbW92ZUNsYXNzKCdtY2UtZGlzYWJsZWQnKVxuICB9LFxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIG1hbmFnZURlbGV0ZTogZnVuY3Rpb24gKCkge1xuXG4gICAgbGV0IHNlbGVjdGVkQ29udGVudCA9IHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRDb250ZW50KClcblxuICAgIC8vIElmIHRoZSBzZWxlY3RlZCBjb250ZW50IGhhcyBIVE1MIGluc2lkZVxuICAgIGlmIChzZWxlY3RlZENvbnRlbnQuaW5kZXhPZignPCcpID4gLTEpIHtcblxuICAgICAgc2VsZWN0ZWRDb250ZW50ID0gJChzZWxlY3RlZENvbnRlbnQpXG4gICAgICBsZXQgaGFzU2VjdGlvbiA9IGZhbHNlXG4gICAgICAvLyBDaGVjayBpZiBvbmUgb2YgdGhlIHNlbGVjdGVkIGVsZW1lbnQgaXMgYSBzZWN0aW9uXG4gICAgICBzZWxlY3RlZENvbnRlbnQuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICgkKHRoaXMpLmlzKFNFQ1RJT05fU0VMRUNUT1IpKVxuICAgICAgICAgIHJldHVybiBoYXNTZWN0aW9uID0gdHJ1ZVxuICAgICAgfSlcblxuICAgICAgLy8gSWYgdGhlIHNlbGVjdGVkIGNvbnRlbnQgaGFzIGEgc2VjdGlvbiBpbnNpZGUsIHRoZW4gbWFuYWdlIGRlbGV0ZVxuICAgICAgaWYgKGhhc1NlY3Rpb24pIHtcblxuICAgICAgICBsZXQgcmFuZ2UgPSB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Um5nKClcbiAgICAgICAgbGV0IHN0YXJ0Tm9kZSA9ICQocmFuZ2Uuc3RhcnRDb250YWluZXIpLnBhcmVudCgpXG4gICAgICAgIGxldCBlbmROb2RlID0gJChyYW5nZS5lbmRDb250YWluZXIpLnBhcmVudCgpXG4gICAgICAgIGxldCBjb21tb25BbmNlc3RvckNvbnRhaW5lciA9ICQocmFuZ2UuY29tbW9uQW5jZXN0b3JDb250YWluZXIpXG5cbiAgICAgICAgLy8gRGVlcG5lc3MgaXMgcmVsYXRpdmUgdG8gdGhlIGNvbW1vbiBhbmNlc3RvciBjb250YWluZXIgb2YgdGhlIHJhbmdlIHN0YXJ0Q29udGFpbmVyIGFuZCBlbmRcbiAgICAgICAgbGV0IGRlZXBuZXNzID0gZW5kTm9kZS5wYXJlbnQoJ3NlY3Rpb24nKS5wYXJlbnRzVW50aWwoY29tbW9uQW5jZXN0b3JDb250YWluZXIpLmxlbmd0aCArIDFcbiAgICAgICAgbGV0IGN1cnJlbnRFbGVtZW50ID0gZW5kTm9kZVxuICAgICAgICBsZXQgdG9Nb3ZlRWxlbWVudHMgPSBbXVxuXG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgIC8vIEdldCBhbmQgZGV0YWNoIGFsbCBuZXh0X2VuZFxuICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDw9IGRlZXBuZXNzOyBpKyspIHtcbiAgICAgICAgICAgIGN1cnJlbnRFbGVtZW50Lm5leHRBbGwoJ3NlY3Rpb24scCxmaWd1cmUscHJlLHVsLG9sLGJsb2NrcXVvdGUnKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgdG9Nb3ZlRWxlbWVudHMucHVzaCgkKHRoaXMpKVxuXG4gICAgICAgICAgICAgICQodGhpcykuZGV0YWNoKClcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICBjdXJyZW50RWxlbWVudCA9IGN1cnJlbnRFbGVtZW50LnBhcmVudCgpXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gRXhlY3V0ZSBkZWxldGVcbiAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5leGVjQ29tbWFuZCgnZGVsZXRlJylcblxuICAgICAgICAgIC8vIERldGFjaCBhbGwgbmV4dF9iZWdpblxuICAgICAgICAgIHN0YXJ0Tm9kZS5uZXh0QWxsKCkuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkKHRoaXMpLmRldGFjaCgpXG4gICAgICAgICAgfSlcblxuICAgICAgICAgIC8vIEFwcGVuZCBhbGwgbmV4dF9lbmQgdG8gc3RhcnRub2RlIHBhcmVudFxuICAgICAgICAgIHRvTW92ZUVsZW1lbnRzLmZvckVhY2goZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICAgICAgICAgIHN0YXJ0Tm9kZS5wYXJlbnQoJ3NlY3Rpb24nKS5hcHBlbmQoZWxlbWVudClcbiAgICAgICAgICB9KVxuXG4gICAgICAgICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG5cbiAgICAgICAgICAvLyBSZWZyZXNoIGhlYWRpbmdzXG4gICAgICAgICAgaGVhZGluZ0RpbWVuc2lvbigpXG5cbiAgICAgICAgICAvLyBVcGRhdGUgcmVmZXJlbmNlcyBpZiBuZWVkZWRcbiAgICAgICAgICB1cGRhdGVSZWZlcmVuY2VzKClcblxuICAgICAgICAgIHVwZGF0ZUlmcmFtZUZyb21TYXZlZENvbnRlbnQoKVxuICAgICAgICB9KVxuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogXG4gICAqL1xuICBkZWxldGVTcGVjaWFsU2VjdGlvbjogZnVuY3Rpb24gKHNlbGVjdGVkRWxlbWVudCkge1xuXG4gICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAvLyBSZW1vdmUgdGhlIHNlY3Rpb24gYW5kIHVwZGF0ZSBcbiAgICAgIHNlbGVjdGVkRWxlbWVudC5wYXJlbnQoU1BFQ0lBTF9TRUNUSU9OX1NFTEVDVE9SKS5yZW1vdmUoKVxuICAgICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG5cbiAgICAgIC8vIFVwZGF0ZSByZWZlcmVuY2VzXG4gICAgICB1cGRhdGVSZWZlcmVuY2VzKClcbiAgICAgIHVwZGF0ZUlmcmFtZUZyb21TYXZlZENvbnRlbnQoKVxuICAgIH0pXG4gIH0sXG5cbiAgLyoqXG4gICAqIFxuICAgKi9cbiAgY3Vyc29ySW5TZWN0aW9uOiBmdW5jdGlvbiAoc2VsZWN0aW9uKSB7XG5cbiAgICByZXR1cm4gJChzZWxlY3Rpb24uZ2V0Tm9kZSgpKS5pcyhTRUNUSU9OX1NFTEVDVE9SKSB8fCBCb29sZWFuKCQoc2VsZWN0aW9uLmdldE5vZGUoKSkucGFyZW50cyhTRUNUSU9OX1NFTEVDVE9SKS5sZW5ndGgpXG4gIH0sXG5cbiAgLyoqXG4gICAqIFxuICAgKi9cbiAgY3Vyc29ySW5TcGVjaWFsU2VjdGlvbjogZnVuY3Rpb24gKHNlbGVjdGlvbikge1xuXG4gICAgcmV0dXJuICQoc2VsZWN0aW9uLmdldE5vZGUoKSkuaXMoU1BFQ0lBTF9TRUNUSU9OX1NFTEVDVE9SKSB8fFxuICAgICAgQm9vbGVhbigkKHNlbGVjdGlvbi5nZXRSbmcoKS5zdGFydENvbnRhaW5lcikucGFyZW50cyhTUEVDSUFMX1NFQ1RJT05fU0VMRUNUT1IpLmxlbmd0aCkgfHxcbiAgICAgIEJvb2xlYW4oJChzZWxlY3Rpb24uZ2V0Um5nKCkuZW5kQ29udGFpbmVyKS5wYXJlbnRzKFNQRUNJQUxfU0VDVElPTl9TRUxFQ1RPUikubGVuZ3RoKVxuICB9XG59IiwidGlueW1jZS5QbHVnaW5NYW5hZ2VyLmFkZCgncmFqZV9jcm9zc3JlZicsIGZ1bmN0aW9uIChlZGl0b3IsIHVybCkge1xuXG4gIC8vIEFkZCBhIGJ1dHRvbiB0aGF0IGhhbmRsZSB0aGUgaW5saW5lIGVsZW1lbnRcbiAgZWRpdG9yLmFkZEJ1dHRvbigncmFqZV9jcm9zc3JlZicsIHtcbiAgICB0aXRsZTogJ3JhamVfY3Jvc3NyZWYnLFxuICAgIGljb246ICdpY29uLWFuY2hvcicsXG4gICAgdG9vbHRpcDogJ0Nyb3NzLXJlZmVyZW5jZScsXG4gICAgZGlzYWJsZWRTdGF0ZVNlbGVjdG9yOiBgJHtESVNBQkxFX1NFTEVDVE9SX0lOTElORX0sOmhlYWRlcmAsXG5cbiAgICAvLyBCdXR0b24gYmVoYXZpb3VyXG4gICAgb25jbGljazogZnVuY3Rpb24gKCkge1xuXG4gICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcblxuICAgICAgbGV0IHJlZmVyZW5jZWFibGVMaXN0ID0ge1xuICAgICAgICBzZWN0aW9uczogY3Jvc3NyZWYuZ2V0QWxsUmVmZXJlbmNlYWJsZVNlY3Rpb25zKCksXG4gICAgICAgIHRhYmxlczogY3Jvc3NyZWYuZ2V0QWxsUmVmZXJlbmNlYWJsZVRhYmxlcygpLFxuICAgICAgICBmaWd1cmVzOiBjcm9zc3JlZi5nZXRBbGxSZWZlcmVuY2VhYmxlRmlndXJlcygpLFxuICAgICAgICBsaXN0aW5nczogY3Jvc3NyZWYuZ2V0QWxsUmVmZXJlbmNlYWJsZUxpc3RpbmdzKCksXG4gICAgICAgIGZvcm11bGFzOiBjcm9zc3JlZi5nZXRBbGxSZWZlcmVuY2VhYmxlRm9ybXVsYXMoKSxcbiAgICAgICAgcmVmZXJlbmNlczogY3Jvc3NyZWYuZ2V0QWxsUmVmZXJlbmNlYWJsZVJlZmVyZW5jZXMoKVxuICAgICAgfVxuXG4gICAgICBlZGl0b3Iud2luZG93TWFuYWdlci5vcGVuKHtcbiAgICAgICAgICB0aXRsZTogJ0Nyb3NzLXJlZmVyZW5jZSBlZGl0b3InLFxuICAgICAgICAgIHVybDogJ2pzL3JhamUtY29yZS9wbHVnaW4vcmFqZV9jcm9zc3JlZi5odG1sJyxcbiAgICAgICAgICB3aWR0aDogNTAwLFxuICAgICAgICAgIGhlaWdodDogODAwLFxuICAgICAgICAgIG9uQ2xvc2U6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBcbiAgICAgICAgICAgICAqIFRoaXMgYmVoYXZpb3VyIGlzIGNhbGxlZCB3aGVuIHVzZXIgcHJlc3MgXCJBREQgTkVXIFJFRkVSRU5DRVwiIFxuICAgICAgICAgICAgICogYnV0dG9uIGZyb20gdGhlIG1vZGFsXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGlmICh0aW55bWNlLmFjdGl2ZUVkaXRvci5jcmVhdGVOZXdSZWZlcmVuY2UpIHtcblxuICAgICAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICAgICAgICAvLyBHZXQgc3VjY2Vzc2l2ZSBiaWJsaW9lbnRyeSBpZFxuICAgICAgICAgICAgICAgIGxldCBpZCA9IGdldFN1Y2Nlc3NpdmVFbGVtZW50SWQoQklCTElPRU5UUllfU0VMRUNUT1IsIEJJQkxJT0VOVFJZX1NVRkZJWClcblxuICAgICAgICAgICAgICAgIC8vIENyZWF0ZSB0aGUgcmVmZXJlbmNlIHRoYXQgcG9pbnRzIHRvIHRoZSBuZXh0IGlkXG4gICAgICAgICAgICAgICAgY3Jvc3NyZWYuYWRkKGlkKVxuXG4gICAgICAgICAgICAgICAgLy8gQWRkIHRoZSBuZXh0IGJpYmxpb2VudHJ5XG4gICAgICAgICAgICAgICAgc2VjdGlvbi5hZGRCaWJsaW9lbnRyeShpZClcblxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgcmVmZXJlbmNlXG4gICAgICAgICAgICAgICAgY3Jvc3NyZWYudXBkYXRlKClcblxuICAgICAgICAgICAgICAgIC8vIE1vdmUgY2FyZXQgdG8gc3RhcnQgb2YgdGhlIG5ldyBiaWJsaW9lbnRyeSBlbGVtZW50XG4gICAgICAgICAgICAgICAgLy8gSXNzdWUgIzEwNSBGaXJlZm94ICsgQ2hyb21pdW1cbiAgICAgICAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2V0Q3Vyc29yTG9jYXRpb24oJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5kb20uZ2V0KGlkKSkuZmluZCgncCcpWzBdLCBmYWxzZSlcbiAgICAgICAgICAgICAgICBzY3JvbGxUbyhgJHtCSUJMSU9FTlRSWV9TRUxFQ1RPUn0jJHtpZH1gKVxuICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICAgIC8vIFNldCB2YXJpYWJsZSBudWxsIGZvciBzdWNjZXNzaXZlIHVzYWdlc1xuICAgICAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5jcmVhdGVOZXdSZWZlcmVuY2UgPSBudWxsXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVGhpcyBpcyBjYWxsZWQgaWYgYSBub3JtYWwgcmVmZXJlbmNlIGlzIHNlbGVjdGVkIGZyb20gbW9kYWxcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZWxzZSBpZiAodGlueW1jZS5hY3RpdmVFZGl0b3IucmVmZXJlbmNlKSB7XG5cbiAgICAgICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgICAgICAgLy8gQ3JlYXRlIHRoZSBlbXB0eSBhbmNob3IgYW5kIHVwZGF0ZSBpdHMgY29udGVudFxuICAgICAgICAgICAgICAgIGNyb3NzcmVmLmFkZCh0aW55bWNlLmFjdGl2ZUVkaXRvci5yZWZlcmVuY2UpXG4gICAgICAgICAgICAgICAgY3Jvc3NyZWYudXBkYXRlKClcblxuICAgICAgICAgICAgICAgIGxldCBzZWxlY3RlZE5vZGUgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG5cbiAgICAgICAgICAgICAgICAvLyBUaGlzIHNlbGVjdCB0aGUgbGFzdCBlbGVtZW50IChsYXN0IGJ5IG9yZGVyKSBhbmQgY29sbGFwc2UgdGhlIHNlbGVjdGlvbiBhZnRlciB0aGUgbm9kZVxuICAgICAgICAgICAgICAgIC8vICMxMDUgRmlyZWZveCArIENocm9taXVtXG4gICAgICAgICAgICAgICAgLy90aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2V0Q3Vyc29yTG9jYXRpb24oJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5kb20uc2VsZWN0KGBhW2hyZWY9XCIjJHt0aW55bWNlLmFjdGl2ZUVkaXRvci5yZWZlcmVuY2V9XCJdOmxhc3QtY2hpbGRgKSlbMF0sIGZhbHNlKVxuICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICAgIC8vIFNldCB2YXJpYWJsZSBudWxsIGZvciBzdWNjZXNzaXZlIHVzYWdlc1xuICAgICAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5yZWZlcmVuY2UgPSBudWxsXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIC8vIExpc3Qgb2YgYWxsIHJlZmVyZW5jZWFibGUgZWxlbWVudHNcbiAgICAgICAgcmVmZXJlbmNlYWJsZUxpc3QpXG4gICAgfVxuICB9KVxuXG4gIGNyb3NzcmVmID0ge1xuICAgIGdldEFsbFJlZmVyZW5jZWFibGVTZWN0aW9uczogZnVuY3Rpb24gKCkge1xuXG4gICAgICBsZXQgc2VjdGlvbnMgPSBbXVxuXG4gICAgICAkKCdzZWN0aW9uJykuZWFjaChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgbGV0IGxldmVsID0gJydcblxuICAgICAgICBpZiAoISQodGhpcykuaXMoRU5ETk9URV9TRUxFQ1RPUikpIHtcblxuICAgICAgICAgIC8vIFNlY3Rpb25zIHdpdGhvdXQgcm9sZSBoYXZlIDphZnRlclxuICAgICAgICAgIGlmICghJCh0aGlzKS5hdHRyKCdyb2xlJykpIHtcblxuICAgICAgICAgICAgLy8gU2F2ZSBpdHMgZGVlcG5lc3NcbiAgICAgICAgICAgIGxldCBwYXJlbnRTZWN0aW9ucyA9ICQodGhpcykucGFyZW50c1VudGlsKCdkaXYjcmFqZV9yb290JylcblxuICAgICAgICAgICAgaWYgKHBhcmVudFNlY3Rpb25zLmxlbmd0aCkge1xuXG4gICAgICAgICAgICAgIC8vIEl0ZXJhdGUgaXRzIHBhcmVudHMgYmFja3dhcmRzIChoaWdlciBmaXJzdClcbiAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IHBhcmVudFNlY3Rpb25zLmxlbmd0aDsgaS0tOyBpID4gMCkge1xuICAgICAgICAgICAgICAgIGxldCBzZWN0aW9uID0gJChwYXJlbnRTZWN0aW9uc1tpXSlcbiAgICAgICAgICAgICAgICBsZXZlbCArPSBgJHtzZWN0aW9uLnBhcmVudCgpLmNoaWxkcmVuKFNFQ1RJT05fU0VMRUNUT1IpLmluZGV4KHNlY3Rpb24pKzF9LmBcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBDdXJyZW50IGluZGV4XG4gICAgICAgICAgICBsZXZlbCArPSBgJHskKHRoaXMpLnBhcmVudCgpLmNoaWxkcmVuKFNFQ1RJT05fU0VMRUNUT1IpLmluZGV4KCQodGhpcykpKzF9LmBcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBzZWN0aW9ucy5wdXNoKHtcbiAgICAgICAgICAgIHJlZmVyZW5jZTogJCh0aGlzKS5hdHRyKCdpZCcpLFxuICAgICAgICAgICAgdGV4dDogJCh0aGlzKS5maW5kKCc6aGVhZGVyJykuZmlyc3QoKS50ZXh0KCksXG4gICAgICAgICAgICBsZXZlbDogbGV2ZWxcbiAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgICB9KVxuXG4gICAgICByZXR1cm4gc2VjdGlvbnNcbiAgICB9LFxuXG4gICAgZ2V0QWxsUmVmZXJlbmNlYWJsZVRhYmxlczogZnVuY3Rpb24gKCkge1xuICAgICAgbGV0IHRhYmxlcyA9IFtdXG5cbiAgICAgICQoJ2ZpZ3VyZTpoYXModGFibGUpJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRhYmxlcy5wdXNoKHtcbiAgICAgICAgICByZWZlcmVuY2U6ICQodGhpcykuYXR0cignaWQnKSxcbiAgICAgICAgICB0ZXh0OiAkKHRoaXMpLmZpbmQoJ2ZpZ2NhcHRpb24nKS50ZXh0KClcbiAgICAgICAgfSlcbiAgICAgIH0pXG5cbiAgICAgIHJldHVybiB0YWJsZXNcbiAgICB9LFxuXG4gICAgZ2V0QWxsUmVmZXJlbmNlYWJsZUxpc3RpbmdzOiBmdW5jdGlvbiAoKSB7XG4gICAgICBsZXQgbGlzdGluZ3MgPSBbXVxuXG4gICAgICAkKCdmaWd1cmU6aGFzKHByZTpoYXMoY29kZSkpJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIGxpc3RpbmdzLnB1c2goe1xuICAgICAgICAgIHJlZmVyZW5jZTogJCh0aGlzKS5hdHRyKCdpZCcpLFxuICAgICAgICAgIHRleHQ6ICQodGhpcykuZmluZCgnZmlnY2FwdGlvbicpLnRleHQoKVxuICAgICAgICB9KVxuICAgICAgfSlcblxuICAgICAgcmV0dXJuIGxpc3RpbmdzXG4gICAgfSxcblxuICAgIGdldEFsbFJlZmVyZW5jZWFibGVGaWd1cmVzOiBmdW5jdGlvbiAoKSB7XG4gICAgICBsZXQgZmlndXJlcyA9IFtdXG5cbiAgICAgICQoRklHVVJFX0lNQUdFX1NFTEVDVE9SKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZmlndXJlcy5wdXNoKHtcbiAgICAgICAgICByZWZlcmVuY2U6ICQodGhpcykuYXR0cignaWQnKSxcbiAgICAgICAgICB0ZXh0OiAkKHRoaXMpLmZpbmQoJ2ZpZ2NhcHRpb24nKS50ZXh0KClcbiAgICAgICAgfSlcbiAgICAgIH0pXG5cbiAgICAgIHJldHVybiBmaWd1cmVzXG4gICAgfSxcblxuICAgIGdldEFsbFJlZmVyZW5jZWFibGVGb3JtdWxhczogZnVuY3Rpb24gKCkge1xuICAgICAgbGV0IGZvcm11bGFzID0gW11cblxuICAgICAgJChmb3JtdWxhYm94X3NlbGVjdG9yKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZm9ybXVsYXMucHVzaCh7XG4gICAgICAgICAgcmVmZXJlbmNlOiAkKHRoaXMpLnBhcmVudHMoRklHVVJFX1NFTEVDVE9SKS5hdHRyKCdpZCcpLFxuICAgICAgICAgIHRleHQ6IGBGb3JtdWxhICR7JCh0aGlzKS5wYXJlbnRzKEZJR1VSRV9TRUxFQ1RPUikuZmluZCgnc3Bhbi5jZ2VuJykudGV4dCgpfWBcbiAgICAgICAgfSlcbiAgICAgIH0pXG5cbiAgICAgIHJldHVybiBmb3JtdWxhc1xuICAgIH0sXG5cbiAgICBnZXRBbGxSZWZlcmVuY2VhYmxlUmVmZXJlbmNlczogZnVuY3Rpb24gKCkge1xuICAgICAgbGV0IHJlZmVyZW5jZXMgPSBbXVxuICAgICAgJCgnc2VjdGlvbltyb2xlPWRvYy1iaWJsaW9ncmFwaHldIGxpJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJlZmVyZW5jZXMucHVzaCh7XG4gICAgICAgICAgcmVmZXJlbmNlOiAkKHRoaXMpLmF0dHIoJ2lkJyksXG4gICAgICAgICAgdGV4dDogJCh0aGlzKS50ZXh0KCksXG4gICAgICAgICAgbGV2ZWw6ICQodGhpcykuaW5kZXgoKSArIDFcbiAgICAgICAgfSlcbiAgICAgIH0pXG5cbiAgICAgIHJldHVybiByZWZlcmVuY2VzXG4gICAgfSxcblxuICAgIGFkZDogZnVuY3Rpb24gKHJlZmVyZW5jZSwgbmV4dCkge1xuXG4gICAgICAvLyBDcmVhdGUgdGhlIGVtcHR5IHJlZmVyZW5jZSB3aXRoIGEgd2hpdGVzcGFjZSBhdCB0aGUgZW5kXG4gICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2V0Q29udGVudChgPGEgY29udGVudGVkaXRhYmxlPVwiZmFsc2VcIiBocmVmPVwiIyR7cmVmZXJlbmNlfVwiPiZuYnNwOzwvYT4mbmJzcDtgKVxuICAgICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG4gICAgfSxcblxuICAgIHVwZGF0ZTogZnVuY3Rpb24gKCkge1xuXG4gICAgICAvLyBVcGRhdGUgdGhlIHJlZmVyZW5jZSAoaW4gc2F2ZWQgY29udGVudClcbiAgICAgIHJlZmVyZW5jZXMoKVxuXG4gICAgICAvLyBQcmV2ZW50IGFkZGluZyBvZiBuZXN0ZWQgYSBhcyBmb290bm90ZXNcbiAgICAgICQoJ2E+c3VwPmEnKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgJCh0aGlzKS5wYXJlbnQoKS5odG1sKCQodGhpcykudGV4dCgpKVxuICAgICAgfSlcblxuICAgICAgLy8gVXBkYXRlIGVkaXRvciB3aXRoIHRoZSByaWdodCByZWZlcmVuY2VzXG4gICAgICB1cGRhdGVJZnJhbWVGcm9tU2F2ZWRDb250ZW50KClcbiAgICB9XG4gIH1cbn0pXG5cbnRpbnltY2UuUGx1Z2luTWFuYWdlci5hZGQoJ3JhamVfZm9vdG5vdGVzJywgZnVuY3Rpb24gKGVkaXRvciwgdXJsKSB7XG5cbiAgZWRpdG9yLmFkZEJ1dHRvbigncmFqZV9mb290bm90ZXMnLCB7XG4gICAgdGl0bGU6ICdyYWplX2Zvb3Rub3RlcycsXG4gICAgaWNvbjogJ2ljb24tZm9vdG5vdGVzJyxcbiAgICB0b29sdGlwOiAnRm9vdG5vdGUnLFxuICAgIGRpc2FibGVkU3RhdGVTZWxlY3RvcjogYCR7RElTQUJMRV9TRUxFQ1RPUl9JTkxJTkV9LDpoZWFkZXJgLFxuXG4gICAgLy8gQnV0dG9uIGJlaGF2aW91clxuICAgIG9uY2xpY2s6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIC8vIEdldCBzdWNjZXNzaXZlIGJpYmxpb2VudHJ5IGlkXG4gICAgICAgIGxldCByZWZlcmVuY2UgPSBnZXRTdWNjZXNzaXZlRWxlbWVudElkKEVORE5PVEVfU0VMRUNUT1IsIEVORE5PVEVfU1VGRklYKVxuXG4gICAgICAgIC8vIENyZWF0ZSB0aGUgcmVmZXJlbmNlIHRoYXQgcG9pbnRzIHRvIHRoZSBuZXh0IGlkXG4gICAgICAgIGNyb3NzcmVmLmFkZChyZWZlcmVuY2UpXG5cbiAgICAgICAgLy8gQWRkIHRoZSBuZXh0IGJpYmxpb2VudHJ5XG4gICAgICAgIHNlY3Rpb24uYWRkRW5kbm90ZShyZWZlcmVuY2UpXG5cbiAgICAgICAgLy8gVXBkYXRlIHRoZSByZWZlcmVuY2VcbiAgICAgICAgY3Jvc3NyZWYudXBkYXRlKClcblxuICAgICAgICAvLyBNb3ZlIGNhcmV0IGF0IHRoZSBlbmQgb2YgcCBpbiBsYXN0IGluc2VydGVkIGVuZG5vdGVcbiAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLnNldEN1cnNvckxvY2F0aW9uKHRpbnltY2UuYWN0aXZlRWRpdG9yLmRvbS5zZWxlY3QoYCR7RU5ETk9URV9TRUxFQ1RPUn0jJHtyZWZlcmVuY2V9PnBgKVswXSwgMSlcbiAgICAgIH0pXG4gICAgfVxuICB9KVxufSlcblxuZnVuY3Rpb24gcmVmZXJlbmNlcygpIHtcbiAgLyogUmVmZXJlbmNlcyAqL1xuICAkKFwiYVtocmVmXVwiKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoJC50cmltKCQodGhpcykudGV4dCgpKSA9PSAnJykge1xuICAgICAgdmFyIGN1cl9pZCA9ICQodGhpcykuYXR0cihcImhyZWZcIik7XG4gICAgICBvcmlnaW5hbF9jb250ZW50ID0gJCh0aGlzKS5odG1sKClcbiAgICAgIG9yaWdpbmFsX3JlZmVyZW5jZSA9IGN1cl9pZFxuICAgICAgcmVmZXJlbmNlZF9lbGVtZW50ID0gJChjdXJfaWQpO1xuXG4gICAgICBpZiAocmVmZXJlbmNlZF9lbGVtZW50Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgcmVmZXJlbmNlZF9lbGVtZW50X2ZpZ3VyZSA9IHJlZmVyZW5jZWRfZWxlbWVudC5maW5kKFxuICAgICAgICAgIGZpZ3VyZWJveF9zZWxlY3Rvcl9pbWcgKyBcIixcIiArIGZpZ3VyZWJveF9zZWxlY3Rvcl9zdmcpO1xuICAgICAgICByZWZlcmVuY2VkX2VsZW1lbnRfdGFibGUgPSByZWZlcmVuY2VkX2VsZW1lbnQuZmluZCh0YWJsZWJveF9zZWxlY3Rvcl90YWJsZSk7XG4gICAgICAgIHJlZmVyZW5jZWRfZWxlbWVudF9mb3JtdWxhID0gcmVmZXJlbmNlZF9lbGVtZW50LmZpbmQoXG4gICAgICAgICAgZm9ybXVsYWJveF9zZWxlY3Rvcl9pbWcgKyBcIixcIiArIGZvcm11bGFib3hfc2VsZWN0b3Jfc3BhbiArIFwiLFwiICsgZm9ybXVsYWJveF9zZWxlY3Rvcl9tYXRoICsgXCIsXCIgKyBmb3JtdWxhYm94X3NlbGVjdG9yX3N2Zyk7XG4gICAgICAgIHJlZmVyZW5jZWRfZWxlbWVudF9saXN0aW5nID0gcmVmZXJlbmNlZF9lbGVtZW50LmZpbmQobGlzdGluZ2JveF9zZWxlY3Rvcl9wcmUpO1xuICAgICAgICAvKiBTcGVjaWFsIHNlY3Rpb25zICovXG4gICAgICAgIGlmIChcbiAgICAgICAgICAkKFwic2VjdGlvbltyb2xlPWRvYy1hYnN0cmFjdF1cIiArIGN1cl9pZCkubGVuZ3RoID4gMCB8fFxuICAgICAgICAgICQoXCJzZWN0aW9uW3JvbGU9ZG9jLWJpYmxpb2dyYXBoeV1cIiArIGN1cl9pZCkubGVuZ3RoID4gMCB8fFxuICAgICAgICAgICQoXCJzZWN0aW9uW3JvbGU9ZG9jLWVuZG5vdGVzXVwiICsgY3VyX2lkICsgXCIsIHNlY3Rpb25bcm9sZT1kb2MtZm9vdG5vdGVzXVwiICsgY3VyX2lkKS5sZW5ndGggPiAwIHx8XG4gICAgICAgICAgJChcInNlY3Rpb25bcm9sZT1kb2MtYWNrbm93bGVkZ2VtZW50c11cIiArIGN1cl9pZCkubGVuZ3RoID4gMCkge1xuICAgICAgICAgICQodGhpcykuaHRtbChcIjxzcGFuIGNsYXNzPVxcXCJjZ2VuXFxcIiBjb250ZW50ZWRpdGFibGU9XFxcImZhbHNlXFxcIiAgZGF0YS1yYXNoLW9yaWdpbmFsLWNvbnRlbnQ9XFxcIlwiICsgb3JpZ2luYWxfY29udGVudCArXG4gICAgICAgICAgICBcIlxcXCI+U2VjdGlvbiA8cT5cIiArICQoY3VyX2lkICsgXCIgPiBoMVwiKS50ZXh0KCkgKyBcIjwvcT48L3NwYW4+XCIpO1xuICAgICAgICAgIC8qIEJpYmxpb2dyYXBoaWMgcmVmZXJlbmNlcyAqL1xuICAgICAgICB9IGVsc2UgaWYgKCQoY3VyX2lkKS5wYXJlbnRzKFwic2VjdGlvbltyb2xlPWRvYy1iaWJsaW9ncmFwaHldXCIpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICB2YXIgY3VyX2NvdW50ID0gJChjdXJfaWQpLnByZXZBbGwoXCJsaVwiKS5sZW5ndGggKyAxO1xuICAgICAgICAgICQodGhpcykuaHRtbChcIjxzcGFuIGNsYXNzPVxcXCJjZ2VuXFxcIiBjb250ZW50ZWRpdGFibGU9XFxcImZhbHNlXFxcIiBkYXRhLXJhc2gtb3JpZ2luYWwtY29udGVudD1cXFwiXCIgKyBvcmlnaW5hbF9jb250ZW50ICtcbiAgICAgICAgICAgIFwiXFxcIiB0aXRsZT1cXFwiQmlibGlvZ3JhcGhpYyByZWZlcmVuY2UgXCIgKyBjdXJfY291bnQgKyBcIjogXCIgK1xuICAgICAgICAgICAgJChjdXJfaWQpLnRleHQoKS5yZXBsYWNlKC9cXHMrL2csIFwiIFwiKS50cmltKCkgKyBcIlxcXCI+W1wiICsgY3VyX2NvdW50ICsgXCJdPC9zcGFuPlwiKTtcbiAgICAgICAgICAvKiBGb290bm90ZSByZWZlcmVuY2VzIChkb2MtZm9vdG5vdGVzIGFuZCBkb2MtZm9vdG5vdGUgaW5jbHVkZWQgZm9yIGVhc2luZyBiYWNrIGNvbXBhdGliaWxpdHkpICovXG4gICAgICAgIH0gZWxzZSBpZiAoJChjdXJfaWQpLnBhcmVudHMoXCJzZWN0aW9uW3JvbGU9ZG9jLWVuZG5vdGVzXSwgc2VjdGlvbltyb2xlPWRvYy1mb290bm90ZXNdXCIpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICB2YXIgY3VyX2NvbnRlbnRzID0gJCh0aGlzKS5wYXJlbnQoKS5jb250ZW50cygpO1xuICAgICAgICAgIHZhciBjdXJfaW5kZXggPSBjdXJfY29udGVudHMuaW5kZXgoJCh0aGlzKSk7XG4gICAgICAgICAgdmFyIHByZXZfdG1wID0gbnVsbDtcbiAgICAgICAgICB3aGlsZSAoY3VyX2luZGV4ID4gMCAmJiAhcHJldl90bXApIHtcbiAgICAgICAgICAgIGN1cl9wcmV2ID0gY3VyX2NvbnRlbnRzW2N1cl9pbmRleCAtIDFdO1xuICAgICAgICAgICAgaWYgKGN1cl9wcmV2Lm5vZGVUeXBlICE9IDMgfHwgJChjdXJfcHJldikudGV4dCgpLnJlcGxhY2UoLyAvZywgJycpICE9ICcnKSB7XG4gICAgICAgICAgICAgIHByZXZfdG1wID0gY3VyX3ByZXY7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBjdXJfaW5kZXgtLTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIHByZXZfZWwgPSAkKHByZXZfdG1wKTtcbiAgICAgICAgICB2YXIgY3VycmVudF9pZCA9ICQodGhpcykuYXR0cihcImhyZWZcIik7XG4gICAgICAgICAgdmFyIGZvb3Rub3RlX2VsZW1lbnQgPSAkKGN1cnJlbnRfaWQpO1xuICAgICAgICAgIGlmIChmb290bm90ZV9lbGVtZW50Lmxlbmd0aCA+IDAgJiZcbiAgICAgICAgICAgIGZvb3Rub3RlX2VsZW1lbnQucGFyZW50KFwic2VjdGlvbltyb2xlPWRvYy1lbmRub3Rlc10sIHNlY3Rpb25bcm9sZT1kb2MtZm9vdG5vdGVzXVwiKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICB2YXIgY291bnQgPSAkKGN1cnJlbnRfaWQpLnByZXZBbGwoXCJzZWN0aW9uXCIpLmxlbmd0aCArIDE7XG4gICAgICAgICAgICBpZiAocHJldl9lbC5maW5kKFwic3VwXCIpLmhhc0NsYXNzKFwiZm5cIikpIHtcbiAgICAgICAgICAgICAgJCh0aGlzKS5iZWZvcmUoXCI8c3VwIGNsYXNzPVxcXCJjZ2VuXFxcIiBjb250ZW50ZWRpdGFibGU9XFxcImZhbHNlXFxcIiBkYXRhLXJhc2gtb3JpZ2luYWwtY29udGVudD1cXFwiXFxcIj4sPC9zdXA+XCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLyogU1RBUlQgUmVtb3ZlZCA8YT4gZnJvbSA8c3VwPiAqL1xuICAgICAgICAgICAgJCh0aGlzKS5odG1sKFwiPHN1cCBjbGFzcz1cXFwiZm4gY2dlblxcXCIgY29udGVudGVkaXRhYmxlPVxcXCJmYWxzZVxcXCIgZGF0YS1yYXNoLW9yaWdpbmFsLWNvbnRlbnQ9XFxcIlwiICsgb3JpZ2luYWxfY29udGVudCArIFwiXFxcIlwiICtcbiAgICAgICAgICAgICAgXCJuYW1lPVxcXCJmbl9wb2ludGVyX1wiICsgY3VycmVudF9pZC5yZXBsYWNlKFwiI1wiLCBcIlwiKSArXG4gICAgICAgICAgICAgIFwiXFxcIiB0aXRsZT1cXFwiRm9vdG5vdGUgXCIgKyBjb3VudCArIFwiOiBcIiArXG4gICAgICAgICAgICAgICQoY3VycmVudF9pZCkudGV4dCgpLnJlcGxhY2UoL1xccysvZywgXCIgXCIpLnRyaW0oKSArIFwiXFxcIj5cIiArIGNvdW50ICsgXCI8L3N1cD5cIik7XG4gICAgICAgICAgICAvKiBFTkQgUmVtb3ZlZCA8YT4gZnJvbSA8c3VwPiAqL1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkKHRoaXMpLmh0bWwoXCI8c3BhbiBjbGFzcz1cXFwiZXJyb3IgY2dlblxcXCIgY29udGVudGVkaXRhYmxlPVxcXCJmYWxzZVxcXCIgZGF0YS1yYXNoLW9yaWdpbmFsLWNvbnRlbnQ9XFxcIlwiICsgb3JpZ2luYWxfY29udGVudCArXG4gICAgICAgICAgICAgIFwiXFxcIj5FUlI6IGZvb3Rub3RlICdcIiArIGN1cnJlbnRfaWQucmVwbGFjZShcIiNcIiwgXCJcIikgKyBcIicgZG9lcyBub3QgZXhpc3Q8L3NwYW4+XCIpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvKiBDb21tb24gc2VjdGlvbnMgKi9cbiAgICAgICAgfSBlbHNlIGlmICgkKFwic2VjdGlvblwiICsgY3VyX2lkKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgdmFyIGN1cl9jb3VudCA9ICQoY3VyX2lkKS5maW5kSGllcmFyY2hpY2FsTnVtYmVyKFxuICAgICAgICAgICAgXCJzZWN0aW9uOm5vdChbcm9sZT1kb2MtYWJzdHJhY3RdKTpub3QoW3JvbGU9ZG9jLWJpYmxpb2dyYXBoeV0pOlwiICtcbiAgICAgICAgICAgIFwibm90KFtyb2xlPWRvYy1lbmRub3Rlc10pOm5vdChbcm9sZT1kb2MtZm9vdG5vdGVzXSk6bm90KFtyb2xlPWRvYy1hY2tub3dsZWRnZW1lbnRzXSlcIik7XG4gICAgICAgICAgaWYgKGN1cl9jb3VudCAhPSBudWxsICYmIGN1cl9jb3VudCAhPSBcIlwiKSB7XG4gICAgICAgICAgICAkKHRoaXMpLmh0bWwoXCI8c3BhbiBjbGFzcz1cXFwiY2dlblxcXCIgY29udGVudGVkaXRhYmxlPVxcXCJmYWxzZVxcXCIgZGF0YS1yYXNoLW9yaWdpbmFsLWNvbnRlbnQ9XFxcIlwiICsgb3JpZ2luYWxfY29udGVudCArXG4gICAgICAgICAgICAgIFwiXFxcIj5TZWN0aW9uIFwiICsgY3VyX2NvdW50ICsgXCI8L3NwYW4+XCIpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvKiBSZWZlcmVuY2UgdG8gZmlndXJlIGJveGVzICovXG4gICAgICAgIH0gZWxzZSBpZiAocmVmZXJlbmNlZF9lbGVtZW50X2ZpZ3VyZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgdmFyIGN1cl9jb3VudCA9IHJlZmVyZW5jZWRfZWxlbWVudF9maWd1cmUuZmluZE51bWJlcihmaWd1cmVib3hfc2VsZWN0b3IpO1xuICAgICAgICAgIGlmIChjdXJfY291bnQgIT0gMCkge1xuICAgICAgICAgICAgJCh0aGlzKS5odG1sKFwiPHNwYW4gY2xhc3M9XFxcImNnZW5cXFwiIGNvbnRlbnRlZGl0YWJsZT1cXFwiZmFsc2VcXFwiIGRhdGEtcmFzaC1vcmlnaW5hbC1jb250ZW50PVxcXCJcIiArIG9yaWdpbmFsX2NvbnRlbnQgK1xuICAgICAgICAgICAgICBcIlxcXCI+RmlndXJlIFwiICsgY3VyX2NvdW50ICsgXCI8L3NwYW4+XCIpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvKiBSZWZlcmVuY2UgdG8gdGFibGUgYm94ZXMgKi9cbiAgICAgICAgfSBlbHNlIGlmIChyZWZlcmVuY2VkX2VsZW1lbnRfdGFibGUubGVuZ3RoID4gMCkge1xuICAgICAgICAgIHZhciBjdXJfY291bnQgPSByZWZlcmVuY2VkX2VsZW1lbnRfdGFibGUuZmluZE51bWJlcih0YWJsZWJveF9zZWxlY3Rvcik7XG4gICAgICAgICAgaWYgKGN1cl9jb3VudCAhPSAwKSB7XG4gICAgICAgICAgICAkKHRoaXMpLmh0bWwoXCI8c3BhbiBjbGFzcz1cXFwiY2dlblxcXCIgY29udGVudGVkaXRhYmxlPVxcXCJmYWxzZVxcXCIgZGF0YS1yYXNoLW9yaWdpbmFsLWNvbnRlbnQ9XFxcIlwiICsgb3JpZ2luYWxfY29udGVudCArXG4gICAgICAgICAgICAgIFwiXFxcIj5UYWJsZSBcIiArIGN1cl9jb3VudCArIFwiPC9zcGFuPlwiKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLyogUmVmZXJlbmNlIHRvIGZvcm11bGEgYm94ZXMgKi9cbiAgICAgICAgfSBlbHNlIGlmIChyZWZlcmVuY2VkX2VsZW1lbnRfZm9ybXVsYS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgdmFyIGN1cl9jb3VudCA9IHJlZmVyZW5jZWRfZWxlbWVudF9mb3JtdWxhLmZpbmROdW1iZXIoZm9ybXVsYWJveF9zZWxlY3Rvcik7XG4gICAgICAgICAgaWYgKGN1cl9jb3VudCAhPSAwKSB7XG4gICAgICAgICAgICAkKHRoaXMpLmh0bWwoXCI8c3BhbiBjbGFzcz1cXFwiY2dlblxcXCIgY29udGVudGVkaXRhYmxlPVxcXCJmYWxzZVxcXCIgZGF0YS1yYXNoLW9yaWdpbmFsLWNvbnRlbnQ9XFxcIlwiICsgb3JpZ2luYWxfY29udGVudCArXG4gICAgICAgICAgICAgIFwiXFxcIj5Gb3JtdWxhIFwiICsgY3VyX2NvdW50ICsgXCI8L3NwYW4+XCIpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvKiBSZWZlcmVuY2UgdG8gbGlzdGluZyBib3hlcyAqL1xuICAgICAgICB9IGVsc2UgaWYgKHJlZmVyZW5jZWRfZWxlbWVudF9saXN0aW5nLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICB2YXIgY3VyX2NvdW50ID0gcmVmZXJlbmNlZF9lbGVtZW50X2xpc3RpbmcuZmluZE51bWJlcihsaXN0aW5nYm94X3NlbGVjdG9yKTtcbiAgICAgICAgICBpZiAoY3VyX2NvdW50ICE9IDApIHtcbiAgICAgICAgICAgICQodGhpcykuaHRtbChcIjxzcGFuIGNsYXNzPVxcXCJjZ2VuXFxcIiBjb250ZW50ZWRpdGFibGU9XFxcImZhbHNlXFxcIiBkYXRhLXJhc2gtb3JpZ2luYWwtY29udGVudD1cXFwiXCIgKyBvcmlnaW5hbF9jb250ZW50ICtcbiAgICAgICAgICAgICAgXCJcXFwiPkxpc3RpbmcgXCIgKyBjdXJfY291bnQgKyBcIjwvc3Bhbj5cIik7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICQodGhpcykuaHRtbChcIjxzcGFuIGNsYXNzPVxcXCJlcnJvciBjZ2VuXFxcIiBjb250ZW50ZWRpdGFibGU9XFxcImZhbHNlXFxcIiBkYXRhLXJhc2gtb3JpZ2luYWwtY29udGVudD1cXFwiXCIgKyBvcmlnaW5hbF9jb250ZW50ICtcbiAgICAgICAgICAgIFwiXFxcIj5FUlI6IHJlZmVyZW5jZWQgZWxlbWVudCAnXCIgKyBjdXJfaWQucmVwbGFjZShcIiNcIiwgXCJcIikgK1xuICAgICAgICAgICAgXCInIGhhcyBub3QgdGhlIGNvcnJlY3QgdHlwZSAoaXQgc2hvdWxkIGJlIGVpdGhlciBhIGZpZ3VyZSwgYSB0YWJsZSwgYSBmb3JtdWxhLCBhIGxpc3RpbmcsIG9yIGEgc2VjdGlvbik8L3NwYW4+XCIpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkKHRoaXMpLnJlcGxhY2VXaXRoKFwiPHNwYW4gY2xhc3M9XFxcImVycm9yIGNnZW5cXFwiIGNvbnRlbnRlZGl0YWJsZT1cXFwiZmFsc2VcXFwiIGRhdGEtcmFzaC1vcmlnaW5hbC1jb250ZW50PVxcXCJcIiArIG9yaWdpbmFsX2NvbnRlbnQgK1xuICAgICAgICAgIFwiXFxcIj5FUlI6IHJlZmVyZW5jZWQgZWxlbWVudCAnXCIgKyBjdXJfaWQucmVwbGFjZShcIiNcIiwgXCJcIikgKyBcIicgZG9lcyBub3QgZXhpc3Q8L3NwYW4+XCIpO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG4gIC8qIC9FTkQgUmVmZXJlbmNlcyAqL1xufVxuXG5mdW5jdGlvbiB1cGRhdGVSZWZlcmVuY2VzKCkge1xuXG4gIGlmICgkKCdzcGFuLmNnZW5bZGF0YS1yYXNoLW9yaWdpbmFsLWNvbnRlbnRdLHN1cC5jZ2VuLmZuJykubGVuZ3RoKSB7XG5cbiAgICAvLyBSZXN0b3JlIGFsbCBzYXZlZCBjb250ZW50XG4gICAgJCgnc3Bhbi5jZ2VuW2RhdGEtcmFzaC1vcmlnaW5hbC1jb250ZW50XSxzdXAuY2dlbi5mbicpLmVhY2goZnVuY3Rpb24gKCkge1xuXG4gICAgICAvLyBTYXZlIG9yaWdpbmFsIGNvbnRlbnQgYW5kIHJlZmVyZW5jZVxuICAgICAgbGV0IG9yaWdpbmFsX2NvbnRlbnQgPSAkKHRoaXMpLmF0dHIoJ2RhdGEtcmFzaC1vcmlnaW5hbC1jb250ZW50JylcbiAgICAgIGxldCBvcmlnaW5hbF9yZWZlcmVuY2UgPSAkKHRoaXMpLnBhcmVudCgnYScpLmF0dHIoJ2hyZWYnKVxuXG4gICAgICAkKHRoaXMpLnBhcmVudCgnYScpLnJlcGxhY2VXaXRoKGA8YSBjb250ZW50ZWRpdGFibGU9XCJmYWxzZVwiIGhyZWY9XCIke29yaWdpbmFsX3JlZmVyZW5jZX1cIj4ke29yaWdpbmFsX2NvbnRlbnR9PC9hPmApXG4gICAgfSlcblxuICAgIHJlZmVyZW5jZXMoKVxuICB9XG59IiwiLyoqXG4gKiBUaGlzIHNjcmlwdCBjb250YWlucyBhbGwgZmlndXJlIGJveCBhdmFpbGFibGUgd2l0aCBSQVNILlxuICogXG4gKiBwbHVnaW5zOlxuICogIHJhamVfdGFibGVcbiAqICByYWplX2ZpZ3VyZVxuICogIHJhamVfZm9ybXVsYVxuICogIHJhamVfbGlzdGluZ1xuICovXG5sZXQgcmVtb3ZlX2xpc3RpbmcgPSAwXG5cbi8qKlxuICogXG4gKiBAcGFyYW0geyp9IGZvcm11bGFWYWx1ZSBcbiAqIEBwYXJhbSB7Kn0gY2FsbGJhY2sgXG4gKi9cbmZ1bmN0aW9uIG9wZW5JbmxpbmVGb3JtdWxhRWRpdG9yKGZvcm11bGFWYWx1ZSwgY2FsbGJhY2spIHtcbiAgdGlueW1jZS5hY3RpdmVFZGl0b3Iud2luZG93TWFuYWdlci5vcGVuKHtcbiAgICAgIHRpdGxlOiAnTWF0aCBmb3JtdWxhIGVkaXRvcicsXG4gICAgICB1cmw6ICdqcy9yYWplLWNvcmUvcGx1Z2luL3JhamVfZm9ybXVsYS5odG1sJyxcbiAgICAgIHdpZHRoOiA4MDAsXG4gICAgICBoZWlnaHQ6IDUwMCxcbiAgICAgIG9uQ2xvc2U6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgICBsZXQgb3V0cHV0ID0gdGlueW1jZS5hY3RpdmVFZGl0b3IuZm9ybXVsYV9vdXRwdXRcblxuICAgICAgICAvLyBJZiBhdCBsZWFzdCBmb3JtdWxhIGlzIHdyaXR0ZW5cbiAgICAgICAgaWYgKG91dHB1dCAhPSBudWxsKSB7XG5cbiAgICAgICAgICAvLyBJZiBoYXMgaWQsIFJBSkUgbXVzdCB1cGRhdGUgaXRcbiAgICAgICAgICBpZiAob3V0cHV0LmZvcm11bGFfaWQpXG4gICAgICAgICAgICBpbmxpbmVfZm9ybXVsYS51cGRhdGUob3V0cHV0LmZvcm11bGFfc3ZnLCBvdXRwdXQuZm9ybXVsYV9pZClcblxuICAgICAgICAgIC8vIE9yIGFkZCBpdCBub3JtYWxseVxuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIGlubGluZV9mb3JtdWxhLmFkZChvdXRwdXQuZm9ybXVsYV9zdmcpXG5cbiAgICAgICAgICAvLyBTZXQgZm9ybXVsYSBudWxsXG4gICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IuZm9ybXVsYV9vdXRwdXQgPSBudWxsXG4gICAgICAgIH1cblxuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci53aW5kb3dNYW5hZ2VyLmNsb3NlKClcbiAgICAgIH1cbiAgICB9LFxuICAgIGZvcm11bGFWYWx1ZVxuICApXG59XG5cbi8qKlxuICogXG4gKiBAcGFyYW0geyp9IGZvcm11bGFWYWx1ZSBcbiAqIEBwYXJhbSB7Kn0gY2FsbGJhY2sgXG4gKi9cbmZ1bmN0aW9uIG9wZW5Gb3JtdWxhRWRpdG9yKGZvcm11bGFWYWx1ZSwgY2FsbGJhY2spIHtcbiAgdGlueW1jZS5hY3RpdmVFZGl0b3Iud2luZG93TWFuYWdlci5vcGVuKHtcbiAgICAgIHRpdGxlOiAnTWF0aCBmb3JtdWxhIGVkaXRvcicsXG4gICAgICB1cmw6ICdqcy9yYWplLWNvcmUvcGx1Z2luL3JhamVfZm9ybXVsYS5odG1sJyxcbiAgICAgIHdpZHRoOiA4MDAsXG4gICAgICBoZWlnaHQ6IDUwMCxcbiAgICAgIG9uQ2xvc2U6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgICBsZXQgb3V0cHV0ID0gdGlueW1jZS5hY3RpdmVFZGl0b3IuZm9ybXVsYV9vdXRwdXRcblxuICAgICAgICAvLyBJZiBhdCBsZWFzdCBmb3JtdWxhIGlzIHdyaXR0ZW5cbiAgICAgICAgaWYgKG91dHB1dCAhPSBudWxsKSB7XG5cbiAgICAgICAgICAvLyBJZiBoYXMgaWQsIFJBSkUgbXVzdCB1cGRhdGUgaXRcbiAgICAgICAgICBpZiAob3V0cHV0LmZvcm11bGFfaWQpXG4gICAgICAgICAgICBmb3JtdWxhLnVwZGF0ZShvdXRwdXQuZm9ybXVsYV9zdmcsIG91dHB1dC5mb3JtdWxhX2lkKVxuXG4gICAgICAgICAgLy8gT3IgYWRkIGl0IG5vcm1hbGx5XG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgZm9ybXVsYS5hZGQob3V0cHV0LmZvcm11bGFfc3ZnKVxuXG4gICAgICAgICAgLy8gU2V0IGZvcm11bGEgbnVsbFxuICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLmZvcm11bGFfb3V0cHV0ID0gbnVsbFxuICAgICAgICB9XG5cbiAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iud2luZG93TWFuYWdlci5jbG9zZSgpXG4gICAgICB9XG4gICAgfSxcbiAgICBmb3JtdWxhVmFsdWVcbiAgKVxufVxuXG4vKipcbiAqIFJhamVfdGFibGVcbiAqL1xudGlueW1jZS5QbHVnaW5NYW5hZ2VyLmFkZCgncmFqZV90YWJsZScsIGZ1bmN0aW9uIChlZGl0b3IsIHVybCkge1xuXG4gIC8vIEFkZCBhIGJ1dHRvbiB0aGF0IGhhbmRsZSB0aGUgaW5saW5lIGVsZW1lbnRcbiAgZWRpdG9yLmFkZEJ1dHRvbigncmFqZV90YWJsZScsIHtcbiAgICB0aXRsZTogJ3JhamVfdGFibGUnLFxuICAgIGljb246ICdpY29uLXRhYmxlJyxcbiAgICB0b29sdGlwOiAnVGFibGUnLFxuICAgIGRpc2FibGVkU3RhdGVTZWxlY3RvcjogRElTQUJMRV9TRUxFQ1RPUl9GSUdVUkVTLFxuXG4gICAgLy8gQnV0dG9uIGJlaGF2aW91clxuICAgIG9uY2xpY2s6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgLy8gT24gY2xpY2sgYSBkaWFsb2cgaXMgb3BlbmVkXG4gICAgICBlZGl0b3Iud2luZG93TWFuYWdlci5vcGVuKHtcbiAgICAgICAgdGl0bGU6ICdTZWxlY3QgVGFibGUgc2l6ZScsXG4gICAgICAgIGJvZHk6IFt7XG4gICAgICAgICAgdHlwZTogJ3RleHRib3gnLFxuICAgICAgICAgIG5hbWU6ICd3aWR0aCcsXG4gICAgICAgICAgbGFiZWw6ICdDb2x1bW5zJ1xuICAgICAgICB9LCB7XG4gICAgICAgICAgdHlwZTogJ3RleHRib3gnLFxuICAgICAgICAgIG5hbWU6ICdoZWlndGgnLFxuICAgICAgICAgIGxhYmVsOiAnUm93cydcbiAgICAgICAgfV0sXG4gICAgICAgIG9uU3VibWl0OiBmdW5jdGlvbiAoZSkge1xuXG4gICAgICAgICAgLy8gR2V0IHdpZHRoIGFuZCBoZWlndGhcbiAgICAgICAgICB0YWJsZS5hZGQoZS5kYXRhLndpZHRoLCBlLmRhdGEuaGVpZ3RoKVxuICAgICAgICB9XG4gICAgICB9KVxuICAgIH1cbiAgfSlcblxuICAvLyBCZWNhdXNlIHNvbWUgYmVoYXZpb3VycyBhcmVuJ3QgYWNjZXB0ZWQsIFJBSkUgbXVzdCBjaGVjayBzZWxlY3Rpb24gYW5kIGFjY2VwdCBiYWNrc3BhY2UsIGNhbmMgYW5kIGVudGVyIHByZXNzXG4gIGVkaXRvci5vbigna2V5RG93bicsIGZ1bmN0aW9uIChlKSB7XG5cbiAgICAvLyBUT0RPIGlmIGluc2lkZSB0YWJsZVxuXG4gICAgLy8ga2V5Q29kZSA4IGlzIGJhY2tzcGFjZSwgNDYgaXMgY2FuY1xuICAgIGlmIChlLmtleUNvZGUgPT0gOClcbiAgICAgIHJldHVybiBoYW5kbGVGaWd1cmVEZWxldGUodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uKVxuXG4gICAgaWYgKGUua2V5Q29kZSA9PSA0NilcbiAgICAgIHJldHVybiBoYW5kbGVGaWd1cmVDYW5jKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbilcblxuICAgIC8vIEhhbmRsZSBlbnRlciBrZXkgaW4gZmlnY2FwdGlvblxuICAgIGlmIChlLmtleUNvZGUgPT0gMTMpXG4gICAgICByZXR1cm4gaGFuZGxlRmlndXJlRW50ZXIodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uKVxuXG4gICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKVxuICB9KVxuXG4gIC8vIEhhbmRsZSBzdHJhbmdlIHN0cnVjdHVyYWwgbW9kaWZpY2F0aW9uIGVtcHR5IGZpZ3VyZXMgb3Igd2l0aCBjYXB0aW9uIGFzIGZpcnN0IGNoaWxkXG4gIGVkaXRvci5vbignbm9kZUNoYW5nZScsIGZ1bmN0aW9uIChlKSB7XG4gICAgaGFuZGxlRmlndXJlQ2hhbmdlKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbilcbiAgfSlcblxuICB0YWJsZSA9IHtcblxuICAgIC8qKlxuICAgICAqIEFkZCB0aGUgbmV3IHRhYmxlICh3aXRoIGdpdmVuIHNpemUpIGF0IHRoZSBjYXJldCBwb3NpdGlvblxuICAgICAqL1xuICAgIGFkZDogZnVuY3Rpb24gKHdpZHRoLCBoZWlndGgpIHtcblxuICAgICAgLy8gR2V0IHRoZSByZWZlcmVuY2Ugb2YgdGhlIGN1cnJlbnQgc2VsZWN0ZWQgZWxlbWVudFxuICAgICAgbGV0IHNlbGVjdGVkRWxlbWVudCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcblxuICAgICAgLy8gR2V0IHRoZSByZWZlcmVuY2Ugb2YgdGhlIG5ldyBjcmVhdGVkIHRhYmxlXG4gICAgICBsZXQgbmV3VGFibGUgPSB0aGlzLmNyZWF0ZSh3aWR0aCwgaGVpZ3RoLCBnZXRTdWNjZXNzaXZlRWxlbWVudElkKEZJR1VSRV9UQUJMRV9TRUxFQ1RPUiwgVEFCTEVfU1VGRklYKSlcblxuICAgICAgLy8gQmVnaW4gYXRvbWljIFVORE8gbGV2ZWwgXG4gICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIHNlbGVjdGVkIGVsZW1lbnQgaXMgbm90IGVtcHR5LCBhbmQgYWRkIHRhYmxlIGFmdGVyXG4gICAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQudGV4dCgpLnRyaW0oKS5sZW5ndGggIT0gMCkge1xuXG4gICAgICAgICAgLy8gSWYgc2VsZWN0aW9uIGlzIGF0IHN0YXJ0IG9mIHRoZSBzZWxlY3RlZCBlbGVtZW50XG4gICAgICAgICAgaWYgKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRSbmcoKS5zdGFydE9mZnNldCA9PSAwKVxuICAgICAgICAgICAgc2VsZWN0ZWRFbGVtZW50LmJlZm9yZShuZXdUYWJsZSlcblxuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIHNlbGVjdGVkRWxlbWVudC5hZnRlcihuZXdUYWJsZSlcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIElmIHNlbGVjdGVkIGVsZW1lbnQgaXMgZW1wdHksIHJlcGxhY2UgaXQgd2l0aCB0aGUgbmV3IHRhYmxlXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBzZWxlY3RlZEVsZW1lbnQucmVwbGFjZVdpdGgobmV3VGFibGUpXG5cbiAgICAgICAgLy8gU2F2ZSB1cGRhdGVzIFxuICAgICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcblxuICAgICAgICAvLyBVcGRhdGUgYWxsIGNhcHRpb25zIHdpdGggUkFTSCBmdW5jdGlvblxuICAgICAgICBjYXB0aW9ucygpXG5cbiAgICAgICAgLy8gVXBkYXRlIGFsbCBjcm9zcy1yZWZcbiAgICAgICAgdXBkYXRlUmVmZXJlbmNlcygpXG5cbiAgICAgICAgLy8gVXBkYXRlIFJlbmRlcmVkIFJBU0hcbiAgICAgICAgdXBkYXRlSWZyYW1lRnJvbVNhdmVkQ29udGVudCgpXG4gICAgICB9KVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgdGhlIG5ldyB0YWJsZSB1c2luZyBwYXNzZWQgd2lkdGggYW5kIGhlaWdodFxuICAgICAqL1xuICAgIGNyZWF0ZTogZnVuY3Rpb24gKHdpZHRoLCBoZWlnaHQsIGlkKSB7XG5cbiAgICAgIC8vIElmIHdpZHRoIGFuZCBoZWlndGggYXJlIHBvc2l0aXZlXG4gICAgICB0cnkge1xuICAgICAgICBpZiAod2lkdGggPiAwICYmIGhlaWdodCA+IDApIHtcblxuICAgICAgICAgIC8vIENyZWF0ZSBmaWd1cmUgYW5kIHRhYmxlXG4gICAgICAgICAgbGV0IGZpZ3VyZSA9ICQoYDxmaWd1cmUgaWQ9XCIke2lkfVwiPjwvZmlndXJlPmApXG4gICAgICAgICAgbGV0IHRhYmxlID0gJChgPHRhYmxlPjwvdGFibGU+YClcblxuICAgICAgICAgIC8vIFBvcHVsYXRlIHdpdGggd2lkdGggJiBoZWlndGhcbiAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8PSBoZWlnaHQ7IGkrKykge1xuXG4gICAgICAgICAgICBsZXQgcm93ID0gJChgPHRyPjwvdHI+YClcbiAgICAgICAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgd2lkdGg7IHgrKykge1xuXG4gICAgICAgICAgICAgIGlmIChpID09IDApXG4gICAgICAgICAgICAgICAgcm93LmFwcGVuZChgPHRoPkhlYWRpbmcgY2VsbCAke3grMX08L3RoPmApXG5cbiAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIHJvdy5hcHBlbmQoYDx0ZD48cD5EYXRhIGNlbGwgJHt4KzF9PC9wPjwvdGQ+YClcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGFibGUuYXBwZW5kKHJvdylcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBmaWd1cmUuYXBwZW5kKHRhYmxlKVxuICAgICAgICAgIGZpZ3VyZS5hcHBlbmQoYDxmaWdjYXB0aW9uPkNhcHRpb24uPC9maWdjYXB0aW9uPmApXG5cbiAgICAgICAgICByZXR1cm4gZmlndXJlXG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2ggKGUpIHt9XG4gICAgfVxuICB9XG59KVxuXG4vKipcbiAqIFJhamVfZmlndXJlXG4gKi9cbnRpbnltY2UuUGx1Z2luTWFuYWdlci5hZGQoJ3JhamVfaW1hZ2UnLCBmdW5jdGlvbiAoZWRpdG9yLCB1cmwpIHtcblxuICAvLyBBZGQgYSBidXR0b24gdGhhdCBoYW5kbGUgdGhlIGlubGluZSBlbGVtZW50XG4gIGVkaXRvci5hZGRCdXR0b24oJ3JhamVfaW1hZ2UnLCB7XG4gICAgdGl0bGU6ICdyYWplX2ltYWdlJyxcbiAgICBpY29uOiAnaWNvbi1pbWFnZScsXG4gICAgdG9vbHRpcDogJ0ltYWdlIGJsb2NrJyxcbiAgICBkaXNhYmxlZFN0YXRlU2VsZWN0b3I6IERJU0FCTEVfU0VMRUNUT1JfRklHVVJFUyxcblxuICAgIC8vIEJ1dHRvbiBiZWhhdmlvdXJcbiAgICBvbmNsaWNrOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgIGxldCBmaWxlbmFtZSA9IHNlbGVjdEltYWdlKClcblxuICAgICAgaWYgKGZpbGVuYW1lICE9IG51bGwpXG4gICAgICAgIGltYWdlLmFkZChmaWxlbmFtZSwgZmlsZW5hbWUpXG4gICAgfVxuICB9KVxuXG4gIC8vIEJlY2F1c2Ugc29tZSBiZWhhdmlvdXJzIGFyZW4ndCBhY2NlcHRlZCwgUkFKRSBtdXN0IGNoZWNrIHNlbGVjdGlvbiBhbmQgYWNjZXB0IGJhY2tzcGFjZSwgY2FuYyBhbmQgZW50ZXIgcHJlc3NcbiAgZWRpdG9yLm9uKCdrZXlEb3duJywgZnVuY3Rpb24gKGUpIHtcblxuXG4gICAgLy8ga2V5Q29kZSA4IGlzIGJhY2tzcGFjZVxuICAgIGlmIChlLmtleUNvZGUgPT0gOClcbiAgICAgIHJldHVybiBoYW5kbGVGaWd1cmVEZWxldGUodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uKVxuXG4gICAgaWYgKGUua2V5Q29kZSA9PSA0NilcbiAgICAgIHJldHVybiBoYW5kbGVGaWd1cmVDYW5jKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbilcblxuICAgIC8vIEhhbmRsZSBlbnRlciBrZXkgaW4gZmlnY2FwdGlvblxuICAgIGlmIChlLmtleUNvZGUgPT0gMTMpXG4gICAgICByZXR1cm4gaGFuZGxlRmlndXJlRW50ZXIodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uKVxuXG4gIH0pXG5cbiAgaW1hZ2UgPSB7XG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBhZGQ6IGZ1bmN0aW9uICh1cmwsIGFsdCkge1xuXG4gICAgICAvLyBHZXQgdGhlIHJlZmVyZWNlIG9mIHRoZSBzZWxlY3RlZCBlbGVtZW50XG4gICAgICBsZXQgc2VsZWN0ZWRFbGVtZW50ID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuICAgICAgbGV0IG5ld0ZpZ3VyZSA9IHRoaXMuY3JlYXRlKHVybCwgYWx0LCBnZXRTdWNjZXNzaXZlRWxlbWVudElkKEZJR1VSRV9JTUFHRV9TRUxFQ1RPUiwgSU1BR0VfU1VGRklYKSlcblxuICAgICAgLy8gQmVnaW4gYXRvbWljIFVORE8gbGV2ZWwgXG4gICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIHNlbGVjdGVkIGVsZW1lbnQgaXMgbm90IGVtcHR5LCBhbmQgYWRkIHRhYmxlIGFmdGVyXG4gICAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQudGV4dCgpLnRyaW0oKS5sZW5ndGggIT0gMCkge1xuXG4gICAgICAgICAgLy8gSWYgc2VsZWN0aW9uIGlzIGF0IHN0YXJ0IG9mIHRoZSBzZWxlY3RlZCBlbGVtZW50XG4gICAgICAgICAgaWYgKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRSbmcoKS5zdGFydE9mZnNldCA9PSAwKVxuICAgICAgICAgICAgc2VsZWN0ZWRFbGVtZW50LmJlZm9yZShuZXdGaWd1cmUpXG5cbiAgICAgICAgICBlbHNlXG4gICAgICAgICAgICBzZWxlY3RlZEVsZW1lbnQuYWZ0ZXIobmV3RmlndXJlKVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gSWYgc2VsZWN0ZWQgZWxlbWVudCBpcyBlbXB0eSwgcmVwbGFjZSBpdCB3aXRoIHRoZSBuZXcgdGFibGVcbiAgICAgICAgZWxzZVxuICAgICAgICAgIHNlbGVjdGVkRWxlbWVudC5yZXBsYWNlV2l0aChuZXdGaWd1cmUpXG5cbiAgICAgICAgLy8gU2F2ZSB1cGRhdGVzIFxuICAgICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcblxuICAgICAgICAvLyBVcGRhdGUgYWxsIGNhcHRpb25zIHdpdGggUkFTSCBmdW5jdGlvblxuICAgICAgICBjYXB0aW9ucygpXG5cbiAgICAgICAgLy8gVXBkYXRlIGFsbCBjcm9zcy1yZWZcbiAgICAgICAgdXBkYXRlUmVmZXJlbmNlcygpXG5cbiAgICAgICAgLy8gVXBkYXRlIFJlbmRlcmVkIFJBU0hcbiAgICAgICAgdXBkYXRlSWZyYW1lRnJvbVNhdmVkQ29udGVudCgpXG4gICAgICB9KVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBjcmVhdGU6IGZ1bmN0aW9uICh1cmwsIGFsdCwgaWQpIHtcbiAgICAgIHJldHVybiAkKGA8ZmlndXJlIGlkPVwiJHtpZH1cIj48cD48aW1nIHNyYz1cIiR7dXJsfVwiICR7YWx0PydhbHQ9XCInK2FsdCsnXCInOicnfSAvPjwvcD48ZmlnY2FwdGlvbj5DYXB0aW9uLjwvZmlnY2FwdGlvbj48L2ZpZ3VyZT5gKVxuICAgIH1cbiAgfVxufSlcblxuLyoqXG4gKiBSYWplX2Zvcm11bGFcbiAqL1xudGlueW1jZS5QbHVnaW5NYW5hZ2VyLmFkZCgncmFqZV9mb3JtdWxhJywgZnVuY3Rpb24gKGVkaXRvciwgdXJsKSB7XG5cbiAgLy8gQWRkIGEgYnV0dG9uIHRoYXQgaGFuZGxlIHRoZSBpbmxpbmUgZWxlbWVudFxuICBlZGl0b3IuYWRkQnV0dG9uKCdyYWplX2Zvcm11bGEnLCB7XG4gICAgdGl0bGU6ICdyYWplX2Zvcm11bGEnLFxuICAgIGljb246ICdpY29uLWZvcm11bGEnLFxuICAgIHRvb2x0aXA6ICdGb3JtdWxhJyxcbiAgICBkaXNhYmxlZFN0YXRlU2VsZWN0b3I6IERJU0FCTEVfU0VMRUNUT1JfRklHVVJFUyxcblxuICAgIC8vIEJ1dHRvbiBiZWhhdmlvdXJcbiAgICBvbmNsaWNrOiBmdW5jdGlvbiAoKSB7XG4gICAgICBvcGVuRm9ybXVsYUVkaXRvcigpXG4gICAgfVxuICB9KVxuXG4gIC8vIEJlY2F1c2Ugc29tZSBiZWhhdmlvdXJzIGFyZW4ndCBhY2NlcHRlZCwgUkFKRSBtdXN0IGNoZWNrIHNlbGVjdGlvbiBhbmQgYWNjZXB0IGJhY2tzcGFjZSwgY2FuYyBhbmQgZW50ZXIgcHJlc3NcbiAgZWRpdG9yLm9uKCdrZXlEb3duJywgZnVuY3Rpb24gKGUpIHtcblxuICAgIGxldCBzZWxlY3RlZEVsZW1lbnQgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG5cbiAgICBpZiAoZm9ybXVsYS5jdXJzb3JJbkZvcm11bGEoc2VsZWN0ZWRFbGVtZW50KSkge1xuXG4gICAgICAvLyBrZXlDb2RlIDggaXMgYmFja3NwYWNlXG4gICAgICBpZiAoZS5rZXlDb2RlID09IDgpIHtcbiAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKVxuICAgICAgICByZXR1cm4gaGFuZGxlRmlndXJlRGVsZXRlKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbilcbiAgICAgIH1cblxuICAgICAgaWYgKGUua2V5Q29kZSA9PSA0Nikge1xuICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpXG4gICAgICAgIHJldHVybiBoYW5kbGVGaWd1cmVDYW5jKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbilcbiAgICAgIH1cblxuICAgICAgLy8gSGFuZGxlIGVudGVyIGtleSBpbiBmaWdjYXB0aW9uXG4gICAgICBpZiAoZS5rZXlDb2RlID09IDEzKSB7XG4gICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKClcbiAgICAgICAgcmV0dXJuIGhhbmRsZUZpZ3VyZUVudGVyKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbilcbiAgICAgIH1cblxuICAgICAgLy8gQmxvY2sgcHJpbnRhYmxlIGNoYXJzIGluIHBcbiAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQuaXMoJ3AnKSAmJiBjaGVja0lmUHJpbnRhYmxlQ2hhcihlLmtleUNvZGUpKSB7XG4gICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKClcbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICB9XG4gICAgfVxuICB9KVxuXG4gIGVkaXRvci5vbignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuICAgIGxldCBzZWxlY3RlZEVsZW1lbnQgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG5cbiAgICAvLyBPcGVuIGZvcm11bGEgZWRpdG9yIGNsaWNraW5nIG9uIG1hdGggZm9ybXVsYXNcbiAgICAvLyBPTmx5IGlmIHRoZSBjdXJyZW50IGVsZW1lbnQgdGhlIHNwYW4gd2l0aCBjb250ZW50ZWRpdGFibGU9XCJmYWxzZVwiXG4gICAgaWYgKHNlbGVjdGVkRWxlbWVudC5pcygnc3Bhbltjb250ZW50ZWRpdGFibGU9ZmFsc2VdJykgJiYgZm9ybXVsYS5jdXJzb3JJbkZvcm11bGEoc2VsZWN0ZWRFbGVtZW50KSkge1xuXG4gICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpXG5cbiAgICAgIGxldCBmaWd1cmUgPSBzZWxlY3RlZEVsZW1lbnRcblxuICAgICAgaWYgKCFzZWxlY3RlZEVsZW1lbnQuaXMoRklHVVJFX0ZPUk1VTEFfU0VMRUNUT1IpKVxuICAgICAgICBmaWd1cmUgPSBzZWxlY3RlZEVsZW1lbnQucGFyZW50cyhGSUdVUkVfRk9STVVMQV9TRUxFQ1RPUilcblxuICAgICAgb3BlbkZvcm11bGFFZGl0b3Ioe1xuICAgICAgICBmb3JtdWxhX3ZhbDogZmlndXJlLmZpbmQoJ3N2Z1tkYXRhLW1hdGgtb3JpZ2luYWwtaW5wdXRdJykuYXR0cignZGF0YS1tYXRoLW9yaWdpbmFsLWlucHV0JyksXG4gICAgICAgIGZvcm11bGFfaWQ6IGZpZ3VyZS5hdHRyKCdpZCcpXG4gICAgICB9KVxuICAgIH1cbiAgfSlcblxuICBmb3JtdWxhID0ge1xuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIGFkZDogZnVuY3Rpb24gKGZvcm11bGFfc3ZnKSB7XG5cbiAgICAgIGxldCBzZWxlY3RlZEVsZW1lbnQgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG4gICAgICBsZXQgaWQgPSBnZXRTdWNjZXNzaXZlRWxlbWVudElkKEZJR1VSRV9GT1JNVUxBX1NFTEVDVE9SLCBGT1JNVUxBX1NVRkZJWClcbiAgICAgIGxldCBuZXdGb3JtdWxhID0gdGhpcy5jcmVhdGUoZm9ybXVsYV9zdmcsIGlkKVxuXG4gICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIHNlbGVjdGVkIGVsZW1lbnQgaXMgbm90IGVtcHR5LCBhbmQgYWRkIHRoZSBuZXcgZm9ybXVsYSByaWdodCBhZnRlclxuICAgICAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LnRleHQoKS50cmltKCkubGVuZ3RoICE9IDApXG4gICAgICAgICAgc2VsZWN0ZWRFbGVtZW50LmFmdGVyKG5ld0Zvcm11bGEpXG5cbiAgICAgICAgLy8gSWYgc2VsZWN0ZWQgZWxlbWVudCBpcyBlbXB0eSwgcmVwbGFjZSBpdCB3aXRoIHRoZSBuZXcgZm9ybXVsYVxuICAgICAgICBlbHNlXG4gICAgICAgICAgc2VsZWN0ZWRFbGVtZW50LnJlcGxhY2VXaXRoKG5ld0Zvcm11bGEpXG5cbiAgICAgICAgLy8gU2F2ZSB1cGRhdGVzIFxuICAgICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcbiAgICAgICAgY2FwdGlvbnMoKVxuXG4gICAgICAgIG5ld0Zvcm11bGEgPSAkKGAjJHtpZH1gKVxuXG4gICAgICAgIGZvcm11bGEudXBkYXRlU3RydWN0dXJlKG5ld0Zvcm11bGEpXG5cbiAgICAgICAgLy8gQWRkIGEgbmV3IGVtcHR5IHAgYWZ0ZXIgdGhlIGZvcm11bGFcbiAgICAgICAgaWYgKCFuZXdGb3JtdWxhLm5leHQoKS5sZW5ndGgpXG4gICAgICAgICAgbmV3Rm9ybXVsYS5hZnRlcignPHA+PGJyLz48L3A+JylcblxuICAgICAgICAvLyBVcGRhdGUgYWxsIGNyb3NzLXJlZlxuICAgICAgICB1cGRhdGVSZWZlcmVuY2VzKClcblxuICAgICAgICAvLyBVcGRhdGUgUmVuZGVyZWQgUkFTSFxuICAgICAgICB1cGRhdGVJZnJhbWVGcm9tU2F2ZWRDb250ZW50KClcblxuICAgICAgICAvLyBNb3ZlIHRoZSBjYXJldCBhdCB0aGUgc3RhcnQgb2YgdGhlIG5leHQgZWxlbWVudFxuICAgICAgICBtb3ZlQ2FyZXQodGlueW1jZS5hY3RpdmVFZGl0b3IuZG9tLmdldE5leHQodGlueW1jZS5hY3RpdmVFZGl0b3IuZG9tLmdldChpZCksICcqJyksIHRydWUpXG4gICAgICB9KVxuXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIHVwZGF0ZTogZnVuY3Rpb24gKGZvcm11bGFfc3ZnLCBmb3JtdWxhX2lkKSB7XG5cbiAgICAgIGxldCBzZWxlY3RlZEZpZ3VyZSA9ICQoYCMke2Zvcm11bGFfaWR9YClcblxuICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIHNlbGVjdGVkRmlndXJlLmZpbmQoJ3N2ZycpLnJlcGxhY2VXaXRoKGZvcm11bGFfc3ZnKVxuICAgICAgICB1cGRhdGVJZnJhbWVGcm9tU2F2ZWRDb250ZW50KClcbiAgICAgIH0pXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIGNyZWF0ZTogZnVuY3Rpb24gKGZvcm11bGFfc3ZnLCBpZCkge1xuICAgICAgcmV0dXJuIGA8ZmlndXJlIGlkPVwiJHtpZH1cIj48cD48c3Bhbj4ke2Zvcm11bGFfc3ZnWzBdLm91dGVySFRNTH08L3NwYW4+PC9wPjwvZmlndXJlPmBcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgY3Vyc29ySW5Gb3JtdWxhOiBmdW5jdGlvbiAoc2VsZWN0ZWRFbGVtZW50KSB7XG5cbiAgICAgIHJldHVybiAoXG5cbiAgICAgICAgLy8gSWYgdGhlIHNlbGVjdGVkIGVsZW1lbnQgaXMgdGhlIGZvcm11bGEgZmlndXJlXG4gICAgICAgIChzZWxlY3RlZEVsZW1lbnQuaXMoRklHVVJFX0ZPUk1VTEFfU0VMRUNUT1IpKSB8fFxuXG4gICAgICAgIC8vIElmIHRoZSBzZWxlY3RlZCBlbGVtZW50IGlzIGluc2lkZSB0aGUgZm9ybXVsYSBmaWd1cmVcbiAgICAgICAgc2VsZWN0ZWRFbGVtZW50LnBhcmVudHMoRklHVVJFX0ZPUk1VTEFfU0VMRUNUT1IpLmxlbmd0aCkgPT0gMSA/IHRydWUgOiBmYWxzZVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICB1cGRhdGVTdHJ1Y3R1cmU6IGZ1bmN0aW9uIChmb3JtdWxhKSB7XG5cbiAgICAgIC8vIEFkZCBhIG5vdCBlZGl0YWJsZSBzcGFuXG4gICAgICBsZXQgcGFyYWdyYXBoID0gZm9ybXVsYS5jaGlsZHJlbigncCcpXG4gICAgICBsZXQgcGFyYWdyYXBoQ29udGVudCA9IHBhcmFncmFwaC5odG1sKClcbiAgICAgIHBhcmFncmFwaC5odG1sKGA8c3BhbiBjb250ZW50ZWRpdGFibGU9XCJmYWxzZVwiPiR7cGFyYWdyYXBoQ29udGVudH08L3NwYW4+YClcbiAgICB9XG4gIH1cbn0pXG5cbi8qKlxuICogUmFqZV9saXN0aW5nXG4gKi9cbnRpbnltY2UuUGx1Z2luTWFuYWdlci5hZGQoJ3JhamVfbGlzdGluZycsIGZ1bmN0aW9uIChlZGl0b3IsIHVybCkge1xuXG4gIC8vIEFkZCBhIGJ1dHRvbiB0aGF0IGhhbmRsZSB0aGUgaW5saW5lIGVsZW1lbnRcbiAgZWRpdG9yLmFkZEJ1dHRvbigncmFqZV9saXN0aW5nJywge1xuICAgIHRpdGxlOiAncmFqZV9saXN0aW5nJyxcbiAgICBpY29uOiAnaWNvbi1saXN0aW5nJyxcbiAgICB0b29sdGlwOiAnTGlzdGluZycsXG4gICAgZGlzYWJsZWRTdGF0ZVNlbGVjdG9yOiBESVNBQkxFX1NFTEVDVE9SX0ZJR1VSRVMsXG5cbiAgICAvLyBCdXR0b24gYmVoYXZpb3VyXG4gICAgb25jbGljazogZnVuY3Rpb24gKCkge1xuICAgICAgbGlzdGluZy5hZGQoKVxuICAgIH1cbiAgfSlcblxuXG5cbiAgLy8gQmVjYXVzZSBzb21lIGJlaGF2aW91cnMgYXJlbid0IGFjY2VwdGVkLCBSQUpFIG11c3QgY2hlY2sgc2VsZWN0aW9uIGFuZCBhY2NlcHQgYmFja3NwYWNlLCBjYW5jIGFuZCBlbnRlciBwcmVzc1xuICBlZGl0b3Iub24oJ2tleURvd24nLCBmdW5jdGlvbiAoZSkge1xuXG4gICAgLy8gTk9URTogdGhpcyBiZWh2YWlvdXIgaXMgdGhlIHNhbWUgZm9yIGNvZGVibG9jayBcbiAgICBsZXQgc2VsZWN0ZWRFbGVtZW50ID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuICAgIGlmIChzZWxlY3RlZEVsZW1lbnQucGFyZW50cygncHJlOmhhcyhjb2RlKScpLmxlbmd0aCkge1xuXG5cbiAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQuaXMoJ2NvZGUnKSkge1xuXG5cbiAgICAgICAgLy8gRU5URVJcbiAgICAgICAgaWYgKGUua2V5Q29kZSA9PSAxMykge1xuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgICAgIHJldHVybiBsaXN0aW5nLnNldENvbnRlbnQoYFxcbmApXG4gICAgICAgIH1cblxuICAgICAgICAvL1RBQlxuICAgICAgICBpZiAoZS5rZXlDb2RlID09IDkpIHtcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgICByZXR1cm4gbGlzdGluZy5zZXRDb250ZW50KGBcXHRgKVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChlLmtleUNvZGUgPT0gMTMpXG4gICAgICAgIHJldHVybiBoYW5kbGVGaWd1cmVFbnRlcih0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24pXG5cbiAgICAgIC8vIGtleUNvZGUgOCBpcyBiYWNrc3BhY2VcbiAgICAgIGlmIChlLmtleUNvZGUgPT0gOClcbiAgICAgICAgcmV0dXJuIGhhbmRsZUZpZ3VyZURlbGV0ZSh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24pXG5cbiAgICAgIC8qXG4gICAgICAgIC8vIGtleUNvZGUgOCBpcyBiYWNrc3BhY2VcbiAgICAgICAgaWYgKGUua2V5Q29kZSA9PSA4KVxuICAgICAgICAgIHJldHVybiBoYW5kbGVGaWd1cmVEZWxldGUodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uKVxuXG4gICAgICAgIGlmIChlLmtleUNvZGUgPT0gNDYpXG4gICAgICAgICAgcmV0dXJuIGhhbmRsZUZpZ3VyZUNhbmModGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uKVxuXG4gICAgICAgIC8vIEhhbmRsZSBlbnRlciBrZXkgaW4gZmlnY2FwdGlvblxuICAgICAgICBpZiAoZS5rZXlDb2RlID09IDEzKVxuICAgICAgICAgIHJldHVybiBoYW5kbGVGaWd1cmVFbnRlcih0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24pXG4gICAgICAgICovXG4gICAgfVxuICAgIC8qXG4gICAgaWYgKGUua2V5Q29kZSA9PSA5KSB7XG4gICAgICBpZiAodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmlzQ29sbGFwc2VkKCkgJiYgJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKS5wYXJlbnRzKGBjb2RlLCR7RklHVVJFX1NFTEVDVE9SfWApLmxlbmd0aCkge1xuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2V0Q29udGVudCgnXFx0JylcbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGUua2V5Q29kZSA9PSAzNykge1xuICAgICAgbGV0IHJhbmdlID0gdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldFJuZygpXG4gICAgICBsZXQgc3RhcnROb2RlID0gJChyYW5nZS5zdGFydENvbnRhaW5lcilcbiAgICAgIGlmIChzdGFydE5vZGUucGFyZW50KCkuaXMoJ2NvZGUnKSAmJiAoc3RhcnROb2RlLnBhcmVudCgpLmNvbnRlbnRzKCkuaW5kZXgoc3RhcnROb2RlKSA9PSAwICYmIHJhbmdlLnN0YXJ0T2Zmc2V0ID09IDEpKSB7XG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZXRDdXJzb3JMb2NhdGlvbihzdGFydE5vZGUucGFyZW50cyhGSUdVUkVfU0VMRUNUT1IpLnByZXYoJ3AsOmhlYWRlcicpWzBdLCAxKVxuICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgIH1cbiAgICB9Ki9cbiAgfSlcblxuICBsaXN0aW5nID0ge1xuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIGFkZDogZnVuY3Rpb24gKCkge1xuXG4gICAgICBsZXQgc2VsZWN0ZWRFbGVtZW50ID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuICAgICAgbGV0IG5ld0xpc3RpbmcgPSB0aGlzLmNyZWF0ZShnZXRTdWNjZXNzaXZlRWxlbWVudElkKEZJR1VSRV9MSVNUSU5HX1NFTEVDVE9SLCBMSVNUSU5HX1NVRkZJWCkpXG5cbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAvLyBDaGVjayBpZiB0aGUgc2VsZWN0ZWQgcGFyYWdyYXBoIGlzIG5vdCBlbXB0eSwgYWRkIHRoZSBuZXcgbGlzdGluZyByaWdodCBiZWxvd1xuICAgICAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LnRleHQoKS50cmltKCkubGVuZ3RoICE9IDApXG4gICAgICAgICAgc2VsZWN0ZWRFbGVtZW50LmFmdGVyKG5ld0xpc3RpbmcpXG5cbiAgICAgICAgLy8gSWYgc2VsZWN0ZWQgcGFyYWdyYXBoIGlzIGVtcHR5LCByZXBsYWNlIGl0IHdpdGggdGhlIG5ldyB0YWJsZVxuICAgICAgICBlbHNlXG4gICAgICAgICAgc2VsZWN0ZWRFbGVtZW50LnJlcGxhY2VXaXRoKG5ld0xpc3RpbmcpXG5cbiAgICAgICAgLy8gU2F2ZSB1cGRhdGVzIFxuICAgICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcblxuICAgICAgICAvLyBVcGRhdGUgYWxsIGNhcHRpb25zIHdpdGggUkFTSCBmdW5jdGlvblxuICAgICAgICBjYXB0aW9ucygpXG5cbiAgICAgICAgLy8gTW92ZSB0aGUgY2FyZXRcbiAgICAgICAgc2VsZWN0UmFuZ2UobmV3TGlzdGluZy5maW5kKCdjb2RlJylbMF0sIDApXG5cbiAgICAgICAgLy8gVXBkYXRlIGFsbCBjcm9zcy1yZWZcbiAgICAgICAgdXBkYXRlUmVmZXJlbmNlcygpXG5cbiAgICAgICAgLy8gVXBkYXRlIFJlbmRlcmVkIFJBU0hcbiAgICAgICAgdXBkYXRlSWZyYW1lRnJvbVNhdmVkQ29udGVudCgpXG4gICAgICB9KVxuXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIGNyZWF0ZTogZnVuY3Rpb24gKGlkKSB7XG4gICAgICByZXR1cm4gJChgPGZpZ3VyZSBpZD1cIiR7aWR9XCI+PHByZT48Y29kZT4ke1pFUk9fU1BBQ0V9PC9jb2RlPjwvcHJlPjxmaWdjYXB0aW9uPkNhcHRpb24uPC9maWdjYXB0aW9uPjwvZmlndXJlPmApXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIHNldENvbnRlbnQ6IGZ1bmN0aW9uIChjaGFyKSB7XG4gICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2V0Q29udGVudChjaGFyKVxuICAgIH1cbiAgfVxufSlcblxuXG4vKipcbiAqIFxuICovXG50aW55bWNlLlBsdWdpbk1hbmFnZXIuYWRkKCdyYWplX2lubGluZV9mb3JtdWxhJywgZnVuY3Rpb24gKGVkaXRvciwgdXJsKSB7XG5cbiAgZWRpdG9yLmFkZEJ1dHRvbigncmFqZV9pbmxpbmVfZm9ybXVsYScsIHtcbiAgICBpY29uOiAnaWNvbi1pbmxpbmUtZm9ybXVsYScsXG4gICAgdG9vbHRpcDogJ0lubGluZSBmb3JtdWxhJyxcbiAgICBkaXNhYmxlZFN0YXRlU2VsZWN0b3I6IGAke0RJU0FCTEVfU0VMRUNUT1JfSU5MSU5FfSw6aGVhZGVyYCxcblxuICAgIC8vIEJ1dHRvbiBiZWhhdmlvdXJcbiAgICBvbmNsaWNrOiBmdW5jdGlvbiAoKSB7XG4gICAgICBvcGVuSW5saW5lRm9ybXVsYUVkaXRvcigpXG4gICAgfVxuICB9KVxuXG4gIGVkaXRvci5vbignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuICAgIGxldCBzZWxlY3RlZEVsZW1lbnQgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG5cbiAgICAvLyBPcGVuIGZvcm11bGEgZWRpdG9yIGNsaWNraW5nIG9uIG1hdGggZm9ybXVsYXNcbiAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LmNoaWxkcmVuKCdzdmdbcm9sZT1tYXRoXScpLmxlbmd0aCkge1xuXG4gICAgICBvcGVuSW5saW5lRm9ybXVsYUVkaXRvcih7XG4gICAgICAgIGZvcm11bGFfdmFsOiBzZWxlY3RlZEVsZW1lbnQuY2hpbGRyZW4oJ3N2Z1tyb2xlPW1hdGhdJykuYXR0cignZGF0YS1tYXRoLW9yaWdpbmFsLWlucHV0JyksXG4gICAgICAgIGZvcm11bGFfaWQ6IHNlbGVjdGVkRWxlbWVudC5hdHRyKCdpZCcpXG4gICAgICB9KVxuICAgIH1cbiAgfSlcblxuICBpbmxpbmVfZm9ybXVsYSA9IHtcbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBhZGQ6IGZ1bmN0aW9uIChmb3JtdWxhX3N2Zykge1xuXG4gICAgICBsZXQgc2VsZWN0ZWRFbGVtZW50ID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuICAgICAgbGV0IG5ld0Zvcm11bGEgPSB0aGlzLmNyZWF0ZShmb3JtdWxhX3N2ZywgZ2V0U3VjY2Vzc2l2ZUVsZW1lbnRJZChGSUdVUkVfRk9STVVMQV9TRUxFQ1RPUiwgRk9STVVMQV9TVUZGSVgpKVxuXG4gICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLnNldENvbnRlbnQobmV3Rm9ybXVsYSlcblxuICAgICAgICAvLyBTYXZlIHVwZGF0ZXMgXG4gICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuXG4gICAgICAgIGNhcHRpb25zKClcblxuICAgICAgICAvLyBVcGRhdGUgYWxsIGNyb3NzLXJlZlxuICAgICAgICB1cGRhdGVSZWZlcmVuY2VzKClcblxuICAgICAgICAvLyBVcGRhdGUgUmVuZGVyZWQgUkFTSFxuICAgICAgICB1cGRhdGVJZnJhbWVGcm9tU2F2ZWRDb250ZW50KClcbiAgICAgIH0pXG5cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgdXBkYXRlOiBmdW5jdGlvbiAoZm9ybXVsYV9zdmcsIGZvcm11bGFfaWQpIHtcblxuICAgICAgbGV0IHNlbGVjdGVkRmlndXJlID0gJChgIyR7Zm9ybXVsYV9pZH1gKVxuXG4gICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgc2VsZWN0ZWRGaWd1cmUuZmluZCgnc3ZnJykucmVwbGFjZVdpdGgoZm9ybXVsYV9zdmcpXG4gICAgICAgIHVwZGF0ZUlmcmFtZUZyb21TYXZlZENvbnRlbnQoKVxuICAgICAgfSlcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgY3JlYXRlOiBmdW5jdGlvbiAoZm9ybXVsYV9zdmcsIGlkKSB7XG4gICAgICByZXR1cm4gYDxzcGFuIGlkPVwiJHtpZH1cIiBjb250ZW50ZWRpdGFibGU9XCJmYWxzZVwiPiR7Zm9ybXVsYV9zdmdbMF0ub3V0ZXJIVE1MfTwvc3Bhbj5gXG4gICAgfVxuICB9XG59KVxuXG4vKipcbiAqIFJhamUgY29kZWJsb2NrXG4gKi9cbnRpbnltY2UuUGx1Z2luTWFuYWdlci5hZGQoJ3JhamVfY29kZWJsb2NrJywgZnVuY3Rpb24gKGVkaXRvciwgdXJsKSB7XG5cbiAgLy8gQWRkIGEgYnV0dG9uIHRoYXQgaGFuZGxlIHRoZSBpbmxpbmUgZWxlbWVudFxuICBlZGl0b3IuYWRkQnV0dG9uKCdyYWplX2NvZGVibG9jaycsIHtcbiAgICB0aXRsZTogJ3JhamVfY29kZWJsb2NrJyxcbiAgICBpY29uOiAnaWNvbi1ibG9jay1jb2RlJyxcbiAgICB0b29sdGlwOiAnQmxvY2sgY29kZScsXG4gICAgZGlzYWJsZWRTdGF0ZVNlbGVjdG9yOiBgJHtESVNBQkxFX1NFTEVDVE9SX0ZJR1VSRVN9LGNvZGUscHJlYCxcblxuICAgIC8vIEJ1dHRvbiBiZWhhdmlvdXJcbiAgICBvbmNsaWNrOiBmdW5jdGlvbiAoKSB7XG4gICAgICBibG9ja2NvZGUuYWRkKClcbiAgICB9XG4gIH0pXG5cbiAgYmxvY2tjb2RlID0ge1xuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIGFkZDogZnVuY3Rpb24gKCkge1xuXG4gICAgICBsZXQgc2VsZWN0ZWRFbGVtZW50ID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuICAgICAgbGV0IGJsb2NrQ29kZSA9IHRoaXMuY3JlYXRlKGdldFN1Y2Nlc3NpdmVFbGVtZW50SWQoRklHVVJFX0xJU1RJTkdfU0VMRUNUT1IsIExJU1RJTkdfU1VGRklYKSlcblxuICAgICAgaWYgKCFzZWxlY3RlZEVsZW1lbnQucGFyZW50cygncHJlLGNvZGUnKS5sZW5ndGgpIHtcblxuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICAvLyBDaGVjayBpZiB0aGUgc2VsZWN0ZWQgcGFyYWdyYXBoIGlzIG5vdCBlbXB0eSwgYWRkIHRoZSBuZXcgbGlzdGluZyByaWdodCBiZWxvd1xuICAgICAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQudGV4dCgpLnRyaW0oKS5sZW5ndGggIT0gMClcbiAgICAgICAgICAgIHNlbGVjdGVkRWxlbWVudC5hZnRlcihibG9ja0NvZGUpXG5cbiAgICAgICAgICAvLyBJZiBzZWxlY3RlZCBwYXJhZ3JhcGggaXMgZW1wdHksIHJlcGxhY2UgaXQgd2l0aCB0aGUgbmV3IHRhYmxlXG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgc2VsZWN0ZWRFbGVtZW50LnJlcGxhY2VXaXRoKGJsb2NrQ29kZSlcblxuICAgICAgICAgIC8vIFNhdmUgdXBkYXRlcyBcbiAgICAgICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcblxuICAgICAgICAgIC8vIFVwZGF0ZSBhbGwgY2FwdGlvbnMgd2l0aCBSQVNIIGZ1bmN0aW9uXG4gICAgICAgICAgY2FwdGlvbnMoKVxuXG4gICAgICAgICAgLy8gTW92ZSB0aGUgY2FyZXRcbiAgICAgICAgICBzZWxlY3RSYW5nZShibG9ja0NvZGUuZmluZCgnY29kZScpWzBdLCAwKVxuXG4gICAgICAgICAgLy8gVXBkYXRlIFJlbmRlcmVkIFJBU0hcbiAgICAgICAgICB1cGRhdGVJZnJhbWVGcm9tU2F2ZWRDb250ZW50KClcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgY3JlYXRlOiBmdW5jdGlvbiAoaWQpIHtcbiAgICAgIHJldHVybiAkKGA8cHJlPjxjb2RlPiR7WkVST19TUEFDRX08L2NvZGU+PC9wcmU+YClcbiAgICB9XG4gIH1cbn0pXG5cbi8qKlxuICogUmFqZSBxdW90ZWJsb2NrXG4gKi9cbnRpbnltY2UuUGx1Z2luTWFuYWdlci5hZGQoJ3JhamVfcXVvdGVibG9jaycsIGZ1bmN0aW9uIChlZGl0b3IsIHVybCkge1xuXG4gIC8vIEFkZCBhIGJ1dHRvbiB0aGF0IGhhbmRsZSB0aGUgaW5saW5lIGVsZW1lbnRcbiAgZWRpdG9yLmFkZEJ1dHRvbigncmFqZV9xdW90ZWJsb2NrJywge1xuICAgIHRpdGxlOiAncmFqZV9xdW90ZWJsb2NrJyxcbiAgICBpY29uOiAnaWNvbi1ibG9jay1xdW90ZScsXG4gICAgdG9vbHRpcDogJ0Jsb2NrIHF1b3RlJyxcbiAgICBkaXNhYmxlZFN0YXRlU2VsZWN0b3I6IGAke0RJU0FCTEVfU0VMRUNUT1JfRklHVVJFU30sYmxvY2txdW90ZWAsXG5cbiAgICAvLyBCdXR0b24gYmVoYXZpb3VyXG4gICAgb25jbGljazogZnVuY3Rpb24gKCkge1xuICAgICAgYmxvY2txdW90ZS5hZGQoKVxuICAgIH1cbiAgfSlcblxuICBlZGl0b3Iub24oJ2tleURvd24nLCBmdW5jdGlvbiAoZSkge1xuXG5cbiAgICBsZXQgc2VsZWN0ZWRFbGVtZW50ID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuICAgIGlmIChzZWxlY3RlZEVsZW1lbnQuaXMoJ3AnKSAmJiBzZWxlY3RlZEVsZW1lbnQucGFyZW50KCkuaXMoJ2Jsb2NrcXVvdGUnKSkge1xuXG4gICAgICAvL0VOVEVSXG4gICAgICBpZiAoZS5rZXlDb2RlID09IDEzKSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKVxuXG4gICAgICAgIC8vIEV4aXQgZnJvbSB0aGUgYmxvY2txdW90ZSBpZiB0aGUgY3VycmVudCBwIGlzIGVtcHR5XG4gICAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQudGV4dCgpLnRyaW0oKS5sZW5ndGggPT0gMClcbiAgICAgICAgICByZXR1cm4gYmxvY2txdW90ZS5leGl0KClcblxuICAgICAgICBibG9ja3F1b3RlLmFkZFBhcmFncmFwaCgpXG4gICAgICB9XG4gICAgfVxuICB9KVxuXG4gIGJsb2NrcXVvdGUgPSB7XG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgYWRkOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgIGxldCBzZWxlY3RlZEVsZW1lbnQgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG4gICAgICBsZXQgYmxvY2tRdW90ZSA9IHRoaXMuY3JlYXRlKGdldFN1Y2Nlc3NpdmVFbGVtZW50SWQoRklHVVJFX0xJU1RJTkdfU0VMRUNUT1IsIExJU1RJTkdfU1VGRklYKSlcblxuICAgICAgaWYgKCFzZWxlY3RlZEVsZW1lbnQucGFyZW50cygncHJlLGNvZGUnKS5sZW5ndGgpIHtcblxuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICAvLyBDaGVjayBpZiB0aGUgc2VsZWN0ZWQgcGFyYWdyYXBoIGlzIG5vdCBlbXB0eSwgYWRkIHRoZSBuZXcgbGlzdGluZyByaWdodCBiZWxvd1xuICAgICAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQudGV4dCgpLnRyaW0oKS5sZW5ndGggIT0gMClcbiAgICAgICAgICAgIHNlbGVjdGVkRWxlbWVudC5hZnRlcihibG9ja1F1b3RlKVxuXG4gICAgICAgICAgLy8gSWYgc2VsZWN0ZWQgcGFyYWdyYXBoIGlzIGVtcHR5LCByZXBsYWNlIGl0IHdpdGggdGhlIG5ldyB0YWJsZVxuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIHNlbGVjdGVkRWxlbWVudC5yZXBsYWNlV2l0aChibG9ja1F1b3RlKVxuXG4gICAgICAgICAgLy8gU2F2ZSB1cGRhdGVzIFxuICAgICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuXG4gICAgICAgICAgLy8gVXBkYXRlIGFsbCBjYXB0aW9ucyB3aXRoIFJBU0ggZnVuY3Rpb25cbiAgICAgICAgICBjYXB0aW9ucygpXG5cbiAgICAgICAgICAvLyBNb3ZlIHRoZSBjYXJldFxuICAgICAgICAgIG1vdmVDYXJldChibG9ja1F1b3RlWzBdKVxuXG4gICAgICAgICAgLy8gVXBkYXRlIFJlbmRlcmVkIFJBU0hcbiAgICAgICAgICB1cGRhdGVJZnJhbWVGcm9tU2F2ZWRDb250ZW50KClcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgY3JlYXRlOiBmdW5jdGlvbiAoaWQpIHtcbiAgICAgIHJldHVybiAkKGA8YmxvY2txdW90ZT48cD4ke1pFUk9fU1BBQ0V9PC9wPjwvYmxvY2txdW90ZT5gKVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBnZXRMYXN0Tm90RW1wdHlOb2RlOiBmdW5jdGlvbiAobm9kZXMpIHtcblxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBub2Rlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoKG5vZGVzW2ldLm5vZGVUeXBlID09IDMgfHwgbm9kZXNbaV0udGFnTmFtZSA9PSAnYnInKSAmJiAhbm9kZXNbaV0ubGVuZ3RoKVxuICAgICAgICAgIG5vZGVzLnNwbGljZShpLCAxKVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gbm9kZXNbbm9kZXMubGVuZ3RoIC0gMV1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgYWRkUGFyYWdyYXBoOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgIGNvbnN0IEJSID0gJzxicj4nXG5cbiAgICAgIC8vIEdldCB0aGUgcmVmZXJlbmNlcyBvZiB0aGUgZXhpc3RpbmcgZWxlbWVudFxuICAgICAgbGV0IHBhcmFncmFwaCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcblxuICAgICAgLy8gUGxhY2Vob2xkZXIgdGV4dCBvZiB0aGUgbmV3IGxpXG4gICAgICBsZXQgdGV4dCA9IEJSXG4gICAgICBsZXQgdGV4dE5vZGVzID0gcGFyYWdyYXBoLmNvbnRlbnRzKClcblxuICAgICAgLy8gSWYgdGhlcmUgaXMganVzdCBvbmUgbm9kZSB3cmFwcGVkIGluc2lkZSB0aGUgcGFyYWdyYXBoXG4gICAgICBpZiAodGV4dE5vZGVzLmxlbmd0aCA9PSAxKSB7XG5cbiAgICAgICAgLy8gR2V0IHRoZSBzdGFydCBvZmZzZXQgYW5kIHRleHQgb2YgdGhlIGN1cnJlbnQgbGlcbiAgICAgICAgbGV0IHN0YXJ0T2Zmc2V0ID0gdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldFJuZygpLnN0YXJ0T2Zmc2V0XG4gICAgICAgIGxldCB3aG9sZVRleHQgPSBwYXJhZ3JhcGgudGV4dCgpXG5cbiAgICAgICAgLy8gSWYgdGhlIGN1cnNvciBpc24ndCBhdCB0aGUgZW5kIGJ1dCBpdCdzIGluIHRoZSBtaWRkbGVcbiAgICAgICAgLy8gR2V0IHRoZSByZW1haW5pbmcgdGV4dCBmcm9tIHRoZSBjdXJzb3IgdG8gdGhlIGVuZFxuICAgICAgICBpZiAoc3RhcnRPZmZzZXQgIT0gd2hvbGVUZXh0Lmxlbmd0aClcbiAgICAgICAgICB0ZXh0ID0gd2hvbGVUZXh0LnN1YnN0cmluZyhzdGFydE9mZnNldCwgd2hvbGVUZXh0Lmxlbmd0aClcblxuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICAvLyBVcGRhdGUgdGhlIHRleHQgb2YgdGhlIGN1cnJlbnQgbGlcbiAgICAgICAgICBwYXJhZ3JhcGgudGV4dCh3aG9sZVRleHQuc3Vic3RyaW5nKDAsIHN0YXJ0T2Zmc2V0KSlcblxuICAgICAgICAgIGlmICghcGFyYWdyYXBoLnRleHQoKS5sZW5ndGgpXG4gICAgICAgICAgICBwYXJhZ3JhcGguaHRtbChCUilcblxuICAgICAgICAgIC8vIENyZWF0ZSBhbmQgYWRkIHRoZSBuZXcgbGlcbiAgICAgICAgICBsZXQgbmV3UGFyYWdyYXBoID0gJChgPHA+JHt0ZXh0fTwvcD5gKVxuICAgICAgICAgIHBhcmFncmFwaC5hZnRlcihuZXdQYXJhZ3JhcGgpXG5cbiAgICAgICAgICAvLyBNb3ZlIHRoZSBjYXJldCB0byB0aGUgbmV3IGxpXG4gICAgICAgICAgbW92ZUNhcmV0KG5ld1BhcmFncmFwaFswXSwgdHJ1ZSlcblxuICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgY29udGVudFxuICAgICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuICAgICAgICB9KVxuICAgICAgfVxuXG4gICAgICAvLyBJbnN0ZWFkIGlmIHRoZXJlIGFyZSBtdWx0aXBsZSBub2RlcyBpbnNpZGUgdGhlIHBhcmFncmFwaFxuICAgICAgZWxzZSB7XG5cbiAgICAgICAgLy8gSXN0YW50aWF0ZSB0aGUgcmFuZ2UgdG8gYmUgc2VsZWN0ZWRcbiAgICAgICAgbGV0IHJhbmdlID0gZG9jdW1lbnQuY3JlYXRlUmFuZ2UoKVxuXG4gICAgICAgIC8vIFN0YXJ0IHRoZSByYW5nZSBmcm9tIHRoZSBzZWxlY3RlZCBub2RlIGFuZCBvZmZzZXQgYW5kIGVuZHMgaXQgYXQgdGhlIGVuZCBvZiB0aGUgbGFzdCBub2RlXG4gICAgICAgIHJhbmdlLnNldFN0YXJ0KHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRSbmcoKS5zdGFydENvbnRhaW5lciwgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldFJuZygpLnN0YXJ0T2Zmc2V0KVxuICAgICAgICByYW5nZS5zZXRFbmQodGhpcy5nZXRMYXN0Tm90RW1wdHlOb2RlKHRleHROb2RlcyksIDEpXG5cbiAgICAgICAgLy8gU2VsZWN0IHRoZSByYW5nZVxuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2V0Um5nKHJhbmdlKVxuXG4gICAgICAgIC8vIFNhdmUgdGhlIGh0bWwgY29udGVudFxuICAgICAgICB3aG9sZVRleHQgPSB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Q29udGVudCgpXG5cbiAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgcGFyYWdyYXBoLmh0bWwocGFyYWdyYXBoLmh0bWwoKS5yZXBsYWNlKHdob2xlVGV4dCwgJycpKVxuXG4gICAgICAgICAgaWYgKCFwYXJhZ3JhcGgudGV4dCgpLmxlbmd0aClcbiAgICAgICAgICAgIHBhcmFncmFwaC5odG1sKEJSKVxuXG4gICAgICAgICAgLy8gQ3JlYXRlIGFuZCBhZGQgdGhlIG5ldyBsaVxuICAgICAgICAgIGxldCBuZXdQYXJhZ3JhcGggPSAkKGA8cD4ke3dob2xlVGV4dH08L3A+YClcbiAgICAgICAgICBwYXJhZ3JhcGguYWZ0ZXIobmV3UGFyYWdyYXBoKVxuXG4gICAgICAgICAgLy8gTW92ZSB0aGUgY2FyZXQgdG8gdGhlIG5ldyBsaVxuICAgICAgICAgIG1vdmVDYXJldChuZXdQYXJhZ3JhcGhbMF0sIHRydWUpXG5cbiAgICAgICAgICAvLyBVcGRhdGUgdGhlIGNvbnRlbnRcbiAgICAgICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgZXhpdDogZnVuY3Rpb24gKCkge1xuICAgICAgbGV0IHBhcmFncmFwaCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcbiAgICAgIGxldCBibG9ja3F1b3RlID0gcGFyYWdyYXBoLnBhcmVudCgpXG5cbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICBwYXJhZ3JhcGgucmVtb3ZlKClcblxuICAgICAgICBpZiAoIWJsb2NrcXVvdGUubmV4dCgpLmxlbmd0aCkge1xuICAgICAgICAgIGJsb2NrcXVvdGUuYWZ0ZXIoJChgPHA+PGJyLz48L3A+YCkpXG4gICAgICAgIH1cblxuICAgICAgICBtb3ZlQ2FyZXQoYmxvY2txdW90ZS5uZXh0KClbMF0pXG5cbiAgICAgIH0pXG4gICAgfVxuICB9XG59KVxuXG4vKipcbiAqIFVwZGF0ZSB0YWJsZSBjYXB0aW9ucyB3aXRoIGEgUkFTSCBmdW5jaW9uIFxuICovXG5mdW5jdGlvbiBjYXB0aW9ucygpIHtcblxuICAvKiBDYXB0aW9ucyAqL1xuICAkKGZpZ3VyZWJveF9zZWxlY3RvcikuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGN1cl9jYXB0aW9uID0gJCh0aGlzKS5wYXJlbnRzKFwiZmlndXJlXCIpLmZpbmQoXCJmaWdjYXB0aW9uXCIpO1xuICAgIHZhciBjdXJfbnVtYmVyID0gJCh0aGlzKS5maW5kTnVtYmVyKGZpZ3VyZWJveF9zZWxlY3Rvcik7XG4gICAgY3VyX2NhcHRpb24uZmluZCgnc3Ryb25nJykucmVtb3ZlKCk7XG4gICAgY3VyX2NhcHRpb24uaHRtbChcIjxzdHJvbmcgY2xhc3M9XFxcImNnZW5cXFwiIGRhdGEtcmFzaC1vcmlnaW5hbC1jb250ZW50PVxcXCJcXFwiIGNvbnRlbnRlZGl0YWJsZT1cXFwiZmFsc2VcXFwiPkZpZ3VyZSBcIiArIGN1cl9udW1iZXIgK1xuICAgICAgXCIuIDwvc3Ryb25nPlwiICsgY3VyX2NhcHRpb24uaHRtbCgpKTtcbiAgfSk7XG4gICQodGFibGVib3hfc2VsZWN0b3IpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgIHZhciBjdXJfY2FwdGlvbiA9ICQodGhpcykucGFyZW50cyhcImZpZ3VyZVwiKS5maW5kKFwiZmlnY2FwdGlvblwiKTtcbiAgICB2YXIgY3VyX251bWJlciA9ICQodGhpcykuZmluZE51bWJlcih0YWJsZWJveF9zZWxlY3Rvcik7XG4gICAgY3VyX2NhcHRpb24uZmluZCgnc3Ryb25nJykucmVtb3ZlKCk7XG4gICAgY3VyX2NhcHRpb24uaHRtbChcIjxzdHJvbmcgY2xhc3M9XFxcImNnZW5cXFwiIGRhdGEtcmFzaC1vcmlnaW5hbC1jb250ZW50PVxcXCJcXFwiIGNvbnRlbnRlZGl0YWJsZT1cXFwiZmFsc2VcXFwiID5UYWJsZSBcIiArIGN1cl9udW1iZXIgK1xuICAgICAgXCIuIDwvc3Ryb25nPlwiICsgY3VyX2NhcHRpb24uaHRtbCgpKTtcbiAgfSk7XG4gICQoZm9ybXVsYWJveF9zZWxlY3RvcikuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGN1cl9jYXB0aW9uID0gJCh0aGlzKS5wYXJlbnRzKFwiZmlndXJlXCIpLmZpbmQoXCJwXCIpO1xuICAgIHZhciBjdXJfbnVtYmVyID0gJCh0aGlzKS5maW5kTnVtYmVyKGZvcm11bGFib3hfc2VsZWN0b3IpO1xuXG4gICAgaWYgKGN1cl9jYXB0aW9uLmZpbmQoJ3NwYW4uY2dlbicpLmxlbmd0aCkge1xuICAgICAgY3VyX2NhcHRpb24uZmluZCgnc3Bhbi5jZ2VuJykucmVtb3ZlKCk7XG4gICAgICBjdXJfY2FwdGlvbi5maW5kKCdzcGFuW2NvbnRlbnRlZGl0YWJsZV0nKS5hcHBlbmQoXCI8c3BhbiBjbGFzcz1cXFwiY2dlblxcXCIgZGF0YS1yYXNoLW9yaWdpbmFsLWNvbnRlbnQ9XFxcIlxcXCIgPiAoXCIgKyBjdXJfbnVtYmVyICsgXCIpPC9zcGFuPlwiKVxuICAgIH0gZWxzZVxuICAgICAgY3VyX2NhcHRpb24uaHRtbChjdXJfY2FwdGlvbi5odG1sKCkgKyBcIjxzcGFuIGNsYXNzPVxcXCJjZ2VuXFxcIiBkYXRhLXJhc2gtb3JpZ2luYWwtY29udGVudD1cXFwiXFxcIiA+IChcIiArXG4gICAgICAgIGN1cl9udW1iZXIgKyBcIik8L3NwYW4+XCIpO1xuICB9KTtcbiAgJChsaXN0aW5nYm94X3NlbGVjdG9yKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY3VyX2NhcHRpb24gPSAkKHRoaXMpLnBhcmVudHMoXCJmaWd1cmVcIikuZmluZChcImZpZ2NhcHRpb25cIik7XG4gICAgdmFyIGN1cl9udW1iZXIgPSAkKHRoaXMpLmZpbmROdW1iZXIobGlzdGluZ2JveF9zZWxlY3Rvcik7XG4gICAgY3VyX2NhcHRpb24uZmluZCgnc3Ryb25nJykucmVtb3ZlKCk7XG4gICAgY3VyX2NhcHRpb24uaHRtbChcIjxzdHJvbmcgY2xhc3M9XFxcImNnZW5cXFwiIGRhdGEtcmFzaC1vcmlnaW5hbC1jb250ZW50PVxcXCJcXFwiIGNvbnRlbnRlZGl0YWJsZT1cXFwiZmFsc2VcXFwiPkxpc3RpbmcgXCIgKyBjdXJfbnVtYmVyICtcbiAgICAgIFwiLiA8L3N0cm9uZz5cIiArIGN1cl9jYXB0aW9uLmh0bWwoKSk7XG4gIH0pO1xuICAvKiAvRU5EIENhcHRpb25zICovXG59XG5cbi8qKlxuICogXG4gKiBAcGFyYW0geyp9IHNlbCA9PiB0aW55bWNlIHNlbGVjdGlvblxuICogXG4gKiBNYWlubHkgaXQgY2hlY2tzIHdoZXJlIHNlbGVjdGlvbiBzdGFydHMgYW5kIGVuZHMgdG8gYmxvY2sgdW5hbGxvd2VkIGRlbGV0aW9uXG4gKiBJbiBzYW1lIGZpZ3VyZSBhcmVuJ3QgYmxvY2tlZCwgdW5sZXNzIHNlbGVjdGlvbiBzdGFydCBPUiBlbmQgaW5zaWRlIGZpZ2NhcHRpb24gKG5vdCBib3RoKVxuICovXG5mdW5jdGlvbiBoYW5kbGVGaWd1cmVEZWxldGUoc2VsKSB7XG5cbiAgdHJ5IHtcblxuICAgIC8vIEdldCByZWZlcmVuY2Ugb2Ygc3RhcnQgYW5kIGVuZCBub2RlXG4gICAgbGV0IHN0YXJ0Tm9kZSA9ICQoc2VsLmdldFJuZygpLnN0YXJ0Q29udGFpbmVyKVxuICAgIGxldCBzdGFydE5vZGVQYXJlbnQgPSBzdGFydE5vZGUucGFyZW50cyhGSUdVUkVfU0VMRUNUT1IpXG5cbiAgICBsZXQgZW5kTm9kZSA9ICQoc2VsLmdldFJuZygpLmVuZENvbnRhaW5lcilcbiAgICBsZXQgZW5kTm9kZVBhcmVudCA9IGVuZE5vZGUucGFyZW50cyhGSUdVUkVfU0VMRUNUT1IpXG5cbiAgICAvLyBJZiBhdCBsZWFzdCBzZWxlY3Rpb24gc3RhcnQgb3IgZW5kIGlzIGluc2lkZSB0aGUgZmlndXJlXG4gICAgaWYgKHN0YXJ0Tm9kZVBhcmVudC5sZW5ndGggfHwgZW5kTm9kZVBhcmVudC5sZW5ndGgpIHtcblxuICAgICAgLy8gSWYgc2VsZWN0aW9uIHdyYXBzIGVudGlyZWx5IGEgZmlndXJlIGZyb20gdGhlIHN0YXJ0IG9mIGZpcnN0IGVsZW1lbnQgKHRoIGluIHRhYmxlKSBhbmQgc2VsZWN0aW9uIGVuZHNcbiAgICAgIGlmIChlbmROb2RlLnBhcmVudHMoJ2ZpZ2NhcHRpb24nKS5sZW5ndGgpIHtcblxuICAgICAgICBsZXQgY29udGVudHMgPSBlbmROb2RlLnBhcmVudCgpLmNvbnRlbnRzKClcbiAgICAgICAgaWYgKHN0YXJ0Tm9kZS5pcyhGSUdVUkVfU0VMRUNUT1IpICYmIGNvbnRlbnRzLmluZGV4KGVuZE5vZGUpID09IGNvbnRlbnRzLmxlbmd0aCAtIDEgJiYgc2VsLmdldFJuZygpLmVuZE9mZnNldCA9PSBlbmROb2RlLnRleHQoKS5sZW5ndGgpIHtcbiAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICAgIC8vIE1vdmUgY3Vyc29yIGF0IHRoZSBwcmV2aW91cyBlbGVtZW50IGFuZCByZW1vdmUgZmlndXJlXG4gICAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5mb2N1cygpXG4gICAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2V0Q3Vyc29yTG9jYXRpb24oc3RhcnROb2RlLnByZXYoKVswXSwgMSlcbiAgICAgICAgICAgIHN0YXJ0Tm9kZS5yZW1vdmUoKVxuXG4gICAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIElmIHNlbGVjdGlvbiBkb2Vzbid0IHN0YXJ0IGFuZCBlbmQgaW4gdGhlIHNhbWUgZmlndXJlLCBidXQgb25lIGJlZXR3ZW4gc3RhcnQgb3IgZW5kIGlzIGluc2lkZSB0aGUgZmlnY2FwdGlvbiwgbXVzdCBibG9ja1xuICAgICAgaWYgKHN0YXJ0Tm9kZS5wYXJlbnRzKCdmaWdjYXB0aW9uJykubGVuZ3RoICE9IGVuZE5vZGUucGFyZW50cygnZmlnY2FwdGlvbicpLmxlbmd0aCAmJiAoc3RhcnROb2RlLnBhcmVudHMoJ2ZpZ2NhcHRpb24nKS5sZW5ndGggfHwgZW5kTm9kZS5wYXJlbnRzKCdmaWdjYXB0aW9uJykubGVuZ3RoKSlcbiAgICAgICAgcmV0dXJuIGZhbHNlXG5cbiAgICAgIC8vIElmIHRoZSBmaWd1cmUgaXMgbm90IHRoZSBzYW1lLCBtdXN0IGJsb2NrXG4gICAgICAvLyBCZWNhdXNlIGEgc2VsZWN0aW9uIGNhbiBzdGFydCBpbiBmaWd1cmVYIGFuZCBlbmQgaW4gZmlndXJlWVxuICAgICAgaWYgKChzdGFydE5vZGVQYXJlbnQuYXR0cignaWQnKSAhPSBlbmROb2RlUGFyZW50LmF0dHIoJ2lkJykpKVxuICAgICAgICByZXR1cm4gZmFsc2VcblxuICAgICAgLy8gSWYgY3Vyc29yIGlzIGF0IHN0YXJ0IG9mIGNvZGUgcHJldmVudFxuICAgICAgaWYgKHN0YXJ0Tm9kZS5wYXJlbnRzKEZJR1VSRV9TRUxFQ1RPUikuZmluZCgncHJlJykubGVuZ3RoKSB7XG5cbiAgICAgICAgLy8gSWYgYXQgdGhlIHN0YXJ0IG9mIHByZT5jb2RlLCBwcmVzc2luZyAydGltZXMgYmFja3NwYWNlIHdpbGwgcmVtb3ZlIGV2ZXJ5dGhpbmcgXG4gICAgICAgIGlmIChzdGFydE5vZGUucGFyZW50KCkuaXMoJ2NvZGUnKSAmJiAoc3RhcnROb2RlLnBhcmVudCgpLmNvbnRlbnRzKCkuaW5kZXgoc3RhcnROb2RlKSA9PSAwICYmIHNlbC5nZXRSbmcoKS5zdGFydE9mZnNldCA9PSAxKSkge1xuICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHN0YXJ0Tm9kZS5wYXJlbnRzKEZJR1VSRV9TRUxFQ1RPUikucmVtb3ZlKClcbiAgICAgICAgICB9KVxuICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICB9XG5cblxuICAgICAgICBpZiAoc3RhcnROb2RlLnBhcmVudCgpLmlzKCdwcmUnKSAmJiBzZWwuZ2V0Um5nKCkuc3RhcnRPZmZzZXQgPT0gMClcbiAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZVxuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbn1cblxuLyoqXG4gKiBcbiAqIEBwYXJhbSB7Kn0gc2VsIFxuICovXG5mdW5jdGlvbiBoYW5kbGVGaWd1cmVDYW5jKHNlbCkge1xuXG4gIC8vIEdldCByZWZlcmVuY2Ugb2Ygc3RhcnQgYW5kIGVuZCBub2RlXG4gIGxldCBzdGFydE5vZGUgPSAkKHNlbC5nZXRSbmcoKS5zdGFydENvbnRhaW5lcilcbiAgbGV0IHN0YXJ0Tm9kZVBhcmVudCA9IHN0YXJ0Tm9kZS5wYXJlbnRzKEZJR1VSRV9TRUxFQ1RPUilcblxuICBsZXQgZW5kTm9kZSA9ICQoc2VsLmdldFJuZygpLmVuZENvbnRhaW5lcilcbiAgbGV0IGVuZE5vZGVQYXJlbnQgPSBlbmROb2RlLnBhcmVudHMoRklHVVJFX1NFTEVDVE9SKVxuXG4gIC8vIElmIGF0IGxlYXN0IHNlbGVjdGlvbiBzdGFydCBvciBlbmQgaXMgaW5zaWRlIHRoZSBmaWd1cmVcbiAgaWYgKHN0YXJ0Tm9kZVBhcmVudC5sZW5ndGggfHwgZW5kTm9kZVBhcmVudC5sZW5ndGgpIHtcblxuICAgIC8vIElmIHNlbGVjdGlvbiBkb2Vzbid0IHN0YXJ0IGFuZCBlbmQgaW4gdGhlIHNhbWUgZmlndXJlLCBidXQgb25lIGJlZXR3ZW4gc3RhcnQgb3IgZW5kIGlzIGluc2lkZSB0aGUgZmlnY2FwdGlvbiwgbXVzdCBibG9ja1xuICAgIGlmIChzdGFydE5vZGUucGFyZW50cygnZmlnY2FwdGlvbicpLmxlbmd0aCAhPSBlbmROb2RlLnBhcmVudHMoJ2ZpZ2NhcHRpb24nKS5sZW5ndGggJiYgKHN0YXJ0Tm9kZS5wYXJlbnRzKCdmaWdjYXB0aW9uJykubGVuZ3RoIHx8IGVuZE5vZGUucGFyZW50cygnZmlnY2FwdGlvbicpLmxlbmd0aCkpXG4gICAgICByZXR1cm4gZmFsc2VcblxuICAgIC8vIElmIHRoZSBmaWd1cmUgaXMgbm90IHRoZSBzYW1lLCBtdXN0IGJsb2NrXG4gICAgLy8gQmVjYXVzZSBhIHNlbGVjdGlvbiBjYW4gc3RhcnQgaW4gZmlndXJlWCBhbmQgZW5kIGluIGZpZ3VyZVlcbiAgICBpZiAoKHN0YXJ0Tm9kZVBhcmVudC5hdHRyKCdpZCcpICE9IGVuZE5vZGVQYXJlbnQuYXR0cignaWQnKSkpXG4gICAgICByZXR1cm4gZmFsc2VcblxuICB9XG5cbiAgLy8gVGhpcyBhbGdvcml0aG0gZG9lc24ndCB3b3JrIGlmIGNhcmV0IGlzIGluIGVtcHR5IHRleHQgZWxlbWVudFxuXG4gIC8vIEN1cnJlbnQgZWxlbWVudCBjYW4gYmUgb3IgdGV4dCBvciBwXG4gIGxldCBwYXJhZ3JhcGggPSBzdGFydE5vZGUuaXMoJ3AnKSA/IHN0YXJ0Tm9kZSA6IHN0YXJ0Tm9kZS5wYXJlbnRzKCdwJykuZmlyc3QoKVxuICAvLyBTYXZlIGFsbCBjaGxkcmVuIG5vZGVzICh0ZXh0IGluY2x1ZGVkKVxuICBsZXQgcGFyYWdyYXBoQ29udGVudCA9IHBhcmFncmFwaC5jb250ZW50cygpXG5cbiAgLy8gSWYgbmV4dCB0aGVyZSBpcyBhIGZpZ3VyZVxuICBpZiAocGFyYWdyYXBoLm5leHQoKS5pcyhGSUdVUkVfU0VMRUNUT1IpKSB7XG5cbiAgICBpZiAoZW5kTm9kZVswXS5ub2RlVHlwZSA9PSAzKSB7XG5cbiAgICAgIC8vIElmIHRoZSBlbmQgbm9kZSBpcyBhIHRleHQgaW5zaWRlIGEgc3Ryb25nLCBpdHMgaW5kZXggd2lsbCBiZSAtMS5cbiAgICAgIC8vIEluIHRoaXMgY2FzZSB0aGUgZWRpdG9yIG11c3QgaXRlcmF0ZSB1bnRpbCBpdCBmYWNlIGEgaW5saW5lIGVsZW1lbnRcbiAgICAgIGlmIChwYXJhZ3JhcGhDb250ZW50LmluZGV4KGVuZE5vZGUpID09IC0xKSAvLyYmIHBhcmFncmFwaC5wYXJlbnRzKFNFQ1RJT05fU0VMRUNUT1IpLmxlbmd0aClcbiAgICAgICAgZW5kTm9kZSA9IGVuZE5vZGUucGFyZW50KClcblxuICAgICAgLy8gSWYgaW5kZXggb2YgdGhlIGlubGluZSBlbGVtZW50IGlzIGVxdWFsIG9mIGNoaWxkcmVuIG5vZGUgbGVuZ3RoXG4gICAgICAvLyBBTkQgdGhlIGN1cnNvciBpcyBhdCB0aGUgbGFzdCBwb3NpdGlvblxuICAgICAgLy8gUmVtb3ZlIHRoZSBuZXh0IGZpZ3VyZSBpbiBvbmUgdW5kbyBsZXZlbFxuICAgICAgaWYgKHBhcmFncmFwaENvbnRlbnQuaW5kZXgoZW5kTm9kZSkgKyAxID09IHBhcmFncmFwaENvbnRlbnQubGVuZ3RoICYmIHBhcmFncmFwaENvbnRlbnQubGFzdCgpLnRleHQoKS5sZW5ndGggPT0gc2VsLmdldFJuZygpLmVuZE9mZnNldCkge1xuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgcGFyYWdyYXBoLm5leHQoKS5yZW1vdmUoKVxuICAgICAgICB9KVxuICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdHJ1ZVxufVxuXG4vKipcbiAqIFxuICogQHBhcmFtIHsqfSBzZWwgPT4gdGlueW1jZSBzZWxlY3Rpb25cbiAqIFxuICogQWRkIGEgcGFyYWdyYXBoIGFmdGVyIHRoZSBmaWd1cmVcbiAqL1xuZnVuY3Rpb24gaGFuZGxlRmlndXJlRW50ZXIoc2VsKSB7XG5cbiAgbGV0IHNlbGVjdGVkRWxlbWVudCA9ICQoc2VsLmdldE5vZGUoKSlcbiAgaWYgKHNlbGVjdGVkRWxlbWVudC5pcygnZmlnY2FwdGlvbicpIHx8IChzZWxlY3RlZEVsZW1lbnQucGFyZW50cyhGSUdVUkVfU0VMRUNUT1IpLmxlbmd0aCAmJiBzZWxlY3RlZEVsZW1lbnQuaXMoJ3AnKSkpIHtcblxuICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgLy9hZGQgYSBuZXcgcGFyYWdyYXBoIGFmdGVyIHRoZSBmaWd1cmVcbiAgICAgIHNlbGVjdGVkRWxlbWVudC5wYXJlbnQoRklHVVJFX1NFTEVDVE9SKS5hZnRlcignPHA+PGJyLz48L3A+JylcblxuICAgICAgLy9tb3ZlIGNhcmV0IGF0IHRoZSBzdGFydCBvZiBuZXcgcFxuICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLnNldEN1cnNvckxvY2F0aW9uKHNlbGVjdGVkRWxlbWVudC5wYXJlbnQoRklHVVJFX1NFTEVDVE9SKVswXS5uZXh0U2libGluZywgMClcbiAgICB9KVxuICAgIHJldHVybiBmYWxzZVxuICB9IGVsc2UgaWYgKHNlbGVjdGVkRWxlbWVudC5pcygndGgnKSlcbiAgICByZXR1cm4gZmFsc2VcbiAgcmV0dXJuIHRydWVcbn1cblxuLyoqXG4gKiBcbiAqIEBwYXJhbSB7Kn0gc2VsID0+IHRpbnltY2Ugc2VsZWN0aW9uXG4gKi9cbmZ1bmN0aW9uIGhhbmRsZUZpZ3VyZUNoYW5nZShzZWwpIHtcblxuICB0aW55bWNlLnRyaWdnZXJTYXZlKClcblxuICAvLyBJZiByYXNoLWdlbmVyYXRlZCBzZWN0aW9uIGlzIGRlbGV0ZSwgcmUtYWRkIGl0XG4gIGlmICgkKCdmaWdjYXB0aW9uOm5vdCg6aGFzKHN0cm9uZykpJykubGVuZ3RoKSB7XG4gICAgY2FwdGlvbnMoKVxuICAgIHVwZGF0ZUlmcmFtZUZyb21TYXZlZENvbnRlbnQoKVxuICB9XG59IiwiLyoqXG4gKiByYWplX2lubGluZV9jb2RlIHBsdWdpbiBSQUpFXG4gKi9cblxuLyoqXG4gKiBcbiAqL1xubGV0IGlubGluZSA9IHtcblxuICAvKipcbiAgICogXG4gICAqL1xuICBoYW5kbGU6IGZ1bmN0aW9uICh0eXBlKSB7XG4gICAgbGV0IHNlbGVjdGVkRWxlbWVudCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcblxuICAgIC8vIElmIHRoZXJlIGlzbid0IGFueSBpbmxpbmUgY29kZVxuICAgIGlmICghc2VsZWN0ZWRFbGVtZW50LmlzKHR5cGUpICYmICFzZWxlY3RlZEVsZW1lbnQucGFyZW50cyh0eXBlKS5sZW5ndGgpIHtcblxuICAgICAgbGV0IHRleHQgPSBaRVJPX1NQQUNFXG5cbiAgICAgIC8vIENoZWNrIGlmIHRoZSBzZWxlY3Rpb24gc3RhcnRzIGFuZCBlbmRzIGluIHRoZSBzYW1lIHBhcmFncmFwaFxuICAgICAgaWYgKCF0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uaXNDb2xsYXBzZWQoKSkge1xuXG4gICAgICAgIGxldCBzdGFydE5vZGUgPSB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0U3RhcnQoKVxuICAgICAgICBsZXQgZW5kTm9kZSA9IHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRFbmQoKVxuXG4gICAgICAgIC8vIE5vdGlmeSB0aGUgZXJyb3IgYW5kIGV4aXRcbiAgICAgICAgaWYgKHN0YXJ0Tm9kZSAhPSBlbmROb2RlKSB7XG4gICAgICAgICAgbm90aWZ5KElOTElORV9FUlJPUlMsICdlcnJvcicsIDMwMDApXG4gICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgIH1cblxuICAgICAgICAvLyBTYXZlIHRoZSBzZWxlY3RlZCBjb250ZW50IGFzIHRleHRcbiAgICAgICAgdGV4dCArPSB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Q29udGVudCgpXG4gICAgICB9XG5cbiAgICAgIC8vIFVwZGF0ZSB0aGUgY3VycmVudCBzZWxlY3Rpb24gd2l0aCBjb2RlIGVsZW1lbnRcbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAvLyBHZXQgdGhlIGluZGV4IG9mIHRoZSBjdXJyZW50IHNlbGVjdGVkIG5vZGVcbiAgICAgICAgbGV0IHByZXZpb3VzTm9kZUluZGV4ID0gc2VsZWN0ZWRFbGVtZW50LmNvbnRlbnRzKCkuaW5kZXgoJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Um5nKCkuc3RhcnRDb250YWluZXIpKVxuXG4gICAgICAgIC8vIEFkZCBjb2RlIGVsZW1lbnRcbiAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLnNldENvbnRlbnQoYDwke3R5cGV9PiR7dGV4dH08LyR7dHlwZX0+JHsodHlwZSA9PSAncScgPyBaRVJPX1NQQUNFIDogJycpfWApXG4gICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuXG4gICAgICAgIC8vIE1vdmUgY2FyZXQgYXQgdGhlIGVuZCBvZiB0aGUgc3VjY2Vzc2l2ZSBub2RlIG9mIHByZXZpb3VzIHNlbGVjdGVkIG5vZGVcbiAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLnNldEN1cnNvckxvY2F0aW9uKHNlbGVjdGVkRWxlbWVudC5jb250ZW50cygpW3ByZXZpb3VzTm9kZUluZGV4ICsgMV0sIDEpXG4gICAgICB9KVxuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogXG4gICAqL1xuICBleGl0OiBmdW5jdGlvbiAoKSB7XG4gICAgLy8gR2V0IHRoZSBjdXJyZW50IG5vZGUgaW5kZXgsIHJlbGF0aXZlIHRvIGl0cyBwYXJlbnRcbiAgICBsZXQgc2VsZWN0ZWRFbGVtZW50ID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuICAgIGxldCBwYXJlbnRDb250ZW50ID0gc2VsZWN0ZWRFbGVtZW50LnBhcmVudCgpLmNvbnRlbnRzKClcbiAgICBsZXQgaW5kZXggPSBwYXJlbnRDb250ZW50LmluZGV4KHNlbGVjdGVkRWxlbWVudClcblxuICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgLy8gQ2hlY2sgaWYgdGhlIGN1cnJlbnQgbm9kZSBoYXMgYSB0ZXh0IGFmdGVyXG4gICAgICBpZiAodHlwZW9mIHBhcmVudENvbnRlbnRbaW5kZXggKyAxXSAhPSAndW5kZWZpbmVkJyAmJiAkKHBhcmVudENvbnRlbnRbaW5kZXggKyAxXSkuaXMoJ3RleHQnKSkge1xuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2V0Q3Vyc29yTG9jYXRpb24ocGFyZW50Q29udGVudFtpbmRleCArIDFdLCAwKVxuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2V0Q29udGVudChaRVJPX1NQQUNFKVxuICAgICAgfVxuXG4gICAgICAvLyBJZiB0aGUgbm9kZSBoYXNuJ3QgdGV4dCBhZnRlciwgcmFqZSBoYXMgdG8gYWRkIGl0XG4gICAgICBlbHNlIHtcbiAgICAgICAgc2VsZWN0ZWRFbGVtZW50LmFmdGVyKFpFUk9fU1BBQ0UpXG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZXRDdXJzb3JMb2NhdGlvbihwYXJlbnRDb250ZW50W2luZGV4ICsgMV0sIDApXG4gICAgICB9XG4gICAgfSlcbiAgfSxcblxuICAvKipcbiAgICogXG4gICAqL1xuICByZXBsYWNlVGV4dDogZnVuY3Rpb24gKGNoYXIpIHtcblxuICAgIGxldCBzZWxlY3RlZEVsZW1lbnQgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG4gICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAvLyBTZXQgdGhlIG5ldyBjaGFyIGFuZCBvdmVyd3JpdGUgY3VycmVudCB0ZXh0XG4gICAgICBzZWxlY3RlZEVsZW1lbnQuaHRtbChjaGFyKVxuXG4gICAgICAvLyBNb3ZlIHRoZSBjYXJldCBhdCB0aGUgZW5kIG9mIGN1cnJlbnQgdGV4dFxuICAgICAgbGV0IGNvbnRlbnQgPSBzZWxlY3RlZEVsZW1lbnQuY29udGVudHMoKVxuICAgICAgbW92ZUNhcmV0KGNvbnRlbnRbY29udGVudC5sZW5ndGggLSAxXSlcbiAgICB9KVxuICB9XG59XG5cbi8qKlxuICogXG4gKi9cbnRpbnltY2UuUGx1Z2luTWFuYWdlci5hZGQoJ3JhamVfaW5saW5lQ29kZScsIGZ1bmN0aW9uIChlZGl0b3IsIHVybCkge1xuXG4gIGNvbnN0IENPREUgPSAnY29kZSdcblxuICAvLyBBZGQgYSBidXR0b24gdGhhdCBvcGVucyBhIHdpbmRvd1xuICBlZGl0b3IuYWRkQnV0dG9uKCdyYWplX2lubGluZUNvZGUnLCB7XG4gICAgdGl0bGU6ICdpbmxpbmVfY29kZScsXG4gICAgaWNvbjogJ2ljb24taW5saW5lLWNvZGUnLFxuICAgIHRvb2x0aXA6ICdJbmxpbmUgY29kZScsXG4gICAgZGlzYWJsZWRTdGF0ZVNlbGVjdG9yOiBESVNBQkxFX1NFTEVDVE9SX0lOTElORSxcblxuICAgIC8vIEJ1dHRvbiBiZWhhdmlvdXJcbiAgICBvbmNsaWNrOiBmdW5jdGlvbiAoKSB7XG4gICAgICBpbmxpbmUuaGFuZGxlKENPREUpXG4gICAgfVxuICB9KVxuXG4gIGVkaXRvci5vbigna2V5RG93bicsIGZ1bmN0aW9uIChlKSB7XG5cblxuICAgIC8vIENoZWNrIGlmIHRoZSBzZWxlY3RlZCBlbGVtZW50IGlzIGEgQ09ERSB0aGF0IGlzbid0IGluc2lkZSBhIEZJR1VSRSBvciBQUkVcbiAgICBsZXQgc2VsZWN0ZWRFbGVtZW50ID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuICAgIGlmIChzZWxlY3RlZEVsZW1lbnQuaXMoJ2NvZGUnKSAmJiAhc2VsZWN0ZWRFbGVtZW50LnBhcmVudHMoRklHVVJFX1NFTEVDVE9SKS5sZW5ndGggJiYgIXNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKCdwcmUnKS5sZW5ndGgpIHtcblxuICAgICAgLy8gQ2hlY2sgaWYgRU5URVIgaXMgcHJlc3NlZFxuICAgICAgaWYgKGUua2V5Q29kZSA9PSAxMykge1xuXG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpXG4gICAgICAgIGlubGluZS5leGl0KClcbiAgICAgIH1cblxuICAgICAgLy9DaGVjayBpZiBhIFBSSU5UQUJMRSBDSEFSIGlzIHByZXNzZWRcbiAgICAgIGlmIChjaGVja0lmUHJpbnRhYmxlQ2hhcihlLmtleUNvZGUpKSB7XG5cbiAgICAgICAgLy8gSWYgdGhlIGZpcnN0IGNoYXIgaXMgWkVST19TUEFDRSBhbmQgdGhlIGNvZGUgaGFzIG5vIGNoYXJcbiAgICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC50ZXh0KCkubGVuZ3RoID09IDIgJiYgYCYjJHtzZWxlY3RlZEVsZW1lbnQudGV4dCgpLmNoYXJDb2RlQXQoMCl9O2AgPT0gWkVST19TUEFDRSkge1xuXG4gICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKVxuICAgICAgICAgIGlubGluZS5yZXBsYWNlVGV4dChlLmtleSlcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfSlcbn0pXG5cbi8qKlxuICogIElubGluZSBxdW90ZSBwbHVnaW4gUkFKRVxuICovXG50aW55bWNlLlBsdWdpbk1hbmFnZXIuYWRkKCdyYWplX2lubGluZVF1b3RlJywgZnVuY3Rpb24gKGVkaXRvciwgdXJsKSB7XG5cbiAgY29uc3QgUSA9ICdxJ1xuXG4gIC8vIEFkZCBhIGJ1dHRvbiB0aGF0IGhhbmRsZSB0aGUgaW5saW5lIGVsZW1lbnRcbiAgZWRpdG9yLmFkZEJ1dHRvbigncmFqZV9pbmxpbmVRdW90ZScsIHtcbiAgICB0aXRsZTogJ2lubGluZV9xdW90ZScsXG4gICAgaWNvbjogJ2ljb24taW5saW5lLXF1b3RlJyxcbiAgICB0b29sdGlwOiAnSW5saW5lIHF1b3RlJyxcbiAgICBkaXNhYmxlZFN0YXRlU2VsZWN0b3I6IERJU0FCTEVfU0VMRUNUT1JfSU5MSU5FLFxuXG4gICAgLy8gQnV0dG9uIGJlaGF2aW91clxuICAgIG9uY2xpY2s6IGZ1bmN0aW9uICgpIHtcbiAgICAgIGlubGluZS5oYW5kbGUoJ3EnKVxuICAgIH1cbiAgfSlcblxuICBlZGl0b3Iub24oJ2tleURvd24nLCBmdW5jdGlvbiAoZSkge1xuXG4gICAgLy8gQ2hlY2sgaWYgdGhlIHNlbGVjdGVkIGVsZW1lbnQgaXMgYSBDT0RFIHRoYXQgaXNuJ3QgaW5zaWRlIGEgRklHVVJFIG9yIFBSRVxuICAgIGxldCBzZWxlY3RlZEVsZW1lbnQgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG4gICAgaWYgKHNlbGVjdGVkRWxlbWVudC5pcygncScpKSB7XG5cbiAgICAgIC8vIENoZWNrIGlmIEVOVEVSIGlzIHByZXNzZWRcbiAgICAgIGlmIChlLmtleUNvZGUgPT0gMTMpIHtcblxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKVxuICAgICAgICBpbmxpbmUuZXhpdCgpXG4gICAgICB9XG5cbiAgICAgIC8vIENoZWNrIGlmIGEgUFJJTlRBQkxFIENIQVIgaXMgcHJlc3NlZFxuICAgICAgaWYgKGNoZWNrSWZQcmludGFibGVDaGFyKGUua2V5Q29kZSkpIHtcblxuICAgICAgICAvLyBJZiB0aGUgZmlyc3QgY2hhciBpcyBaRVJPX1NQQUNFIGFuZCB0aGUgY29kZSBoYXMgbm8gY2hhclxuICAgICAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LnRleHQoKS5sZW5ndGggPT0gMSAmJiBgJiMke3NlbGVjdGVkRWxlbWVudC50ZXh0KCkuY2hhckNvZGVBdCgwKX07YCA9PSBaRVJPX1NQQUNFKSB7XG5cbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpXG4gICAgICAgICAgaW5saW5lLnJlcGxhY2VUZXh0KGUua2V5KVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9KVxufSlcblxuLyoqXG4gKiBcbiAqL1xudGlueW1jZS5QbHVnaW5NYW5hZ2VyLmFkZCgncmFqZV9leHRlcm5hbExpbmsnLCBmdW5jdGlvbiAoZWRpdG9yLCB1cmwpIHtcblxuICBlZGl0b3IuYWRkQnV0dG9uKCdyYWplX2V4dGVybmFsTGluaycsIHtcbiAgICB0aXRsZTogJ2V4dGVybmFsX2xpbmsnLFxuICAgIGljb246ICdpY29uLWV4dGVybmFsLWxpbmsnLFxuICAgIHRvb2x0aXA6ICdFeHRlcm5hbCBsaW5rJyxcbiAgICBkaXNhYmxlZFN0YXRlU2VsZWN0b3I6IERJU0FCTEVfU0VMRUNUT1JfSU5MSU5FLFxuXG4gICAgLy8gQnV0dG9uIGJlaGF2aW91clxuICAgIG9uY2xpY2s6IGZ1bmN0aW9uICgpIHt9XG4gIH0pXG5cblxuICBsZXQgbGluayA9IHtcbiAgICBhZGQ6IGZ1bmN0aW9uICgpIHtcblxuICAgIH1cbiAgfVxufSlcblxuLyoqXG4gKiBcbiAqL1xudGlueW1jZS5QbHVnaW5NYW5hZ2VyLmFkZCgncmFqZV9pbmxpbmVGaWd1cmUnLCBmdW5jdGlvbiAoZWRpdG9yLCB1cmwpIHtcbiAgZWRpdG9yLmFkZEJ1dHRvbigncmFqZV9pbmxpbmVGaWd1cmUnLCB7XG4gICAgdGV4dDogJ2lubGluZV9maWd1cmUnLFxuICAgIHRvb2x0aXA6ICdJbmxpbmUgcXVvdGUnLFxuICAgIGRpc2FibGVkU3RhdGVTZWxlY3RvcjogRElTQUJMRV9TRUxFQ1RPUl9JTkxJTkUsXG5cbiAgICAvLyBCdXR0b24gYmVoYXZpb3VyXG4gICAgb25jbGljazogZnVuY3Rpb24gKCkge31cbiAgfSlcbn0pIiwidGlueW1jZS5QbHVnaW5NYW5hZ2VyLmFkZCgncmFqZV9saXN0cycsIGZ1bmN0aW9uIChlZGl0b3IsIHVybCkge1xuXG4gIGNvbnN0IE9MID0gJ29sJ1xuICBjb25zdCBVTCA9ICd1bCdcblxuICBlZGl0b3IuYWRkQnV0dG9uKCdyYWplX29sJywge1xuICAgIHRpdGxlOiAncmFqZV9vbCcsXG4gICAgaWNvbjogJ2ljb24tb2wnLFxuICAgIHRvb2x0aXA6ICdPcmRlcmVkIGxpc3QnLFxuICAgIGRpc2FibGVkU3RhdGVTZWxlY3RvcjogRElTQUJMRV9TRUxFQ1RPUl9GSUdVUkVTLFxuXG4gICAgLy8gQnV0dG9uIGJlaGF2aW91clxuICAgIG9uY2xpY2s6IGZ1bmN0aW9uICgpIHtcbiAgICAgIGxpc3QuYWRkKE9MKVxuICAgIH1cbiAgfSlcblxuICBlZGl0b3IuYWRkQnV0dG9uKCdyYWplX3VsJywge1xuICAgIHRpdGxlOiAncmFqZV91bCcsXG4gICAgaWNvbjogJ2ljb24tdWwnLFxuICAgIHRvb2x0aXA6ICdVbm9yZGVyZWQgbGlzdCcsXG4gICAgZGlzYWJsZWRTdGF0ZVNlbGVjdG9yOiBESVNBQkxFX1NFTEVDVE9SX0ZJR1VSRVMsXG5cbiAgICAvLyBCdXR0b24gYmVoYXZpb3VyXG4gICAgb25jbGljazogZnVuY3Rpb24gKCkge1xuICAgICAgbGlzdC5hZGQoVUwpXG4gICAgfVxuICB9KVxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGVkaXRvci5vbigna2V5RG93bicsIGZ1bmN0aW9uIChlKSB7XG5cblxuICAgIC8vIENoZWNrIGlmIHRoZSBzZWxlY3RlZCBlbGVtZW50IGlzIGEgUCBpbnNpZGUgYSBsaXN0IChPTCwgVUwpXG4gICAgbGV0IHNlbGVjdGVkRWxlbWVudCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcbiAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LmlzKCdwJykgJiYgKHNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKCd1bCcpLmxlbmd0aCB8fCBzZWxlY3RlZEVsZW1lbnQucGFyZW50cygnbGknKS5sZW5ndGgpKSB7XG5cblxuICAgICAgLyoqXG4gICAgICAgKiBDaGVjayBpZiBDTUQrRU5URVIgb3IgQ1RSTCtFTlRFUiBhcmUgcHJlc3NlZFxuICAgICAgICovXG4gICAgICBpZiAoKGUubWV0YUtleSB8fCBlLmN0cmxLZXkpICYmIGUua2V5Q29kZSA9PSAxMykge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgbGlzdC5hZGRQYXJhZ3JhcGgoKVxuICAgICAgfVxuXG4gICAgICAvKipcbiAgICAgICAqIENoZWNrIGlmIFNISUZUK1RBQiBpcyBwcmVzc2VkXG4gICAgICAgKi9cbiAgICAgIGVsc2UgaWYgKGUuc2hpZnRLZXkgJiYgZS5rZXlDb2RlID09IDkpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgIGxpc3QuZGVOZXN0KClcbiAgICAgIH1cblxuICAgICAgLyoqXG4gICAgICAgKiBDaGVjayBpZiBFTlRFUiBpcyBwcmVzc2VkXG4gICAgICAgKi9cbiAgICAgIGVsc2UgaWYgKGUua2V5Q29kZSA9PSAxMykge1xuXG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKVxuXG4gICAgICAgIC8vIENoZWNrIGlmIHRoZSBzZWxlY3Rpb24gaXMgY29sbGFwc2VkXG4gICAgICAgIGlmICh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uaXNDb2xsYXBzZWQoKSkge1xuXG4gICAgICAgICAgaWYgKCFzZWxlY3RlZEVsZW1lbnQudGV4dCgpLnRyaW0oKS5sZW5ndGgpIHtcblxuICAgICAgICAgICAgLy8gRGUgbmVzdFxuICAgICAgICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKCd1bCxvbCcpLmxlbmd0aCA+IDEpXG4gICAgICAgICAgICAgIGxpc3QuZGVOZXN0KClcblxuICAgICAgICAgICAgLy8gUmVtb3ZlIHRoZSBlbXB0eSBMSVxuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICBsaXN0LnJlbW92ZUxpc3RJdGVtKClcblxuICAgICAgICAgIH0gZWxzZVxuICAgICAgICAgICAgbGlzdC5hZGRMaXN0SXRlbSgpXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLyoqXG4gICAgICAgKiBDaGVjayBpZiBUQUIgaXMgcHJlc3NlZFxuICAgICAgICovXG4gICAgICBlbHNlIGlmIChlLmtleUNvZGUgPT0gOSkge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgbGlzdC5uZXN0KClcbiAgICAgIH1cbiAgICB9XG4gIH0pXG5cblxuICAvKipcbiAgICogXG4gICAqL1xuICBsZXQgbGlzdCA9IHtcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIGFkZDogZnVuY3Rpb24gKHR5cGUpIHtcblxuICAgICAgLy8gR2V0IHRoZSBjdXJyZW50IGVsZW1lbnQgXG4gICAgICBsZXQgc2VsZWN0ZWRFbGVtZW50ID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuICAgICAgbGV0IHRleHQgPSAnPGJyPidcblxuICAgICAgLy8gSWYgdGhlIGN1cnJlbnQgZWxlbWVudCBoYXMgdGV4dCwgc2F2ZSBpdFxuICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC50ZXh0KCkudHJpbSgpLmxlbmd0aCA+IDApXG4gICAgICAgIHRleHQgPSBzZWxlY3RlZEVsZW1lbnQudGV4dCgpLnRyaW0oKVxuXG4gICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgbGV0IG5ld0xpc3QgPSAkKGA8JHt0eXBlfT48bGk+PHA+JHt0ZXh0fTwvcD48L2xpPjwvJHt0eXBlfT5gKVxuXG4gICAgICAgIC8vIEFkZCB0aGUgbmV3IGVsZW1lbnRcbiAgICAgICAgc2VsZWN0ZWRFbGVtZW50LnJlcGxhY2VXaXRoKG5ld0xpc3QpXG5cbiAgICAgICAgLy8gU2F2ZSBjaGFuZ2VzXG4gICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuXG4gICAgICAgIC8vIE1vdmUgdGhlIGN1cnNvclxuICAgICAgICBtb3ZlQ2FyZXQobmV3TGlzdC5maW5kKCdwJylbMF0sIGZhbHNlKVxuICAgICAgfSlcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgYWRkTGlzdEl0ZW06IGZ1bmN0aW9uICgpIHtcblxuICAgICAgY29uc3QgQlIgPSAnPGJyPidcblxuICAgICAgLy8gR2V0IHRoZSByZWZlcmVuY2VzIG9mIHRoZSBleGlzdGluZyBlbGVtZW50XG4gICAgICBsZXQgcCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcbiAgICAgIGxldCBsaXN0SXRlbSA9IHAucGFyZW50KCdsaScpXG5cbiAgICAgIC8vIFBsYWNlaG9sZGVyIHRleHQgb2YgdGhlIG5ldyBsaVxuICAgICAgbGV0IG5ld1RleHQgPSBCUlxuICAgICAgbGV0IG5vZGVzID0gcC5jb250ZW50cygpXG5cbiAgICAgIC8vIElmIHRoZXJlIGlzIGp1c3Qgb25lIG5vZGUgd3JhcHBlZCBpbnNpZGUgdGhlIHBhcmFncmFwaFxuICAgICAgaWYgKG5vZGVzLmxlbmd0aCA9PSAxKSB7XG5cbiAgICAgICAgLy8gR2V0IHRoZSBzdGFydCBvZmZzZXQgYW5kIHRleHQgb2YgdGhlIGN1cnJlbnQgbGlcbiAgICAgICAgbGV0IHN0YXJ0T2Zmc2V0ID0gdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldFJuZygpLnN0YXJ0T2Zmc2V0XG4gICAgICAgIGxldCBwVGV4dCA9IHAudGV4dCgpXG5cbiAgICAgICAgLy8gSWYgdGhlIGN1cnNvciBpc24ndCBhdCB0aGUgZW5kXG4gICAgICAgIGlmIChzdGFydE9mZnNldCAhPSBwVGV4dC5sZW5ndGgpIHtcblxuICAgICAgICAgIC8vIEdldCB0aGUgcmVtYWluaW5nIHRleHRcbiAgICAgICAgICBuZXdUZXh0ID0gcFRleHQuc3Vic3RyaW5nKHN0YXJ0T2Zmc2V0LCBwVGV4dC5sZW5ndGgpXG4gICAgICAgIH1cblxuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICAvLyBVcGRhdGUgdGhlIHRleHQgb2YgdGhlIGN1cnJlbnQgbGlcbiAgICAgICAgICBwLnRleHQocFRleHQuc3Vic3RyaW5nKDAsIHN0YXJ0T2Zmc2V0KSlcblxuICAgICAgICAgIGlmICghcC50ZXh0KCkubGVuZ3RoKVxuICAgICAgICAgICAgcC5odG1sKEJSKVxuXG4gICAgICAgICAgLy8gQ3JlYXRlIGFuZCBhZGQgdGhlIG5ldyBsaVxuICAgICAgICAgIGxldCBuZXdMaXN0SXRlbSA9ICQoYDxsaT48cD4ke25ld1RleHR9PC9wPjwvbGk+YClcbiAgICAgICAgICBsaXN0SXRlbS5hZnRlcihuZXdMaXN0SXRlbSlcblxuICAgICAgICAgIC8vIE1vdmUgdGhlIGNhcmV0IHRvIHRoZSBuZXcgbGlcbiAgICAgICAgICBtb3ZlQ2FyZXQobmV3TGlzdEl0ZW1bMF0sIHRydWUpXG5cbiAgICAgICAgICAvLyBVcGRhdGUgdGhlIGNvbnRlbnRcbiAgICAgICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcbiAgICAgICAgfSlcbiAgICAgIH1cblxuICAgICAgLy8gSW5zdGVhZCBpZiB0aGVyZSBhcmUgbXVsdGlwbGUgbm9kZXMgaW5zaWRlIHRoZSBwYXJhZ3JhcGhcbiAgICAgIGVsc2Uge1xuXG4gICAgICAgIC8vIElzdGFudGlhdGUgdGhlIHJhbmdlIHRvIGJlIHNlbGVjdGVkXG4gICAgICAgIGxldCByYW5nZSA9IGRvY3VtZW50LmNyZWF0ZVJhbmdlKClcblxuICAgICAgICAvLyBTdGFydCB0aGUgcmFuZ2UgZnJvbSB0aGUgc2VsZWN0ZWQgbm9kZSBhbmQgb2Zmc2V0IGFuZCBlbmRzIGl0IGF0IHRoZSBlbmQgb2YgdGhlIGxhc3Qgbm9kZVxuICAgICAgICByYW5nZS5zZXRTdGFydCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Um5nKCkuc3RhcnRDb250YWluZXIsIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRSbmcoKS5zdGFydE9mZnNldClcbiAgICAgICAgcmFuZ2Uuc2V0RW5kKHRoaXMuZ2V0TGFzdE5vdEVtcHR5Tm9kZShub2RlcyksIDEpXG5cbiAgICAgICAgLy8gU2VsZWN0IHRoZSByYW5nZVxuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2V0Um5nKHJhbmdlKVxuXG4gICAgICAgIC8vIFNhdmUgdGhlIGh0bWwgY29udGVudFxuICAgICAgICBuZXdUZXh0ID0gdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldENvbnRlbnQoKVxuXG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgIHAuaHRtbChwLmh0bWwoKS5yZXBsYWNlKG5ld1RleHQsICcnKSlcblxuICAgICAgICAgIGlmICghcC50ZXh0KCkubGVuZ3RoKVxuICAgICAgICAgICAgcC5odG1sKEJSKVxuXG4gICAgICAgICAgLy8gQ3JlYXRlIGFuZCBhZGQgdGhlIG5ldyBsaVxuICAgICAgICAgIGxldCBuZXdMaXN0SXRlbSA9ICQoYDxsaT48cD4ke25ld1RleHR9PC9wPjwvbGk+YClcbiAgICAgICAgICBsaXN0SXRlbS5hZnRlcihuZXdMaXN0SXRlbSlcblxuICAgICAgICAgIC8vIE1vdmUgdGhlIGNhcmV0IHRvIHRoZSBuZXcgbGlcbiAgICAgICAgICBtb3ZlQ2FyZXQobmV3TGlzdEl0ZW1bMF0sIHRydWUpXG5cbiAgICAgICAgICAvLyBVcGRhdGUgdGhlIGNvbnRlbnRcbiAgICAgICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgZ2V0TGFzdE5vdEVtcHR5Tm9kZTogZnVuY3Rpb24gKG5vZGVzKSB7XG5cbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbm9kZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKG5vZGVzW2ldLm5vZGVUeXBlID09IDMgJiYgIW5vZGVzW2ldLmxlbmd0aClcbiAgICAgICAgICBub2Rlcy5zcGxpY2UoaSwgMSlcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG5vZGVzW25vZGVzLmxlbmd0aCAtIDFdXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIHJlbW92ZUxpc3RJdGVtOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgIC8vIEdldCB0aGUgc2VsZWN0ZWQgbGlzdEl0ZW1cbiAgICAgIGxldCBsaXN0SXRlbSA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSkucGFyZW50KCdsaScpXG5cbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAvLyBBZGQgYSBlbXB0eSBwYXJhZ3JhcGggYWZ0ZXIgdGhlIGxpc3RcbiAgICAgICAgbGV0IG5ld1AgPSAkKCc8cD48YnI+PC9wPicpXG4gICAgICAgIGxpc3RJdGVtLnBhcmVudCgpLmFmdGVyKG5ld1ApXG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIGxpc3QgaGFzIGV4YWN0bHkgb25lIGNoaWxkIHJlbW92ZSB0aGUgbGlzdFxuICAgICAgICBpZiAobGlzdEl0ZW0ucGFyZW50KCkuY2hpbGRyZW4oJ2xpJykubGVuZ3RoID09IDEpIHtcbiAgICAgICAgICBsZXQgbGlzdCA9IGxpc3RJdGVtLnBhcmVudCgpXG4gICAgICAgICAgbGlzdC5yZW1vdmUoKVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gSWYgdGhlIGxpc3QgaGFzIG1vcmUgY2hpbGRyZW4gcmVtb3ZlIHRoZSBzZWxlY3RlZCBjaGlsZFxuICAgICAgICBlbHNlXG4gICAgICAgICAgbGlzdEl0ZW0ucmVtb3ZlKClcblxuICAgICAgICBtb3ZlQ2FyZXQobmV3UFswXSlcblxuICAgICAgICAvLyBVcGRhdGUgdGhlIGNvbnRlbnRcbiAgICAgICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG4gICAgICB9KVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBuZXN0OiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgIGxldCBwID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuICAgICAgbGV0IGxpc3RJdGVtID0gcC5wYXJlbnQoJ2xpJylcblxuICAgICAgLy8gQ2hlY2sgaWYgdGhlIGN1cnJlbnQgbGkgaGFzIGF0IGxlYXN0IG9uZSBwcmV2aW91cyBlbGVtZW50XG4gICAgICBpZiAobGlzdEl0ZW0ucHJldkFsbCgpLmxlbmd0aCA+IDApIHtcblxuICAgICAgICAvLyBDcmVhdGUgdGhlIG5ldyBsaXN0XG4gICAgICAgIGxldCB0ZXh0ID0gJzxicj4nXG5cbiAgICAgICAgaWYgKHAudGV4dCgpLnRyaW0oKS5sZW5ndGgpXG4gICAgICAgICAgdGV4dCA9IHAudGV4dCgpLnRyaW0oKVxuXG4gICAgICAgIC8vIEdldCB0eXBlIG9mIHRoZSBwYXJlbnQgbGlzdFxuICAgICAgICBsZXQgdHlwZSA9IGxpc3RJdGVtLnBhcmVudCgpWzBdLnRhZ05hbWUudG9Mb3dlckNhc2UoKVxuXG4gICAgICAgIC8vIENyZWF0ZSB0aGUgbmV3IG5lc3RlZCBsaXN0XG4gICAgICAgIGxldCBuZXdMaXN0SXRlbSA9ICQobGlzdEl0ZW1bMF0ub3V0ZXJIVE1MKVxuXG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgIC8vIElmIHRoZSBwcmV2aW91cyBlbGVtZW50IGhhcyBhIGxpc3RcbiAgICAgICAgICBpZiAobGlzdEl0ZW0ucHJldigpLmZpbmQoJ3VsLG9sJykubGVuZ3RoKVxuICAgICAgICAgICAgbGlzdEl0ZW0ucHJldigpLmZpbmQoJ3VsLG9sJykuYXBwZW5kKG5ld0xpc3RJdGVtKVxuXG4gICAgICAgICAgLy8gQWRkIHRoZSBuZXcgbGlzdCBpbnNpZGUgdGhlIHByZXZpb3VzIGxpXG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBuZXdMaXN0SXRlbSA9ICQoYDwke3R5cGV9PiR7bmV3TGlzdEl0ZW1bMF0ub3V0ZXJIVE1MfTwvJHt0eXBlfT5gKVxuICAgICAgICAgICAgbGlzdEl0ZW0ucHJldigpLmFwcGVuZChuZXdMaXN0SXRlbSlcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBsaXN0SXRlbS5yZW1vdmUoKVxuXG4gICAgICAgICAgLy8gTW92ZSB0aGUgY2FyZXQgYXQgdGhlIGVuZCBvZiB0aGUgbmV3IHAgXG4gICAgICAgICAgbW92ZUNhcmV0KG5ld0xpc3RJdGVtLmZpbmQoJ3AnKVswXSlcblxuICAgICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuICAgICAgICB9KVxuICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBkZU5lc3Q6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgbGV0IGxpc3RJdGVtID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKS5wYXJlbnQoJ2xpJylcbiAgICAgIGxldCBsaXN0ID0gbGlzdEl0ZW0ucGFyZW50KClcblxuICAgICAgLy8gQ2hlY2sgaWYgdGhlIGN1cnJlbnQgbGlzdCBoYXMgYXQgbGVhc3QgYW5vdGhlciBsaXN0IGFzIHBhcmVudFxuICAgICAgaWYgKGxpc3RJdGVtLnBhcmVudHMoJ3VsLG9sJykubGVuZ3RoID4gMSkge1xuXG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgIC8vIEdldCBhbGwgbGk6IGN1cnJlbnQgYW5kIGlmIHRoZXJlIGFyZSBzdWNjZXNzaXZlXG4gICAgICAgICAgbGV0IG5leHRMaSA9IFtsaXN0SXRlbV1cbiAgICAgICAgICBpZiAobGlzdEl0ZW0ubmV4dEFsbCgpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGxpc3RJdGVtLm5leHRBbGwoKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgbmV4dExpLnB1c2goJCh0aGlzKSlcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gTW92ZSBhbGwgbGkgb3V0IGZyb20gdGhlIG5lc3RlZCBsaXN0XG4gICAgICAgICAgZm9yIChsZXQgaSA9IG5leHRMaS5sZW5ndGggLSAxOyBpID4gLTE7IGktLSkge1xuICAgICAgICAgICAgbmV4dExpW2ldLnJlbW92ZSgpXG4gICAgICAgICAgICBsaXN0LnBhcmVudCgpLmFmdGVyKG5leHRMaVtpXSlcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBJZiBlbXB0eSByZW1vdmUgdGhlIGxpc3RcbiAgICAgICAgICBpZiAoIWxpc3QuY2hpbGRyZW4oJ2xpJykubGVuZ3RoKVxuICAgICAgICAgICAgbGlzdC5yZW1vdmUoKVxuXG4gICAgICAgICAgLy8gTW92ZSB0aGUgY2FyZXQgYXQgdGhlIGVuZFxuICAgICAgICAgIG1vdmVDYXJldChsaXN0SXRlbS5maW5kKCdwJylbMF0pXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIGFkZFBhcmFncmFwaDogZnVuY3Rpb24gKCkge1xuXG4gICAgICAvLyBHZXQgcmVmZXJlbmNlcyBvZiBjdXJyZW50IHBcbiAgICAgIGxldCBwID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuICAgICAgbGV0IHN0YXJ0T2Zmc2V0ID0gdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldFJuZygpLnN0YXJ0T2Zmc2V0XG4gICAgICBsZXQgcFRleHQgPSBwLnRleHQoKS50cmltKClcblxuICAgICAgbGV0IHRleHQgPSAnPGJyPidcblxuICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIC8vIElmIHRoZSBFTlRFUiBicmVha3MgcFxuICAgICAgICBpZiAoc3RhcnRPZmZzZXQgIT0gcFRleHQubGVuZ3RoKSB7XG5cbiAgICAgICAgICAvLyBVcGRhdGUgdGhlIHRleHQgb2YgdGhlIGN1cnJlbnQgbGlcbiAgICAgICAgICBwLnRleHQocFRleHQuc3Vic3RyaW5nKDAsIHN0YXJ0T2Zmc2V0KSlcblxuICAgICAgICAgIC8vIEdldCB0aGUgcmVtYWluaW5nIHRleHRcbiAgICAgICAgICB0ZXh0ID0gcFRleHQuc3Vic3RyaW5nKHN0YXJ0T2Zmc2V0LCBwVGV4dC5sZW5ndGgpXG4gICAgICAgIH1cblxuICAgICAgICAvLyBDcmVhdGUgYW5kIGFkZCB0aGUgZWxlbWVudFxuICAgICAgICBsZXQgbmV3UCA9ICQoYDxwPiR7dGV4dH08L3A+YClcbiAgICAgICAgcC5hZnRlcihuZXdQKVxuXG4gICAgICAgIG1vdmVDYXJldChuZXdQWzBdLCB0cnVlKVxuICAgICAgfSlcbiAgICB9XG4gIH1cbn0pIiwiLyoqXG4gKiBcbiAqL1xuXG5mdW5jdGlvbiBvcGVuTWV0YWRhdGFEaWFsb2coKSB7XG4gIHRpbnltY2UuYWN0aXZlRWRpdG9yLndpbmRvd01hbmFnZXIub3Blbih7XG4gICAgdGl0bGU6ICdFZGl0IG1ldGFkYXRhJyxcbiAgICB1cmw6ICdqcy9yYWplLWNvcmUvcGx1Z2luL3JhamVfbWV0YWRhdGEuaHRtbCcsXG4gICAgd2lkdGg6IDk1MCxcbiAgICBoZWlnaHQ6IDgwMCxcbiAgICBvbkNsb3NlOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgIGlmICh0aW55bWNlLmFjdGl2ZUVkaXRvci51cGRhdGVkX21ldGFkYXRhICE9IG51bGwpIHtcblxuICAgICAgICBtZXRhZGF0YS51cGRhdGUodGlueW1jZS5hY3RpdmVFZGl0b3IudXBkYXRlZF9tZXRhZGF0YSlcblxuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51cGRhdGVkX21ldGFkYXRhID09IG51bGxcbiAgICAgIH1cblxuICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iud2luZG93TWFuYWdlci5jbG9zZSgpXG4gICAgfVxuICB9LCBtZXRhZGF0YS5nZXRBbGxNZXRhZGF0YSgpKVxufVxuXG50aW55bWNlLlBsdWdpbk1hbmFnZXIuYWRkKCdyYWplX21ldGFkYXRhJywgZnVuY3Rpb24gKGVkaXRvciwgdXJsKSB7XG5cbiAgLy8gQWRkIGEgYnV0dG9uIHRoYXQgaGFuZGxlIHRoZSBpbmxpbmUgZWxlbWVudFxuICBlZGl0b3IuYWRkQnV0dG9uKCdyYWplX21ldGFkYXRhJywge1xuICAgIHRleHQ6ICdNZXRhZGF0YScsXG4gICAgaWNvbjogZmFsc2UsXG4gICAgdG9vbHRpcDogJ0VkaXQgbWV0YWRhdGEnLFxuXG4gICAgLy8gQnV0dG9uIGJlaGF2aW91clxuICAgIG9uY2xpY2s6IGZ1bmN0aW9uICgpIHtcbiAgICAgIG9wZW5NZXRhZGF0YURpYWxvZygpXG4gICAgfVxuICB9KVxuXG4gIGVkaXRvci5vbignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuICAgIGlmICgkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpLmlzKEhFQURFUl9TRUxFQ1RPUikpXG4gICAgICBvcGVuTWV0YWRhdGFEaWFsb2coKVxuICB9KVxuXG4gIG1ldGFkYXRhID0ge1xuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgZ2V0QWxsTWV0YWRhdGE6IGZ1bmN0aW9uICgpIHtcbiAgICAgIGxldCBoZWFkZXIgPSAkKEhFQURFUl9TRUxFQ1RPUilcbiAgICAgIGxldCBzdWJ0aXRsZSA9IGhlYWRlci5maW5kKCdoMS50aXRsZSA+IHNtYWxsJykudGV4dCgpXG4gICAgICBsZXQgZGF0YSA9IHtcbiAgICAgICAgc3VidGl0bGU6IHN1YnRpdGxlLFxuICAgICAgICB0aXRsZTogaGVhZGVyLmZpbmQoJ2gxLnRpdGxlJykudGV4dCgpLnJlcGxhY2Uoc3VidGl0bGUsICcnKSxcbiAgICAgICAgYXV0aG9yczogbWV0YWRhdGEuZ2V0QXV0aG9ycyhoZWFkZXIpLFxuICAgICAgICBjYXRlZ29yaWVzOiBtZXRhZGF0YS5nZXRDYXRlZ29yaWVzKGhlYWRlciksXG4gICAgICAgIGtleXdvcmRzOiBtZXRhZGF0YS5nZXRLZXl3b3JkcyhoZWFkZXIpXG4gICAgICB9XG5cbiAgICAgIHJldHVybiBkYXRhXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIGdldEF1dGhvcnM6IGZ1bmN0aW9uIChoZWFkZXIpIHtcbiAgICAgIGxldCBhdXRob3JzID0gW11cblxuICAgICAgaGVhZGVyLmZpbmQoJ2FkZHJlc3MubGVhZC5hdXRob3JzJykuZWFjaChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgLy8gR2V0IGFsbCBhZmZpbGlhdGlvbnNcbiAgICAgICAgbGV0IGFmZmlsaWF0aW9ucyA9IFtdXG4gICAgICAgICQodGhpcykuZmluZCgnc3BhbicpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGFmZmlsaWF0aW9ucy5wdXNoKCQodGhpcykudGV4dCgpKVxuICAgICAgICB9KVxuXG4gICAgICAgIC8vIHB1c2ggc2luZ2xlIGF1dGhvclxuICAgICAgICBhdXRob3JzLnB1c2goe1xuICAgICAgICAgIG5hbWU6ICQodGhpcykuY2hpbGRyZW4oJ3N0cm9uZy5hdXRob3JfbmFtZScpLnRleHQoKSxcbiAgICAgICAgICBlbWFpbDogJCh0aGlzKS5maW5kKCdjb2RlLmVtYWlsID4gYScpLnRleHQoKSxcbiAgICAgICAgICBhZmZpbGlhdGlvbnM6IGFmZmlsaWF0aW9uc1xuICAgICAgICB9KVxuICAgICAgfSlcblxuICAgICAgcmV0dXJuIGF1dGhvcnNcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgZ2V0Q2F0ZWdvcmllczogZnVuY3Rpb24gKGhlYWRlcikge1xuICAgICAgbGV0IGNhdGVnb3JpZXMgPSBbXVxuXG4gICAgICBoZWFkZXIuZmluZCgncC5hY21fc3ViamVjdF9jYXRlZ29yaWVzID4gY29kZScpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICBjYXRlZ29yaWVzLnB1c2goJCh0aGlzKS50ZXh0KCkpXG4gICAgICB9KVxuXG4gICAgICByZXR1cm4gY2F0ZWdvcmllc1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBnZXRLZXl3b3JkczogZnVuY3Rpb24gKGhlYWRlcikge1xuICAgICAgbGV0IGtleXdvcmRzID0gW11cblxuICAgICAgaGVhZGVyLmZpbmQoJ3VsLmxpc3QtaW5saW5lID4gbGkgPiBjb2RlJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIGtleXdvcmRzLnB1c2goJCh0aGlzKS50ZXh0KCkpXG4gICAgICB9KVxuXG4gICAgICByZXR1cm4ga2V5d29yZHNcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgdXBkYXRlOiBmdW5jdGlvbiAodXBkYXRlZE1ldGFkYXRhKSB7XG5cbiAgICAgICQoJ2hlYWQgbWV0YVtwcm9wZXJ0eV0sIGhlYWQgbGlua1twcm9wZXJ0eV0sIGhlYWQgbWV0YVtuYW1lXScpLnJlbW92ZSgpXG5cbiAgICAgIGxldCBjdXJyZW50TWV0YWRhdGEgPSBtZXRhZGF0YS5nZXRBbGxNZXRhZGF0YSgpXG5cbiAgICAgIC8vIFVwZGF0ZSB0aXRsZSBhbmQgc3VidGl0bGVcbiAgICAgIGlmICh1cGRhdGVkTWV0YWRhdGEudGl0bGUgIT0gY3VycmVudE1ldGFkYXRhLnRpdGxlIHx8IHVwZGF0ZWRNZXRhZGF0YS5zdWJ0aXRsZSAhPSBjdXJyZW50TWV0YWRhdGEuc3VidGl0bGUpIHtcbiAgICAgICAgbGV0IHRleHQgPSB1cGRhdGVkTWV0YWRhdGEudGl0bGVcblxuICAgICAgICBpZiAodXBkYXRlZE1ldGFkYXRhLnN1YnRpdGxlLnRyaW0oKS5sZW5ndGgpXG4gICAgICAgICAgdGV4dCArPSBgIC0tICR7dXBkYXRlZE1ldGFkYXRhLnN1YnRpdGxlfWBcblxuICAgICAgICAkKCd0aXRsZScpLnRleHQodGV4dClcbiAgICAgIH1cblxuICAgICAgbGV0IGFmZmlsaWF0aW9uc0NhY2hlID0gW11cblxuICAgICAgdXBkYXRlZE1ldGFkYXRhLmF1dGhvcnMuZm9yRWFjaChmdW5jdGlvbiAoYXV0aG9yKSB7XG5cbiAgICAgICAgJCgnaGVhZCcpLmFwcGVuZChgPG1ldGEgYWJvdXQ9XCJtYWlsdG86JHthdXRob3IuZW1haWx9XCIgdHlwZW9mPVwic2NoZW1hOlBlcnNvblwiIHByb3BlcnR5PVwic2NoZW1hOm5hbWVcIiBuYW1lPVwiZGMuY3JlYXRvclwiIGNvbnRlbnQ9XCIke2F1dGhvci5uYW1lfVwiPmApXG4gICAgICAgICQoJ2hlYWQnKS5hcHBlbmQoYDxtZXRhIGFib3V0PVwibWFpbHRvOiR7YXV0aG9yLmVtYWlsfVwiIHByb3BlcnR5PVwic2NoZW1hOmVtYWlsXCIgY29udGVudD1cIiR7YXV0aG9yLmVtYWlsfVwiPmApXG5cbiAgICAgICAgYXV0aG9yLmFmZmlsaWF0aW9ucy5mb3JFYWNoKGZ1bmN0aW9uIChhZmZpbGlhdGlvbikge1xuXG4gICAgICAgICAgLy8gTG9vayB1cCBmb3IgYWxyZWFkeSBleGlzdGluZyBhZmZpbGlhdGlvblxuICAgICAgICAgIGxldCB0b0FkZCA9IHRydWVcbiAgICAgICAgICBsZXQgaWRcblxuICAgICAgICAgIGFmZmlsaWF0aW9uc0NhY2hlLmZvckVhY2goZnVuY3Rpb24gKGFmZmlsaWF0aW9uQ2FjaGUpIHtcbiAgICAgICAgICAgIGlmIChhZmZpbGlhdGlvbkNhY2hlLmNvbnRlbnQgPT0gYWZmaWxpYXRpb24pIHtcbiAgICAgICAgICAgICAgdG9BZGQgPSBmYWxzZVxuICAgICAgICAgICAgICBpZCA9IGFmZmlsaWF0aW9uQ2FjaGUuaWRcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KVxuXG4gICAgICAgICAgLy8gSWYgdGhlcmUgaXMgbm8gZXhpc3RpbmcgYWZmaWxpYXRpb24sIGFkZCBpdFxuICAgICAgICAgIGlmICh0b0FkZCkge1xuICAgICAgICAgICAgbGV0IGdlbmVyYXRlZElkID0gYCNhZmZpbGlhdGlvbl8ke2FmZmlsaWF0aW9uc0NhY2hlLmxlbmd0aCsxfWBcbiAgICAgICAgICAgIGFmZmlsaWF0aW9uc0NhY2hlLnB1c2goe1xuICAgICAgICAgICAgICBpZDogZ2VuZXJhdGVkSWQsXG4gICAgICAgICAgICAgIGNvbnRlbnQ6IGFmZmlsaWF0aW9uXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgaWQgPSBnZW5lcmF0ZWRJZFxuICAgICAgICAgIH1cblxuICAgICAgICAgICQoJ2hlYWQnKS5hcHBlbmQoYDxsaW5rIGFib3V0PVwibWFpbHRvOiR7YXV0aG9yLmVtYWlsfVwiIHByb3BlcnR5PVwic2NoZW1hOmFmZmlsaWF0aW9uXCIgaHJlZj1cIiR7aWR9XCI+YClcbiAgICAgICAgfSlcbiAgICAgIH0pXG5cbiAgICAgIGFmZmlsaWF0aW9uc0NhY2hlLmZvckVhY2goZnVuY3Rpb24gKGFmZmlsaWF0aW9uQ2FjaGUpIHtcbiAgICAgICAgJCgnaGVhZCcpLmFwcGVuZChgPG1ldGEgYWJvdXQ9XCIke2FmZmlsaWF0aW9uQ2FjaGUuaWR9XCIgdHlwZW9mPVwic2NoZW1hOk9yZ2FuaXphdGlvblwiIHByb3BlcnR5PVwic2NoZW1hOm5hbWVcIiBjb250ZW50PVwiJHthZmZpbGlhdGlvbkNhY2hlLmNvbnRlbnR9XCI+YClcbiAgICAgIH0pXG5cbiAgICAgIHVwZGF0ZWRNZXRhZGF0YS5jYXRlZ29yaWVzLmZvckVhY2goZnVuY3Rpb24oY2F0ZWdvcnkpe1xuICAgICAgICAkKCdoZWFkJykuYXBwZW5kKGA8bWV0YSBuYW1lPVwiZGN0ZXJtcy5zdWJqZWN0XCIgY29udGVudD1cIiR7Y2F0ZWdvcnl9XCIvPmApXG4gICAgICB9KVxuXG4gICAgICB1cGRhdGVkTWV0YWRhdGEua2V5d29yZHMuZm9yRWFjaChmdW5jdGlvbihrZXl3b3JkKXtcbiAgICAgICAgJCgnaGVhZCcpLmFwcGVuZChgPG1ldGEgcHJvcGVydHk9XCJwcmlzbTprZXl3b3JkXCIgY29udGVudD1cIiR7a2V5d29yZH1cIi8+YClcbiAgICAgIH0pXG5cbiAgICAgICQoJyNyYWplX3Jvb3QnKS5hZGRIZWFkZXJIVE1MKClcbiAgICAgIHNldE5vbkVkaXRhYmxlSGVhZGVyKClcbiAgICAgIHVwZGF0ZUlmcmFtZUZyb21TYXZlZENvbnRlbnQoKVxuICAgIH1cbiAgfVxuXG59KSIsInRpbnltY2UuUGx1Z2luTWFuYWdlci5hZGQoJ3JhamVfc2F2ZScsIGZ1bmN0aW9uIChlZGl0b3IsIHVybCkge1xuXG4gIHNhdmVNYW5hZ2VyID0ge1xuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgaW5pdFNhdmU6IGZ1bmN0aW9uICgpIHtcbiAgICAgIC8vIFJldHVybiB0aGUgbWVzc2FnZSBmb3IgdGhlIGJhY2tlbmRcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHRpdGxlOiBzYXZlTWFuYWdlci5nZXRUaXRsZSgpLFxuICAgICAgICBkb2N1bWVudDogc2F2ZU1hbmFnZXIuZ2V0RGVyYXNoZWRBcnRpY2xlKClcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgc2F2ZUFzOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgIC8vIFNlbmQgbWVzc2FnZSB0byB0aGUgYmFja2VuZFxuICAgICAgc2F2ZUFzQXJ0aWNsZShzYXZlTWFuYWdlci5pbml0U2F2ZSgpKVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBzYXZlOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgIC8vIFNlbmQgbWVzc2FnZSB0byB0aGUgYmFja2VuZFxuICAgICAgc2F2ZUFydGljbGUoc2F2ZU1hbmFnZXIuaW5pdFNhdmUoKSlcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0dXJuIHRoZSBSQVNIIGFydGljbGUgcmVuZGVyZWQgKHdpdGhvdXQgdGlueW1jZSlcbiAgICAgKi9cbiAgICBnZXREZXJhc2hlZEFydGljbGU6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG5cbiAgICAgIC8vIFNhdmUgaHRtbCByZWZlcmVuY2VzXG4gICAgICBsZXQgYXJ0aWNsZSA9ICQoJ2h0bWwnKS5jbG9uZSgpXG4gICAgICBsZXQgdGlueW1jZVNhdmVkQ29udGVudCA9IGFydGljbGUuZmluZCgnI3JhamVfcm9vdCcpXG5cbiAgICAgIGFydGljbGUucmVtb3ZlQXR0cignY2xhc3MnKVxuXG4gICAgICAvL3JlcGxhY2UgYm9keSB3aXRoIHRoZSByaWdodCBvbmUgKHRoaXMgYWN0aW9uIHJlbW92ZSB0aW55bWNlKVxuICAgICAgYXJ0aWNsZS5maW5kKCdib2R5JykuaHRtbCh0aW55bWNlU2F2ZWRDb250ZW50Lmh0bWwoKSlcbiAgICAgIGFydGljbGUuZmluZCgnYm9keScpLnJlbW92ZUF0dHIoJ3N0eWxlJylcbiAgICAgIGFydGljbGUuZmluZCgnYm9keScpLnJlbW92ZUF0dHIoJ2NsYXNzJylcblxuICAgICAgLy9yZW1vdmUgYWxsIHN0eWxlIGFuZCBsaW5rIHVuLW5lZWRlZCBmcm9tIHRoZSBoZWFkXG4gICAgICBhcnRpY2xlLmZpbmQoJ2hlYWQnKS5jaGlsZHJlbignc3R5bGVbdHlwZT1cInRleHQvY3NzXCJdJykucmVtb3ZlKClcbiAgICAgIGFydGljbGUuZmluZCgnaGVhZCcpLmNoaWxkcmVuKCdsaW5rW2lkXScpLnJlbW92ZSgpXG5cbiAgICAgIC8vIElmIHRoZSBwbHVnaW4gcmFqZV9hbm5vdGF0aW9ucyBpcyBhZGRlZCB0byB0aW55bWNlIFxuICAgICAgaWYgKHR5cGVvZiB0aW55bWNlLmFjdGl2ZUVkaXRvci5wbHVnaW5zLnJhamVfYW5ub3RhdGlvbnMgIT0gdW5kZWZpbmVkKVxuICAgICAgICBhcnRpY2xlID0gdXBkYXRlQW5ub3RhdGlvbnNPblNhdmUoYXJ0aWNsZSlcblxuICAgICAgLy8gRXhlY3V0ZSBkZXJhc2ggKHJlcGxhY2UgYWxsIGNnZW4gZWxlbWVudHMgd2l0aCBpdHMgb3JpZ2luYWwgY29udGVudClcbiAgICAgIGFydGljbGUuZmluZCgnKltkYXRhLXJhc2gtb3JpZ2luYWwtY29udGVudF0nKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbGV0IG9yaWdpbmFsQ29udGVudCA9ICQodGhpcykuYXR0cignZGF0YS1yYXNoLW9yaWdpbmFsLWNvbnRlbnQnKVxuICAgICAgICAkKHRoaXMpLnJlcGxhY2VXaXRoKG9yaWdpbmFsQ29udGVudClcbiAgICAgIH0pXG5cbiAgICAgIGFydGljbGUuZmluZCgnKltkYXRhLXJhc2gtb3JpZ2luYWwtcGFyZW50LWNvbnRlbnRdJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIGxldCBvcmlnaW5hbENvbnRlbnQgPSAkKHRoaXMpLmF0dHIoJ2RhdGEtcmFzaC1vcmlnaW5hbC1wYXJlbnQtY29udGVudCcpXG4gICAgICAgICQodGhpcykucGFyZW50KCkucmVwbGFjZVdpdGgob3JpZ2luYWxDb250ZW50KVxuICAgICAgfSlcblxuICAgICAgLy8gRXhlY3V0ZSBkZXJhc2ggY2hhbmdpbmcgdGhlIHdyYXBwZXJcbiAgICAgIGFydGljbGUuZmluZCgnKltkYXRhLXJhc2gtb3JpZ2luYWwtd3JhcHBlcl0nKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbGV0IGNvbnRlbnQgPSAkKHRoaXMpLmh0bWwoKVxuICAgICAgICBsZXQgd3JhcHBlciA9ICQodGhpcykuYXR0cignZGF0YS1yYXNoLW9yaWdpbmFsLXdyYXBwZXInKVxuICAgICAgICAkKHRoaXMpLnJlcGxhY2VXaXRoKGA8JHt3cmFwcGVyfT4ke2NvbnRlbnR9PC8ke3dyYXBwZXJ9PmApXG4gICAgICB9KVxuXG4gICAgICAvLyBSZW1vdmUgdGFyZ2V0IGZyb20gVGlueU1DRSBsaW5rXG4gICAgICBhcnRpY2xlLmZpbmQoJ2FbdGFyZ2V0XScpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICAkKHRoaXMpLnJlbW92ZUF0dHIoJ3RhcmdldCcpXG4gICAgICB9KVxuXG4gICAgICAvLyBSZW1vdmUgY29udGVudGVkaXRhYmxlIGZyb20gVGlueU1DRSBsaW5rXG4gICAgICBhcnRpY2xlLmZpbmQoJ2FbY29udGVudGVkaXRhYmxlXScpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICAkKHRoaXMpLnJlbW92ZUF0dHIoJ2NvbnRlbnRlZGl0YWJsZScpXG4gICAgICB9KVxuXG4gICAgICAvLyBSZW1vdmUgbm90IGFsbG93ZWQgc3BhbiBlbG1lbnRzIGluc2lkZSB0aGUgZm9ybXVsYSwgaW5saW5lX2Zvcm11bGFcbiAgICAgIGFydGljbGUuZmluZChgJHtGSUdVUkVfRk9STVVMQV9TRUxFQ1RPUn0sJHtJTkxJTkVfRk9STVVMQV9TRUxFQ1RPUn1gKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgJCh0aGlzKS5jaGlsZHJlbigncCcpLmh0bWwoJCh0aGlzKS5maW5kKCdzcGFuW2NvbnRlbnRlZGl0YWJsZV0nKS5odG1sKCkpXG4gICAgICB9KVxuXG4gICAgICBhcnRpY2xlLmZpbmQoYCR7RklHVVJFX0ZPUk1VTEFfU0VMRUNUT1J9LCR7SU5MSU5FX0ZPUk1VTEFfU0VMRUNUT1J9YCkuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIGxldCBzdmcgPSAkKHRoaXMpLmZpbmQoJ3N2Z1tkYXRhLW1hdGhtbF0nKVxuICAgICAgICBpZiAoc3ZnLmxlbmd0aCkge1xuXG4gICAgICAgICAgJCh0aGlzKS5hdHRyKERBVEFfTUFUSF9PUklHSU5BTF9JTlBVVCwgc3ZnLmF0dHIoREFUQV9NQVRIX09SSUdJTkFMX0lOUFVUKSlcbiAgICAgICAgICAkKHRoaXMpLmNoaWxkcmVuKCdwJykuaHRtbChzdmcuYXR0cignZGF0YS1tYXRobWwnKSlcbiAgICAgICAgfVxuICAgICAgfSlcblxuICAgICAgLy8gUmVwbGFjZSB0Ym9keSB3aXRoIGl0cyBjb250ZW50ICNcbiAgICAgIGFydGljbGUuZmluZCgndGJvZHknKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgJCh0aGlzKS5yZXBsYWNlV2l0aCgkKHRoaXMpLmh0bWwoKSlcbiAgICAgIH0pXG5cbiAgICAgIHJldHVybiBgPCFET0NUWVBFIGh0bWw+JHtuZXcgWE1MU2VyaWFsaXplcigpLnNlcmlhbGl6ZVRvU3RyaW5nKGFydGljbGVbMF0pfWBcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0dXJuIHRoZSB0aXRsZSBcbiAgICAgKi9cbiAgICBnZXRUaXRsZTogZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuICQoJ3RpdGxlJykudGV4dCgpXG4gICAgfSxcblxuICB9XG59KSIsImNvbnN0IG5vdF9hbm5vdGFibGVfZWxlbWVudHMgPSBgJHtOT05fRURJVEFCTEVfSEVBREVSX1NFTEVDVE9SfSwke1NJREVCQVJfQU5OT1RBVElPTn0sJHtJTkxJTkVfRk9STVVMQV9TRUxFQ1RPUn1gXG5jb25zdCBhbm5vdGF0b3JQb3B1cFNlbGVjdG9yID0gJyNhbm5vdGF0b3JQb3B1cCdcbmNvbnN0IGFubm90YXRvckZvcm1Qb3B1cFNlbGVjdG9yID0gJyNhbm5vdGF0b3JGb3JtUG9wdXAnXG5jb25zdCBjcmVhdG9yID0gJ3NwaW5vOTMzMCdcbmNvbnN0IGFubm90YXRpb25XcmFwcGVyID0gJ3NwYW5bZGF0YS1yYXNoLWFubm90YXRpb24tdHlwZV0nXG5cbnRpbnltY2UuUGx1Z2luTWFuYWdlci5hZGQoJ3JhamVfYW5ub3RhdGlvbnMnLCBmdW5jdGlvbiAoZWRpdG9yLCB1cmwpIHtcblxuICBlZGl0b3Iub24oJ2NsaWNrJywgZSA9PiB7XG5cbiAgICBsZXQgY2xpY2tlZEVsZW1lbnQgPSAkKGUuc3JjRWxlbWVudClcblxuICAgIGlmIChjbGlja2VkRWxlbWVudC5wYXJlbnRzKFNJREVCQVJfQU5OT1RBVElPTikubGVuZ3RoKSB7XG5cbiAgICAgIGlmIChjbGlja2VkRWxlbWVudC5pcygnc3BhbiN0b2dnbGVBbm5vdGF0aW9ucycpIHx8IGNsaWNrZWRFbGVtZW50LnBhcmVudCgpLmlzKCdzcGFuI3RvZ2dsZUFubm90YXRpb25zJykpXG4gICAgICAgIHJhc2gudG9nZ2xlQW5ub3RhdGlvbnMoKVxuXG4gICAgICBpZiAoY2xpY2tlZEVsZW1lbnQuaXMoJ3NwYW4jdG9nZ2xlU2lkZWJhcicpIHx8IGNsaWNrZWRFbGVtZW50LnBhcmVudCgpLmlzKCdzcGFuI3RvZ2dsZVNpZGViYXInKSlcbiAgICAgICAgcmFzaC50b2dnbGVTaWRlYmFyKClcblxuICAgICAgaWYgKGNsaWNrZWRFbGVtZW50LmlzKCdzcGFuW2RhdGEtcmFzaC1hbm5vdGF0aW9uLWlkXScpKVxuICAgICAgICByYXNoLnNob3dBbm5vdGF0aW9uKGNsaWNrZWRFbGVtZW50LmF0dHIoJ3RpdGxlJykuc3BsaXQoJywnKSlcblxuICAgICAgdXBkYXRlSWZyYW1lRnJvbVNhdmVkQ29udGVudCgpXG4gICAgfVxuXG4gICAgLy8gQ2xvc2UgYW5ub3RhdG9yRm9ybVBvcHVwIGlmIHRoZSB1c2VyIGNsaWNrIHNvbWV3aGVyZSBlbHNlXG4gICAgaWYgKCQoYW5ub3RhdG9yRm9ybVBvcHVwU2VsZWN0b3IpLmlzKCc6dmlzaWJsZScpICYmICghY2xpY2tlZEVsZW1lbnQuaXMoYW5ub3RhdG9yRm9ybVBvcHVwU2VsZWN0b3IpIHx8ICFjbGlja2VkRWxlbWVudC5wYXJlbnRzKGFubm90YXRvckZvcm1Qb3B1cFNlbGVjdG9yKS5sZW5ndGgpKVxuICAgICAgaGlkZUFubm90YXRpb25Gb3JtUG9wdXAoKVxuICB9KVxuXG4gIGVkaXRvci5vbignTW91c2VVcCcsIGUgPT4ge1xuXG4gICAgaGlkZUFubm90YXRpb25Qb3B1cCgpXG5cbiAgICAvLyBJZiB0aGUgc2VsZWN0aW9uIGlzIG5vdCBjb2xsYXBzZWQgYW5kIHRoZSBlbGVtZW50IHNlbGVjdGVkIGlzIGFuIFwiYW5ub3RhYmxlIGVsZW1lbnRcIlxuICAgIGlmICghdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmlzQ29sbGFwc2VkKCkgJiYgISQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSkuaXMobm90X2Fubm90YWJsZV9lbGVtZW50cykpXG4gICAgICBoYW5kbGVBbm5vdGF0aW9uKGUpXG4gIH0pXG59KVxuXG5cbi8qKlxuICogXG4gKi9cbmhhbmRsZUFubm90YXRpb24gPSBlID0+IHtcblxuICAvLyBTaG93IHRoZSBwb3B1cFxuICBzaG93QW5ub3RhdGlvblBvcHVwKGUuY2xpZW50WCwgZS5jbGllbnRZKVxufVxuXG4vKipcbiAqIFxuICovXG5jcmVhdGVBbm5vdGF0aW9uID0gKHRleHQsIGNyZWF0b3IpID0+IHtcblxuICBjb25zdCBzZWxlY3Rpb24gPSB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb25cbiAgY29uc3QgcmFuZ2UgPSBzZWxlY3Rpb24uZ2V0Um5nKClcbiAgY29uc3QgbGFzdEFubm90YXRpb24gPSBBbm5vdGF0aW9uLmdldExhc3RBbm5vdGF0aW9uKClcblxuICBjb25zdCBzdGFydFhQYXRoID0gQW5ub3RhdGlvbi5nZXRYUGF0aCgkKHNlbGVjdGlvbi5nZXRTdGFydCgpKSlcbiAgY29uc3Qgc3RhcnRPZmZzZXQgPSBBbm5vdGF0aW9uLmdldE9mZnNldChyYW5nZS5zdGFydENvbnRhaW5lciwgcmFuZ2Uuc3RhcnRPZmZzZXQsIHN0YXJ0WFBhdGgpXG5cbiAgY29uc3QgZW5kWFBhdGggPSBBbm5vdGF0aW9uLmdldFhQYXRoKCQoc2VsZWN0aW9uLmdldEVuZCgpKSlcbiAgY29uc3QgZW5kT2Zmc2V0ID0gQW5ub3RhdGlvbi5nZXRPZmZzZXQocmFuZ2UuZW5kQ29udGFpbmVyLCByYW5nZS5lbmRPZmZzZXQsIGVuZFhQYXRoKVxuXG4gIGNvbnN0IGRhdGEgPSB7XG4gICAgXCJpZFwiOiBsYXN0QW5ub3RhdGlvbi5pZCxcbiAgICBcIkBjb250ZW54dFwiOiBcImh0dHA6Ly93d3cudzMub3JnL25zL2Fubm8uanNvbmxkXCIsXG4gICAgXCJjcmVhdGVkXCI6IERhdGUubm93KCksXG4gICAgXCJib2R5VmFsdWVcIjogdGV4dCxcbiAgICBcImNyZWF0b3JcIjogY3JlYXRvcixcbiAgICBcIk1vdGl2YXRpb25cIjogY29tbWVudGluZyxcbiAgICBcInRhcmdldFwiOiB7XG4gICAgICBcInNlbGVjdG9yXCI6IHtcbiAgICAgICAgXCJzdGFydFNlbGVjdG9yXCI6IHtcbiAgICAgICAgICBcIkB0eXBlXCI6IFwiWFBhdGhTZWxlY3RvclwiLFxuICAgICAgICAgIFwiQHZhbHVlXCI6IHN0YXJ0WFBhdGhcbiAgICAgICAgfSxcbiAgICAgICAgXCJlbmRTZWxlY3RvclwiOiB7XG4gICAgICAgICAgXCJAdHlwZVwiOiBcIlhQYXRoU2VsZWN0b3JcIixcbiAgICAgICAgICBcIkB2YWx1ZVwiOiBlbmRYUGF0aFxuICAgICAgICB9LFxuICAgICAgICBcInN0YXJ0XCI6IHtcbiAgICAgICAgICBcIkB0eXBlXCI6IFwiRGF0YVBvc2l0aW9uU2VsZWN0b3JcIixcbiAgICAgICAgICBcIkB2YWx1ZVwiOiBzdGFydE9mZnNldFxuICAgICAgICB9LFxuICAgICAgICBcImVuZFwiOiB7XG4gICAgICAgICAgXCJAdHlwZVwiOiBcIkRhdGFQb3NpdGlvblNlbGVjdG9yXCIsXG4gICAgICAgICAgXCJAdmFsdWVcIjogZW5kT2Zmc2V0XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBUaGUgYWRkaW5nIG9mIHRoZSBzY3JpcHQgaXMgaW5zaWRlIGEgdW5kbyBsZXZlbFxuICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAkKCcjcmFqZV9yb290JykuYXBwZW5kKGA8c2NyaXB0IGlkPVwiJHtkYXRhLmlkfVwiIHR5cGU9XCJhcHBsaWNhdGlvbi9sZCtqc29uXCI+JHtKU09OLnN0cmluZ2lmeShkYXRhLCBudWxsLCAyKSB9PC9zY3JpcHQ+YClcbiAgICByYXNoLmNsZWFyQW5ub3RhdGlvbnMoKVxuICAgIHJhc2gucmVuZGVyQW5ub3RhdGlvbnMoKVxuICAgIHVwZGF0ZUlmcmFtZUZyb21TYXZlZENvbnRlbnQoKVxuICB9KVxufVxuXG4vKipcbiAqIFxuICovXG5zaG93QW5ub3RhdGlvblBvcHVwID0gKHgsIHkpID0+IHtcblxuICBsZXQgYW5ub3RhdG9yUG9wdXAgPSAkKGBcbiAgICA8ZGl2IGlkPSdhbm5vdGF0b3JQb3B1cCc+XG4gICAgICA8ZGl2IGNsYXNzPVwiYW5ub3RhdG9yUG9wdXBfYXJyb3dcIj48L2Rpdj5cbiAgICAgIDxzcGFuIGNsYXNzPVwiZ2x5cGhpY29uIGdseXBoaWNvbi1wZW5jaWxcIiBhcmlhLWhpZGRlbj1cInRydWVcIj48L3NwYW4+XG4gICAgPC9kaXY+YClcblxuICBhbm5vdGF0b3JQb3B1cC5jc3Moe1xuICAgIHRvcDogeSAtIDIwLFxuICAgIGxlZnQ6IHggLSAxOC41XG4gIH0pXG5cbiAgYW5ub3RhdG9yUG9wdXAub24oJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xuICAgIHNob3dBbm5vdGF0aW9uRm9ybVBvcHVwKClcbiAgfSlcblxuICBhbm5vdGF0b3JQb3B1cC5hcHBlbmRUbygnYm9keScpXG59XG5cbi8qKlxuICogXG4gKi9cbnNob3dBbm5vdGF0aW9uRm9ybVBvcHVwID0gKCkgPT4ge1xuXG4gIGxldCBhbm5vdGF0b3JGb3JtUG9wdXAgPSAkKGBcbiAgICA8ZGl2IGlkPVwiYW5ub3RhdG9yRm9ybVBvcHVwXCI+XG4gICAgICA8dGV4dGFyZWEgY2xhc3M9XCJmb3JtLWNvbnRyb2xcIiByb3dzPVwiM1wiPjwvdGV4dGFyZWE+XG4gICAgICA8ZGl2IGNsYXNzPVwiYW5ub3RhdG9yRm9ybVBvcHVwX2Zvb3RlclwiPlxuICAgICAgICA8YSBpZD1cImFubm90YXRvckZvcm1Qb3B1cF9zYXZlXCIgY2xhc3M9XCJidG4gYnRuLXN1Y2Nlc3MgYnRuLXhzXCI+QW5ub3RhdGU8L2E+XG4gICAgICA8L2Rpdj5cbiAgICA8L2Rpdj5cbiAgYClcblxuICBhbm5vdGF0b3JGb3JtUG9wdXAuYXBwZW5kVG8oJ2JvZHknKVxuXG4gIGFubm90YXRvckZvcm1Qb3B1cC5jc3Moe1xuICAgIHRvcDogJChhbm5vdGF0b3JQb3B1cFNlbGVjdG9yKS5vZmZzZXQoKS50b3AgLSBhbm5vdGF0b3JGb3JtUG9wdXAuaGVpZ2h0KCkgLyAyIC0gMjAsXG4gICAgbGVmdDogJChhbm5vdGF0b3JQb3B1cFNlbGVjdG9yKS5vZmZzZXQoKS5sZWZ0XG4gIH0pXG5cbiAgJChgJHthbm5vdGF0b3JGb3JtUG9wdXBTZWxlY3Rvcn0gYS5idG4tc3VjY2Vzc2ApLm9uKCdjbGljaycsIGZ1bmN0aW9uICgpIHtcbiAgICBjcmVhdGVBbm5vdGF0aW9uKCQoYCR7YW5ub3RhdG9yRm9ybVBvcHVwU2VsZWN0b3J9PnRleHRhcmVhYCkudmFsKCksIGNyZWF0b3IpXG4gICAgaGlkZUFubm90YXRpb25Gb3JtUG9wdXAoKVxuICB9KVxuXG4gIC8vIEhpZGUgdGhlIGxhc3QgYW5ub3RhdGlvbiBwb3B1cFxuICBoaWRlQW5ub3RhdGlvblBvcHVwKClcblxuICAkKGAke2Fubm90YXRvckZvcm1Qb3B1cFNlbGVjdG9yfT50ZXh0YXJlYWApLmZvY3VzKClcblxufVxuXG4vKipcbiAqIFxuICovXG5oaWRlQW5ub3RhdGlvbkZvcm1Qb3B1cCA9ICgpID0+IHtcbiAgJChhbm5vdGF0b3JGb3JtUG9wdXBTZWxlY3RvcikucmVtb3ZlKClcbn1cblxuLyoqXG4gKiBcbiAqL1xuaGlkZUFubm90YXRpb25Qb3B1cCA9ICgpID0+IHtcbiAgJChhbm5vdGF0b3JQb3B1cFNlbGVjdG9yKS5yZW1vdmUoKVxufVxuXG4vKipcbiAqIFxuICovXG51cGRhdGVBbm5vdGF0aW9uc09uU2F2ZSA9IGFydGljbGUgPT4ge1xuXG4gIC8qKlxuICAgKiBcbiAgICogQHBhcmFtIHtKUXVlcnkgb2JqZWN0fSBub2RlIFxuICAgKiBAcGFyYW0ge0ludGVnZXJ9IG9mZnNldCBvcHRpb25hbCwgaXQncyBuZWVkZWQgZm9yIHRoZSBlbmRpbmcgb2Zmc2V0XG4gICAqL1xuICBjb25zdCBnZXRPZmZzZXQgPSAobm9kZSwgb2Zmc2V0ID0gMCkgPT4ge1xuXG4gICAgbm9kZSA9IG5vZGVbMF0ucHJldmlvdXNTaWJsaW5nXG5cbiAgICB3aGlsZSAobm9kZSAhPSBudWxsKSB7XG5cbiAgICAgIGlmIChub2RlLm5vZGVUeXBlID09IDMpXG4gICAgICAgIG9mZnNldCArPSBub2RlLmxlbmd0aFxuICAgICAgZWxzZVxuICAgICAgICBvZmZzZXQgKz0gbm9kZS5pbm5lclRleHQubGVuZ3RoXG5cbiAgICAgIG5vZGUgPSBub2RlLnByZXZpb3VzU2libGluZ1xuICAgIH1cblxuICAgIHJldHVybiBvZmZzZXRcbiAgfVxuXG4gIC8vIEdldCBhbGwgYW5ub3RhdGlvbiBzY3JpcHRzXG4gIGFydGljbGUuZmluZCgnc2NyaXB0W3R5cGU9XCJhcHBsaWNhdGlvbi9sZCtqc29uXCJdJykuZWFjaChmdW5jdGlvbiAoKSB7XG5cbiAgICAvLyBDaGFuZ2UgdGhlIG9mZnNldHMgYW5kIHRoZSBzZWxlY3RvcnNcbiAgICBsZXQganNvbiA9IEpTT04ucGFyc2UoJCh0aGlzKS5odG1sKCkpXG5cbiAgICAvLyBHZXQgdGhlIGlkIG9mIHRoZSBjdXJyZW50IGFubm90YXRpb25cbiAgICBjb25zdCBpZCA9IGpzb24uaWRcblxuICAgIC8vIEdldCB0aGUgbGlzdCBvZiBoaWdobGlnaHRlZCBhbm5vdGF0aW9uc1xuICAgIGNvbnN0IGZpcnN0ID0gJChgc3Bhbi5jZ2VuLmFubm90YXRpb25faGlsaWdodFtkYXRhLXJhc2gtYW5ub3RhdGlvbi1pZD1cIiR7aWR9XCJdYCkuZmlyc3QoKVxuICAgIGNvbnN0IGxhc3QgPSAkKGBzcGFuLmNnZW4uYW5ub3RhdGlvbl9oaWxpZ2h0W2RhdGEtcmFzaC1hbm5vdGF0aW9uLWlkPVwiJHtpZH1cIl1gKS5sYXN0KClcblxuICAgIC8vIFVwZGF0ZSBib3RoIHN0YXJ0IGFuZCBlbmQgb2Zmc2V0cywgdGhlIGVuZGluZyBvZmZzZXQgaGFzIGFsc28gdGhlIGN1cnJudCBsZW5ndGhcbiAgICBqc29uLnRhcmdldC5zZWxlY3Rvci5zdGFydFsnQHZhbHVlJ10gPSBnZXRPZmZzZXQoZmlyc3QpXG4gICAganNvbi50YXJnZXQuc2VsZWN0b3IuZW5kWydAdmFsdWUnXSA9IGdldE9mZnNldChsYXN0LCBsYXN0LnRleHQoKS5sZW5ndGgpXG5cbiAgICAvLyBVcGRhdGUgYm90aCBzdGFydCBhbmQgZW5kIHNlbGVjdG9ycyB3aXRoIHRoZSByaWdodCB4cGF0aFxuICAgIGpzb24udGFyZ2V0LnNlbGVjdG9yLnN0YXJ0U2VsZWN0b3JbJ0B2YWx1ZSddID0gQW5ub3RhdGlvbi5nZXRYUGF0aChmaXJzdClcbiAgICBqc29uLnRhcmdldC5zZWxlY3Rvci5lbmRTZWxlY3RvclsnQHZhbHVlJ10gPSBBbm5vdGF0aW9uLmdldFhQYXRoKGxhc3QpXG5cbiAgICAkKHRoaXMpLmh0bWwoSlNPTi5zdHJpbmdpZnkoanNvbiwgbnVsbCwgMikpXG4gIH0pXG5cbiAgLy8gQ2hhbmdlIGRhdGEtcmFzaC1vcmlnaW5hbFstcGFyZW50XS1jb250ZW50XG4gIGNvbnN0IGNvbnRlbnQgPSAnZGF0YS1yYXNoLW9yaWdpbmFsLWNvbnRlbnQnXG4gIGNvbnN0IHBhcmVudCA9ICdkYXRhLXJhc2gtb3JpZ2luYWwtcGFyZW50LWNvbnRlbnQnXG4gIGxldCBhdHRyaWJ1dGVcblxuICBhcnRpY2xlLmZpbmQoYW5ub3RhdGlvbldyYXBwZXIpLmVhY2goZnVuY3Rpb24gKCkge1xuXG4gICAgaWYgKCQodGhpcykuYXR0cihjb250ZW50KSlcbiAgICAgIGF0dHJpYnV0ZSA9IGNvbnRlbnRcblxuICAgIGlmICgkKHRoaXMpLmF0dHIocGFyZW50KSlcbiAgICAgIGF0dHJpYnV0ZSA9IHBhcmVudFxuXG4gICAgJCh0aGlzKS5hdHRyKGF0dHJpYnV0ZSwgJCh0aGlzKS5odG1sKCkpXG4gIH0pXG5cbiAgcmV0dXJuIGFydGljbGVcbn0iXX0=

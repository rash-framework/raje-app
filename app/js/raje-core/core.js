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
const annotationWrapper = 'span[data-rash-annotation-type]'

tinymce.PluginManager.add('raje_annotations', function (editor) {

  editor.on('click', e => {

    let clickedElement = $(e.srcElement)

    if (clickedElement.parents(SIDEBAR_ANNOTATION).length) {

      // Toggle annotation button
      if (clickedElement.is('span#toggleAnnotations') || clickedElement.parent().is('span#toggleAnnotations')) {
        rash.toggleAnnotations()
        updateIframeFromSavedContent()
      }

      // Toggle sidebar button
      else if (clickedElement.is('span#toggleSidebar') || clickedElement.parent().is('span#toggleSidebar')) {
        rash.toggleSidebar()
        updateIframeFromSavedContent()
      }

      // Show annotation 
      else if (clickedElement.is('span[data-rash-annotation-id]')) {

        rash.displayLastReplayArea(clickedElement.attr('data-rash-annotation-id'))
        rash.showAnnotation(clickedElement.attr('title').split(','))
        updateIframeFromSavedContent()
      }

      // Focus text area
      else if (clickedElement.is('textarea'))
        $(this).focus()

      else if (clickedElement.is(`.side_note_reply_button`)) {

        const parents = clickedElement.parents('[data-rash-annotation-id]')

        const ancestor_note_body = parents.last()
        const parent_note_body = parents.first()
        const parent_note_id = parent_note_body.attr('data-rash-annotation-id')

        const replayingText = parent_note_body.find('textarea').val()

        // Check if the text is ok
        if (replayingText.trim().length > 0) {
          createAnnotationReplying(replayingText, parent_note_id)
          updateIframeFromSavedContent()
        }
      }
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
createAnnotationCommenting = text => {

  const creator = ipcRenderer.sendSync('getSettings').username

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
    "created": Date.now() + (-(new Date().getTimezoneOffset() * 60000)),
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
createAnnotationReplying = (text, targetId) => {

  const creator = ipcRenderer.sendSync('getSettings').username
  const lastAnnotation = Annotation.getLastAnnotation()

  const data = {
    "id": lastAnnotation.id,
    "@contenxt": "http://www.w3.org/ns/anno.jsonld",
    "created": Date.now(),
    "bodyValue": text,
    "creator": creator,
    "Motivation": replying,
    "target": targetId
  }

  // Add the new annotation without clearing everything
  tinymce.activeEditor.undoManager.transact(function () {

    $('#raje_root').append(`<script id="${data.id}" type="application/ld+json">${JSON.stringify(data, null, 2) }</script>`)
    rash.renderSingleAnnotation(data)
    rash.displayLastReplayArea(data.target)
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluaXQuanMiLCIwX3JhamVfY29uc3RhbnRzLmpzIiwiMV9yYWplX3NlY3Rpb24uanMiLCIyX3JhamVfY3Jvc3NyZWYuanMiLCIzX3JhamVfZmlndXJlcy5qcyIsIjRfcmFqZV9pbmxpbmVzLmpzIiwiNV9yYWplX2xpc3RzLmpzIiwiNl9yYWplX21ldGFkYXRhLmpzIiwiN19yYWplX3NhdmUuanMiLCI4X3JhamVfYW5ub3RhdGlvbnMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2p0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcC9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM1WEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDOW9DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDck9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2hYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDeExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDckhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiY29yZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogXG4gKiBJbml0aWxpemUgVGlueU1DRSBlZGl0b3Igd2l0aCBhbGwgcmVxdWlyZWQgb3B0aW9uc1xuICovXG5cbi8vIEludmlzaWJsZSBzcGFjZSBjb25zdGFudHNcbmNvbnN0IFpFUk9fU1BBQ0UgPSAnJiM4MjAzOydcbmNvbnN0IFJBSkVfU0VMRUNUT1IgPSAnYm9keSN0aW55bWNlJ1xuXG4vLyBTZWxlY3RvciBjb25zdGFudHMgKHRvIG1vdmUgaW5zaWRlIGEgbmV3IGNvbnN0IGZpbGUpXG5jb25zdCBIRUFERVJfU0VMRUNUT1IgPSAnaGVhZGVyLnBhZ2UtaGVhZGVyLmNvbnRhaW5lci5jZ2VuJ1xuY29uc3QgRklSU1RfSEVBRElORyA9IGAke1JBSkVfU0VMRUNUT1J9PnNlY3Rpb246Zmlyc3Q+aDE6Zmlyc3RgXG5cbmNvbnN0IERBVEFfTUFUSF9PUklHSU5BTF9JTlBVVCA9ICdkYXRhLW1hdGgtb3JpZ2luYWwtaW5wdXQnXG5jb25zdCBUSU5ZTUNFX1RPT0xCQVJfSEVJR1RIID0gNzZcblxubGV0IGlwY1JlbmRlcmVyLCB3ZWJGcmFtZVxuXG5pZiAoaGFzQmFja2VuZCkge1xuXG4gIGlwY1JlbmRlcmVyID0gcmVxdWlyZSgnZWxlY3Ryb24nKS5pcGNSZW5kZXJlclxuICB3ZWJGcmFtZSA9IHJlcXVpcmUoJ2VsZWN0cm9uJykud2ViRnJhbWVcblxuICAvKipcbiAgICogSW5pdGlsaXNlIFRpbnlNQ0UgXG4gICAqL1xuICAkKGRvY3VtZW50KS5yZWFkeShmdW5jdGlvbiAoKSB7XG5cbiAgICAvLyBPdmVycmlkZSB0aGUgbWFyZ2luIGJvdHRvbiBnaXZlbiBieSBSQVNIIGZvciB0aGUgZm9vdGVyXG4gICAgJCgnYm9keScpLmNzcyh7XG4gICAgICAnbWFyZ2luLWJvdHRvbSc6IDBcbiAgICB9KVxuXG4gICAgLy9oaWRlIGZvb3RlclxuICAgICQoJ2Zvb3Rlci5mb290ZXInKS5yZW1vdmUoKVxuXG4gICAgLy9hdHRhY2ggd2hvbGUgYm9keSBpbnNpZGUgYSBwbGFjZWhvbGRlciBkaXZcbiAgICAkKCdib2R5JykuaHRtbChgPGRpdiBpZD1cInJhamVfcm9vdFwiPiR7JCgnYm9keScpLmh0bWwoKX08L2Rpdj5gKVxuXG4gICAgLy8gXG4gICAgc2V0Tm9uRWRpdGFibGVIZWFkZXIoKVxuXG4gICAgLy9cbiAgICBtYXRobWwyc3ZnQWxsRm9ybXVsYXMoKVxuXG4gICAgdGlueW1jZS5pbml0KHtcblxuICAgICAgLy8gU2VsZWN0IHRoZSBlbGVtZW50IHRvIHdyYXBcbiAgICAgIHNlbGVjdG9yOiAnI3JhamVfcm9vdCcsXG5cbiAgICAgIC8vIFNldCB3aW5kb3cgc2l6ZVxuICAgICAgaGVpZ2h0OiB3aW5kb3cuaW5uZXJIZWlnaHQgLSBUSU5ZTUNFX1RPT0xCQVJfSEVJR1RILFxuXG4gICAgICAvLyBTZXQgdGhlIHN0eWxlcyBvZiB0aGUgY29udGVudCB3cmFwcGVkIGluc2lkZSB0aGUgZWxlbWVudFxuICAgICAgY29udGVudF9jc3M6IFsnY3NzL2Jvb3RzdHJhcC5taW4uY3NzJywgJ2Nzcy9yYXNoLmNzcycsICdjc3MvcmFqZS1jb3JlLmNzcyddLFxuXG4gICAgICAvLyBTZXQgcGx1Z2lucyBbdGFibGUgaW1hZ2UgbGluayBjb2Rlc2FtcGxlXVxuICAgICAgcGx1Z2luczogXCJzZWFyY2hyZXBsYWNlIHJhamVfaW5saW5lRmlndXJlIGZ1bGxzY3JlZW4gcmFqZV9leHRlcm5hbExpbmsgcmFqZV9pbmxpbmVDb2RlIHJhamVfaW5saW5lUXVvdGUgcmFqZV9zZWN0aW9uICBub25lZGl0YWJsZSByYWplX2ltYWdlIHJhamVfcXVvdGVibG9jayByYWplX2NvZGVibG9jayByYWplX3RhYmxlIHJhamVfbGlzdGluZyByYWplX2lubGluZV9mb3JtdWxhIHJhamVfZm9ybXVsYSByYWplX2Nyb3NzcmVmIHJhamVfZm9vdG5vdGVzIHJhamVfbWV0YWRhdGEgcmFqZV9saXN0cyByYWplX3NhdmUgcmFqZV9hbm5vdGF0aW9ucyBzcGVsbGNoZWNrZXIgcGFzdGUgdGFibGUgbGlua1wiLFxuXG4gICAgICAvLyBSZW1vdmUgbWVudWJhclxuICAgICAgbWVudWJhcjogZmFsc2UsXG5cbiAgICAgIC8vIEN1c3RvbSB0b29sYmFyXG4gICAgICB0b29sYmFyOiAndW5kbyByZWRvIGJvbGQgaXRhbGljIGxpbmsgc3VwZXJzY3JpcHQgc3Vic2NyaXB0IHJhamVfaW5saW5lQ29kZSByYWplX2lubGluZVF1b3RlIHJhamVfaW5saW5lX2Zvcm11bGEgcmFqZV9jcm9zc3JlZiByYWplX2Zvb3Rub3RlcyB8IHJhamVfb2wgcmFqZV91bCByYWplX2NvZGVibG9jayByYWplX3F1b3RlYmxvY2sgcmFqZV90YWJsZSByYWplX2ltYWdlIHJhamVfbGlzdGluZyByYWplX2Zvcm11bGEgfCBzZWFyY2hyZXBsYWNlIHNwZWxsY2hlY2tlciB8IHJhamVfc2VjdGlvbiByYWplX21ldGFkYXRhIHJhamVfc2F2ZScsXG5cbiAgICAgIHNwZWxsY2hlY2tlcl9jYWxsYmFjazogZnVuY3Rpb24gKG1ldGhvZCwgdGV4dCwgc3VjY2VzcywgZmFpbHVyZSkge1xuICAgICAgICB0aW55bWNlLnV0aWwuSlNPTlJlcXVlc3Quc2VuZFJQQyh7XG4gICAgICAgICAgdXJsOiBcInNwZWxsY2hlY2tlci5waHBcIixcbiAgICAgICAgICBtZXRob2Q6IFwic3BlbGxjaGVja1wiLFxuICAgICAgICAgIHBhcmFtczoge1xuICAgICAgICAgICAgbGFuZzogdGhpcy5nZXRMYW5ndWFnZSgpLFxuICAgICAgICAgICAgd29yZHM6IHRleHQubWF0Y2godGhpcy5nZXRXb3JkQ2hhclBhdHRlcm4oKSlcbiAgICAgICAgICB9LFxuICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgIHN1Y2Nlc3MocmVzdWx0KTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIGVycm9yOiBmdW5jdGlvbiAoZXJyb3IsIHhocikge1xuICAgICAgICAgICAgZmFpbHVyZShcIlNwZWxsY2hlY2sgZXJyb3I6IFwiICsgZXJyb3IpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9LFxuXG4gICAgICBzcGVsbGNoZWNrZXJfbGFuZ3VhZ2VzOiAnJyxcblxuICAgICAgLy8gU2V0IGRlZmF1bHQgdGFyZ2V0XG4gICAgICBkZWZhdWx0X2xpbmtfdGFyZ2V0OiBcIl9ibGFua1wiLFxuXG4gICAgICAvLyBQcmVwZW5kIHByb3RvY29sIGlmIHRoZSBsaW5rIHN0YXJ0cyB3aXRoIHd3d1xuICAgICAgbGlua19hc3N1bWVfZXh0ZXJuYWxfdGFyZ2V0czogdHJ1ZSxcblxuICAgICAgLy8gSGlkZSB0YXJnZXQgbGlzdFxuICAgICAgdGFyZ2V0X2xpc3Q6IGZhbHNlLFxuXG4gICAgICAvLyBIaWRlIHRpdGxlXG4gICAgICBsaW5rX3RpdGxlOiBmYWxzZSxcblxuICAgICAgLy8gUmVtb3ZlIFwicG93ZXJlZCBieSB0aW55bWNlXCJcbiAgICAgIGJyYW5kaW5nOiBmYWxzZSxcblxuICAgICAgLy8gUHJldmVudCBhdXRvIGJyIG9uIGVsZW1lbnQgaW5zZXJ0XG4gICAgICBhcHBseV9zb3VyY2VfZm9ybWF0dGluZzogZmFsc2UsXG5cbiAgICAgIC8vIFByZXZlbnQgbm9uIGVkaXRhYmxlIG9iamVjdCByZXNpemVcbiAgICAgIG9iamVjdF9yZXNpemluZzogZmFsc2UsXG5cbiAgICAgIC8vIFVwZGF0ZSB0aGUgdGFibGUgcG9wb3ZlciBsYXlvdXRcbiAgICAgIHRhYmxlX3Rvb2xiYXI6IFwidGFibGVpbnNlcnRyb3diZWZvcmUgdGFibGVpbnNlcnRyb3dhZnRlciB0YWJsZWRlbGV0ZXJvdyB8IHRhYmxlaW5zZXJ0Y29sYmVmb3JlIHRhYmxlaW5zZXJ0Y29sYWZ0ZXIgdGFibGVkZWxldGVjb2xcIixcblxuICAgICAgaW1hZ2VfYWR2dGFiOiB0cnVlLFxuXG4gICAgICBwYXN0ZV9ibG9ja19kcm9wOiB0cnVlLFxuXG4gICAgICBleHRlbmRlZF92YWxpZF9lbGVtZW50czogXCJzdmdbKl0sZGVmc1sqXSxwYXR0ZXJuWypdLGRlc2NbKl0sbWV0YWRhdGFbKl0sZ1sqXSxtYXNrWypdLHBhdGhbKl0sbGluZVsqXSxtYXJrZXJbKl0scmVjdFsqXSxjaXJjbGVbKl0sZWxsaXBzZVsqXSxwb2x5Z29uWypdLHBvbHlsaW5lWypdLGxpbmVhckdyYWRpZW50WypdLHJhZGlhbEdyYWRpZW50WypdLHN0b3BbKl0saW1hZ2VbKl0sdmlld1sqXSx0ZXh0WypdLHRleHRQYXRoWypdLHRpdGxlWypdLHRzcGFuWypdLGdseXBoWypdLHN5bWJvbFsqXSxzd2l0Y2hbKl0sdXNlWypdXCIsXG5cbiAgICAgIGZvcm11bGE6IHtcbiAgICAgICAgcGF0aDogJ25vZGVfbW9kdWxlcy90aW55bWNlLWZvcm11bGEvJ1xuICAgICAgfSxcblxuICAgICAgY2xlYW51cF9vbl9zdGFydHVwOiBmYWxzZSxcbiAgICAgIHRyaW1fc3Bhbl9lbGVtZW50czogZmFsc2UsXG4gICAgICB2ZXJpZnlfaHRtbDogZmFsc2UsXG4gICAgICBjbGVhbnVwOiBmYWxzZSxcbiAgICAgIGNvbnZlcnRfdXJsczogZmFsc2UsXG5cbiAgICAgIC8vIFNldHVwIGZ1bGwgc2NyZWVuIG9uIGluaXRcbiAgICAgIHNldHVwOiBmdW5jdGlvbiAoZWRpdG9yKSB7XG5cbiAgICAgICAgbGV0IHBhc3RlQm9va21hcmtcblxuICAgICAgICAvKipcbiAgICAgICAgICogXG4gICAgICAgICAqL1xuICAgICAgICBlZGl0b3Iub24oJ2luaXQnLCBmdW5jdGlvbiAoZSkge1xuXG4gICAgICAgICAgZWRpdG9yLmV4ZWNDb21tYW5kKCdtY2VGdWxsU2NyZWVuJylcblxuICAgICAgICAgIC8vIE1vdmUgY2FyZXQgYXQgdGhlIGZpcnN0IGgxIGVsZW1lbnQgb2YgbWFpbiBzZWN0aW9uXG4gICAgICAgICAgLy8gT3IgcmlnaHQgYWZ0ZXIgaGVhZGluZ1xuICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZXRDdXJzb3JMb2NhdGlvbih0aW55bWNlLmFjdGl2ZUVkaXRvci5kb20uc2VsZWN0KEZJUlNUX0hFQURJTkcpWzBdLCAwKVxuICAgICAgICB9KVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBcbiAgICAgICAgICovXG4gICAgICAgIGVkaXRvci5vbigna2V5RG93bicsIGZ1bmN0aW9uIChlKSB7XG5cbiAgICAgICAgICAvLyBQcmV2ZW50IHNoaWZ0K2VudGVyXG4gICAgICAgICAgaWYgKGUua2V5Q29kZSA9PSAxMyAmJiBlLnNoaWZ0S2V5KVxuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG5cbiAgICAgICAgICBpZiAoZS5rZXlDb2RlID09IDg2ICYmIGUubWV0YUtleSkge1xuXG4gICAgICAgICAgICBpZiAoJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKS5pcygncHJlJykpIHtcblxuICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKVxuXG4gICAgICAgICAgICAgIHBhc3RlQm9va21hcmsgPSB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Qm9va21hcmsoKVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgICAgXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBcbiAgICAgICAgICovXG4gICAgICAgIGVkaXRvci5vbignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuXG4gICAgICAgICAgLy8gRG9uJ3QgY2FwdHVyZSB0aGUgY2xpY2sgb2YgdGhlIHNpZGViYXIgYW5ub3RhdGlvblxuICAgICAgICAgIGlmICghJChlLnNyY0VsZW1lbnQpLnBhcmVudHMoU0lERUJBUl9BTk5PVEFUSU9OKS5sZW5ndGgpXG5cbiAgICAgICAgICAgIC8vIENhcHR1cmUgdGhlIHRyaXBsZSBjbGljayBldmVudFxuICAgICAgICAgICAgaWYgKGUuZGV0YWlsID09IDMpIHtcblxuICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKVxuXG4gICAgICAgICAgICAgIGxldCB3cmFwcGVyID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Um5nKCkuc3RhcnRDb250YWluZXIpLnBhcmVudHMoJ3AsZmlnY2FwdGlvbiw6aGVhZGVyJykuZmlyc3QoKVxuICAgICAgICAgICAgICBsZXQgc3RhcnRDb250YWluZXIgPSB3cmFwcGVyWzBdXG4gICAgICAgICAgICAgIGxldCBlbmRDb250YWluZXIgPSB3cmFwcGVyWzBdXG4gICAgICAgICAgICAgIGxldCByYW5nZSA9IGRvY3VtZW50LmNyZWF0ZVJhbmdlKClcblxuICAgICAgICAgICAgICAvLyBDaGVjayBpZiB0aGUgd3JhcHBlciBoYXMgbW9yZSB0ZXh0IG5vZGUgaW5zaWRlXG4gICAgICAgICAgICAgIGlmICh3cmFwcGVyLmNvbnRlbnRzKCkubGVuZ3RoID4gMSkge1xuXG4gICAgICAgICAgICAgICAgLy8gSWYgdGhlIGZpcnN0IHRleHQgbm9kZSBpcyBhIG5vdCBlZGl0YWJsZSBzdHJvbmcsIHRoZSBzZWxlY3Rpb24gbXVzdCBzdGFydCB3aXRoIHRoZSBzZWNvbmQgZWxlbWVudFxuICAgICAgICAgICAgICAgIGlmICh3cmFwcGVyLmNvbnRlbnRzKCkuZmlyc3QoKS5pcygnc3Ryb25nW2NvbnRlbnRlZGl0YWJsZT1mYWxzZV0nKSlcbiAgICAgICAgICAgICAgICAgIHN0YXJ0Q29udGFpbmVyID0gd3JhcHBlci5jb250ZW50cygpWzFdXG5cbiAgICAgICAgICAgICAgICAvLyBJbiB0aGlzIGNhc2UgdGhlIGVuZENvbnRhaW5lciB3aWxsIGJlIHRoZSBsYXN0IHRleHQgbm9kZVxuICAgICAgICAgICAgICAgIGVuZENvbnRhaW5lciA9IHdyYXBwZXIuY29udGVudHMoKS5sYXN0KClbMF1cbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIHJhbmdlLnNldFN0YXJ0KHN0YXJ0Q29udGFpbmVyLCAwKVxuXG4gICAgICAgICAgICAgIGlmICh3cmFwcGVyLmlzKCdmaWdjYXB0aW9uJykpXG4gICAgICAgICAgICAgICAgcmFuZ2Uuc2V0RW5kKGVuZENvbnRhaW5lciwgZW5kQ29udGFpbmVyLmxlbmd0aClcblxuICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgcmFuZ2Uuc2V0RW5kKGVuZENvbnRhaW5lciwgMSlcblxuICAgICAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2V0Um5nKHJhbmdlKVxuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0pXG5cbiAgICAgICAgLy8gUHJldmVudCBzcGFuIFxuICAgICAgICBlZGl0b3Iub24oJ25vZGVDaGFuZ2UnLCBmdW5jdGlvbiAoZSkge1xuXG4gICAgICAgICAgbGV0IHNlbGVjdGVkRWxlbWVudCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcblxuICAgICAgICAgIC8vIE1vdmUgY2FyZXQgdG8gZmlyc3QgaGVhZGluZyBpZiBpcyBhZnRlciBvciBiZWZvcmUgbm90IGVkaXRhYmxlIGhlYWRlclxuICAgICAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQuaXMoJ3AnKSAmJiAoc2VsZWN0ZWRFbGVtZW50Lm5leHQoKS5pcyhIRUFERVJfU0VMRUNUT1IpIHx8IChzZWxlY3RlZEVsZW1lbnQucHJldigpLmlzKEhFQURFUl9TRUxFQ1RPUikgJiYgdGlueW1jZS5hY3RpdmVFZGl0b3IuZG9tLnNlbGVjdChGSVJTVF9IRUFESU5HKS5sZW5ndGgpKSlcbiAgICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZXRDdXJzb3JMb2NhdGlvbih0aW55bWNlLmFjdGl2ZUVkaXRvci5kb20uc2VsZWN0KEZJUlNUX0hFQURJTkcpWzBdLCAwKVxuXG4gICAgICAgICAgLy8gSWYgdGhlIGN1cnJlbnQgZWxlbWVudCBpc24ndCBpbnNpZGUgaGVhZGVyLCBvbmx5IGluIHNlY3Rpb24gdGhpcyBpcyBwZXJtaXR0ZWRcbiAgICAgICAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LnBhcmVudHMoJ3NlY3Rpb24nKS5sZW5ndGgpIHtcblxuICAgICAgICAgICAgLypcbiAgICAgICAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQuaXMoJ3NwYW4jX21jZV9jYXJldFtkYXRhLW1jZS1ib2d1c10nKSB8fCBzZWxlY3RlZEVsZW1lbnQucGFyZW50KCkuaXMoJ3NwYW4jX21jZV9jYXJldFtkYXRhLW1jZS1ib2d1c10nKSkge1xuXG4gICAgICAgICAgICAgIC8vIFJlbW92ZSBzcGFuIG5vcm1hbGx5IGNyZWF0ZWQgd2l0aCBib2xkXG4gICAgICAgICAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQucGFyZW50KCkuaXMoJ3NwYW4jX21jZV9jYXJldFtkYXRhLW1jZS1ib2d1c10nKSlcbiAgICAgICAgICAgICAgICBzZWxlY3RlZEVsZW1lbnQgPSBzZWxlY3RlZEVsZW1lbnQucGFyZW50KClcblxuICAgICAgICAgICAgICBsZXQgYm0gPSB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Qm9va21hcmsoKVxuICAgICAgICAgICAgICBzZWxlY3RlZEVsZW1lbnQucmVwbGFjZVdpdGgoc2VsZWN0ZWRFbGVtZW50Lmh0bWwoKSlcbiAgICAgICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLm1vdmVUb0Jvb2ttYXJrKGJtKVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgKi9cbiAgICAgICAgICB9XG4gICAgICAgICAgdXBkYXRlRG9jdW1lbnRTdGF0ZSgpXG4gICAgICAgIH0pXG5cbiAgICAgICAgLy8gVXBkYXRlIHNhdmVkIGNvbnRlbnQgb24gdW5kbyBhbmQgcmVkbyBldmVudHNcbiAgICAgICAgZWRpdG9yLm9uKCdVbmRvJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcbiAgICAgICAgfSlcblxuICAgICAgICBlZGl0b3Iub24oJ1JlZG8nLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuICAgICAgICB9KVxuXG4gICAgICAgIGVkaXRvci5vbignUGFzdGUnLCBmdW5jdGlvbiAoZSkge1xuXG4gICAgICAgICAgbGV0IHRhcmdldCA9ICQoZS50YXJnZXQpXG5cbiAgICAgICAgICAvLyBJZiB0aGUgcGFzdGUgZXZlbnQgaXMgY2FsbGVkIGluc2lkZSBhIGxpc3RpbmdcbiAgICAgICAgICBpZiAocGFzdGVCb29rbWFyayAmJiB0YXJnZXQucGFyZW50cygnZmlndXJlOmhhcyhwcmU6aGFzKGNvZGUpKScpLmxlbmd0aCkge1xuXG4gICAgICAgICAgICBsZXQgZGF0YSA9IGUuY2xpcGJvYXJkRGF0YS5nZXREYXRhKCdUZXh0JylcblxuICAgICAgICAgICAgLy8gUmVzdG9yZSB0aGUgc2VsZWN0aW9uIHNhdmVkIG9uIGNtZCt2XG4gICAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24ubW92ZVRvQm9va21hcmsocGFzdGVCb29rbWFyaylcblxuICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSBjb250ZW50XG4gICAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2V0Q29udGVudChlLmNsaXBib2FyZERhdGEuZ2V0RGF0YSgnVGV4dCcpKVxuXG4gICAgICAgICAgICBwYXN0ZUJvb2ttYXJrID0gbnVsbFxuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgIH0sXG4gICAgfSlcbiAgfSlcblxuICAvKipcbiAgICogT3BlbiBhbmQgY2xvc2UgdGhlIGhlYWRpbmdzIGRyb3Bkb3duXG4gICAqL1xuICAkKHdpbmRvdykubG9hZChmdW5jdGlvbiAoKSB7XG5cbiAgICAvLyBPcGVuIGFuZCBjbG9zZSBtZW51IGhlYWRpbmdzIE7DpGl2ZSB3YXlcbiAgICAkKGBkaXZbYXJpYS1sYWJlbD0naGVhZGluZyddYCkuZmluZCgnYnV0dG9uJykudHJpZ2dlcignY2xpY2snKVxuICAgICQoYGRpdlthcmlhLWxhYmVsPSdoZWFkaW5nJ11gKS5maW5kKCdidXR0b24nKS50cmlnZ2VyKCdjbGljaycpXG4gIH0pXG5cblxuICAvKipcbiAgICogVXBkYXRlIGNvbnRlbnQgaW4gdGhlIGlmcmFtZSwgd2l0aCB0aGUgb25lIHN0b3JlZCBieSB0aW55bWNlXG4gICAqIEFuZCBzYXZlL3Jlc3RvcmUgdGhlIHNlbGVjdGlvblxuICAgKi9cbiAgZnVuY3Rpb24gdXBkYXRlSWZyYW1lRnJvbVNhdmVkQ29udGVudCgpIHtcblxuICAgIC8vIFNhdmUgdGhlIGJvb2ttYXJrIFxuICAgIGxldCBib29rbWFyayA9IHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRCb29rbWFyaygyLCB0cnVlKVxuXG4gICAgLy8gVXBkYXRlIGlmcmFtZSBjb250ZW50XG4gICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2V0Q29udGVudCgkKCcjcmFqZV9yb290JykuaHRtbCgpKVxuXG4gICAgLy8gUmVzdG9yZSB0aGUgYm9va21hcmsgXG4gICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLm1vdmVUb0Jvb2ttYXJrKGJvb2ttYXJrKVxuICB9XG5cbiAgLyoqXG4gICAqIFxuICAgKi9cbiAgZnVuY3Rpb24gdXBkYXRlSWZyYW1lRnJvbVNhdmVkQ29udGVudFdpdGhvdXRVbmRvKCkge1xuXG4gICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIuaWdub3JlKGZ1bmN0aW9uICgpIHtcbiAgICAgIC8vIFNhdmUgdGhlIGJvb2ttYXJrIFxuICAgICAgbGV0IGJvb2ttYXJrID0gdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldEJvb2ttYXJrKDIsIHRydWUpXG5cbiAgICAgIC8vIFVwZGF0ZSBpZnJhbWUgY29udGVudFxuICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2V0Q29udGVudCgkKCcjcmFqZV9yb290JykuaHRtbCgpKVxuXG4gICAgICAvLyBSZXN0b3JlIHRoZSBib29rbWFyayBcbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5tb3ZlVG9Cb29rbWFyayhib29rbWFyaylcbiAgICB9KVxuICB9XG5cbiAgLyoqXG4gICAqIEFjY2VwdCBhIGpzIG9iamVjdCB0aGF0IGV4aXN0cyBpbiBmcmFtZVxuICAgKiBAcGFyYW0geyp9IGVsZW1lbnQgXG4gICAqL1xuICBmdW5jdGlvbiBtb3ZlQ2FyZXQoZWxlbWVudCwgdG9TdGFydCkge1xuICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZWxlY3QoZWxlbWVudCwgdHJ1ZSlcbiAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uY29sbGFwc2UodG9TdGFydClcblxuICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLmZvY3VzKClcbiAgfVxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGZ1bmN0aW9uIHNlbGVjdFJhbmdlKHN0YXJ0Q29udGFpbmVyLCBzdGFydE9mZnNldCwgZW5kQ29udGFpbmVyLCBlbmRPZmZzZXQpIHtcblxuICAgIGxldCByYW5nZSA9IGRvY3VtZW50LmNyZWF0ZVJhbmdlKClcbiAgICByYW5nZS5zZXRTdGFydChzdGFydENvbnRhaW5lciwgc3RhcnRPZmZzZXQpXG5cbiAgICAvLyBJZiB0aGVzZSBwcm9wZXJ0aWVzIGFyZSBub3QgaW4gdGhlIHNpZ25hdHVyZSB1c2UgdGhlIHN0YXJ0XG4gICAgaWYgKCFlbmRDb250YWluZXIgJiYgIWVuZE9mZnNldCkge1xuICAgICAgZW5kQ29udGFpbmVyID0gc3RhcnRDb250YWluZXJcbiAgICAgIGVuZE9mZnNldCA9IHN0YXJ0T2Zmc2V0XG4gICAgfVxuXG4gICAgcmFuZ2Uuc2V0RW5kKGVuZENvbnRhaW5lciwgZW5kT2Zmc2V0KVxuICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZXRSbmcocmFuZ2UpXG4gIH1cblxuICAvKipcbiAgICogXG4gICAqIEBwYXJhbSB7Kn0gZWxlbWVudCBcbiAgICovXG4gIGZ1bmN0aW9uIG1vdmVDdXJzb3JUb0VuZChlbGVtZW50KSB7XG5cbiAgICBsZXQgaGVhZGluZyA9IGVsZW1lbnRcbiAgICBsZXQgb2Zmc2V0ID0gMFxuXG4gICAgaWYgKGhlYWRpbmcuY29udGVudHMoKS5sZW5ndGgpIHtcblxuICAgICAgaGVhZGluZyA9IGhlYWRpbmcuY29udGVudHMoKS5sYXN0KClcblxuICAgICAgLy8gSWYgdGhlIGxhc3Qgbm9kZSBpcyBhIHN0cm9uZyxlbSxxIGV0Yy4gd2UgaGF2ZSB0byB0YWtlIGl0cyB0ZXh0IFxuICAgICAgaWYgKGhlYWRpbmdbMF0ubm9kZVR5cGUgIT0gMylcbiAgICAgICAgaGVhZGluZyA9IGhlYWRpbmcuY29udGVudHMoKS5sYXN0KClcblxuICAgICAgb2Zmc2V0ID0gaGVhZGluZ1swXS53aG9sZVRleHQubGVuZ3RoXG4gICAgfVxuXG4gICAgdGlueW1jZS5hY3RpdmVFZGl0b3IuZm9jdXMoKVxuICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZXRDdXJzb3JMb2NhdGlvbihoZWFkaW5nWzBdLCBvZmZzZXQpXG4gIH1cblxuICAvKipcbiAgICogXG4gICAqIEBwYXJhbSB7Kn0gZWxlbWVudCBcbiAgICovXG4gIGZ1bmN0aW9uIG1vdmVDdXJzb3JUb1N0YXJ0KGVsZW1lbnQpIHtcblxuICAgIGxldCBoZWFkaW5nID0gZWxlbWVudFxuICAgIGxldCBvZmZzZXQgPSAwXG5cbiAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5mb2N1cygpXG4gICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLnNldEN1cnNvckxvY2F0aW9uKGhlYWRpbmdbMF0sIG9mZnNldClcbiAgfVxuXG5cbiAgLyoqXG4gICAqIENyZWF0ZSBjdXN0b20gaW50byBub3RpZmljYXRpb25cbiAgICogQHBhcmFtIHsqfSB0ZXh0IFxuICAgKiBAcGFyYW0geyp9IHRpbWVvdXQgXG4gICAqL1xuICBmdW5jdGlvbiBub3RpZnkodGV4dCwgdHlwZSwgdGltZW91dCkge1xuXG4gICAgaWYgKHRpbnltY2UuYWN0aXZlRWRpdG9yLm5vdGlmaWNhdGlvbk1hbmFnZXIuZ2V0Tm90aWZpY2F0aW9ucygpLmxlbmd0aClcbiAgICAgIHRvcC50aW55bWNlLmFjdGl2ZUVkaXRvci5ub3RpZmljYXRpb25NYW5hZ2VyLmNsb3NlKClcblxuICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLm5vdGlmaWNhdGlvbk1hbmFnZXIub3Blbih7XG4gICAgICB0ZXh0OiB0ZXh0LFxuICAgICAgdHlwZTogdHlwZSA/IHR5cGUgOiAnaW5mbycsXG4gICAgICB0aW1lb3V0OiAzMDAwXG4gICAgfSlcbiAgfVxuXG4gIC8qKlxuICAgKiBcbiAgICogQHBhcmFtIHsqfSBlbGVtZW50U2VsZWN0b3IgXG4gICAqL1xuICBmdW5jdGlvbiBzY3JvbGxUbyhlbGVtZW50U2VsZWN0b3IpIHtcbiAgICAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLmdldEJvZHkoKSkuZmluZChlbGVtZW50U2VsZWN0b3IpLmdldCgwKS5zY3JvbGxJbnRvVmlldygpO1xuICB9XG5cbiAgLyoqXG4gICAqIFxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0U3VjY2Vzc2l2ZUVsZW1lbnRJZChlbGVtZW50U2VsZWN0b3IsIFNVRkZJWCkge1xuXG4gICAgbGV0IGxhc3RJZCA9IDBcblxuICAgICQoZWxlbWVudFNlbGVjdG9yKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgIGxldCBjdXJyZW50SWQgPSBwYXJzZUludCgkKHRoaXMpLmF0dHIoJ2lkJykucmVwbGFjZShTVUZGSVgsICcnKSlcbiAgICAgIGxhc3RJZCA9IGN1cnJlbnRJZCA+IGxhc3RJZCA/IGN1cnJlbnRJZCA6IGxhc3RJZFxuICAgIH0pXG5cbiAgICByZXR1cm4gYCR7U1VGRklYfSR7bGFzdElkKzF9YFxuICB9XG5cbiAgLyoqXG4gICAqIFxuICAgKi9cbiAgZnVuY3Rpb24gaGVhZGluZ0RpbWVuc2lvbigpIHtcbiAgICAkKCdoMSxoMixoMyxoNCxoNSxoNicpLmVhY2goZnVuY3Rpb24gKCkge1xuXG4gICAgICBpZiAoISQodGhpcykucGFyZW50cyhIRUFERVJfU0VMRUNUT1IpLmxlbmd0aCkge1xuICAgICAgICB2YXIgY291bnRlciA9IDA7XG4gICAgICAgICQodGhpcykucGFyZW50cyhcInNlY3Rpb25cIikuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgaWYgKCQodGhpcykuY2hpbGRyZW4oXCJoMSxoMixoMyxoNCxoNSxoNlwiKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb3VudGVyKys7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgJCh0aGlzKS5yZXBsYWNlV2l0aChcIjxoXCIgKyBjb3VudGVyICsgXCIgZGF0YS1yYXNoLW9yaWdpbmFsLXdyYXBwZXI9XFxcImgxXFxcIiA+XCIgKyAkKHRoaXMpLmh0bWwoKSArIFwiPC9oXCIgKyBjb3VudGVyICsgXCI+XCIpXG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogXG4gICAqL1xuICBmdW5jdGlvbiBjaGVja0lmUHJpbnRhYmxlQ2hhcihrZXljb2RlKSB7XG5cbiAgICByZXR1cm4gKGtleWNvZGUgPiA0NyAmJiBrZXljb2RlIDwgNTgpIHx8IC8vIG51bWJlciBrZXlzXG4gICAgICAoa2V5Y29kZSA9PSAzMiB8fCBrZXljb2RlID09IDEzKSB8fCAvLyBzcGFjZWJhciAmIHJldHVybiBrZXkocykgKGlmIHlvdSB3YW50IHRvIGFsbG93IGNhcnJpYWdlIHJldHVybnMpXG4gICAgICAoa2V5Y29kZSA+IDY0ICYmIGtleWNvZGUgPCA5MSkgfHwgLy8gbGV0dGVyIGtleXNcbiAgICAgIChrZXljb2RlID4gOTUgJiYga2V5Y29kZSA8IDExMikgfHwgLy8gbnVtcGFkIGtleXNcbiAgICAgIChrZXljb2RlID4gMTg1ICYmIGtleWNvZGUgPCAxOTMpIHx8IC8vIDs9LC0uL2AgKGluIG9yZGVyKVxuICAgICAgKGtleWNvZGUgPiAyMTggJiYga2V5Y29kZSA8IDIyMyk7IC8vIFtcXF0nIChpbiBvcmRlcilcbiAgfVxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGZ1bmN0aW9uIGNoZWNrSWZTcGVjaWFsQ2hhcihrZXljb2RlKSB7XG5cbiAgICByZXR1cm4gKGtleWNvZGUgPiA0NyAmJiBrZXljb2RlIDwgNTgpIHx8IC8vIG51bWJlciBrZXlzXG4gICAgICAoa2V5Y29kZSA+IDk1ICYmIGtleWNvZGUgPCAxMTIpIHx8IC8vIG51bXBhZCBrZXlzXG4gICAgICAoa2V5Y29kZSA+IDE4NSAmJiBrZXljb2RlIDwgMTkzKSB8fCAvLyA7PSwtLi9gIChpbiBvcmRlcilcbiAgICAgIChrZXljb2RlID4gMjE4ICYmIGtleWNvZGUgPCAyMjMpXG4gIH1cblxuICAvKipcbiAgICogXG4gICAqL1xuICBmdW5jdGlvbiBtYXJrVGlueU1DRSgpIHtcbiAgICAkKCdkaXZbaWRePW1jZXVfXScpLmF0dHIoJ2RhdGEtcmFzaC1vcmlnaW5hbC1jb250ZW50JywgJycpXG4gIH1cblxuICAvKipcbiAgICogXG4gICAqL1xuICBmdW5jdGlvbiBzZXROb25FZGl0YWJsZUhlYWRlcigpIHtcbiAgICAkKEhFQURFUl9TRUxFQ1RPUikuYWRkQ2xhc3MoJ21jZU5vbkVkaXRhYmxlJylcbiAgICAkKFNJREVCQVJfQU5OT1RBVElPTikuYWRkQ2xhc3MoJ21jZU5vbkVkaXRhYmxlJylcbiAgfVxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGZ1bmN0aW9uIGNoZWNrSWZBcHAoKSB7XG4gICAgcmV0dXJuIGlwY1JlbmRlcmVyLnNlbmRTeW5jKCdpc0FwcFN5bmMnKVxuICB9XG5cbiAgLyoqXG4gICAqIFxuICAgKi9cbiAgZnVuY3Rpb24gc2VsZWN0SW1hZ2UoKSB7XG4gICAgcmV0dXJuIGlwY1JlbmRlcmVyLnNlbmRTeW5jKCdzZWxlY3RJbWFnZVN5bmMnKVxuICB9XG5cbiAgLyoqXG4gICAqIFNlbmQgYSBtZXNzYWdlIHRvIHRoZSBiYWNrZW5kLCBub3RpZnkgdGhlIHN0cnVjdHVyYWwgY2hhbmdlXG4gICAqIFxuICAgKiBJZiB0aGUgZG9jdW1lbnQgaXMgZHJhZnQgc3RhdGUgPSB0cnVlXG4gICAqIElmIHRoZSBkb2N1bWVudCBpcyBzYXZlZCBzdGF0ZSA9IGZhbHNlXG4gICAqL1xuICBmdW5jdGlvbiB1cGRhdGVEb2N1bWVudFN0YXRlKCkge1xuXG4gICAgLy8gR2V0IHRoZSBJZnJhbWUgY29udGVudCBub3QgaW4geG1sIFxuICAgIGxldCBKcXVlcnlJZnJhbWUgPSAkKGA8ZGl2PiR7dGlueW1jZS5hY3RpdmVFZGl0b3IuZ2V0Q29udGVudCgpfTwvZGl2PmApXG4gICAgbGV0IEpxdWVyeVNhdmVkQ29udGVudCA9ICQoYCNyYWplX3Jvb3RgKVxuXG4gICAgLy8gVHJ1ZSBpZiB0aGV5J3JlIGRpZmZlcmVudCwgRmFsc2UgaXMgdGhleSdyZSBlcXVhbFxuICAgIGlwY1JlbmRlcmVyLnNlbmQoJ3VwZGF0ZURvY3VtZW50U3RhdGUnLCBKcXVlcnlJZnJhbWUuaHRtbCgpICE9IEpxdWVyeVNhdmVkQ29udGVudC5odG1sKCkpXG4gIH1cblxuICAvKipcbiAgICogXG4gICAqL1xuICBmdW5jdGlvbiBzYXZlQXNBcnRpY2xlKG9wdGlvbnMpIHtcbiAgICByZXR1cm4gaXBjUmVuZGVyZXIuc2VuZCgnc2F2ZUFzQXJ0aWNsZScsIG9wdGlvbnMpXG4gIH1cblxuICAvKipcbiAgICogXG4gICAqL1xuICBmdW5jdGlvbiBzYXZlQXJ0aWNsZShvcHRpb25zKSB7XG4gICAgcmV0dXJuIGlwY1JlbmRlcmVyLnNlbmQoJ3NhdmVBcnRpY2xlJywgb3B0aW9ucylcbiAgfVxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGZ1bmN0aW9uIG1hdGhtbDJzdmdBbGxGb3JtdWxhcygpIHtcblxuICAgIC8vIEZvciBlYWNoIGZpZ3VyZSBmb3JtdWxhXG4gICAgJCgnZmlndXJlW2lkXj1cImZvcm11bGFfXCJdJykuZWFjaChmdW5jdGlvbiAoKSB7XG5cbiAgICAgIC8vIEdldCB0aGUgaWRcbiAgICAgIGxldCBpZCA9ICQodGhpcykuYXR0cignaWQnKVxuICAgICAgbGV0IGFzY2lpTWF0aCA9ICQodGhpcykuYXR0cihEQVRBX01BVEhfT1JJR0lOQUxfSU5QVVQpXG4gICAgICAkKHRoaXMpLnJlbW92ZUF0dHIoREFUQV9NQVRIX09SSUdJTkFMX0lOUFVUKVxuXG4gICAgICBNYXRoSmF4Lkh1Yi5RdWV1ZShcblxuICAgICAgICAvLyBQcm9jZXNzIHRoZSBmb3JtdWxhIGJ5IGlkXG4gICAgICAgIFtcIlR5cGVzZXRcIiwgTWF0aEpheC5IdWIsIGlkXSxcbiAgICAgICAgZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgLy8gR2V0IHRoZSBlbGVtZW50LCBzdmcgYW5kIG1hdGhtbCBjb250ZW50XG4gICAgICAgICAgbGV0IGZpZ3VyZUZvcm11bGEgPSAkKGAjJHtpZH1gKVxuICAgICAgICAgIGxldCBzdmdDb250ZW50ID0gZmlndXJlRm9ybXVsYS5maW5kKCdzdmcnKVxuICAgICAgICAgIGxldCBtbWxDb250ZW50ID0gZmlndXJlRm9ybXVsYS5maW5kKCdzY3JpcHRbdHlwZT1cIm1hdGgvbW1sXCJdJykuaHRtbCgpXG5cbiAgICAgICAgICAvLyBBZGQgdGhlIHJvbGVcbiAgICAgICAgICBzdmdDb250ZW50LmF0dHIoJ3JvbGUnLCAnbWF0aCcpXG4gICAgICAgICAgc3ZnQ29udGVudC5hdHRyKCdkYXRhLW1hdGhtbCcsIG1tbENvbnRlbnQpXG5cbiAgICAgICAgICAvLyBBZGQgdGhlIGFzY2lpbWF0aCBpbnB1dCBpZiBleGlzdHNcbiAgICAgICAgICBpZiAodHlwZW9mIGFzY2lpTWF0aCAhPSAndW5kZWZpbmVkJylcbiAgICAgICAgICAgIHN2Z0NvbnRlbnQuYXR0cihEQVRBX01BVEhfT1JJR0lOQUxfSU5QVVQsIGFzY2lpTWF0aClcblxuICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgZmlndXJlIGNvbnRlbnQgYW5kIGl0cyBjYXB0aW9uXG4gICAgICAgICAgZmlndXJlRm9ybXVsYS5odG1sKGA8cD48c3Bhbj4ke3N2Z0NvbnRlbnRbMF0ub3V0ZXJIVE1MfTwvc3Bhbj48L3A+YClcbiAgICAgICAgICBjYXB0aW9ucygpXG5cbiAgICAgICAgICBmb3JtdWxhLnVwZGF0ZVN0cnVjdHVyZShmaWd1cmVGb3JtdWxhKVxuXG4gICAgICAgICAgLy8gVXBkYXRlIHRoZSBjb250ZW50IGFuZCBjbGVhciB0aGUgd2hvbGUgdW5kbyBsZXZlbHMgc2V0XG4gICAgICAgICAgdXBkYXRlSWZyYW1lRnJvbVNhdmVkQ29udGVudCgpXG4gICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIuY2xlYXIoKVxuICAgICAgICB9XG4gICAgICApXG4gICAgfSlcbiAgfVxuXG4gIC8qKiAqL1xuICBzZWxlY3Rpb25Db250ZW50ID0ge1xuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgY29udGFpbnNCaWJsaW9ncmFwaHk6IGZ1bmN0aW9uIChzZWxlY3Rpb24pIHtcblxuICAgICAgbGV0IHJuZyA9IHNlbGVjdGlvbi5nZXRSbmcoKVxuXG4gICAgICAvLyBTYXZlIHRoZSBzdGFydGluZyBlbGVtZW50XG4gICAgICBsZXQgc3RhcnQgPSBybmcuc3RhcnRDb250YWluZXJcbiAgICAgIGxldCBzdGFydE5vZGUgPSAkKHN0YXJ0Lm5vZGVUeXBlID09IDMgPyBzdGFydC5wYXJlbnROb2RlIDogc3RhcnQpXG5cbiAgICAgIC8vIFNhdmUgdGhlIGVuZGluZyBlbGVtZW50XG4gICAgICBsZXQgZW5kID0gcm5nLmVuZENvbnRhaW5lclxuICAgICAgbGV0IGVuZE5vZGUgPSAkKGVuZC5ub2RlVHlwZSA9PSAzID8gZW5kLnBhcmVudE5vZGUgOiBlbmQpXG5cbiAgICAgIC8vIENvbnRyb2xzIGlmIHRoZSBzZWxlY3Rpb24gaGFzIHRoZSBiaWJsaW9ncmFwaHkgaW5zaWRlXG4gICAgICByZXR1cm4gKCQocm5nLmNvbW1vbkFuY2VzdG9yQ29udGFpbmVyKS5maW5kKEJJQkxJT0dSQVBIWV9TRUxFQ1RPUikubGVuZ3RoICYmXG4gICAgICAgICAgKCFzdGFydE5vZGUuaXMoYCR7QklCTElPR1JBUEhZX1NFTEVDVE9SfSA+IGgxYCkgfHxcbiAgICAgICAgICAgICFlbmROb2RlLmlzKGAke0JJQkxJT0dSQVBIWV9TRUxFQ1RPUn0gPiBoMWApKSkgfHxcblxuICAgICAgICAvLyBPciBpZiB0aGUgc2VsZWN0aW9uIGlzIHRoZSBiaWJsaW9ncmFwaHlcbiAgICAgICAgKCQocm5nLmNvbW1vbkFuY2VzdG9yQ29udGFpbmVyKS5pcyhCSUJMSU9HUkFQSFlfU0VMRUNUT1IpICYmXG4gICAgICAgICAgKHN0YXJ0Tm9kZS5pcygnaDEnKSAmJiBybmcuc3RhcnRPZmZzZXQgPT0gMCkgJiZcbiAgICAgICAgICAoZW5kTm9kZS5pcygncCcpICYmIHJuZy5lbmRPZmZzZXQgPT0gZW5kLmxlbmd0aCkpXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIGlzQXRCZWdpbm5pbmdPZkVtcHR5QmlibGlvZW50cnk6IGZ1bmN0aW9uIChzZWxlY3Rpb24pIHtcblxuICAgICAgbGV0IHJuZyA9IHNlbGVjdGlvbi5nZXRSbmcoKVxuXG4gICAgICAvLyBTYXZlIHRoZSBzdGFydGluZyBlbGVtZW50XG4gICAgICBsZXQgc3RhcnQgPSBybmcuc3RhcnRDb250YWluZXJcbiAgICAgIGxldCBzdGFydE5vZGUgPSAkKHN0YXJ0Lm5vZGVUeXBlID09IDMgPyBzdGFydC5wYXJlbnROb2RlIDogc3RhcnQpXG5cbiAgICAgIC8vIFNhdmUgdGhlIGVuZGluZyBlbGVtZW50XG4gICAgICBsZXQgZW5kID0gcm5nLmVuZENvbnRhaW5lclxuICAgICAgbGV0IGVuZE5vZGUgPSAkKGVuZC5ub2RlVHlwZSA9PSAzID8gZW5kLnBhcmVudE5vZGUgOiBlbmQpXG5cbiAgICAgIHJldHVybiAocm5nLmNvbW1vbkFuY2VzdG9yQ29udGFpbmVyLm5vZGVUeXBlID09IDMgfHwgJChybmcuY29tbW9uQW5jZXN0b3JDb250YWluZXIpLmlzKGAke0JJQkxJT0VOVFJZX1NFTEVDVE9SfSA+IHBgKSkgJiZcbiAgICAgICAgKHN0YXJ0Tm9kZS5pcyhlbmROb2RlKSAmJiBzdGFydE5vZGUuaXMoYCR7QklCTElPRU5UUllfU0VMRUNUT1J9ID4gcGApKSAmJlxuICAgICAgICAocm5nLnN0YXJ0T2Zmc2V0ID09IHJuZy5lbmRPZmZzZXQgJiYgcm5nLnN0YXJ0T2Zmc2V0ID09IDApXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIGlzQXRCZWdpbm5pbmdPZkVtcHR5RW5kbm90ZTogZnVuY3Rpb24gKHNlbGVjdGlvbikge1xuXG4gICAgICBsZXQgcm5nID0gc2VsZWN0aW9uLmdldFJuZygpXG5cbiAgICAgIC8vIFNhdmUgdGhlIHN0YXJ0aW5nIGVsZW1lbnRcbiAgICAgIGxldCBzdGFydCA9IHJuZy5zdGFydENvbnRhaW5lclxuICAgICAgbGV0IHN0YXJ0Tm9kZSA9ICQoc3RhcnQubm9kZVR5cGUgPT0gMyA/IHN0YXJ0LnBhcmVudE5vZGUgOiBzdGFydClcblxuICAgICAgLy8gU2F2ZSB0aGUgZW5kaW5nIGVsZW1lbnRcbiAgICAgIGxldCBlbmQgPSBybmcuZW5kQ29udGFpbmVyXG4gICAgICBsZXQgZW5kTm9kZSA9ICQoZW5kLm5vZGVUeXBlID09IDMgPyBlbmQucGFyZW50Tm9kZSA6IGVuZClcblxuICAgICAgcmV0dXJuICgkKHJuZy5jb21tb25BbmNlc3RvckNvbnRhaW5lcikucGFyZW50KCkuaXMoRU5ETk9URV9TRUxFQ1RPUikgJiYgc3RhcnROb2RlLmlzKGVuZE5vZGUpICYmIHN0YXJ0Tm9kZS5pcyhgJHtFTkROT1RFX1NFTEVDVE9SfSA+IHA6Zmlyc3QtY2hpbGRgKSkgJiZcbiAgICAgICAgKChybmcuc3RhcnRPZmZzZXQgPT0gcm5nLmVuZE9mZnNldCAmJiBybmcuc3RhcnRPZmZzZXQgPT0gMCkgfHwgKC9cXHJ8XFxuLy5leGVjKHN0YXJ0LmlubmVyVGV4dCkgIT0gbnVsbCkpXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIGNvbnRhaW5zQmlibGlvZW50cmllczogZnVuY3Rpb24gKHNlbGVjdGlvbikge1xuXG4gICAgICBsZXQgcm5nID0gc2VsZWN0aW9uLmdldFJuZygpXG5cbiAgICAgIC8vIFNhdmUgdGhlIHN0YXJ0aW5nIGVsZW1lbnRcbiAgICAgIGxldCBzdGFydCA9IHJuZy5zdGFydENvbnRhaW5lclxuICAgICAgbGV0IHN0YXJ0Tm9kZSA9ICQoc3RhcnQubm9kZVR5cGUgPT0gMyA/IHN0YXJ0LnBhcmVudE5vZGUgOiBzdGFydClcblxuICAgICAgLy8gU2F2ZSB0aGUgZW5kaW5nIGVsZW1lbnRcbiAgICAgIGxldCBlbmQgPSBybmcuZW5kQ29udGFpbmVyXG4gICAgICBsZXQgZW5kTm9kZSA9ICQoZW5kLm5vZGVUeXBlID09IDMgPyBlbmQucGFyZW50Tm9kZSA6IGVuZClcblxuICAgICAgLy8gQ2hlY2sgaWYgdGhlIHNlbGVjdGlvbiBjb250YWlucyBtb3JlIHRoYW4gb25lIGJpYmxpb2VudHJ5XG4gICAgICByZXR1cm4gKCQocm5nLmNvbW1vbkFuY2VzdG9yQ29udGFpbmVyKS5pcyhgJHtCSUJMSU9HUkFQSFlfU0VMRUNUT1J9ID4gdWxgKSB8fCAkKHJuZy5jb21tb25BbmNlc3RvckNvbnRhaW5lcikuaXMoQklCTElPR1JBUEhZX1NFTEVDVE9SKSkgJiZcbiAgICAgICAgKEJvb2xlYW4oc3RhcnROb2RlLnBhcmVudChCSUJMSU9FTlRSWV9TRUxFQ1RPUikubGVuZ3RoKSB8fCBzdGFydE5vZGUuaXMoJ2gxJykpICYmXG4gICAgICAgIEJvb2xlYW4oZW5kTm9kZS5wYXJlbnRzKEJJQkxJT0VOVFJZX1NFTEVDVE9SKS5sZW5ndGgpXG4gICAgfSxcbiAgfVxuXG4gIC8qKlxuICAgKiBTdGFydCB0aGUgc2F2ZSBhcyBwcm9jZXNzIGdldHRpbmcgdGhlIGRhdGEgYW5kIHNlbmRpbmcgaXRcbiAgICogdG8gdGhlIG1haW4gcHJvY2Vzc1xuICAgKi9cbiAgaXBjUmVuZGVyZXIub24oJ2V4ZWN1dGVTYXZlQXMnLCAoZXZlbnQsIGRhdGEpID0+IHtcbiAgICBzYXZlTWFuYWdlci5zYXZlQXMoKVxuICB9KVxuXG4gIC8qKlxuICAgKiBTdGFydCB0aGUgc2F2ZSBwcm9jZXNzIGdldHRpbmcgdGhlIGRhdGEgYW5kIHNlbmRpbmcgaXRcbiAgICogdG8gdGhlIG1haW4gcHJvY2Vzc1xuICAgKi9cbiAgaXBjUmVuZGVyZXIub24oJ2V4ZWN1dGVTYXZlJywgKGV2ZW50LCBkYXRhKSA9PiB7XG4gICAgc2F2ZU1hbmFnZXIuc2F2ZSgpXG4gIH0pXG5cbiAgLyoqXG4gICAqIFxuICAgKi9cbiAgaXBjUmVuZGVyZXIub24oJ25vdGlmeScsIChldmVudCwgZGF0YSkgPT4ge1xuICAgIG5vdGlmeShkYXRhLnRleHQsIGRhdGEudHlwZSwgZGF0YS50aW1lb3V0KVxuICB9KVxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGlwY1JlbmRlcmVyLm9uKCd1cGRhdGVDb250ZW50JywgKGV2ZW50LCBkYXRhKSA9PiB7XG4gICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG4gIH0pXG5cbiAgY3Vyc29yID0ge1xuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgaXNJbnNpZGVIZWFkaW5nOiBmdW5jdGlvbiAoc2VsZWN0aW9uKSB7XG5cbiAgICAgIGxldCBybmcgPSBzZWxlY3Rpb24uZ2V0Um5nKClcblxuICAgICAgLy8gU2F2ZSB0aGUgc3RhcnRpbmcgZWxlbWVudFxuICAgICAgbGV0IHN0YXJ0ID0gcm5nLnN0YXJ0Q29udGFpbmVyXG4gICAgICBsZXQgc3RhcnROb2RlID0gJChzdGFydC5ub2RlVHlwZSA9PSAzID8gc3RhcnQucGFyZW50Tm9kZSA6IHN0YXJ0KVxuXG4gICAgICAvLyBTYXZlIHRoZSBlbmRpbmcgZWxlbWVudFxuICAgICAgbGV0IGVuZCA9IHJuZy5lbmRDb250YWluZXJcbiAgICAgIGxldCBlbmROb2RlID0gJChlbmQubm9kZVR5cGUgPT0gMyA/IGVuZC5wYXJlbnROb2RlIDogZW5kKVxuXG4gICAgICAvLyBDaGVjayBpZiB0aGUgc2VsZWN0aW9uIGNvbnRhaW5zIG1vcmUgdGhhbiBvbmUgYmlibGlvZW50cnlcbiAgICAgIHJldHVybiAkKHJuZy5jb21tb25BbmNlc3RvckNvbnRhaW5lcikuaXMoJzpoZWFkZXInKSAmJlxuICAgICAgICAkKHJuZy5jb21tb25BbmNlc3RvckNvbnRhaW5lcikudGV4dCgpLnRyaW0oKS5sZW5ndGggIT0gcm5nLnN0YXJ0T2Zmc2V0XG4gICAgfSxcblxuICAgIGlzSW5zaWRlVGFibGU6IGZ1bmN0aW9uIChzZWxlY3Rpb24pIHtcblxuICAgICAgbGV0IHJuZyA9IHNlbGVjdGlvbi5nZXRSbmcoKVxuXG4gICAgICAvLyBTYXZlIHRoZSBzdGFydGluZyBlbGVtZW50XG4gICAgICBsZXQgc3RhcnQgPSBybmcuc3RhcnRDb250YWluZXJcbiAgICAgIGxldCBzdGFydE5vZGUgPSAkKHN0YXJ0Lm5vZGVUeXBlID09IDMgPyBzdGFydC5wYXJlbnROb2RlIDogc3RhcnQpXG5cbiAgICAgIC8vIFNhdmUgdGhlIGVuZGluZyBlbGVtZW50XG4gICAgICBsZXQgZW5kID0gcm5nLmVuZENvbnRhaW5lclxuICAgICAgbGV0IGVuZE5vZGUgPSAkKGVuZC5ub2RlVHlwZSA9PSAzID8gZW5kLnBhcmVudE5vZGUgOiBlbmQpXG5cbiAgICAgIC8vIENoZWNrIGlmIHRoZSBzZWxlY3Rpb24gY29udGFpbnMgbW9yZSB0aGFuIG9uZSBiaWJsaW9lbnRyeVxuICAgICAgcmV0dXJuICgkKHJuZy5jb21tb25BbmNlc3RvckNvbnRhaW5lcikuaXMoRklHVVJFX1RBQkxFX1NFTEVDVE9SKSB8fCAkKHJuZy5jb21tb25BbmNlc3RvckNvbnRhaW5lcikucGFyZW50cyhGSUdVUkVfVEFCTEVfU0VMRUNUT1IpLmxlbmd0aCkgJiZcbiAgICAgICAgJChybmcuY29tbW9uQW5jZXN0b3JDb250YWluZXIpLnRleHQoKS50cmltKCkubGVuZ3RoICE9IHJuZy5zdGFydE9mZnNldFxuICAgIH1cbiAgfVxufSIsImNvbnN0IE5PTl9FRElUQUJMRV9IRUFERVJfU0VMRUNUT1IgPSAnaGVhZGVyLnBhZ2UtaGVhZGVyLmNvbnRhaW5lci5jZ2VuJ1xuY29uc3QgQklCTElPRU5UUllfU1VGRklYID0gJ2JpYmxpb2VudHJ5XydcbmNvbnN0IEVORE5PVEVfU1VGRklYID0gJ2VuZG5vdGVfJ1xuXG5jb25zdCBCSUJMSU9HUkFQSFlfU0VMRUNUT1IgPSAnc2VjdGlvbltyb2xlPWRvYy1iaWJsaW9ncmFwaHldJ1xuY29uc3QgQklCTElPRU5UUllfU0VMRUNUT1IgPSAnbGlbcm9sZT1kb2MtYmlibGlvZW50cnldJ1xuXG5jb25zdCBFTkROT1RFU19TRUxFQ1RPUiA9ICdzZWN0aW9uW3JvbGU9ZG9jLWVuZG5vdGVzXSdcbmNvbnN0IEVORE5PVEVfU0VMRUNUT1IgPSAnc2VjdGlvbltyb2xlPWRvYy1lbmRub3RlXSdcblxuY29uc3QgQUJTVFJBQ1RfU0VMRUNUT1IgPSAnc2VjdGlvbltyb2xlPWRvYy1hYnN0cmFjdF0nXG5jb25zdCBBQ0tOT1dMRURHRU1FTlRTX1NFTEVDVE9SID0gJ3NlY3Rpb25bcm9sZT1kb2MtYWNrbm93bGVkZ2VtZW50c10nXG5cbmNvbnN0IE1BSU5fU0VDVElPTl9TRUxFQ1RPUiA9ICdkaXYjcmFqZV9yb290ID4gc2VjdGlvbjpub3QoW3JvbGVdKSdcbmNvbnN0IFNFQ1RJT05fU0VMRUNUT1IgPSAnc2VjdGlvbjpub3QoW3JvbGVdKSdcbmNvbnN0IFNQRUNJQUxfU0VDVElPTl9TRUxFQ1RPUiA9ICdzZWN0aW9uW3JvbGVdJ1xuXG5jb25zdCBNRU5VX1NFTEVDVE9SID0gJ2RpdltpZF49bWNldV9dW2lkJD0tYm9keV1bcm9sZT1tZW51XSdcblxuY29uc3QgREFUQV9VUEdSQURFID0gJ2RhdGEtdXBncmFkZSdcbmNvbnN0IERBVEFfRE9XTkdSQURFID0gJ2RhdGEtZG93bmdyYWRlJ1xuXG5jb25zdCBIRUFESU5HID0gJ0hlYWRpbmcgJ1xuXG5jb25zdCBIRUFESU5HX1RSQVNGT1JNQVRJT05fRk9SQklEREVOID0gJ0Vycm9yLCB5b3UgY2Fubm90IHRyYW5zZm9ybSB0aGUgY3VycmVudCBoZWFkZXIgaW4gdGhpcyB3YXkhJ1xuXG5jb25zdCBESVNBQkxFX1NFTEVDVE9SX0ZJR1VSRVMgPSAnZmlndXJlICosIGgxLCBoMiwgaDMsIGg0LCBoNSwgaDYsJyArIEJJQkxJT0dSQVBIWV9TRUxFQ1RPUlxuXG5jb25zdCBGSUdVUkVfU0VMRUNUT1IgPSAnZmlndXJlW2lkXSdcblxuY29uc3QgRklHVVJFX1RBQkxFX1NFTEVDVE9SID0gYCR7RklHVVJFX1NFTEVDVE9SfTpoYXModGFibGUpYFxuY29uc3QgVEFCTEVfU1VGRklYID0gJ3RhYmxlXydcblxuY29uc3QgRklHVVJFX0lNQUdFX1NFTEVDVE9SID0gYCR7RklHVVJFX1NFTEVDVE9SfTpoYXMoaW1nOm5vdChbcm9sZT1tYXRoXSkpYFxuY29uc3QgSU1BR0VfU1VGRklYID0gJ2ltZ18nXG5cbmNvbnN0IEZJR1VSRV9GT1JNVUxBX1NFTEVDVE9SID0gYCR7RklHVVJFX1NFTEVDVE9SfTpoYXMoc3ZnW3JvbGU9bWF0aF0pYFxuY29uc3QgSU5MSU5FX0ZPUk1VTEFfU0VMRUNUT1IgPSBgc3BhbjpoYXMoc3ZnW3JvbGU9bWF0aF0pYFxuY29uc3QgRk9STVVMQV9TVUZGSVggPSAnZm9ybXVsYV8nXG5cbmNvbnN0IEZJR1VSRV9MSVNUSU5HX1NFTEVDVE9SID0gYCR7RklHVVJFX1NFTEVDVE9SfTpoYXMocHJlOmhhcyhjb2RlKSlgXG5jb25zdCBMSVNUSU5HX1NVRkZJWCA9ICdsaXN0aW5nXydcblxuY29uc3QgRElTQUJMRV9TRUxFQ1RPUl9JTkxJTkUgPSAndGFibGUsIGltZywgcHJlLCBjb2RlJ1xuXG5jb25zdCBTSURFQkFSX0FOTk9UQVRJT04gPSAnYXNpZGUjYW5ub3RhdGlvbnMnXG5cbmNvbnN0IElOTElORV9FUlJPUlMgPSAnRXJyb3IsIElubGluZSBlbGVtZW50cyBjYW4gYmUgT05MWSBjcmVhdGVkIGluc2lkZSB0aGUgc2FtZSBwYXJhZ3JhcGgnXG5cbiIsIi8qKlxuICogUkFTSCBzZWN0aW9uIHBsdWdpbiBSQUpFXG4gKi9cblxudGlueW1jZS5QbHVnaW5NYW5hZ2VyLmFkZCgncmFqZV9zZWN0aW9uJywgZnVuY3Rpb24gKGVkaXRvciwgdXJsKSB7XG5cbiAgbGV0IHJhamVfc2VjdGlvbl9mbGFnID0gZmFsc2VcbiAgbGV0IHJhamVfc3RvcmVkX3NlbGVjdGlvblxuXG4gIGVkaXRvci5hZGRCdXR0b24oJ3JhamVfc2VjdGlvbicsIHtcbiAgICB0eXBlOiAnbWVudWJ1dHRvbicsXG4gICAgdGV4dDogJ0hlYWRpbmdzJyxcbiAgICB0aXRsZTogJ2hlYWRpbmcnLFxuICAgIGljb25zOiBmYWxzZSxcblxuICAgIC8vIFNlY3Rpb25zIHN1YiBtZW51XG4gICAgbWVudTogW3tcbiAgICAgIHRleHQ6IGAke0hFQURJTkd9MS5gLFxuICAgICAgb25jbGljazogZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgc2VjdGlvbi5hZGRPckRvd25VcGdyYWRlKGUsIDEpXG4gICAgICB9XG4gICAgfSwge1xuICAgICAgdGV4dDogYCR7SEVBRElOR30xLjEuYCxcbiAgICAgIG9uY2xpY2s6IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIHNlY3Rpb24uYWRkT3JEb3duVXBncmFkZShlLCAyKVxuICAgICAgfVxuICAgIH0sIHtcbiAgICAgIHRleHQ6IGAke0hFQURJTkd9MS4xLjEuYCxcbiAgICAgIG9uY2xpY2s6IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIHNlY3Rpb24uYWRkT3JEb3duVXBncmFkZShlLCAzKVxuICAgICAgfVxuICAgIH0sIHtcbiAgICAgIHRleHQ6IGAke0hFQURJTkd9MS4xLjEuMS5gLFxuICAgICAgb25jbGljazogZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgc2VjdGlvbi5hZGRPckRvd25VcGdyYWRlKGUsIDQpXG4gICAgICB9XG4gICAgfSwge1xuICAgICAgdGV4dDogYCR7SEVBRElOR30xLjEuMS4xLjEuYCxcbiAgICAgIG9uY2xpY2s6IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIHNlY3Rpb24uYWRkT3JEb3duVXBncmFkZShlLCA1KVxuICAgICAgfVxuICAgIH0sIHtcbiAgICAgIHRleHQ6IGAke0hFQURJTkd9MS4xLjEuMS4xLjEuYCxcbiAgICAgIG9uY2xpY2s6IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIHNlY3Rpb24uYWRkT3JEb3duVXBncmFkZShlLCA2KVxuICAgICAgfVxuICAgIH0sIHtcbiAgICAgIHRleHQ6ICdTcGVjaWFsJyxcbiAgICAgIG1lbnU6IFt7XG4gICAgICAgICAgdGV4dDogJ0Fic3RyYWN0JyxcbiAgICAgICAgICBvbmNsaWNrOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICAgIHNlY3Rpb24uYWRkQWJzdHJhY3QoKVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIHRleHQ6ICdBY2tub3dsZWRnZW1lbnRzJyxcbiAgICAgICAgICBvbmNsaWNrOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWN0aW9uLmFkZEFja25vd2xlZGdlbWVudHMoKVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIHRleHQ6ICdSZWZlcmVuY2VzJyxcbiAgICAgICAgICBvbmNsaWNrOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuXG4gICAgICAgICAgICAvLyBPbmx5IGlmIGJpYmxpb2dyYXBoeSBzZWN0aW9uIGRvZXNuJ3QgZXhpc3RzXG4gICAgICAgICAgICBpZiAoISQoQklCTElPR1JBUEhZX1NFTEVDVE9SKS5sZW5ndGgpIHtcblxuICAgICAgICAgICAgICAvLyBUT0RPIGNoYW5nZSBoZXJlXG4gICAgICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAvLyBBZGQgbmV3IGJpYmxpb2VudHJ5XG4gICAgICAgICAgICAgICAgc2VjdGlvbi5hZGRCaWJsaW9lbnRyeSgpXG5cbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgaWZyYW1lXG4gICAgICAgICAgICAgICAgdXBkYXRlSWZyYW1lRnJvbVNhdmVkQ29udGVudCgpXG5cbiAgICAgICAgICAgICAgICAvL21vdmUgY2FyZXQgYW5kIHNldCBmb2N1cyB0byBhY3RpdmUgYWRpdG9yICMxMDVcbiAgICAgICAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2VsZWN0KHRpbnltY2UuYWN0aXZlRWRpdG9yLmRvbS5zZWxlY3QoYCR7QklCTElPRU5UUllfU0VMRUNUT1J9Omxhc3QtY2hpbGRgKVswXSwgdHJ1ZSlcbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH0gZWxzZVxuICAgICAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2VsZWN0KHRpbnltY2UuYWN0aXZlRWRpdG9yLmRvbS5zZWxlY3QoYCR7QklCTElPR1JBUEhZX1NFTEVDVE9SfT5oMWApWzBdKVxuXG4gICAgICAgICAgICBzY3JvbGxUbyhgJHtCSUJMSU9FTlRSWV9TRUxFQ1RPUn06bGFzdC1jaGlsZGApXG5cbiAgICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLmZvY3VzKClcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIF1cbiAgICB9XVxuICB9KVxuXG4gIGVkaXRvci5vbigna2V5RG93bicsIGZ1bmN0aW9uIChlKSB7XG5cbiAgICAvLyBpbnN0YW5jZSBvZiB0aGUgc2VsZWN0ZWQgZWxlbWVudFxuICAgIGxldCBzZWxlY3RlZEVsZW1lbnQgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG4gICAgbGV0IHNlbGVjdGlvbiA9IHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvblxuXG4gICAgbGV0IHN0YXJ0Tm9kZSA9ICQoc2VsZWN0aW9uLmdldFJuZygpLnN0YXJ0Q29udGFpbmVyKVxuICAgIGxldCBlbmROb2RlID0gJChzZWxlY3Rpb24uZ2V0Um5nKCkuZW5kQ29udGFpbmVyKVxuXG4gICAgaWYgKChzZWN0aW9uLmN1cnNvckluU2VjdGlvbihzZWxlY3Rpb24pIHx8IHNlY3Rpb24uY3Vyc29ySW5TcGVjaWFsU2VjdGlvbihzZWxlY3Rpb24pKSkge1xuXG4gICAgICAvLyBCbG9jayBzcGVjaWFsIGNoYXJzIGluIHNwZWNpYWwgZWxlbWVudHNcbiAgICAgIGlmIChjaGVja0lmU3BlY2lhbENoYXIoZS5rZXlDb2RlKSAmJlxuICAgICAgICAoc3RhcnROb2RlLnBhcmVudHMoU1BFQ0lBTF9TRUNUSU9OX1NFTEVDVE9SKS5sZW5ndGggfHwgZW5kTm9kZS5wYXJlbnRzKFNQRUNJQUxfU0VDVElPTl9TRUxFQ1RPUikubGVuZ3RoKSAmJlxuICAgICAgICAoc3RhcnROb2RlLnBhcmVudHMoJ2gxJykubGVuZ3RoID4gMCB8fCBlbmROb2RlLnBhcmVudHMoJ2gxJykubGVuZ3RoID4gMCkpIHtcblxuICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpXG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgfVxuXG4gICAgICAvKipcbiAgICAgICAqIENoZWNrIGlmIEJBQ0tTUEFDRSBvciBDQU5DIGFyZSBwcmVzc2VkXG4gICAgICAgKi9cbiAgICAgIGlmIChlLmtleUNvZGUgPT0gOCB8fCBlLmtleUNvZGUgPT0gNDYpIHtcblxuICAgICAgICAvLyBJZiB0aGUgc2VjdGlvbiBpc24ndCBjb2xsYXBzZWRcbiAgICAgICAgaWYgKCF0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uaXNDb2xsYXBzZWQoKSkge1xuXG4gICAgICAgICAgLy8gSWYgdGhlIHNlbGVjdGlvbiBjb250YWlucyBhdCBsZWFzdCBhIGJpYmxpb2VudHJ5XG4gICAgICAgICAgaWYgKHNlbGVjdGlvbkNvbnRlbnQuY29udGFpbnNCaWJsaW9lbnRyaWVzKHNlbGVjdGlvbikpIHtcblxuICAgICAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKVxuXG4gICAgICAgICAgICAvLyBCb3RoIGRlbGV0ZSBldmVudCBhbmQgdXBkYXRlIGFyZSBzdG9yZWQgaW4gYSBzaW5nbGUgdW5kbyBsZXZlbFxuICAgICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLmV4ZWNDb21tYW5kKCdkZWxldGUnKVxuICAgICAgICAgICAgICBzZWN0aW9uLnVwZGF0ZUJpYmxpb2dyYXBoeVNlY3Rpb24oKVxuICAgICAgICAgICAgICB1cGRhdGVSZWZlcmVuY2VzKClcblxuICAgICAgICAgICAgICAvLyB1cGRhdGUgaWZyYW1lXG4gICAgICAgICAgICAgIHVwZGF0ZUlmcmFtZUZyb21TYXZlZENvbnRlbnQoKVxuICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gSWYgdGhlIHNlbGVjdGlvbiBjb250YWlucyB0aGUgZW50aXJlIGJpYmxpb2dyYXBoeSBzZWN0aW9uXG4gICAgICAgICAgaWYgKHNlbGVjdGlvbkNvbnRlbnQuY29udGFpbnNCaWJsaW9ncmFwaHkoc2VsZWN0aW9uKSkge1xuXG4gICAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpXG5cbiAgICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgICAgICAvLyBFeGVjdXRlIG5vcm1hbCBkZWxldGVcbiAgICAgICAgICAgICAgJChCSUJMSU9HUkFQSFlfU0VMRUNUT1IpLnJlbW92ZSgpXG4gICAgICAgICAgICAgIHVwZGF0ZVJlZmVyZW5jZXMoKVxuXG4gICAgICAgICAgICAgIC8vIFVwZGF0ZSBpZnJhbWUgYW5kIHJlc3RvcmUgc2VsZWN0aW9uXG4gICAgICAgICAgICAgIHVwZGF0ZUlmcmFtZUZyb21TYXZlZENvbnRlbnQoKVxuICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gUmVzdHJ1Y3R1cmUgdGhlIGVudGlyZSBib2R5IGlmIHRoZSBzZWN0aW9uIGlzbid0IGNvbGxhcHNlZCBhbmQgbm90IGluc2lkZSBhIHNwZWNpYWwgc2VjdGlvblxuICAgICAgICAgIGlmICghc2VjdGlvbi5jdXJzb3JJblNwZWNpYWxTZWN0aW9uKHNlbGVjdGlvbikpIHtcbiAgICAgICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKClcbiAgICAgICAgICAgIHNlY3Rpb24ubWFuYWdlRGVsZXRlKClcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJZiB0aGUgc2VjdGlvbiBpcyBjb2xsYXBzZWRcbiAgICAgICAgaWYgKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5pc0NvbGxhcHNlZCgpKSB7XG5cbiAgICAgICAgICAvLyBJZiB0aGUgc2VsZWN0aW9uIGlzIGluc2lkZSBhIHNwZWNpYWwgc2VjdGlvblxuICAgICAgICAgIGlmIChzZWN0aW9uLmN1cnNvckluU3BlY2lhbFNlY3Rpb24oc2VsZWN0aW9uKSkge1xuXG4gICAgICAgICAgICAvLyBSZW1vdmUgc3BlY2lhbCBzZWN0aW9uIGlmIHRoZSBjdXJzb3IgaXMgYXQgdGhlIGJlZ2lubmluZ1xuICAgICAgICAgICAgaWYgKChzdGFydE5vZGUucGFyZW50cygnaDEnKS5sZW5ndGggfHwgc3RhcnROb2RlLmlzKCdoMScpKSAmJiB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Um5nKCkuc3RhcnRPZmZzZXQgPT0gMCkge1xuXG4gICAgICAgICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKClcbiAgICAgICAgICAgICAgc2VjdGlvbi5kZWxldGVTcGVjaWFsU2VjdGlvbihzZWxlY3RlZEVsZW1lbnQpXG4gICAgICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBpZiB0aGUgY3Vyc29yIGlzIGF0IHRoZSBiZWdpbm5pbmcgb2YgYSBlbXB0eSBwIGluc2lkZSBpdHMgYmlibGlvZW50cnksIHJlbW92ZSBpdCBhbmQgdXBkYXRlIHRoZSByZWZlcmVuY2VzXG4gICAgICAgICAgICBpZiAoc2VsZWN0aW9uQ29udGVudC5pc0F0QmVnaW5uaW5nT2ZFbXB0eUJpYmxpb2VudHJ5KHNlbGVjdGlvbikpIHtcblxuICAgICAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpXG5cbiAgICAgICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgICAgICAgLy8gRXhlY3V0ZSBub3JtYWwgZGVsZXRlXG4gICAgICAgICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IuZXhlY0NvbW1hbmQoJ2RlbGV0ZScpXG4gICAgICAgICAgICAgICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG4gICAgICAgICAgICAgICAgdXBkYXRlUmVmZXJlbmNlcygpXG5cbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgaWZyYW1lIGFuZCByZXN0b3JlIHNlbGVjdGlvblxuICAgICAgICAgICAgICAgIHVwZGF0ZUlmcmFtZUZyb21TYXZlZENvbnRlbnQoKVxuICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBpZiB0aGUgY3Vyc29yIGlzIGF0IHRoZSBiZWdpbm5pbmcgb2YgdGhlIGZpcnN0IGVtcHR5IHAgaW5zaWRlIGEgZm9vdG5vdGUsIHJlbW92ZSBpdCBhbmQgdXBkYXRlIHRoZSByZWZlcmVuY2VzXG4gICAgICAgICAgICBpZiAoc2VsZWN0aW9uQ29udGVudC5pc0F0QmVnaW5uaW5nT2ZFbXB0eUVuZG5vdGUoc2VsZWN0aW9uKSkge1xuXG4gICAgICAgICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKClcblxuICAgICAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICAgICAgICBsZXQgZW5kbm90ZSA9IHNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKEVORE5PVEVfU0VMRUNUT1IpXG5cbiAgICAgICAgICAgICAgICAvLyBJZiB0aGUgY3VycmVudCBlbmRub3RlIGlzIHRoZSBsYXN0IG9uZSByZW1vdmUgdGhlIGVudGlyZSBmb290bm90ZXMgc2VjdGlvblxuICAgICAgICAgICAgICAgIGlmICghZW5kbm90ZS5wcmV2KEVORE5PVEVfU0VMRUNUT1IpLmxlbmd0aCAmJiAhZW5kbm90ZS5uZXh0KEVORE5PVEVfU0VMRUNUT1IpLmxlbmd0aClcbiAgICAgICAgICAgICAgICAgICQoRU5ETk9URVNfU0VMRUNUT1IpLnJlbW92ZSgpXG5cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLmV4ZWNDb21tYW5kKCdkZWxldGUnKVxuICAgICAgICAgICAgICAgICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdXBkYXRlUmVmZXJlbmNlcygpXG5cbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgaWZyYW1lIGFuZCByZXN0b3JlIHNlbGVjdGlvblxuICAgICAgICAgICAgICAgIHVwZGF0ZUlmcmFtZUZyb21TYXZlZENvbnRlbnQoKVxuICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFByZXZlbnQgcmVtb3ZlIGZyb20gaGVhZGVyXG4gICAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQuaXMoTk9OX0VESVRBQkxFX0hFQURFUl9TRUxFQ1RPUikgfHxcbiAgICAgICAgICAoc2VsZWN0ZWRFbGVtZW50LmF0dHIoJ2RhdGEtbWNlLWNhcmV0JykgPT0gJ2FmdGVyJyAmJiBzZWxlY3RlZEVsZW1lbnQucGFyZW50KCkuaXMoUkFKRV9TRUxFQ1RPUikpIHx8XG4gICAgICAgICAgKHNlbGVjdGVkRWxlbWVudC5hdHRyKCdkYXRhLW1jZS1jYXJldCcpICYmIHNlbGVjdGVkRWxlbWVudC5wYXJlbnQoKS5pcyhSQUpFX1NFTEVDVE9SKSkgPT0gJ2JlZm9yZScpXG4gICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICB9XG5cbiAgICAgIC8qKlxuICAgICAgICogQ2hlY2sgaWYgRU5URVIgaXMgcHJlc3NlZFxuICAgICAgICovXG4gICAgICBpZiAoZS5rZXlDb2RlID09IDEzKSB7XG5cbiAgICAgICAgLy8gV2hlbiBlbnRlciBpcyBwcmVzc2VkIGluc2lkZSBhbiBoZWFkZXIsIG5vdCBhdCB0aGUgZW5kIG9mIGl0XG4gICAgICAgIGlmIChjdXJzb3IuaXNJbnNpZGVIZWFkaW5nKHNlbGVjdGlvbikpIHtcbiAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpXG4gICAgICAgICAgc2VjdGlvbi5hZGRXaXRoRW50ZXIoKVxuICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICB9XG4gIFxuICAgICAgICAvLyBJZiBzZWxlY3Rpb24gaXMgYmVmb3JlL2FmdGVyIGhlYWRlclxuICAgICAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LmlzKCdwJykpIHtcbiAgXG4gICAgICAgICAgLy8gQmxvY2sgZW50ZXIgYmVmb3JlIGhlYWRlclxuICAgICAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQuYXR0cignZGF0YS1tY2UtY2FyZXQnKSA9PSAnYmVmb3JlJyl7XG4gICAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpXG4gICAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgICAgICB9XG4gIFxuICBcbiAgICAgICAgICAvLyBBZGQgbmV3IHNlY3Rpb24gYWZ0ZXIgaGVhZGVyXG4gICAgICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC5hdHRyKCdkYXRhLW1jZS1jYXJldCcpID09ICdhZnRlcicpIHtcbiAgICAgICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKClcbiAgICAgICAgICAgIHNlY3Rpb24uYWRkKDEpXG4gICAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgXG4gICAgICAgIC8vIElmIGVudGVyIGlzIHByZXNzZWQgaW5zaWRlIGJpYmxpb2dyYXBoeSBzZWxlY3RvclxuICAgICAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LnBhcmVudHMoQklCTElPR1JBUEhZX1NFTEVDVE9SKS5sZW5ndGgpIHtcbiAgXG4gICAgICAgICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG4gIFxuICAgICAgICAgIGxldCBpZCA9IGdldFN1Y2Nlc3NpdmVFbGVtZW50SWQoQklCTElPRU5UUllfU0VMRUNUT1IsIEJJQkxJT0VOVFJZX1NVRkZJWClcbiAgXG4gICAgICAgICAgLy8gUHJlc3NpbmcgZW50ZXIgaW4gaDEgd2lsbCBhZGQgYSBuZXcgYmlibGlvZW50cnkgYW5kIGNhcmV0IHJlcG9zaXRpb25cbiAgICAgICAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LmlzKCdoMScpKSB7XG4gIFxuICAgICAgICAgICAgc2VjdGlvbi5hZGRCaWJsaW9lbnRyeShpZClcbiAgICAgICAgICAgIHVwZGF0ZUlmcmFtZUZyb21TYXZlZENvbnRlbnQoKVxuICAgICAgICAgIH1cbiAgXG4gICAgICAgICAgLy8gSWYgc2VsZWN0ZWQgZWxlbWVudCBpcyBpbnNpZGUgdGV4dFxuICAgICAgICAgIGVsc2UgaWYgKHNlbGVjdGVkRWxlbWVudC5pcygncCcpKVxuICAgICAgICAgICAgc2VjdGlvbi5hZGRCaWJsaW9lbnRyeShpZCwgbnVsbCwgc2VsZWN0ZWRFbGVtZW50LnBhcmVudCgnbGknKSlcbiAgXG4gIFxuICAgICAgICAgIC8vIElmIHNlbGVjdGVkIGVsZW1lbnQgaXMgd2l0aG91dCB0ZXh0XG4gICAgICAgICAgZWxzZSBpZiAoc2VsZWN0ZWRFbGVtZW50LmlzKCdsaScpKVxuICAgICAgICAgICAgc2VjdGlvbi5hZGRCaWJsaW9lbnRyeShpZCwgbnVsbCwgc2VsZWN0ZWRFbGVtZW50KVxuICBcbiAgICAgICAgICAvLyBNb3ZlIGNhcmV0ICMxMDVcbiAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2V0Q3Vyc29yTG9jYXRpb24odGlueW1jZS5hY3RpdmVFZGl0b3IuZG9tLnNlbGVjdChgJHtCSUJMSU9FTlRSWV9TRUxFQ1RPUn0jJHtpZH0gPiBwYClbMF0sIGZhbHNlKVxuICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICB9XG4gIFxuICAgICAgICAvLyBBZGRpbmcgc2VjdGlvbnMgd2l0aCBzaG9ydGN1dHMgI1xuICAgICAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LmlzKCdwJykgJiYgc2VsZWN0ZWRFbGVtZW50LnRleHQoKS50cmltKCkuc3Vic3RyaW5nKDAsIDEpID09ICcjJykge1xuICBcbiAgICAgICAgICBsZXQgbGV2ZWwgPSBzZWN0aW9uLmdldExldmVsRnJvbUhhc2goc2VsZWN0ZWRFbGVtZW50LnRleHQoKS50cmltKCkpXG4gICAgICAgICAgbGV0IGRlZXBuZXNzID0gJChzZWxlY3RlZEVsZW1lbnQpLnBhcmVudHNVbnRpbChSQUpFX1NFTEVDVE9SKS5sZW5ndGggLSBsZXZlbCArIDFcbiAgXG4gICAgICAgICAgLy8gSW5zZXJ0IHNlY3Rpb24gb25seSBpZiBjYXJldCBpcyBpbnNpZGUgYWJzdHJhY3Qgc2VjdGlvbiwgYW5kIHVzZXIgaXMgZ29pbmcgdG8gaW5zZXJ0IGEgc3ViIHNlY3Rpb25cbiAgICAgICAgICAvLyBPUiB0aGUgY3Vyc29yIGlzbid0IGluc2lkZSBvdGhlciBzcGVjaWFsIHNlY3Rpb25zXG4gICAgICAgICAgLy8gQU5EIHNlbGVjdGVkRWxlbWVudCBpc24ndCBpbnNpZGUgYSBmaWd1cmVcbiAgICAgICAgICBpZiAoKChzZWxlY3RlZEVsZW1lbnQucGFyZW50cyhBQlNUUkFDVF9TRUxFQ1RPUikubGVuZ3RoICYmIGRlZXBuZXNzID4gMCkgfHwgIXNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKFNQRUNJQUxfU0VDVElPTl9TRUxFQ1RPUikubGVuZ3RoKSAmJiAhc2VsZWN0ZWRFbGVtZW50LnBhcmVudHMoRklHVVJFX1NFTEVDVE9SKS5sZW5ndGgpIHtcbiAgXG4gICAgICAgICAgICBzZWN0aW9uLmFkZChsZXZlbCwgc2VsZWN0ZWRFbGVtZW50LnRleHQoKS5zdWJzdHJpbmcobGV2ZWwpLnRyaW0oKSlcbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfSlcblxuICBlZGl0b3Iub24oJ05vZGVDaGFuZ2UnLCBmdW5jdGlvbiAoZSkge1xuICAgIHNlY3Rpb24udXBkYXRlU2VjdGlvblRvb2xiYXIoKVxuICB9KVxufSlcblxuc2VjdGlvbiA9IHtcblxuICAvKipcbiAgICogRnVuY3Rpb24gY2FsbGVkIHdoZW4gYSBuZXcgc2VjdGlvbiBuZWVkcyB0byBiZSBhdHRhY2hlZCwgd2l0aCBidXR0b25zXG4gICAqL1xuICBhZGQ6IGZ1bmN0aW9uIChsZXZlbCwgdGV4dCkge1xuXG4gICAgLy8gU2VsZWN0IGN1cnJlbnQgbm9kZVxuICAgIGxldCBzZWxlY3RlZEVsZW1lbnQgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG5cbiAgICAvLyBDcmVhdGUgdGhlIHNlY3Rpb25cbiAgICBsZXQgbmV3U2VjdGlvbiA9IHRoaXMuY3JlYXRlKHRleHQgIT0gbnVsbCA/IHRleHQgOiBzZWxlY3RlZEVsZW1lbnQuaHRtbCgpLnRyaW0oKSwgbGV2ZWwpXG5cbiAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgIC8vIENoZWNrIHdoYXQga2luZCBvZiBzZWN0aW9uIG5lZWRzIHRvIGJlIGluc2VydGVkXG4gICAgICBpZiAoc2VjdGlvbi5tYW5hZ2VTZWN0aW9uKHNlbGVjdGVkRWxlbWVudCwgbmV3U2VjdGlvbiwgbGV2ZWwgPyBsZXZlbCA6IHNlbGVjdGVkRWxlbWVudC5wYXJlbnRzVW50aWwoUkFKRV9TRUxFQ1RPUikubGVuZ3RoKSkge1xuXG4gICAgICAgIC8vIFJlbW92ZSB0aGUgc2VsZWN0ZWQgc2VjdGlvblxuICAgICAgICBzZWxlY3RlZEVsZW1lbnQucmVtb3ZlKClcblxuICAgICAgICAvLyBJZiB0aGUgbmV3IGhlYWRpbmcgaGFzIHRleHQgbm9kZXMsIHRoZSBvZmZzZXQgd29uJ3QgYmUgMCAoYXMgbm9ybWFsKSBidXQgaW5zdGVhZCBpdCdsbCBiZSBsZW5ndGggb2Ygbm9kZSB0ZXh0XG4gICAgICAgIG1vdmVDYXJldChuZXdTZWN0aW9uLmZpbmQoJzpoZWFkZXInKS5maXJzdCgpWzBdKVxuXG4gICAgICAgIC8vIFVwZGF0ZSBlZGl0b3IgY29udGVudFxuICAgICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcbiAgICAgIH1cbiAgICB9KVxuICB9LFxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGFkZE9yRG93blVwZ3JhZGU6IGZ1bmN0aW9uIChlLCBsZXZlbCkge1xuXG4gICAgbGV0IHNlbGVjdGVkTWVudUl0ZW0gPSAkKGUudGFyZ2V0KS5wYXJlbnQoJy5tY2UtbWVudS1pdGVtJylcblxuICAgIGlmIChzZWxlY3RlZE1lbnVJdGVtLmF0dHIoREFUQV9VUEdSQURFKSlcbiAgICAgIHJldHVybiB0aGlzLnVwZ3JhZGUoKVxuXG4gICAgaWYgKHNlbGVjdGVkTWVudUl0ZW0uYXR0cihEQVRBX0RPV05HUkFERSkpXG4gICAgICByZXR1cm4gdGhpcy5kb3duZ3JhZGUoKVxuXG4gICAgcmV0dXJuIHRoaXMuYWRkKGxldmVsKVxuICB9LFxuXG4gIC8qKlxuICAgKiBGdW5jdGlvbiBjYWxsZWQgd2hlbiBhIG5ldyBzZWN0aW9uIG5lZWRzIHRvIGJlIGF0dGFjaGVkLCB3aXRoIGJ1dHRvbnNcbiAgICovXG4gIGFkZFdpdGhFbnRlcjogZnVuY3Rpb24gKCkge1xuXG4gICAgLy8gU2VsZWN0IGN1cnJlbnQgbm9kZVxuICAgIGxldCBzZWxlY3RlZEVsZW1lbnQgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG5cbiAgICAvLyBJZiB0aGUgc2VjdGlvbiBpc24ndCBzcGVjaWFsXG4gICAgaWYgKCFzZWxlY3RlZEVsZW1lbnQucGFyZW50KCkuYXR0cigncm9sZScpKSB7XG5cbiAgICAgIGxldmVsID0gc2VsZWN0ZWRFbGVtZW50LnBhcmVudHNVbnRpbChSQUpFX1NFTEVDVE9SKS5sZW5ndGhcblxuICAgICAgLy8gQ3JlYXRlIHRoZSBzZWN0aW9uXG4gICAgICBsZXQgbmV3U2VjdGlvbiA9IHRoaXMuY3JlYXRlKHNlbGVjdGVkRWxlbWVudC50ZXh0KCkudHJpbSgpLnN1YnN0cmluZyh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Um5nKCkuc3RhcnRPZmZzZXQpLCBsZXZlbClcblxuICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIC8vIENoZWNrIHdoYXQga2luZCBvZiBzZWN0aW9uIG5lZWRzIHRvIGJlIGluc2VydGVkXG4gICAgICAgIHNlY3Rpb24ubWFuYWdlU2VjdGlvbihzZWxlY3RlZEVsZW1lbnQsIG5ld1NlY3Rpb24sIGxldmVsKVxuXG4gICAgICAgIC8vIFJlbW92ZSB0aGUgc2VsZWN0ZWQgc2VjdGlvblxuICAgICAgICBzZWxlY3RlZEVsZW1lbnQuaHRtbChzZWxlY3RlZEVsZW1lbnQudGV4dCgpLnRyaW0oKS5zdWJzdHJpbmcoMCwgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldFJuZygpLnN0YXJ0T2Zmc2V0KSlcblxuICAgICAgICBtb3ZlQ2FyZXQobmV3U2VjdGlvbi5maW5kKCc6aGVhZGVyJykuZmlyc3QoKVswXSwgdHJ1ZSlcblxuICAgICAgICAvLyBVcGRhdGUgZWRpdG9yXG4gICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuICAgICAgfSlcbiAgICB9IGVsc2VcbiAgICAgIG5vdGlmeSgnRXJyb3IsIGhlYWRlcnMgb2Ygc3BlY2lhbCBzZWN0aW9ucyAoYWJzdHJhY3QsIGFja25vd2xlZG1lbnRzKSBjYW5ub3QgYmUgc3BsaXR0ZWQnLCAnZXJyb3InLCA0MDAwKVxuICB9LFxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIGxhc3QgaW5zZXJ0ZWQgaWRcbiAgICovXG4gIGdldE5leHRJZDogZnVuY3Rpb24gKCkge1xuICAgIGxldCBpZCA9IDBcbiAgICAkKCdzZWN0aW9uW2lkXScpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKCQodGhpcykuYXR0cignaWQnKS5pbmRleE9mKCdzZWN0aW9uJykgPiAtMSkge1xuICAgICAgICBsZXQgY3VycklkID0gcGFyc2VJbnQoJCh0aGlzKS5hdHRyKCdpZCcpLnJlcGxhY2UoJ3NlY3Rpb24nLCAnJykpXG4gICAgICAgIGlkID0gaWQgPiBjdXJySWQgPyBpZCA6IGN1cnJJZFxuICAgICAgfVxuICAgIH0pXG4gICAgcmV0dXJuIGBzZWN0aW9uJHtpZCsxfWBcbiAgfSxcblxuICAvKipcbiAgICogUmV0cmlldmUgYW5kIHRoZW4gcmVtb3ZlIGV2ZXJ5IHN1Y2Nlc3NpdmUgZWxlbWVudHMgXG4gICAqL1xuICBnZXRTdWNjZXNzaXZlRWxlbWVudHM6IGZ1bmN0aW9uIChlbGVtZW50LCBkZWVwbmVzcykge1xuXG4gICAgbGV0IHN1Y2Nlc3NpdmVFbGVtZW50cyA9ICQoJzxkaXY+PC9kaXY+JylcblxuICAgIHdoaWxlIChkZWVwbmVzcyA+PSAwKSB7XG5cbiAgICAgIGlmIChlbGVtZW50Lm5leHRBbGwoJzpub3QoLmZvb3RlciknKSkge1xuXG4gICAgICAgIC8vIElmIHRoZSBkZWVwbmVzcyBpcyAwLCBvbmx5IHBhcmFncmFwaCBhcmUgc2F2ZWQgKG5vdCBzZWN0aW9ucylcbiAgICAgICAgaWYgKGRlZXBuZXNzID09IDApIHtcbiAgICAgICAgICAvLyBTdWNjZXNzaXZlIGVsZW1lbnRzIGNhbiBiZSBwIG9yIGZpZ3VyZXNcbiAgICAgICAgICBzdWNjZXNzaXZlRWxlbWVudHMuYXBwZW5kKGVsZW1lbnQubmV4dEFsbChgcCwke0ZJR1VSRV9TRUxFQ1RPUn1gKSlcbiAgICAgICAgICBlbGVtZW50Lm5leHRBbGwoKS5yZW1vdmUoYHAsJHtGSUdVUkVfU0VMRUNUT1J9YClcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdWNjZXNzaXZlRWxlbWVudHMuYXBwZW5kKGVsZW1lbnQubmV4dEFsbCgpKVxuICAgICAgICAgIGVsZW1lbnQubmV4dEFsbCgpLnJlbW92ZSgpXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgZWxlbWVudCA9IGVsZW1lbnQucGFyZW50KCdzZWN0aW9uJylcbiAgICAgIGRlZXBuZXNzLS1cbiAgICB9XG5cbiAgICByZXR1cm4gJChzdWNjZXNzaXZlRWxlbWVudHMuaHRtbCgpKVxuICB9LFxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGdldExldmVsRnJvbUhhc2g6IGZ1bmN0aW9uICh0ZXh0KSB7XG5cbiAgICBsZXQgbGV2ZWwgPSAwXG4gICAgdGV4dCA9IHRleHQuc3Vic3RyaW5nKDAsIHRleHQubGVuZ3RoID49IDYgPyA2IDogdGV4dC5sZW5ndGgpXG5cbiAgICB3aGlsZSAodGV4dC5sZW5ndGggPiAwKSB7XG5cbiAgICAgIGlmICh0ZXh0LnN1YnN0cmluZyh0ZXh0Lmxlbmd0aCAtIDEpID09ICcjJylcbiAgICAgICAgbGV2ZWwrK1xuXG4gICAgICAgIHRleHQgPSB0ZXh0LnN1YnN0cmluZygwLCB0ZXh0Lmxlbmd0aCAtIDEpXG4gICAgfVxuXG4gICAgcmV0dXJuIGxldmVsXG4gIH0sXG5cbiAgLyoqXG4gICAqIFJldHVybiBKUWV1cnkgb2JqZWN0IHRoYXQgcmVwcmVzZW50IHRoZSBzZWN0aW9uXG4gICAqL1xuICBjcmVhdGU6IGZ1bmN0aW9uICh0ZXh0LCBsZXZlbCkge1xuICAgIC8vIENyZWF0ZSB0aGUgc2VjdGlvblxuXG4gICAgLy8gVHJpbSB3aGl0ZSBzcGFjZXMgYW5kIGFkZCB6ZXJvX3NwYWNlIGNoYXIgaWYgbm90aGluZyBpcyBpbnNpZGVcblxuICAgIGlmICh0eXBlb2YgdGV4dCAhPSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICB0ZXh0ID0gdGV4dC50cmltKClcbiAgICAgIGlmICh0ZXh0Lmxlbmd0aCA9PSAwKVxuICAgICAgICB0ZXh0ID0gXCI8YnI+XCJcbiAgICB9IGVsc2VcbiAgICAgIHRleHQgPSBcIjxicj5cIlxuXG4gICAgcmV0dXJuICQoYDxzZWN0aW9uIGlkPVwiJHt0aGlzLmdldE5leHRJZCgpfVwiPjxoJHtsZXZlbH0gZGF0YS1yYXNoLW9yaWdpbmFsLXdyYXBwZXI9XCJoMVwiPiR7dGV4dH08L2gke2xldmVsfT48L3NlY3Rpb24+YClcbiAgfSxcblxuICAvKipcbiAgICogQ2hlY2sgd2hhdCBraW5kIG9mIHNlY3Rpb24gbmVlZHMgdG8gYmUgYWRkZWQsIGFuZCBwcmVjZWVkXG4gICAqL1xuICBtYW5hZ2VTZWN0aW9uOiBmdW5jdGlvbiAoc2VsZWN0ZWRFbGVtZW50LCBuZXdTZWN0aW9uLCBsZXZlbCkge1xuXG4gICAgbGV0IGRlZXBuZXNzID0gJChzZWxlY3RlZEVsZW1lbnQpLnBhcmVudHNVbnRpbChSQUpFX1NFTEVDVE9SKS5sZW5ndGggLSBsZXZlbCArIDFcblxuICAgIGlmIChkZWVwbmVzcyA+PSAwKSB7XG5cbiAgICAgIC8vIEJsb2NrIGluc2VydCBzZWxlY3Rpb24gaWYgY2FyZXQgaXMgaW5zaWRlIHNwZWNpYWwgc2VjdGlvbiwgYW5kIHVzZXIgaXMgZ29pbmcgdG8gaW5zZXJ0IGEgc3ViIHNlY3Rpb25cbiAgICAgIGlmICgoc2VsZWN0ZWRFbGVtZW50LnBhcmVudHMoU1BFQ0lBTF9TRUNUSU9OX1NFTEVDVE9SKS5sZW5ndGggJiYgZGVlcG5lc3MgIT0gMSkgfHwgKHNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKEFDS05PV0xFREdFTUVOVFNfU0VMRUNUT1IpLmxlbmd0aCAmJlxuICAgICAgICAgIHNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKEJJQkxJT0dSQVBIWV9TRUxFQ1RPUikgJiZcbiAgICAgICAgICBzZWxlY3RlZEVsZW1lbnQucGFyZW50cyhFTkROT1RFU19TRUxFQ1RPUikpKVxuICAgICAgICByZXR1cm4gZmFsc2VcblxuICAgICAgLy8gR2V0IGRpcmVjdCBwYXJlbnQgYW5kIGFuY2VzdG9yIHJlZmVyZW5jZVxuICAgICAgbGV0IHN1Y2Nlc3NpdmVFbGVtZW50cyA9IHRoaXMuZ2V0U3VjY2Vzc2l2ZUVsZW1lbnRzKHNlbGVjdGVkRWxlbWVudCwgZGVlcG5lc3MpXG5cbiAgICAgIGlmIChzdWNjZXNzaXZlRWxlbWVudHMubGVuZ3RoKVxuICAgICAgICBuZXdTZWN0aW9uLmFwcGVuZChzdWNjZXNzaXZlRWxlbWVudHMpXG5cbiAgICAgIC8vIENBU0U6IHN1YiBzZWN0aW9uXG4gICAgICBpZiAoZGVlcG5lc3MgPT0gMClcbiAgICAgICAgc2VsZWN0ZWRFbGVtZW50LmFmdGVyKG5ld1NlY3Rpb24pXG5cbiAgICAgIC8vIENBU0U6IHNpYmxpbmcgc2VjdGlvblxuICAgICAgZWxzZSBpZiAoZGVlcG5lc3MgPT0gMSlcbiAgICAgICAgc2VsZWN0ZWRFbGVtZW50LnBhcmVudCgnc2VjdGlvbicpLmFmdGVyKG5ld1NlY3Rpb24pXG5cbiAgICAgIC8vIENBU0U6IGFuY2VzdG9yIHNlY3Rpb24gYXQgYW55IHVwbGV2ZWxcbiAgICAgIGVsc2VcbiAgICAgICAgJChzZWxlY3RlZEVsZW1lbnQucGFyZW50cygnc2VjdGlvbicpW2RlZXBuZXNzIC0gMV0pLmFmdGVyKG5ld1NlY3Rpb24pXG5cbiAgICAgIGhlYWRpbmdEaW1lbnNpb24oKVxuXG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogXG4gICAqL1xuICB1cGdyYWRlOiBmdW5jdGlvbiAoKSB7XG5cbiAgICBsZXQgc2VsZWN0ZWRFbGVtZW50ID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuXG4gICAgaWYgKHNlbGVjdGVkRWxlbWVudC5pcygnOmhlYWRlcicpKSB7XG5cbiAgICAgIC8vIEdldCB0aGUgcmVmZXJlbmNlcyBvZiBzZWxlY3RlZCBhbmQgcGFyZW50IHNlY3Rpb25cbiAgICAgIGxldCBzZWxlY3RlZFNlY3Rpb24gPSBzZWxlY3RlZEVsZW1lbnQucGFyZW50KFNFQ1RJT05fU0VMRUNUT1IpXG4gICAgICBsZXQgcGFyZW50U2VjdGlvbiA9IHNlbGVjdGVkU2VjdGlvbi5wYXJlbnQoU0VDVElPTl9TRUxFQ1RPUilcblxuICAgICAgLy8gSWYgdGhlcmUgaXMgYSBwYXJlbnQgc2VjdGlvbiB1cGdyYWRlIGlzIGFsbG93ZWRcbiAgICAgIGlmIChwYXJlbnRTZWN0aW9uLmxlbmd0aCkge1xuXG4gICAgICAgIC8vIEV2ZXJ5dGhpbmcgaW4gaGVyZSwgaXMgYW4gYXRvbWljIHVuZG8gbGV2ZWxcbiAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgLy8gU2F2ZSB0aGUgc2VjdGlvbiBhbmQgZGV0YWNoXG4gICAgICAgICAgbGV0IGJvZHlTZWN0aW9uID0gJChzZWxlY3RlZFNlY3Rpb25bMF0ub3V0ZXJIVE1MKVxuICAgICAgICAgIHNlbGVjdGVkU2VjdGlvbi5kZXRhY2goKVxuXG4gICAgICAgICAgLy8gVXBkYXRlIGRpbWVuc2lvbiBhbmQgbW92ZSB0aGUgc2VjdGlvbiBvdXRcbiAgICAgICAgICBwYXJlbnRTZWN0aW9uLmFmdGVyKGJvZHlTZWN0aW9uKVxuXG4gICAgICAgICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG4gICAgICAgICAgaGVhZGluZ0RpbWVuc2lvbigpXG4gICAgICAgICAgdXBkYXRlSWZyYW1lRnJvbVNhdmVkQ29udGVudCgpXG4gICAgICAgIH0pXG4gICAgICB9XG5cbiAgICAgIC8vIE5vdGlmeSBlcnJvclxuICAgICAgZWxzZVxuICAgICAgICBub3RpZnkoSEVBRElOR19UUkFTRk9STUFUSU9OX0ZPUkJJRERFTiwgJ2Vycm9yJywgMjAwMClcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIFxuICAgKi9cbiAgZG93bmdyYWRlOiBmdW5jdGlvbiAoKSB7XG5cbiAgICBsZXQgc2VsZWN0ZWRFbGVtZW50ID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuXG4gICAgaWYgKHNlbGVjdGVkRWxlbWVudC5pcygnaDEsaDIsaDMsaDQsaDUsaDYnKSkge1xuICAgICAgLy8gR2V0IHRoZSByZWZlcmVuY2VzIG9mIHNlbGVjdGVkIGFuZCBzaWJsaW5nIHNlY3Rpb25cbiAgICAgIGxldCBzZWxlY3RlZFNlY3Rpb24gPSBzZWxlY3RlZEVsZW1lbnQucGFyZW50KFNFQ1RJT05fU0VMRUNUT1IpXG4gICAgICBsZXQgc2libGluZ1NlY3Rpb24gPSBzZWxlY3RlZFNlY3Rpb24ucHJldihTRUNUSU9OX1NFTEVDVE9SKVxuXG4gICAgICAvLyBJZiB0aGVyZSBpcyBhIHByZXZpb3VzIHNpYmxpbmcgc2VjdGlvbiBkb3duZ3JhZGUgaXMgYWxsb3dlZFxuICAgICAgaWYgKHNpYmxpbmdTZWN0aW9uLmxlbmd0aCkge1xuXG4gICAgICAgIC8vIEV2ZXJ5dGhpbmcgaW4gaGVyZSwgaXMgYW4gYXRvbWljIHVuZG8gbGV2ZWxcbiAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgLy8gU2F2ZSB0aGUgc2VjdGlvbiBhbmQgZGV0YWNoXG4gICAgICAgICAgbGV0IGJvZHlTZWN0aW9uID0gJChzZWxlY3RlZFNlY3Rpb25bMF0ub3V0ZXJIVE1MKVxuICAgICAgICAgIHNlbGVjdGVkU2VjdGlvbi5kZXRhY2goKVxuXG4gICAgICAgICAgLy8gVXBkYXRlIGRpbWVuc2lvbiBhbmQgbW92ZSB0aGUgc2VjdGlvbiBvdXRcbiAgICAgICAgICBzaWJsaW5nU2VjdGlvbi5hcHBlbmQoYm9keVNlY3Rpb24pXG5cbiAgICAgICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcbiAgICAgICAgICAvLyBSZWZyZXNoIHRpbnltY2UgY29udGVudCBhbmQgc2V0IHRoZSBoZWFkaW5nIGRpbWVuc2lvblxuICAgICAgICAgIGhlYWRpbmdEaW1lbnNpb24oKVxuICAgICAgICAgIHVwZGF0ZUlmcmFtZUZyb21TYXZlZENvbnRlbnQoKVxuICAgICAgICB9KVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIE5vdGlmeSBlcnJvclxuICAgIGVsc2VcbiAgICAgIG5vdGlmeShIRUFESU5HX1RSQVNGT1JNQVRJT05fRk9SQklEREVOLCAnZXJyb3InLCAyMDAwKVxuICB9LFxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGFkZEFic3RyYWN0OiBmdW5jdGlvbiAoKSB7XG5cbiAgICBpZiAoISQoQUJTVFJBQ1RfU0VMRUNUT1IpLmxlbmd0aCkge1xuXG4gICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgLy8gVGhpcyBzZWN0aW9uIGNhbiBvbmx5IGJlIHBsYWNlZCBhZnRlciBub24gZWRpdGFibGUgaGVhZGVyXG4gICAgICAgICQoTk9OX0VESVRBQkxFX0hFQURFUl9TRUxFQ1RPUikuYWZ0ZXIoYDxzZWN0aW9uIGlkPVwiZG9jLWFic3RyYWN0XCIgcm9sZT1cImRvYy1hYnN0cmFjdFwiPjxoMT5BYnN0cmFjdDwvaDE+PC9zZWN0aW9uPmApXG5cbiAgICAgICAgdXBkYXRlSWZyYW1lRnJvbVNhdmVkQ29udGVudCgpXG4gICAgICB9KVxuICAgIH1cblxuICAgIC8vbW92ZSBjYXJldCBhbmQgc2V0IGZvY3VzIHRvIGFjdGl2ZSBhZGl0b3IgIzEwNVxuICAgIG1vdmVDYXJldCh0aW55bWNlLmFjdGl2ZUVkaXRvci5kb20uc2VsZWN0KGAke0FCU1RSQUNUX1NFTEVDVE9SfSA+IGgxYClbMF0pXG4gICAgc2Nyb2xsVG8oQUJTVFJBQ1RfU0VMRUNUT1IpXG4gIH0sXG5cbiAgLyoqXG4gICAqIFxuICAgKi9cbiAgYWRkQWNrbm93bGVkZ2VtZW50czogZnVuY3Rpb24gKCkge1xuXG4gICAgaWYgKCEkKEFDS05PV0xFREdFTUVOVFNfU0VMRUNUT1IpLmxlbmd0aCkge1xuXG4gICAgICBsZXQgYWNrID0gJChgPHNlY3Rpb24gaWQ9XCJkb2MtYWNrbm93bGVkZ2VtZW50c1wiIHJvbGU9XCJkb2MtYWNrbm93bGVkZ2VtZW50c1wiPjxoMT5BY2tub3dsZWRnZW1lbnRzPC9oMT48L3NlY3Rpb24+YClcblxuICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIC8vIEluc2VydCB0aGlzIHNlY3Rpb24gYWZ0ZXIgbGFzdCBub24gc3BlY2lhbCBzZWN0aW9uIFxuICAgICAgICAvLyBPUiBhZnRlciBhYnN0cmFjdCBzZWN0aW9uIFxuICAgICAgICAvLyBPUiBhZnRlciBub24gZWRpdGFibGUgaGVhZGVyXG4gICAgICAgIGlmICgkKE1BSU5fU0VDVElPTl9TRUxFQ1RPUikubGVuZ3RoKVxuICAgICAgICAgICQoTUFJTl9TRUNUSU9OX1NFTEVDVE9SKS5sYXN0KCkuYWZ0ZXIoYWNrKVxuXG4gICAgICAgIGVsc2UgaWYgKCQoQUJTVFJBQ1RfU0VMRUNUT1IpLmxlbmd0aClcbiAgICAgICAgICAkKEFCU1RSQUNUX1NFTEVDVE9SKS5hZnRlcihhY2spXG5cbiAgICAgICAgZWxzZVxuICAgICAgICAgICQoTk9OX0VESVRBQkxFX0hFQURFUl9TRUxFQ1RPUikuYWZ0ZXIoYWNrKVxuXG4gICAgICAgIHVwZGF0ZUlmcmFtZUZyb21TYXZlZENvbnRlbnQoKVxuICAgICAgfSlcbiAgICB9XG5cbiAgICAvL21vdmUgY2FyZXQgYW5kIHNldCBmb2N1cyB0byBhY3RpdmUgYWRpdG9yICMxMDVcbiAgICBtb3ZlQ2FyZXQodGlueW1jZS5hY3RpdmVFZGl0b3IuZG9tLnNlbGVjdChgJHtBQ0tOT1dMRURHRU1FTlRTX1NFTEVDVE9SfSA+IGgxYClbMF0pXG4gICAgc2Nyb2xsVG8oQUNLTk9XTEVER0VNRU5UU19TRUxFQ1RPUilcbiAgfSxcblxuICAvKipcbiAgICogVGhpcyBtZXRob2QgaXMgdGhlIG1haW4gb25lLiBJdCdzIGNhbGxlZCBiZWNhdXNlIGFsbCB0aW1lcyB0aGUgaW50ZW50IGlzIHRvIGFkZCBhIG5ldyBiaWJsaW9lbnRyeSAoc2luZ2xlIHJlZmVyZW5jZSlcbiAgICogVGhlbiBpdCBjaGVja3MgaWYgaXMgbmVjZXNzYXJ5IHRvIGFkZCB0aGUgZW50aXJlIDxzZWN0aW9uPiBvciBvbmx5IHRoZSBtaXNzaW5nIDx1bD5cbiAgICovXG4gIGFkZEJpYmxpb2VudHJ5OiBmdW5jdGlvbiAoaWQsIHRleHQsIGxpc3RJdGVtKSB7XG5cbiAgICAvLyBBZGQgYmlibGlvZ3JhcGh5IHNlY3Rpb24gaWYgbm90IGV4aXN0c1xuICAgIGlmICghJChCSUJMSU9HUkFQSFlfU0VMRUNUT1IpLmxlbmd0aCkge1xuXG4gICAgICBsZXQgYmlibGlvZ3JhcGh5ID0gJChgPHNlY3Rpb24gaWQ9XCJkb2MtYmlibGlvZ3JhcGh5XCIgcm9sZT1cImRvYy1iaWJsaW9ncmFwaHlcIj48aDE+UmVmZXJlbmNlczwvaDE+PHVsPjwvdWw+PC9zZWN0aW9uPmApXG5cbiAgICAgIC8vIFRoaXMgc2VjdGlvbiBpcyBhZGRlZCBhZnRlciBhY2tub3dsZWRnZW1lbnRzIHNlY3Rpb25cbiAgICAgIC8vIE9SIGFmdGVyIGxhc3Qgbm9uIHNwZWNpYWwgc2VjdGlvblxuICAgICAgLy8gT1IgYWZ0ZXIgYWJzdHJhY3Qgc2VjdGlvblxuICAgICAgLy8gT1IgYWZ0ZXIgbm9uIGVkaXRhYmxlIGhlYWRlciBcbiAgICAgIGlmICgkKEFDS05PV0xFREdFTUVOVFNfU0VMRUNUT1IpLmxlbmd0aClcbiAgICAgICAgJChBQ0tOT1dMRURHRU1FTlRTX1NFTEVDVE9SKS5hZnRlcihiaWJsaW9ncmFwaHkpXG5cbiAgICAgIGVsc2UgaWYgKCQoTUFJTl9TRUNUSU9OX1NFTEVDVE9SKS5sZW5ndGgpXG4gICAgICAgICQoTUFJTl9TRUNUSU9OX1NFTEVDVE9SKS5sYXN0KCkuYWZ0ZXIoYmlibGlvZ3JhcGh5KVxuXG4gICAgICBlbHNlIGlmICgkKEFCU1RSQUNUX1NFTEVDVE9SKS5sZW5ndGgpXG4gICAgICAgICQoQUJTVFJBQ1RfU0VMRUNUT1IpLmFmdGVyKGJpYmxpb2dyYXBoeSlcblxuICAgICAgZWxzZVxuICAgICAgICAkKE5PTl9FRElUQUJMRV9IRUFERVJfU0VMRUNUT1IpLmFmdGVyKGJpYmxpb2dyYXBoeSlcblxuICAgIH1cblxuICAgIC8vIEFkZCB1bCBpbiBiaWJsaW9ncmFwaHkgc2VjdGlvbiBpZiBub3QgZXhpc3RzXG4gICAgaWYgKCEkKEJJQkxJT0dSQVBIWV9TRUxFQ1RPUikuZmluZCgndWwnKS5sZW5ndGgpXG4gICAgICAkKEJJQkxJT0dSQVBIWV9TRUxFQ1RPUikuYXBwZW5kKCc8dWw+PC91bD4nKVxuXG4gICAgLy8gSUYgaWQgYW5kIHRleHQgYXJlbid0IHBhc3NlZCBhcyBwYXJhbWV0ZXJzLCB0aGVzZSBjYW4gYmUgcmV0cmlldmVkIG9yIGluaXQgZnJvbSBoZXJlXG4gICAgaWQgPSAoaWQpID8gaWQgOiBnZXRTdWNjZXNzaXZlRWxlbWVudElkKEJJQkxJT0VOVFJZX1NFTEVDVE9SLCBCSUJMSU9FTlRSWV9TVUZGSVgpXG4gICAgdGV4dCA9IHRleHQgPyB0ZXh0IDogJzxici8+J1xuXG4gICAgbGV0IG5ld0l0ZW0gPSAkKGA8bGkgcm9sZT1cImRvYy1iaWJsaW9lbnRyeVwiIGlkPVwiJHtpZH1cIj48cD4ke3RleHR9PC9wPjwvbGk+YClcblxuICAgIC8vIEFwcGVuZCBuZXcgbGkgdG8gdWwgYXQgbGFzdCBwb3NpdGlvblxuICAgIC8vIE9SIGluc2VydCB0aGUgbmV3IGxpIHJpZ2h0IGFmdGVyIHRoZSBjdXJyZW50IG9uZVxuICAgIGlmICghbGlzdEl0ZW0pXG4gICAgICAkKGAke0JJQkxJT0dSQVBIWV9TRUxFQ1RPUn0gdWxgKS5hcHBlbmQobmV3SXRlbSlcblxuICAgIGVsc2VcbiAgICAgIGxpc3RJdGVtLmFmdGVyKG5ld0l0ZW0pXG4gIH0sXG5cbiAgLyoqXG4gICAqIFxuICAgKi9cbiAgdXBkYXRlQmlibGlvZ3JhcGh5U2VjdGlvbjogZnVuY3Rpb24gKCkge1xuXG4gICAgLy8gU3luY2hyb25pemUgaWZyYW1lIGFuZCBzdG9yZWQgY29udGVudFxuICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuXG4gICAgLy8gUmVtb3ZlIGFsbCBzZWN0aW9ucyB3aXRob3V0IHAgY2hpbGRcbiAgICAkKGAke0JJQkxJT0VOVFJZX1NFTEVDVE9SfTpub3QoOmhhcyhwKSlgKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICQodGhpcykucmVtb3ZlKClcbiAgICB9KVxuICB9LFxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGFkZEVuZG5vdGU6IGZ1bmN0aW9uIChpZCkge1xuXG4gICAgLy8gQWRkIHRoZSBzZWN0aW9uIGlmIGl0IG5vdCBleGlzdHNcbiAgICBpZiAoISQoRU5ETk9URV9TRUxFQ1RPUikubGVuZ3RoKSB7XG5cbiAgICAgIGxldCBlbmRub3RlcyA9ICQoYDxzZWN0aW9uIGlkPVwiZG9jLWVuZG5vdGVzXCIgcm9sZT1cImRvYy1lbmRub3Rlc1wiPjxoMSBkYXRhLXJhc2gtb3JpZ2luYWwtY29udGVudD1cIlwiPkZvb3Rub3RlczwvaDE+PC9zZWN0aW9uPmApXG5cbiAgICAgIC8vIEluc2VydCB0aGlzIHNlY3Rpb24gYWZ0ZXIgYmlibGlvZ3JhcGh5IHNlY3Rpb25cbiAgICAgIC8vIE9SIGFmdGVyIGFja25vd2xlZGdlbWVudHMgc2VjdGlvblxuICAgICAgLy8gT1IgYWZ0ZXIgbm9uIHNwZWNpYWwgc2VjdGlvbiBzZWxlY3RvclxuICAgICAgLy8gT1IgYWZ0ZXIgYWJzdHJhY3Qgc2VjdGlvblxuICAgICAgLy8gT1IgYWZ0ZXIgbm9uIGVkaXRhYmxlIGhlYWRlciBcbiAgICAgIGlmICgkKEJJQkxJT0dSQVBIWV9TRUxFQ1RPUikubGVuZ3RoKVxuICAgICAgICAkKEJJQkxJT0dSQVBIWV9TRUxFQ1RPUikuYWZ0ZXIoZW5kbm90ZXMpXG5cbiAgICAgIGVsc2UgaWYgKCQoQUNLTk9XTEVER0VNRU5UU19TRUxFQ1RPUikubGVuZ3RoKVxuICAgICAgICAkKEFDS05PV0xFREdFTUVOVFNfU0VMRUNUT1IpLmFmdGVyKGVuZG5vdGVzKVxuXG4gICAgICBlbHNlIGlmICgkKE1BSU5fU0VDVElPTl9TRUxFQ1RPUikubGVuZ3RoKVxuICAgICAgICAkKE1BSU5fU0VDVElPTl9TRUxFQ1RPUikubGFzdCgpLmFmdGVyKGVuZG5vdGVzKVxuXG4gICAgICBlbHNlIGlmICgkKEFCU1RSQUNUX1NFTEVDVE9SKS5sZW5ndGgpXG4gICAgICAgICQoQUJTVFJBQ1RfU0VMRUNUT1IpLmFmdGVyKGVuZG5vdGVzKVxuXG4gICAgICBlbHNlXG4gICAgICAgICQoTk9OX0VESVRBQkxFX0hFQURFUl9TRUxFQ1RPUikuYWZ0ZXIoZW5kbm90ZXMpXG4gICAgfVxuXG4gICAgLy8gQ3JlYXRlIGFuZCBhcHBlbmQgdGhlIG5ldyBlbmRub3RlXG4gICAgbGV0IGVuZG5vdGUgPSAkKGA8c2VjdGlvbiByb2xlPVwiZG9jLWVuZG5vdGVcIiBpZD1cIiR7aWR9XCI+PHA+PGJyLz48L3A+PC9zZWN0aW9uPmApXG4gICAgJChFTkROT1RFU19TRUxFQ1RPUikuYXBwZW5kKGVuZG5vdGUpXG4gIH0sXG5cbiAgLyoqXG4gICAqIFxuICAgKi9cbiAgdXBkYXRlU2VjdGlvblRvb2xiYXI6IGZ1bmN0aW9uICgpIHtcblxuICAgIC8vIERyb3Bkb3duIG1lbnUgcmVmZXJlbmNlXG4gICAgbGV0IG1lbnUgPSAkKE1FTlVfU0VMRUNUT1IpXG5cbiAgICBpZiAobWVudS5sZW5ndGgpIHtcbiAgICAgIHNlY3Rpb24ucmVzdG9yZVNlY3Rpb25Ub29sYmFyKG1lbnUpXG5cbiAgICAgIC8vIFNhdmUgY3VycmVudCBzZWxlY3RlZCBlbGVtZW50XG4gICAgICBsZXQgc2VsZWN0ZWRFbGVtZW50ID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Um5nKCkuc3RhcnRDb250YWluZXIpXG5cbiAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnRbMF0ubm9kZVR5cGUgPT0gMylcbiAgICAgICAgc2VsZWN0ZWRFbGVtZW50ID0gc2VsZWN0ZWRFbGVtZW50LnBhcmVudCgpXG5cbiAgICAgIC8vIElmIGN1cnJlbnQgZWxlbWVudCBpcyBwXG4gICAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LmlzKCdwJykgfHwgc2VsZWN0ZWRFbGVtZW50LnBhcmVudCgpLmlzKCdwJykpIHtcblxuICAgICAgICAvLyBDaGVjayBpZiBjYXJldCBpcyBpbnNpZGUgc3BlY2lhbCBzZWN0aW9uXG4gICAgICAgIC8vIEluIHRoaXMgY2FzZSBlbmFibGUgb25seSBmaXJzdCBtZW51aXRlbSBpZiBjYXJldCBpcyBpbiBhYnN0cmFjdFxuICAgICAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LnBhcmVudHMoU1BFQ0lBTF9TRUNUSU9OX1NFTEVDVE9SKS5sZW5ndGgpIHtcblxuICAgICAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQucGFyZW50cyhBQlNUUkFDVF9TRUxFQ1RPUikubGVuZ3RoKVxuICAgICAgICAgICAgbWVudS5jaGlsZHJlbihgOmx0KDEpYCkucmVtb3ZlQ2xhc3MoJ21jZS1kaXNhYmxlZCcpXG5cbiAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEdldCBkZWVwbmVzcyBvZiB0aGUgc2VjdGlvblxuICAgICAgICBsZXQgZGVlcG5lc3MgPSBzZWxlY3RlZEVsZW1lbnQucGFyZW50cyhTRUNUSU9OX1NFTEVDVE9SKS5sZW5ndGggKyAxXG5cbiAgICAgICAgLy8gUmVtb3ZlIGRpc2FibGluZyBjbGFzcyBvbiBmaXJzdCB7ZGVlcG5lc3N9IG1lbnUgaXRlbXNcbiAgICAgICAgbWVudS5jaGlsZHJlbihgOmx0KCR7ZGVlcG5lc3N9KWApLnJlbW92ZUNsYXNzKCdtY2UtZGlzYWJsZWQnKVxuXG4gICAgICAgIC8vIEdldCB0aGUgc2VjdGlvbiBsaXN0IGFuZCB1cGRhdGUgdGhlIGRyb3Bkb3duIHdpdGggdGhlIHJpZ2h0IHRleHRzXG4gICAgICAgIGxldCBsaXN0ID0gc2VjdGlvbi5nZXRBbmNlc3RvclNlY3Rpb25zTGlzdChzZWxlY3RlZEVsZW1lbnQpXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDw9IGxpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBtZW51LmNoaWxkcmVuKGA6ZXEoJHtpfSlgKS5maW5kKCdzcGFuLm1jZS10ZXh0JykudGV4dChsaXN0W2ldKVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIEVuYWJsZSBvbmx5IGZvciB1cGdyYWRlL2Rvd25ncmFkZVxuICAgICAgZWxzZSBpZiAoIXNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKFNQRUNJQUxfU0VDVElPTl9TRUxFQ1RPUikubGVuZ3RoICYmIHNlbGVjdGVkRWxlbWVudC5pcygnaDEsaDIsaDMnKSkge1xuXG4gICAgICAgIC8vIEdldCB0aGUgc2VsZWN0ZWQgc2VjdGlvblxuICAgICAgICBsZXQgc2VsZWN0ZWRTZWN0aW9uID0gc2VsZWN0ZWRFbGVtZW50LnBhcmVudHMoU0VDVElPTl9TRUxFQ1RPUikuZmlyc3QoKVxuXG4gICAgICAgIC8vIEdldCB0aGUgbnVtYmVyIG9mIHRoZSBoZWFkaW5nIChlZy4gSDEgPT4gMSwgSDIgPT4gMilcbiAgICAgICAgbGV0IGluZGV4ID0gcGFyc2VJbnQoc2VsZWN0ZWRFbGVtZW50LnByb3AoJ3RhZ05hbWUnKS50b0xvd2VyQ2FzZSgpLnJlcGxhY2UoJ2gnLCAnJykpXG5cbiAgICAgICAgLy8gR2V0IHRoZSBkZWVwbmVzcyBvZiB0aGUgc2VjdGlvbiAoZWcuIDEgaWYgaXMgYSBtYWluIHNlY3Rpb24sIDIgaWYgaXMgYSBzdWJzZWN0aW9uKVxuICAgICAgICBsZXQgZGVlcG5lc3MgPSBzZWxlY3RlZEVsZW1lbnQucGFyZW50cyhTRUNUSU9OX1NFTEVDVE9SKS5sZW5ndGhcblxuICAgICAgICAvLyBHZXQgdGhlIGxpc3Qgb2YgdGV4dHMgdGhhdCBhcmUgYmVlXG4gICAgICAgIGxldCBsaXN0ID0gc2VjdGlvbi5nZXRBbmNlc3RvclNlY3Rpb25zTGlzdChzZWxlY3RlZEVsZW1lbnQpXG5cbiAgICAgICAgLy8gVGhlIHRleHQgaW5kZXggaW4gbGlzdFxuICAgICAgICBsZXQgaSA9IGRlZXBuZXNzIC0gaW5kZXhcblxuICAgICAgICAvLyBDaGVjayBpZiB0aGUgY3VycmVudCBzZWN0aW9uIGhhcyBhIHByZXZpb3VzIHNlY3Rpb24gXG4gICAgICAgIC8vIEluIHRoaXMgY2FzZSB0aGUgdXBncmFkZSBpcyBwZXJtaXR0ZWRcbiAgICAgICAgaWYgKHNlbGVjdGVkU2VjdGlvbi5wcmV2KCkuaXMoU0VDVElPTl9TRUxFQ1RPUikpIHtcblxuICAgICAgICAgIC8vIG1lbnUgaXRlbSBpbnNpZGUgdGhlIGRyb3Bkb3duXG4gICAgICAgICAgbGV0IG1lbnVJdGVtID0gbWVudS5jaGlsZHJlbihgOmVxKCR7aW5kZXh9KWApXG5cbiAgICAgICAgICBsZXQgdG1wID0gbGlzdFtpbmRleF0ucmVwbGFjZShIRUFESU5HLCAnJylcbiAgICAgICAgICB0bXAgPSB0bXAuc3BsaXQoJy4nKVxuICAgICAgICAgIHRtcFtpbmRleCAtIDFdID0gcGFyc2VJbnQodG1wW2luZGV4IC0gMV0pIC0gMVxuXG4gICAgICAgICAgbGV0IHRleHQgPSBIRUFESU5HICsgdG1wLmpvaW4oJy4nKVxuXG4gICAgICAgICAgbWVudUl0ZW0uZmluZCgnc3Bhbi5tY2UtdGV4dCcpLnRleHQodGV4dClcbiAgICAgICAgICBtZW51SXRlbS5yZW1vdmVDbGFzcygnbWNlLWRpc2FibGVkJylcbiAgICAgICAgICBtZW51SXRlbS5hdHRyKERBVEFfRE9XTkdSQURFLCB0cnVlKVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIGN1cnJlbnQgc2VjdGlvbiBoYXMgYSBwYXJlbnRcbiAgICAgICAgLy8gSW4gdGhpcyBjYXNlIHRoZSB1cGdyYWRlIGlzIHBlcm1pdHRlZFxuICAgICAgICBpZiAoc2VsZWN0ZWRTZWN0aW9uLnBhcmVudChTRUNUSU9OX1NFTEVDVE9SKS5sZW5ndGgpIHtcblxuICAgICAgICAgIGluZGV4ID0gaW5kZXggLSAyXG5cbiAgICAgICAgICAvLyBtZW51IGl0ZW0gaW5zaWRlIHRoZSBkcm9wZG93blxuICAgICAgICAgIGxldCBtZW51SXRlbSA9IG1lbnUuY2hpbGRyZW4oYDplcSgke2luZGV4fSlgKVxuICAgICAgICAgIG1lbnVJdGVtLmZpbmQoJ3NwYW4ubWNlLXRleHQnKS50ZXh0KGxpc3RbaW5kZXhdKVxuICAgICAgICAgIG1lbnVJdGVtLnJlbW92ZUNsYXNzKCdtY2UtZGlzYWJsZWQnKVxuICAgICAgICAgIG1lbnVJdGVtLmF0dHIoREFUQV9VUEdSQURFLCB0cnVlKVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIERpc2FibGUgaW4gYW55IG90aGVyIGNhc2VzXG4gICAgICBlbHNlXG4gICAgICAgIG1lbnUuY2hpbGRyZW4oJzpndCgxMCknKS5hZGRDbGFzcygnbWNlLWRpc2FibGVkJylcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIFxuICAgKi9cbiAgZ2V0QW5jZXN0b3JTZWN0aW9uc0xpc3Q6IGZ1bmN0aW9uIChzZWxlY3RlZEVsZW1lbnQpIHtcblxuICAgIGxldCBwcmVIZWFkZXJzID0gW11cbiAgICBsZXQgbGlzdCA9IFtdXG4gICAgbGV0IHBhcmVudFNlY3Rpb25zID0gc2VsZWN0ZWRFbGVtZW50LnBhcmVudHMoJ3NlY3Rpb24nKVxuXG4gICAgLy8gU2F2ZSBpbmRleCBvZiBhbGwgcGFyZW50IHNlY3Rpb25zXG4gICAgZm9yIChsZXQgaSA9IHBhcmVudFNlY3Rpb25zLmxlbmd0aDsgaSA+IDA7IGktLSkge1xuICAgICAgbGV0IGVsZW0gPSAkKHBhcmVudFNlY3Rpb25zW2kgLSAxXSlcbiAgICAgIGxldCBpbmRleCA9IGVsZW0ucGFyZW50KCkuY2hpbGRyZW4oU0VDVElPTl9TRUxFQ1RPUikuaW5kZXgoZWxlbSkgKyAxXG4gICAgICBwcmVIZWFkZXJzLnB1c2goaW5kZXgpXG4gICAgfVxuXG4gICAgLy8gVXBkYXRlIHRleHQgb2YgYWxsIG1lbnUgaXRlbVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDw9IHByZUhlYWRlcnMubGVuZ3RoOyBpKyspIHtcblxuICAgICAgbGV0IHRleHQgPSBIRUFESU5HXG5cbiAgICAgIC8vIFVwZGF0ZSB0ZXh0IGJhc2VkIG9uIHNlY3Rpb24gc3RydWN0dXJlXG4gICAgICBpZiAoaSAhPSBwcmVIZWFkZXJzLmxlbmd0aCkge1xuICAgICAgICBmb3IgKGxldCB4ID0gMDsgeCA8PSBpOyB4KyspXG4gICAgICAgICAgdGV4dCArPSBgJHtwcmVIZWFkZXJzW3hdICsgKHggPT0gaSA/IDEgOiAwKX0uYFxuICAgICAgfVxuXG4gICAgICAvLyBJbiB0aGlzIGNhc2UgcmFqZSBjaGFuZ2VzIHRleHQgb2YgbmV4dCBzdWIgaGVhZGluZ1xuICAgICAgZWxzZSB7XG4gICAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgaTsgeCsrKVxuICAgICAgICAgIHRleHQgKz0gYCR7cHJlSGVhZGVyc1t4XX0uYFxuXG4gICAgICAgIHRleHQgKz0gJzEuJ1xuICAgICAgfVxuXG4gICAgICBsaXN0LnB1c2godGV4dClcbiAgICB9XG5cbiAgICByZXR1cm4gbGlzdFxuICB9LFxuXG4gIC8qKlxuICAgKiBSZXN0b3JlIG5vcm1hbCB0ZXh0IGluIHNlY3Rpb24gdG9vbGJhciBhbmQgZGlzYWJsZSBhbGxcbiAgICovXG4gIHJlc3RvcmVTZWN0aW9uVG9vbGJhcjogZnVuY3Rpb24gKG1lbnUpIHtcblxuICAgIGxldCBjbnQgPSAxXG5cbiAgICBtZW51LmNoaWxkcmVuKCc6bHQoNiknKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgIGxldCB0ZXh0ID0gSEVBRElOR1xuXG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGNudDsgaSsrKVxuICAgICAgICB0ZXh0ICs9IGAxLmBcblxuICAgICAgLy8gUmVtb3ZlIGRhdGEgZWxlbWVudHNcbiAgICAgICQodGhpcykucmVtb3ZlQXR0cihEQVRBX1VQR1JBREUpXG4gICAgICAkKHRoaXMpLnJlbW92ZUF0dHIoREFUQV9ET1dOR1JBREUpXG5cbiAgICAgICQodGhpcykuZmluZCgnc3Bhbi5tY2UtdGV4dCcpLnRleHQodGV4dClcbiAgICAgICQodGhpcykuYWRkQ2xhc3MoJ21jZS1kaXNhYmxlZCcpXG5cbiAgICAgIGNudCsrXG4gICAgfSlcblxuICAgIC8vIEVuYWJsZSB1cGdyYWRlL2Rvd25ncmFkZSBsYXN0IHRocmVlIG1lbnUgaXRlbXNcbiAgICBtZW51LmNoaWxkcmVuKCc6Z3QoMTApJykucmVtb3ZlQ2xhc3MoJ21jZS1kaXNhYmxlZCcpXG4gIH0sXG5cbiAgLyoqXG4gICAqIFxuICAgKi9cbiAgbWFuYWdlRGVsZXRlOiBmdW5jdGlvbiAoKSB7XG5cbiAgICBsZXQgc2VsZWN0ZWRDb250ZW50ID0gdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldENvbnRlbnQoKVxuXG4gICAgLy8gSWYgdGhlIHNlbGVjdGVkIGNvbnRlbnQgaGFzIEhUTUwgaW5zaWRlXG4gICAgaWYgKHNlbGVjdGVkQ29udGVudC5pbmRleE9mKCc8JykgPiAtMSkge1xuXG4gICAgICBzZWxlY3RlZENvbnRlbnQgPSAkKHNlbGVjdGVkQ29udGVudClcbiAgICAgIGxldCBoYXNTZWN0aW9uID0gZmFsc2VcbiAgICAgIC8vIENoZWNrIGlmIG9uZSBvZiB0aGUgc2VsZWN0ZWQgZWxlbWVudCBpcyBhIHNlY3Rpb25cbiAgICAgIHNlbGVjdGVkQ29udGVudC5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCQodGhpcykuaXMoU0VDVElPTl9TRUxFQ1RPUikpXG4gICAgICAgICAgcmV0dXJuIGhhc1NlY3Rpb24gPSB0cnVlXG4gICAgICB9KVxuXG4gICAgICAvLyBJZiB0aGUgc2VsZWN0ZWQgY29udGVudCBoYXMgYSBzZWN0aW9uIGluc2lkZSwgdGhlbiBtYW5hZ2UgZGVsZXRlXG4gICAgICBpZiAoaGFzU2VjdGlvbikge1xuXG4gICAgICAgIGxldCByYW5nZSA9IHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRSbmcoKVxuICAgICAgICBsZXQgc3RhcnROb2RlID0gJChyYW5nZS5zdGFydENvbnRhaW5lcikucGFyZW50KClcbiAgICAgICAgbGV0IGVuZE5vZGUgPSAkKHJhbmdlLmVuZENvbnRhaW5lcikucGFyZW50KClcbiAgICAgICAgbGV0IGNvbW1vbkFuY2VzdG9yQ29udGFpbmVyID0gJChyYW5nZS5jb21tb25BbmNlc3RvckNvbnRhaW5lcilcblxuICAgICAgICAvLyBEZWVwbmVzcyBpcyByZWxhdGl2ZSB0byB0aGUgY29tbW9uIGFuY2VzdG9yIGNvbnRhaW5lciBvZiB0aGUgcmFuZ2Ugc3RhcnRDb250YWluZXIgYW5kIGVuZFxuICAgICAgICBsZXQgZGVlcG5lc3MgPSBlbmROb2RlLnBhcmVudCgnc2VjdGlvbicpLnBhcmVudHNVbnRpbChjb21tb25BbmNlc3RvckNvbnRhaW5lcikubGVuZ3RoICsgMVxuICAgICAgICBsZXQgY3VycmVudEVsZW1lbnQgPSBlbmROb2RlXG4gICAgICAgIGxldCB0b01vdmVFbGVtZW50cyA9IFtdXG5cbiAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgLy8gR2V0IGFuZCBkZXRhY2ggYWxsIG5leHRfZW5kXG4gICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPD0gZGVlcG5lc3M7IGkrKykge1xuICAgICAgICAgICAgY3VycmVudEVsZW1lbnQubmV4dEFsbCgnc2VjdGlvbixwLGZpZ3VyZSxwcmUsdWwsb2wsYmxvY2txdW90ZScpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICB0b01vdmVFbGVtZW50cy5wdXNoKCQodGhpcykpXG5cbiAgICAgICAgICAgICAgJCh0aGlzKS5kZXRhY2goKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIGN1cnJlbnRFbGVtZW50ID0gY3VycmVudEVsZW1lbnQucGFyZW50KClcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBFeGVjdXRlIGRlbGV0ZVxuICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLmV4ZWNDb21tYW5kKCdkZWxldGUnKVxuXG4gICAgICAgICAgLy8gRGV0YWNoIGFsbCBuZXh0X2JlZ2luXG4gICAgICAgICAgc3RhcnROb2RlLm5leHRBbGwoKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICQodGhpcykuZGV0YWNoKClcbiAgICAgICAgICB9KVxuXG4gICAgICAgICAgLy8gQXBwZW5kIGFsbCBuZXh0X2VuZCB0byBzdGFydG5vZGUgcGFyZW50XG4gICAgICAgICAgdG9Nb3ZlRWxlbWVudHMuZm9yRWFjaChmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgICAgICAgICAgc3RhcnROb2RlLnBhcmVudCgnc2VjdGlvbicpLmFwcGVuZChlbGVtZW50KVxuICAgICAgICAgIH0pXG5cbiAgICAgICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcblxuICAgICAgICAgIC8vIFJlZnJlc2ggaGVhZGluZ3NcbiAgICAgICAgICBoZWFkaW5nRGltZW5zaW9uKClcblxuICAgICAgICAgIC8vIFVwZGF0ZSByZWZlcmVuY2VzIGlmIG5lZWRlZFxuICAgICAgICAgIHVwZGF0ZVJlZmVyZW5jZXMoKVxuXG4gICAgICAgICAgdXBkYXRlSWZyYW1lRnJvbVNhdmVkQ29udGVudCgpXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGRlbGV0ZVNwZWNpYWxTZWN0aW9uOiBmdW5jdGlvbiAoc2VsZWN0ZWRFbGVtZW50KSB7XG5cbiAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgIC8vIFJlbW92ZSB0aGUgc2VjdGlvbiBhbmQgdXBkYXRlIFxuICAgICAgc2VsZWN0ZWRFbGVtZW50LnBhcmVudChTUEVDSUFMX1NFQ1RJT05fU0VMRUNUT1IpLnJlbW92ZSgpXG4gICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcblxuICAgICAgLy8gVXBkYXRlIHJlZmVyZW5jZXNcbiAgICAgIHVwZGF0ZVJlZmVyZW5jZXMoKVxuICAgICAgdXBkYXRlSWZyYW1lRnJvbVNhdmVkQ29udGVudCgpXG4gICAgfSlcbiAgfSxcblxuICAvKipcbiAgICogXG4gICAqL1xuICBjdXJzb3JJblNlY3Rpb246IGZ1bmN0aW9uIChzZWxlY3Rpb24pIHtcblxuICAgIHJldHVybiAkKHNlbGVjdGlvbi5nZXROb2RlKCkpLmlzKFNFQ1RJT05fU0VMRUNUT1IpIHx8IEJvb2xlYW4oJChzZWxlY3Rpb24uZ2V0Tm9kZSgpKS5wYXJlbnRzKFNFQ1RJT05fU0VMRUNUT1IpLmxlbmd0aClcbiAgfSxcblxuICAvKipcbiAgICogXG4gICAqL1xuICBjdXJzb3JJblNwZWNpYWxTZWN0aW9uOiBmdW5jdGlvbiAoc2VsZWN0aW9uKSB7XG5cbiAgICByZXR1cm4gJChzZWxlY3Rpb24uZ2V0Tm9kZSgpKS5pcyhTUEVDSUFMX1NFQ1RJT05fU0VMRUNUT1IpIHx8XG4gICAgICBCb29sZWFuKCQoc2VsZWN0aW9uLmdldFJuZygpLnN0YXJ0Q29udGFpbmVyKS5wYXJlbnRzKFNQRUNJQUxfU0VDVElPTl9TRUxFQ1RPUikubGVuZ3RoKSB8fFxuICAgICAgQm9vbGVhbigkKHNlbGVjdGlvbi5nZXRSbmcoKS5lbmRDb250YWluZXIpLnBhcmVudHMoU1BFQ0lBTF9TRUNUSU9OX1NFTEVDVE9SKS5sZW5ndGgpXG4gIH1cbn0iLCJ0aW55bWNlLlBsdWdpbk1hbmFnZXIuYWRkKCdyYWplX2Nyb3NzcmVmJywgZnVuY3Rpb24gKGVkaXRvciwgdXJsKSB7XG5cbiAgLy8gQWRkIGEgYnV0dG9uIHRoYXQgaGFuZGxlIHRoZSBpbmxpbmUgZWxlbWVudFxuICBlZGl0b3IuYWRkQnV0dG9uKCdyYWplX2Nyb3NzcmVmJywge1xuICAgIHRpdGxlOiAncmFqZV9jcm9zc3JlZicsXG4gICAgaWNvbjogJ2ljb24tYW5jaG9yJyxcbiAgICB0b29sdGlwOiAnQ3Jvc3MtcmVmZXJlbmNlJyxcbiAgICBkaXNhYmxlZFN0YXRlU2VsZWN0b3I6IGAke0RJU0FCTEVfU0VMRUNUT1JfSU5MSU5FfSw6aGVhZGVyYCxcblxuICAgIC8vIEJ1dHRvbiBiZWhhdmlvdXJcbiAgICBvbmNsaWNrOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuXG4gICAgICBsZXQgcmVmZXJlbmNlYWJsZUxpc3QgPSB7XG4gICAgICAgIHNlY3Rpb25zOiBjcm9zc3JlZi5nZXRBbGxSZWZlcmVuY2VhYmxlU2VjdGlvbnMoKSxcbiAgICAgICAgdGFibGVzOiBjcm9zc3JlZi5nZXRBbGxSZWZlcmVuY2VhYmxlVGFibGVzKCksXG4gICAgICAgIGZpZ3VyZXM6IGNyb3NzcmVmLmdldEFsbFJlZmVyZW5jZWFibGVGaWd1cmVzKCksXG4gICAgICAgIGxpc3RpbmdzOiBjcm9zc3JlZi5nZXRBbGxSZWZlcmVuY2VhYmxlTGlzdGluZ3MoKSxcbiAgICAgICAgZm9ybXVsYXM6IGNyb3NzcmVmLmdldEFsbFJlZmVyZW5jZWFibGVGb3JtdWxhcygpLFxuICAgICAgICByZWZlcmVuY2VzOiBjcm9zc3JlZi5nZXRBbGxSZWZlcmVuY2VhYmxlUmVmZXJlbmNlcygpXG4gICAgICB9XG5cbiAgICAgIGVkaXRvci53aW5kb3dNYW5hZ2VyLm9wZW4oe1xuICAgICAgICAgIHRpdGxlOiAnQ3Jvc3MtcmVmZXJlbmNlIGVkaXRvcicsXG4gICAgICAgICAgdXJsOiAnanMvcmFqZS1jb3JlL3BsdWdpbi9yYWplX2Nyb3NzcmVmLmh0bWwnLFxuICAgICAgICAgIHdpZHRoOiA1MDAsXG4gICAgICAgICAgaGVpZ2h0OiA4MDAsXG4gICAgICAgICAgb25DbG9zZTogZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFxuICAgICAgICAgICAgICogVGhpcyBiZWhhdmlvdXIgaXMgY2FsbGVkIHdoZW4gdXNlciBwcmVzcyBcIkFERCBORVcgUkVGRVJFTkNFXCIgXG4gICAgICAgICAgICAgKiBidXR0b24gZnJvbSB0aGUgbW9kYWxcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgaWYgKHRpbnltY2UuYWN0aXZlRWRpdG9yLmNyZWF0ZU5ld1JlZmVyZW5jZSkge1xuXG4gICAgICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgICAgICAgIC8vIEdldCBzdWNjZXNzaXZlIGJpYmxpb2VudHJ5IGlkXG4gICAgICAgICAgICAgICAgbGV0IGlkID0gZ2V0U3VjY2Vzc2l2ZUVsZW1lbnRJZChCSUJMSU9FTlRSWV9TRUxFQ1RPUiwgQklCTElPRU5UUllfU1VGRklYKVxuXG4gICAgICAgICAgICAgICAgLy8gQ3JlYXRlIHRoZSByZWZlcmVuY2UgdGhhdCBwb2ludHMgdG8gdGhlIG5leHQgaWRcbiAgICAgICAgICAgICAgICBjcm9zc3JlZi5hZGQoaWQpXG5cbiAgICAgICAgICAgICAgICAvLyBBZGQgdGhlIG5leHQgYmlibGlvZW50cnlcbiAgICAgICAgICAgICAgICBzZWN0aW9uLmFkZEJpYmxpb2VudHJ5KGlkKVxuXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSByZWZlcmVuY2VcbiAgICAgICAgICAgICAgICBjcm9zc3JlZi51cGRhdGUoKVxuXG4gICAgICAgICAgICAgICAgLy8gTW92ZSBjYXJldCB0byBzdGFydCBvZiB0aGUgbmV3IGJpYmxpb2VudHJ5IGVsZW1lbnRcbiAgICAgICAgICAgICAgICAvLyBJc3N1ZSAjMTA1IEZpcmVmb3ggKyBDaHJvbWl1bVxuICAgICAgICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZXRDdXJzb3JMb2NhdGlvbigkKHRpbnltY2UuYWN0aXZlRWRpdG9yLmRvbS5nZXQoaWQpKS5maW5kKCdwJylbMF0sIGZhbHNlKVxuICAgICAgICAgICAgICAgIHNjcm9sbFRvKGAke0JJQkxJT0VOVFJZX1NFTEVDVE9SfSMke2lkfWApXG4gICAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgICAgLy8gU2V0IHZhcmlhYmxlIG51bGwgZm9yIHN1Y2Nlc3NpdmUgdXNhZ2VzXG4gICAgICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLmNyZWF0ZU5ld1JlZmVyZW5jZSA9IG51bGxcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBUaGlzIGlzIGNhbGxlZCBpZiBhIG5vcm1hbCByZWZlcmVuY2UgaXMgc2VsZWN0ZWQgZnJvbSBtb2RhbFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBlbHNlIGlmICh0aW55bWNlLmFjdGl2ZUVkaXRvci5yZWZlcmVuY2UpIHtcblxuICAgICAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICAgICAgICAvLyBDcmVhdGUgdGhlIGVtcHR5IGFuY2hvciBhbmQgdXBkYXRlIGl0cyBjb250ZW50XG4gICAgICAgICAgICAgICAgY3Jvc3NyZWYuYWRkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnJlZmVyZW5jZSlcbiAgICAgICAgICAgICAgICBjcm9zc3JlZi51cGRhdGUoKVxuXG4gICAgICAgICAgICAgICAgbGV0IHNlbGVjdGVkTm9kZSA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcblxuICAgICAgICAgICAgICAgIC8vIFRoaXMgc2VsZWN0IHRoZSBsYXN0IGVsZW1lbnQgKGxhc3QgYnkgb3JkZXIpIGFuZCBjb2xsYXBzZSB0aGUgc2VsZWN0aW9uIGFmdGVyIHRoZSBub2RlXG4gICAgICAgICAgICAgICAgLy8gIzEwNSBGaXJlZm94ICsgQ2hyb21pdW1cbiAgICAgICAgICAgICAgICAvL3RpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZXRDdXJzb3JMb2NhdGlvbigkKHRpbnltY2UuYWN0aXZlRWRpdG9yLmRvbS5zZWxlY3QoYGFbaHJlZj1cIiMke3RpbnltY2UuYWN0aXZlRWRpdG9yLnJlZmVyZW5jZX1cIl06bGFzdC1jaGlsZGApKVswXSwgZmFsc2UpXG4gICAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgICAgLy8gU2V0IHZhcmlhYmxlIG51bGwgZm9yIHN1Y2Nlc3NpdmUgdXNhZ2VzXG4gICAgICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnJlZmVyZW5jZSA9IG51bGxcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgLy8gTGlzdCBvZiBhbGwgcmVmZXJlbmNlYWJsZSBlbGVtZW50c1xuICAgICAgICByZWZlcmVuY2VhYmxlTGlzdClcbiAgICB9XG4gIH0pXG5cbiAgY3Jvc3NyZWYgPSB7XG4gICAgZ2V0QWxsUmVmZXJlbmNlYWJsZVNlY3Rpb25zOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgIGxldCBzZWN0aW9ucyA9IFtdXG5cbiAgICAgICQoJ3NlY3Rpb24nKS5lYWNoKGZ1bmN0aW9uICgpIHtcblxuICAgICAgICBsZXQgbGV2ZWwgPSAnJ1xuXG4gICAgICAgIGlmICghJCh0aGlzKS5pcyhFTkROT1RFX1NFTEVDVE9SKSkge1xuXG4gICAgICAgICAgLy8gU2VjdGlvbnMgd2l0aG91dCByb2xlIGhhdmUgOmFmdGVyXG4gICAgICAgICAgaWYgKCEkKHRoaXMpLmF0dHIoJ3JvbGUnKSkge1xuXG4gICAgICAgICAgICAvLyBTYXZlIGl0cyBkZWVwbmVzc1xuICAgICAgICAgICAgbGV0IHBhcmVudFNlY3Rpb25zID0gJCh0aGlzKS5wYXJlbnRzVW50aWwoJ2RpdiNyYWplX3Jvb3QnKVxuXG4gICAgICAgICAgICBpZiAocGFyZW50U2VjdGlvbnMubGVuZ3RoKSB7XG5cbiAgICAgICAgICAgICAgLy8gSXRlcmF0ZSBpdHMgcGFyZW50cyBiYWNrd2FyZHMgKGhpZ2VyIGZpcnN0KVxuICAgICAgICAgICAgICBmb3IgKGxldCBpID0gcGFyZW50U2VjdGlvbnMubGVuZ3RoOyBpLS07IGkgPiAwKSB7XG4gICAgICAgICAgICAgICAgbGV0IHNlY3Rpb24gPSAkKHBhcmVudFNlY3Rpb25zW2ldKVxuICAgICAgICAgICAgICAgIGxldmVsICs9IGAke3NlY3Rpb24ucGFyZW50KCkuY2hpbGRyZW4oU0VDVElPTl9TRUxFQ1RPUikuaW5kZXgoc2VjdGlvbikrMX0uYFxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEN1cnJlbnQgaW5kZXhcbiAgICAgICAgICAgIGxldmVsICs9IGAkeyQodGhpcykucGFyZW50KCkuY2hpbGRyZW4oU0VDVElPTl9TRUxFQ1RPUikuaW5kZXgoJCh0aGlzKSkrMX0uYFxuICAgICAgICAgIH1cblxuICAgICAgICAgIHNlY3Rpb25zLnB1c2goe1xuICAgICAgICAgICAgcmVmZXJlbmNlOiAkKHRoaXMpLmF0dHIoJ2lkJyksXG4gICAgICAgICAgICB0ZXh0OiAkKHRoaXMpLmZpbmQoJzpoZWFkZXInKS5maXJzdCgpLnRleHQoKSxcbiAgICAgICAgICAgIGxldmVsOiBsZXZlbFxuICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICAgIH0pXG5cbiAgICAgIHJldHVybiBzZWN0aW9uc1xuICAgIH0sXG5cbiAgICBnZXRBbGxSZWZlcmVuY2VhYmxlVGFibGVzOiBmdW5jdGlvbiAoKSB7XG4gICAgICBsZXQgdGFibGVzID0gW11cblxuICAgICAgJCgnZmlndXJlOmhhcyh0YWJsZSknKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGFibGVzLnB1c2goe1xuICAgICAgICAgIHJlZmVyZW5jZTogJCh0aGlzKS5hdHRyKCdpZCcpLFxuICAgICAgICAgIHRleHQ6ICQodGhpcykuZmluZCgnZmlnY2FwdGlvbicpLnRleHQoKVxuICAgICAgICB9KVxuICAgICAgfSlcblxuICAgICAgcmV0dXJuIHRhYmxlc1xuICAgIH0sXG5cbiAgICBnZXRBbGxSZWZlcmVuY2VhYmxlTGlzdGluZ3M6IGZ1bmN0aW9uICgpIHtcbiAgICAgIGxldCBsaXN0aW5ncyA9IFtdXG5cbiAgICAgICQoJ2ZpZ3VyZTpoYXMocHJlOmhhcyhjb2RlKSknKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbGlzdGluZ3MucHVzaCh7XG4gICAgICAgICAgcmVmZXJlbmNlOiAkKHRoaXMpLmF0dHIoJ2lkJyksXG4gICAgICAgICAgdGV4dDogJCh0aGlzKS5maW5kKCdmaWdjYXB0aW9uJykudGV4dCgpXG4gICAgICAgIH0pXG4gICAgICB9KVxuXG4gICAgICByZXR1cm4gbGlzdGluZ3NcbiAgICB9LFxuXG4gICAgZ2V0QWxsUmVmZXJlbmNlYWJsZUZpZ3VyZXM6IGZ1bmN0aW9uICgpIHtcbiAgICAgIGxldCBmaWd1cmVzID0gW11cblxuICAgICAgJChGSUdVUkVfSU1BR0VfU0VMRUNUT1IpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICBmaWd1cmVzLnB1c2goe1xuICAgICAgICAgIHJlZmVyZW5jZTogJCh0aGlzKS5hdHRyKCdpZCcpLFxuICAgICAgICAgIHRleHQ6ICQodGhpcykuZmluZCgnZmlnY2FwdGlvbicpLnRleHQoKVxuICAgICAgICB9KVxuICAgICAgfSlcblxuICAgICAgcmV0dXJuIGZpZ3VyZXNcbiAgICB9LFxuXG4gICAgZ2V0QWxsUmVmZXJlbmNlYWJsZUZvcm11bGFzOiBmdW5jdGlvbiAoKSB7XG4gICAgICBsZXQgZm9ybXVsYXMgPSBbXVxuXG4gICAgICAkKGZvcm11bGFib3hfc2VsZWN0b3IpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICBmb3JtdWxhcy5wdXNoKHtcbiAgICAgICAgICByZWZlcmVuY2U6ICQodGhpcykucGFyZW50cyhGSUdVUkVfU0VMRUNUT1IpLmF0dHIoJ2lkJyksXG4gICAgICAgICAgdGV4dDogYEZvcm11bGEgJHskKHRoaXMpLnBhcmVudHMoRklHVVJFX1NFTEVDVE9SKS5maW5kKCdzcGFuLmNnZW4nKS50ZXh0KCl9YFxuICAgICAgICB9KVxuICAgICAgfSlcblxuICAgICAgcmV0dXJuIGZvcm11bGFzXG4gICAgfSxcblxuICAgIGdldEFsbFJlZmVyZW5jZWFibGVSZWZlcmVuY2VzOiBmdW5jdGlvbiAoKSB7XG4gICAgICBsZXQgcmVmZXJlbmNlcyA9IFtdXG4gICAgICAkKCdzZWN0aW9uW3JvbGU9ZG9jLWJpYmxpb2dyYXBoeV0gbGknKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmVmZXJlbmNlcy5wdXNoKHtcbiAgICAgICAgICByZWZlcmVuY2U6ICQodGhpcykuYXR0cignaWQnKSxcbiAgICAgICAgICB0ZXh0OiAkKHRoaXMpLnRleHQoKSxcbiAgICAgICAgICBsZXZlbDogJCh0aGlzKS5pbmRleCgpICsgMVxuICAgICAgICB9KVxuICAgICAgfSlcblxuICAgICAgcmV0dXJuIHJlZmVyZW5jZXNcbiAgICB9LFxuXG4gICAgYWRkOiBmdW5jdGlvbiAocmVmZXJlbmNlLCBuZXh0KSB7XG5cbiAgICAgIC8vIENyZWF0ZSB0aGUgZW1wdHkgcmVmZXJlbmNlIHdpdGggYSB3aGl0ZXNwYWNlIGF0IHRoZSBlbmRcbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZXRDb250ZW50KGA8YSBjb250ZW50ZWRpdGFibGU9XCJmYWxzZVwiIGhyZWY9XCIjJHtyZWZlcmVuY2V9XCI+Jm5ic3A7PC9hPiZuYnNwO2ApXG4gICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcbiAgICB9LFxuXG4gICAgdXBkYXRlOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgIC8vIFVwZGF0ZSB0aGUgcmVmZXJlbmNlIChpbiBzYXZlZCBjb250ZW50KVxuICAgICAgcmVmZXJlbmNlcygpXG5cbiAgICAgIC8vIFByZXZlbnQgYWRkaW5nIG9mIG5lc3RlZCBhIGFzIGZvb3Rub3Rlc1xuICAgICAgJCgnYT5zdXA+YScpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICAkKHRoaXMpLnBhcmVudCgpLmh0bWwoJCh0aGlzKS50ZXh0KCkpXG4gICAgICB9KVxuXG4gICAgICAvLyBVcGRhdGUgZWRpdG9yIHdpdGggdGhlIHJpZ2h0IHJlZmVyZW5jZXNcbiAgICAgIHVwZGF0ZUlmcmFtZUZyb21TYXZlZENvbnRlbnQoKVxuICAgIH1cbiAgfVxufSlcblxudGlueW1jZS5QbHVnaW5NYW5hZ2VyLmFkZCgncmFqZV9mb290bm90ZXMnLCBmdW5jdGlvbiAoZWRpdG9yLCB1cmwpIHtcblxuICBlZGl0b3IuYWRkQnV0dG9uKCdyYWplX2Zvb3Rub3RlcycsIHtcbiAgICB0aXRsZTogJ3JhamVfZm9vdG5vdGVzJyxcbiAgICBpY29uOiAnaWNvbi1mb290bm90ZXMnLFxuICAgIHRvb2x0aXA6ICdGb290bm90ZScsXG4gICAgZGlzYWJsZWRTdGF0ZVNlbGVjdG9yOiBgJHtESVNBQkxFX1NFTEVDVE9SX0lOTElORX0sOmhlYWRlcmAsXG5cbiAgICAvLyBCdXR0b24gYmVoYXZpb3VyXG4gICAgb25jbGljazogZnVuY3Rpb24gKCkge1xuXG4gICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgLy8gR2V0IHN1Y2Nlc3NpdmUgYmlibGlvZW50cnkgaWRcbiAgICAgICAgbGV0IHJlZmVyZW5jZSA9IGdldFN1Y2Nlc3NpdmVFbGVtZW50SWQoRU5ETk9URV9TRUxFQ1RPUiwgRU5ETk9URV9TVUZGSVgpXG5cbiAgICAgICAgLy8gQ3JlYXRlIHRoZSByZWZlcmVuY2UgdGhhdCBwb2ludHMgdG8gdGhlIG5leHQgaWRcbiAgICAgICAgY3Jvc3NyZWYuYWRkKHJlZmVyZW5jZSlcblxuICAgICAgICAvLyBBZGQgdGhlIG5leHQgYmlibGlvZW50cnlcbiAgICAgICAgc2VjdGlvbi5hZGRFbmRub3RlKHJlZmVyZW5jZSlcblxuICAgICAgICAvLyBVcGRhdGUgdGhlIHJlZmVyZW5jZVxuICAgICAgICBjcm9zc3JlZi51cGRhdGUoKVxuXG4gICAgICAgIC8vIE1vdmUgY2FyZXQgYXQgdGhlIGVuZCBvZiBwIGluIGxhc3QgaW5zZXJ0ZWQgZW5kbm90ZVxuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2V0Q3Vyc29yTG9jYXRpb24odGlueW1jZS5hY3RpdmVFZGl0b3IuZG9tLnNlbGVjdChgJHtFTkROT1RFX1NFTEVDVE9SfSMke3JlZmVyZW5jZX0+cGApWzBdLCAxKVxuICAgICAgfSlcbiAgICB9XG4gIH0pXG59KVxuXG5mdW5jdGlvbiByZWZlcmVuY2VzKCkge1xuICAvKiBSZWZlcmVuY2VzICovXG4gICQoXCJhW2hyZWZdXCIpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgIGlmICgkLnRyaW0oJCh0aGlzKS50ZXh0KCkpID09ICcnKSB7XG4gICAgICB2YXIgY3VyX2lkID0gJCh0aGlzKS5hdHRyKFwiaHJlZlwiKTtcbiAgICAgIG9yaWdpbmFsX2NvbnRlbnQgPSAkKHRoaXMpLmh0bWwoKVxuICAgICAgb3JpZ2luYWxfcmVmZXJlbmNlID0gY3VyX2lkXG4gICAgICByZWZlcmVuY2VkX2VsZW1lbnQgPSAkKGN1cl9pZCk7XG5cbiAgICAgIGlmIChyZWZlcmVuY2VkX2VsZW1lbnQubGVuZ3RoID4gMCkge1xuICAgICAgICByZWZlcmVuY2VkX2VsZW1lbnRfZmlndXJlID0gcmVmZXJlbmNlZF9lbGVtZW50LmZpbmQoXG4gICAgICAgICAgZmlndXJlYm94X3NlbGVjdG9yX2ltZyArIFwiLFwiICsgZmlndXJlYm94X3NlbGVjdG9yX3N2Zyk7XG4gICAgICAgIHJlZmVyZW5jZWRfZWxlbWVudF90YWJsZSA9IHJlZmVyZW5jZWRfZWxlbWVudC5maW5kKHRhYmxlYm94X3NlbGVjdG9yX3RhYmxlKTtcbiAgICAgICAgcmVmZXJlbmNlZF9lbGVtZW50X2Zvcm11bGEgPSByZWZlcmVuY2VkX2VsZW1lbnQuZmluZChcbiAgICAgICAgICBmb3JtdWxhYm94X3NlbGVjdG9yX2ltZyArIFwiLFwiICsgZm9ybXVsYWJveF9zZWxlY3Rvcl9zcGFuICsgXCIsXCIgKyBmb3JtdWxhYm94X3NlbGVjdG9yX21hdGggKyBcIixcIiArIGZvcm11bGFib3hfc2VsZWN0b3Jfc3ZnKTtcbiAgICAgICAgcmVmZXJlbmNlZF9lbGVtZW50X2xpc3RpbmcgPSByZWZlcmVuY2VkX2VsZW1lbnQuZmluZChsaXN0aW5nYm94X3NlbGVjdG9yX3ByZSk7XG4gICAgICAgIC8qIFNwZWNpYWwgc2VjdGlvbnMgKi9cbiAgICAgICAgaWYgKFxuICAgICAgICAgICQoXCJzZWN0aW9uW3JvbGU9ZG9jLWFic3RyYWN0XVwiICsgY3VyX2lkKS5sZW5ndGggPiAwIHx8XG4gICAgICAgICAgJChcInNlY3Rpb25bcm9sZT1kb2MtYmlibGlvZ3JhcGh5XVwiICsgY3VyX2lkKS5sZW5ndGggPiAwIHx8XG4gICAgICAgICAgJChcInNlY3Rpb25bcm9sZT1kb2MtZW5kbm90ZXNdXCIgKyBjdXJfaWQgKyBcIiwgc2VjdGlvbltyb2xlPWRvYy1mb290bm90ZXNdXCIgKyBjdXJfaWQpLmxlbmd0aCA+IDAgfHxcbiAgICAgICAgICAkKFwic2VjdGlvbltyb2xlPWRvYy1hY2tub3dsZWRnZW1lbnRzXVwiICsgY3VyX2lkKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgJCh0aGlzKS5odG1sKFwiPHNwYW4gY2xhc3M9XFxcImNnZW5cXFwiIGNvbnRlbnRlZGl0YWJsZT1cXFwiZmFsc2VcXFwiICBkYXRhLXJhc2gtb3JpZ2luYWwtY29udGVudD1cXFwiXCIgKyBvcmlnaW5hbF9jb250ZW50ICtcbiAgICAgICAgICAgIFwiXFxcIj5TZWN0aW9uIDxxPlwiICsgJChjdXJfaWQgKyBcIiA+IGgxXCIpLnRleHQoKSArIFwiPC9xPjwvc3Bhbj5cIik7XG4gICAgICAgICAgLyogQmlibGlvZ3JhcGhpYyByZWZlcmVuY2VzICovXG4gICAgICAgIH0gZWxzZSBpZiAoJChjdXJfaWQpLnBhcmVudHMoXCJzZWN0aW9uW3JvbGU9ZG9jLWJpYmxpb2dyYXBoeV1cIikubGVuZ3RoID4gMCkge1xuICAgICAgICAgIHZhciBjdXJfY291bnQgPSAkKGN1cl9pZCkucHJldkFsbChcImxpXCIpLmxlbmd0aCArIDE7XG4gICAgICAgICAgJCh0aGlzKS5odG1sKFwiPHNwYW4gY2xhc3M9XFxcImNnZW5cXFwiIGNvbnRlbnRlZGl0YWJsZT1cXFwiZmFsc2VcXFwiIGRhdGEtcmFzaC1vcmlnaW5hbC1jb250ZW50PVxcXCJcIiArIG9yaWdpbmFsX2NvbnRlbnQgK1xuICAgICAgICAgICAgXCJcXFwiIHRpdGxlPVxcXCJCaWJsaW9ncmFwaGljIHJlZmVyZW5jZSBcIiArIGN1cl9jb3VudCArIFwiOiBcIiArXG4gICAgICAgICAgICAkKGN1cl9pZCkudGV4dCgpLnJlcGxhY2UoL1xccysvZywgXCIgXCIpLnRyaW0oKSArIFwiXFxcIj5bXCIgKyBjdXJfY291bnQgKyBcIl08L3NwYW4+XCIpO1xuICAgICAgICAgIC8qIEZvb3Rub3RlIHJlZmVyZW5jZXMgKGRvYy1mb290bm90ZXMgYW5kIGRvYy1mb290bm90ZSBpbmNsdWRlZCBmb3IgZWFzaW5nIGJhY2sgY29tcGF0aWJpbGl0eSkgKi9cbiAgICAgICAgfSBlbHNlIGlmICgkKGN1cl9pZCkucGFyZW50cyhcInNlY3Rpb25bcm9sZT1kb2MtZW5kbm90ZXNdLCBzZWN0aW9uW3JvbGU9ZG9jLWZvb3Rub3Rlc11cIikubGVuZ3RoID4gMCkge1xuICAgICAgICAgIHZhciBjdXJfY29udGVudHMgPSAkKHRoaXMpLnBhcmVudCgpLmNvbnRlbnRzKCk7XG4gICAgICAgICAgdmFyIGN1cl9pbmRleCA9IGN1cl9jb250ZW50cy5pbmRleCgkKHRoaXMpKTtcbiAgICAgICAgICB2YXIgcHJldl90bXAgPSBudWxsO1xuICAgICAgICAgIHdoaWxlIChjdXJfaW5kZXggPiAwICYmICFwcmV2X3RtcCkge1xuICAgICAgICAgICAgY3VyX3ByZXYgPSBjdXJfY29udGVudHNbY3VyX2luZGV4IC0gMV07XG4gICAgICAgICAgICBpZiAoY3VyX3ByZXYubm9kZVR5cGUgIT0gMyB8fCAkKGN1cl9wcmV2KS50ZXh0KCkucmVwbGFjZSgvIC9nLCAnJykgIT0gJycpIHtcbiAgICAgICAgICAgICAgcHJldl90bXAgPSBjdXJfcHJldjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGN1cl9pbmRleC0tO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgcHJldl9lbCA9ICQocHJldl90bXApO1xuICAgICAgICAgIHZhciBjdXJyZW50X2lkID0gJCh0aGlzKS5hdHRyKFwiaHJlZlwiKTtcbiAgICAgICAgICB2YXIgZm9vdG5vdGVfZWxlbWVudCA9ICQoY3VycmVudF9pZCk7XG4gICAgICAgICAgaWYgKGZvb3Rub3RlX2VsZW1lbnQubGVuZ3RoID4gMCAmJlxuICAgICAgICAgICAgZm9vdG5vdGVfZWxlbWVudC5wYXJlbnQoXCJzZWN0aW9uW3JvbGU9ZG9jLWVuZG5vdGVzXSwgc2VjdGlvbltyb2xlPWRvYy1mb290bm90ZXNdXCIpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHZhciBjb3VudCA9ICQoY3VycmVudF9pZCkucHJldkFsbChcInNlY3Rpb25cIikubGVuZ3RoICsgMTtcbiAgICAgICAgICAgIGlmIChwcmV2X2VsLmZpbmQoXCJzdXBcIikuaGFzQ2xhc3MoXCJmblwiKSkge1xuICAgICAgICAgICAgICAkKHRoaXMpLmJlZm9yZShcIjxzdXAgY2xhc3M9XFxcImNnZW5cXFwiIGNvbnRlbnRlZGl0YWJsZT1cXFwiZmFsc2VcXFwiIGRhdGEtcmFzaC1vcmlnaW5hbC1jb250ZW50PVxcXCJcXFwiPiw8L3N1cD5cIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvKiBTVEFSVCBSZW1vdmVkIDxhPiBmcm9tIDxzdXA+ICovXG4gICAgICAgICAgICAkKHRoaXMpLmh0bWwoXCI8c3VwIGNsYXNzPVxcXCJmbiBjZ2VuXFxcIiBjb250ZW50ZWRpdGFibGU9XFxcImZhbHNlXFxcIiBkYXRhLXJhc2gtb3JpZ2luYWwtY29udGVudD1cXFwiXCIgKyBvcmlnaW5hbF9jb250ZW50ICsgXCJcXFwiXCIgK1xuICAgICAgICAgICAgICBcIm5hbWU9XFxcImZuX3BvaW50ZXJfXCIgKyBjdXJyZW50X2lkLnJlcGxhY2UoXCIjXCIsIFwiXCIpICtcbiAgICAgICAgICAgICAgXCJcXFwiIHRpdGxlPVxcXCJGb290bm90ZSBcIiArIGNvdW50ICsgXCI6IFwiICtcbiAgICAgICAgICAgICAgJChjdXJyZW50X2lkKS50ZXh0KCkucmVwbGFjZSgvXFxzKy9nLCBcIiBcIikudHJpbSgpICsgXCJcXFwiPlwiICsgY291bnQgKyBcIjwvc3VwPlwiKTtcbiAgICAgICAgICAgIC8qIEVORCBSZW1vdmVkIDxhPiBmcm9tIDxzdXA+ICovXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICQodGhpcykuaHRtbChcIjxzcGFuIGNsYXNzPVxcXCJlcnJvciBjZ2VuXFxcIiBjb250ZW50ZWRpdGFibGU9XFxcImZhbHNlXFxcIiBkYXRhLXJhc2gtb3JpZ2luYWwtY29udGVudD1cXFwiXCIgKyBvcmlnaW5hbF9jb250ZW50ICtcbiAgICAgICAgICAgICAgXCJcXFwiPkVSUjogZm9vdG5vdGUgJ1wiICsgY3VycmVudF9pZC5yZXBsYWNlKFwiI1wiLCBcIlwiKSArIFwiJyBkb2VzIG5vdCBleGlzdDwvc3Bhbj5cIik7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8qIENvbW1vbiBzZWN0aW9ucyAqL1xuICAgICAgICB9IGVsc2UgaWYgKCQoXCJzZWN0aW9uXCIgKyBjdXJfaWQpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICB2YXIgY3VyX2NvdW50ID0gJChjdXJfaWQpLmZpbmRIaWVyYXJjaGljYWxOdW1iZXIoXG4gICAgICAgICAgICBcInNlY3Rpb246bm90KFtyb2xlPWRvYy1hYnN0cmFjdF0pOm5vdChbcm9sZT1kb2MtYmlibGlvZ3JhcGh5XSk6XCIgK1xuICAgICAgICAgICAgXCJub3QoW3JvbGU9ZG9jLWVuZG5vdGVzXSk6bm90KFtyb2xlPWRvYy1mb290bm90ZXNdKTpub3QoW3JvbGU9ZG9jLWFja25vd2xlZGdlbWVudHNdKVwiKTtcbiAgICAgICAgICBpZiAoY3VyX2NvdW50ICE9IG51bGwgJiYgY3VyX2NvdW50ICE9IFwiXCIpIHtcbiAgICAgICAgICAgICQodGhpcykuaHRtbChcIjxzcGFuIGNsYXNzPVxcXCJjZ2VuXFxcIiBjb250ZW50ZWRpdGFibGU9XFxcImZhbHNlXFxcIiBkYXRhLXJhc2gtb3JpZ2luYWwtY29udGVudD1cXFwiXCIgKyBvcmlnaW5hbF9jb250ZW50ICtcbiAgICAgICAgICAgICAgXCJcXFwiPlNlY3Rpb24gXCIgKyBjdXJfY291bnQgKyBcIjwvc3Bhbj5cIik7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8qIFJlZmVyZW5jZSB0byBmaWd1cmUgYm94ZXMgKi9cbiAgICAgICAgfSBlbHNlIGlmIChyZWZlcmVuY2VkX2VsZW1lbnRfZmlndXJlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICB2YXIgY3VyX2NvdW50ID0gcmVmZXJlbmNlZF9lbGVtZW50X2ZpZ3VyZS5maW5kTnVtYmVyKGZpZ3VyZWJveF9zZWxlY3Rvcik7XG4gICAgICAgICAgaWYgKGN1cl9jb3VudCAhPSAwKSB7XG4gICAgICAgICAgICAkKHRoaXMpLmh0bWwoXCI8c3BhbiBjbGFzcz1cXFwiY2dlblxcXCIgY29udGVudGVkaXRhYmxlPVxcXCJmYWxzZVxcXCIgZGF0YS1yYXNoLW9yaWdpbmFsLWNvbnRlbnQ9XFxcIlwiICsgb3JpZ2luYWxfY29udGVudCArXG4gICAgICAgICAgICAgIFwiXFxcIj5GaWd1cmUgXCIgKyBjdXJfY291bnQgKyBcIjwvc3Bhbj5cIik7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8qIFJlZmVyZW5jZSB0byB0YWJsZSBib3hlcyAqL1xuICAgICAgICB9IGVsc2UgaWYgKHJlZmVyZW5jZWRfZWxlbWVudF90YWJsZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgdmFyIGN1cl9jb3VudCA9IHJlZmVyZW5jZWRfZWxlbWVudF90YWJsZS5maW5kTnVtYmVyKHRhYmxlYm94X3NlbGVjdG9yKTtcbiAgICAgICAgICBpZiAoY3VyX2NvdW50ICE9IDApIHtcbiAgICAgICAgICAgICQodGhpcykuaHRtbChcIjxzcGFuIGNsYXNzPVxcXCJjZ2VuXFxcIiBjb250ZW50ZWRpdGFibGU9XFxcImZhbHNlXFxcIiBkYXRhLXJhc2gtb3JpZ2luYWwtY29udGVudD1cXFwiXCIgKyBvcmlnaW5hbF9jb250ZW50ICtcbiAgICAgICAgICAgICAgXCJcXFwiPlRhYmxlIFwiICsgY3VyX2NvdW50ICsgXCI8L3NwYW4+XCIpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvKiBSZWZlcmVuY2UgdG8gZm9ybXVsYSBib3hlcyAqL1xuICAgICAgICB9IGVsc2UgaWYgKHJlZmVyZW5jZWRfZWxlbWVudF9mb3JtdWxhLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICB2YXIgY3VyX2NvdW50ID0gcmVmZXJlbmNlZF9lbGVtZW50X2Zvcm11bGEuZmluZE51bWJlcihmb3JtdWxhYm94X3NlbGVjdG9yKTtcbiAgICAgICAgICBpZiAoY3VyX2NvdW50ICE9IDApIHtcbiAgICAgICAgICAgICQodGhpcykuaHRtbChcIjxzcGFuIGNsYXNzPVxcXCJjZ2VuXFxcIiBjb250ZW50ZWRpdGFibGU9XFxcImZhbHNlXFxcIiBkYXRhLXJhc2gtb3JpZ2luYWwtY29udGVudD1cXFwiXCIgKyBvcmlnaW5hbF9jb250ZW50ICtcbiAgICAgICAgICAgICAgXCJcXFwiPkZvcm11bGEgXCIgKyBjdXJfY291bnQgKyBcIjwvc3Bhbj5cIik7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8qIFJlZmVyZW5jZSB0byBsaXN0aW5nIGJveGVzICovXG4gICAgICAgIH0gZWxzZSBpZiAocmVmZXJlbmNlZF9lbGVtZW50X2xpc3RpbmcubGVuZ3RoID4gMCkge1xuICAgICAgICAgIHZhciBjdXJfY291bnQgPSByZWZlcmVuY2VkX2VsZW1lbnRfbGlzdGluZy5maW5kTnVtYmVyKGxpc3Rpbmdib3hfc2VsZWN0b3IpO1xuICAgICAgICAgIGlmIChjdXJfY291bnQgIT0gMCkge1xuICAgICAgICAgICAgJCh0aGlzKS5odG1sKFwiPHNwYW4gY2xhc3M9XFxcImNnZW5cXFwiIGNvbnRlbnRlZGl0YWJsZT1cXFwiZmFsc2VcXFwiIGRhdGEtcmFzaC1vcmlnaW5hbC1jb250ZW50PVxcXCJcIiArIG9yaWdpbmFsX2NvbnRlbnQgK1xuICAgICAgICAgICAgICBcIlxcXCI+TGlzdGluZyBcIiArIGN1cl9jb3VudCArIFwiPC9zcGFuPlwiKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgJCh0aGlzKS5odG1sKFwiPHNwYW4gY2xhc3M9XFxcImVycm9yIGNnZW5cXFwiIGNvbnRlbnRlZGl0YWJsZT1cXFwiZmFsc2VcXFwiIGRhdGEtcmFzaC1vcmlnaW5hbC1jb250ZW50PVxcXCJcIiArIG9yaWdpbmFsX2NvbnRlbnQgK1xuICAgICAgICAgICAgXCJcXFwiPkVSUjogcmVmZXJlbmNlZCBlbGVtZW50ICdcIiArIGN1cl9pZC5yZXBsYWNlKFwiI1wiLCBcIlwiKSArXG4gICAgICAgICAgICBcIicgaGFzIG5vdCB0aGUgY29ycmVjdCB0eXBlIChpdCBzaG91bGQgYmUgZWl0aGVyIGEgZmlndXJlLCBhIHRhYmxlLCBhIGZvcm11bGEsIGEgbGlzdGluZywgb3IgYSBzZWN0aW9uKTwvc3Bhbj5cIik7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICQodGhpcykucmVwbGFjZVdpdGgoXCI8c3BhbiBjbGFzcz1cXFwiZXJyb3IgY2dlblxcXCIgY29udGVudGVkaXRhYmxlPVxcXCJmYWxzZVxcXCIgZGF0YS1yYXNoLW9yaWdpbmFsLWNvbnRlbnQ9XFxcIlwiICsgb3JpZ2luYWxfY29udGVudCArXG4gICAgICAgICAgXCJcXFwiPkVSUjogcmVmZXJlbmNlZCBlbGVtZW50ICdcIiArIGN1cl9pZC5yZXBsYWNlKFwiI1wiLCBcIlwiKSArIFwiJyBkb2VzIG5vdCBleGlzdDwvc3Bhbj5cIik7XG4gICAgICB9XG4gICAgfVxuICB9KTtcbiAgLyogL0VORCBSZWZlcmVuY2VzICovXG59XG5cbmZ1bmN0aW9uIHVwZGF0ZVJlZmVyZW5jZXMoKSB7XG5cbiAgaWYgKCQoJ3NwYW4uY2dlbltkYXRhLXJhc2gtb3JpZ2luYWwtY29udGVudF0sc3VwLmNnZW4uZm4nKS5sZW5ndGgpIHtcblxuICAgIC8vIFJlc3RvcmUgYWxsIHNhdmVkIGNvbnRlbnRcbiAgICAkKCdzcGFuLmNnZW5bZGF0YS1yYXNoLW9yaWdpbmFsLWNvbnRlbnRdLHN1cC5jZ2VuLmZuJykuZWFjaChmdW5jdGlvbiAoKSB7XG5cbiAgICAgIC8vIFNhdmUgb3JpZ2luYWwgY29udGVudCBhbmQgcmVmZXJlbmNlXG4gICAgICBsZXQgb3JpZ2luYWxfY29udGVudCA9ICQodGhpcykuYXR0cignZGF0YS1yYXNoLW9yaWdpbmFsLWNvbnRlbnQnKVxuICAgICAgbGV0IG9yaWdpbmFsX3JlZmVyZW5jZSA9ICQodGhpcykucGFyZW50KCdhJykuYXR0cignaHJlZicpXG5cbiAgICAgICQodGhpcykucGFyZW50KCdhJykucmVwbGFjZVdpdGgoYDxhIGNvbnRlbnRlZGl0YWJsZT1cImZhbHNlXCIgaHJlZj1cIiR7b3JpZ2luYWxfcmVmZXJlbmNlfVwiPiR7b3JpZ2luYWxfY29udGVudH08L2E+YClcbiAgICB9KVxuXG4gICAgcmVmZXJlbmNlcygpXG4gIH1cbn0iLCIvKipcbiAqIFRoaXMgc2NyaXB0IGNvbnRhaW5zIGFsbCBmaWd1cmUgYm94IGF2YWlsYWJsZSB3aXRoIFJBU0guXG4gKiBcbiAqIHBsdWdpbnM6XG4gKiAgcmFqZV90YWJsZVxuICogIHJhamVfZmlndXJlXG4gKiAgcmFqZV9mb3JtdWxhXG4gKiAgcmFqZV9saXN0aW5nXG4gKi9cbmxldCByZW1vdmVfbGlzdGluZyA9IDBcblxuLyoqXG4gKiBcbiAqIEBwYXJhbSB7Kn0gZm9ybXVsYVZhbHVlIFxuICogQHBhcmFtIHsqfSBjYWxsYmFjayBcbiAqL1xuZnVuY3Rpb24gb3BlbklubGluZUZvcm11bGFFZGl0b3IoZm9ybXVsYVZhbHVlLCBjYWxsYmFjaykge1xuICB0aW55bWNlLmFjdGl2ZUVkaXRvci53aW5kb3dNYW5hZ2VyLm9wZW4oe1xuICAgICAgdGl0bGU6ICdNYXRoIGZvcm11bGEgZWRpdG9yJyxcbiAgICAgIHVybDogJ2pzL3JhamUtY29yZS9wbHVnaW4vcmFqZV9mb3JtdWxhLmh0bWwnLFxuICAgICAgd2lkdGg6IDgwMCxcbiAgICAgIGhlaWdodDogNTAwLFxuICAgICAgb25DbG9zZTogZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIGxldCBvdXRwdXQgPSB0aW55bWNlLmFjdGl2ZUVkaXRvci5mb3JtdWxhX291dHB1dFxuXG4gICAgICAgIC8vIElmIGF0IGxlYXN0IGZvcm11bGEgaXMgd3JpdHRlblxuICAgICAgICBpZiAob3V0cHV0ICE9IG51bGwpIHtcblxuICAgICAgICAgIC8vIElmIGhhcyBpZCwgUkFKRSBtdXN0IHVwZGF0ZSBpdFxuICAgICAgICAgIGlmIChvdXRwdXQuZm9ybXVsYV9pZClcbiAgICAgICAgICAgIGlubGluZV9mb3JtdWxhLnVwZGF0ZShvdXRwdXQuZm9ybXVsYV9zdmcsIG91dHB1dC5mb3JtdWxhX2lkKVxuXG4gICAgICAgICAgLy8gT3IgYWRkIGl0IG5vcm1hbGx5XG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgaW5saW5lX2Zvcm11bGEuYWRkKG91dHB1dC5mb3JtdWxhX3N2ZylcblxuICAgICAgICAgIC8vIFNldCBmb3JtdWxhIG51bGxcbiAgICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5mb3JtdWxhX291dHB1dCA9IG51bGxcbiAgICAgICAgfVxuXG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLndpbmRvd01hbmFnZXIuY2xvc2UoKVxuICAgICAgfVxuICAgIH0sXG4gICAgZm9ybXVsYVZhbHVlXG4gIClcbn1cblxuLyoqXG4gKiBcbiAqIEBwYXJhbSB7Kn0gZm9ybXVsYVZhbHVlIFxuICogQHBhcmFtIHsqfSBjYWxsYmFjayBcbiAqL1xuZnVuY3Rpb24gb3BlbkZvcm11bGFFZGl0b3IoZm9ybXVsYVZhbHVlLCBjYWxsYmFjaykge1xuICB0aW55bWNlLmFjdGl2ZUVkaXRvci53aW5kb3dNYW5hZ2VyLm9wZW4oe1xuICAgICAgdGl0bGU6ICdNYXRoIGZvcm11bGEgZWRpdG9yJyxcbiAgICAgIHVybDogJ2pzL3JhamUtY29yZS9wbHVnaW4vcmFqZV9mb3JtdWxhLmh0bWwnLFxuICAgICAgd2lkdGg6IDgwMCxcbiAgICAgIGhlaWdodDogNTAwLFxuICAgICAgb25DbG9zZTogZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIGxldCBvdXRwdXQgPSB0aW55bWNlLmFjdGl2ZUVkaXRvci5mb3JtdWxhX291dHB1dFxuXG4gICAgICAgIC8vIElmIGF0IGxlYXN0IGZvcm11bGEgaXMgd3JpdHRlblxuICAgICAgICBpZiAob3V0cHV0ICE9IG51bGwpIHtcblxuICAgICAgICAgIC8vIElmIGhhcyBpZCwgUkFKRSBtdXN0IHVwZGF0ZSBpdFxuICAgICAgICAgIGlmIChvdXRwdXQuZm9ybXVsYV9pZClcbiAgICAgICAgICAgIGZvcm11bGEudXBkYXRlKG91dHB1dC5mb3JtdWxhX3N2Zywgb3V0cHV0LmZvcm11bGFfaWQpXG5cbiAgICAgICAgICAvLyBPciBhZGQgaXQgbm9ybWFsbHlcbiAgICAgICAgICBlbHNlXG4gICAgICAgICAgICBmb3JtdWxhLmFkZChvdXRwdXQuZm9ybXVsYV9zdmcpXG5cbiAgICAgICAgICAvLyBTZXQgZm9ybXVsYSBudWxsXG4gICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IuZm9ybXVsYV9vdXRwdXQgPSBudWxsXG4gICAgICAgIH1cblxuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci53aW5kb3dNYW5hZ2VyLmNsb3NlKClcbiAgICAgIH1cbiAgICB9LFxuICAgIGZvcm11bGFWYWx1ZVxuICApXG59XG5cbi8qKlxuICogUmFqZV90YWJsZVxuICovXG50aW55bWNlLlBsdWdpbk1hbmFnZXIuYWRkKCdyYWplX3RhYmxlJywgZnVuY3Rpb24gKGVkaXRvciwgdXJsKSB7XG5cbiAgLy8gQWRkIGEgYnV0dG9uIHRoYXQgaGFuZGxlIHRoZSBpbmxpbmUgZWxlbWVudFxuICBlZGl0b3IuYWRkQnV0dG9uKCdyYWplX3RhYmxlJywge1xuICAgIHRpdGxlOiAncmFqZV90YWJsZScsXG4gICAgaWNvbjogJ2ljb24tdGFibGUnLFxuICAgIHRvb2x0aXA6ICdUYWJsZScsXG4gICAgZGlzYWJsZWRTdGF0ZVNlbGVjdG9yOiBESVNBQkxFX1NFTEVDVE9SX0ZJR1VSRVMsXG5cbiAgICAvLyBCdXR0b24gYmVoYXZpb3VyXG4gICAgb25jbGljazogZnVuY3Rpb24gKCkge1xuXG4gICAgICAvLyBPbiBjbGljayBhIGRpYWxvZyBpcyBvcGVuZWRcbiAgICAgIGVkaXRvci53aW5kb3dNYW5hZ2VyLm9wZW4oe1xuICAgICAgICB0aXRsZTogJ1NlbGVjdCBUYWJsZSBzaXplJyxcbiAgICAgICAgYm9keTogW3tcbiAgICAgICAgICB0eXBlOiAndGV4dGJveCcsXG4gICAgICAgICAgbmFtZTogJ3dpZHRoJyxcbiAgICAgICAgICBsYWJlbDogJ0NvbHVtbnMnXG4gICAgICAgIH0sIHtcbiAgICAgICAgICB0eXBlOiAndGV4dGJveCcsXG4gICAgICAgICAgbmFtZTogJ2hlaWd0aCcsXG4gICAgICAgICAgbGFiZWw6ICdSb3dzJ1xuICAgICAgICB9XSxcbiAgICAgICAgb25TdWJtaXQ6IGZ1bmN0aW9uIChlKSB7XG5cbiAgICAgICAgICAvLyBHZXQgd2lkdGggYW5kIGhlaWd0aFxuICAgICAgICAgIHRhYmxlLmFkZChlLmRhdGEud2lkdGgsIGUuZGF0YS5oZWlndGgpXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfVxuICB9KVxuXG4gIC8vIEJlY2F1c2Ugc29tZSBiZWhhdmlvdXJzIGFyZW4ndCBhY2NlcHRlZCwgUkFKRSBtdXN0IGNoZWNrIHNlbGVjdGlvbiBhbmQgYWNjZXB0IGJhY2tzcGFjZSwgY2FuYyBhbmQgZW50ZXIgcHJlc3NcbiAgZWRpdG9yLm9uKCdrZXlEb3duJywgZnVuY3Rpb24gKGUpIHtcblxuICAgIC8vIFRPRE8gaWYgaW5zaWRlIHRhYmxlXG5cbiAgICAvLyBrZXlDb2RlIDggaXMgYmFja3NwYWNlLCA0NiBpcyBjYW5jXG4gICAgaWYgKGUua2V5Q29kZSA9PSA4KVxuICAgICAgcmV0dXJuIGhhbmRsZUZpZ3VyZURlbGV0ZSh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24pXG5cbiAgICBpZiAoZS5rZXlDb2RlID09IDQ2KVxuICAgICAgcmV0dXJuIGhhbmRsZUZpZ3VyZUNhbmModGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uKVxuXG4gICAgLy8gSGFuZGxlIGVudGVyIGtleSBpbiBmaWdjYXB0aW9uXG4gICAgaWYgKGUua2V5Q29kZSA9PSAxMylcbiAgICAgIHJldHVybiBoYW5kbGVGaWd1cmVFbnRlcih0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24pXG5cbiAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpXG4gIH0pXG5cbiAgLy8gSGFuZGxlIHN0cmFuZ2Ugc3RydWN0dXJhbCBtb2RpZmljYXRpb24gZW1wdHkgZmlndXJlcyBvciB3aXRoIGNhcHRpb24gYXMgZmlyc3QgY2hpbGRcbiAgZWRpdG9yLm9uKCdub2RlQ2hhbmdlJywgZnVuY3Rpb24gKGUpIHtcbiAgICBoYW5kbGVGaWd1cmVDaGFuZ2UodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uKVxuICB9KVxuXG4gIHRhYmxlID0ge1xuXG4gICAgLyoqXG4gICAgICogQWRkIHRoZSBuZXcgdGFibGUgKHdpdGggZ2l2ZW4gc2l6ZSkgYXQgdGhlIGNhcmV0IHBvc2l0aW9uXG4gICAgICovXG4gICAgYWRkOiBmdW5jdGlvbiAod2lkdGgsIGhlaWd0aCkge1xuXG4gICAgICAvLyBHZXQgdGhlIHJlZmVyZW5jZSBvZiB0aGUgY3VycmVudCBzZWxlY3RlZCBlbGVtZW50XG4gICAgICBsZXQgc2VsZWN0ZWRFbGVtZW50ID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuXG4gICAgICAvLyBHZXQgdGhlIHJlZmVyZW5jZSBvZiB0aGUgbmV3IGNyZWF0ZWQgdGFibGVcbiAgICAgIGxldCBuZXdUYWJsZSA9IHRoaXMuY3JlYXRlKHdpZHRoLCBoZWlndGgsIGdldFN1Y2Nlc3NpdmVFbGVtZW50SWQoRklHVVJFX1RBQkxFX1NFTEVDVE9SLCBUQUJMRV9TVUZGSVgpKVxuXG4gICAgICAvLyBCZWdpbiBhdG9taWMgVU5ETyBsZXZlbCBcbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAvLyBDaGVjayBpZiB0aGUgc2VsZWN0ZWQgZWxlbWVudCBpcyBub3QgZW1wdHksIGFuZCBhZGQgdGFibGUgYWZ0ZXJcbiAgICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC50ZXh0KCkudHJpbSgpLmxlbmd0aCAhPSAwKSB7XG5cbiAgICAgICAgICAvLyBJZiBzZWxlY3Rpb24gaXMgYXQgc3RhcnQgb2YgdGhlIHNlbGVjdGVkIGVsZW1lbnRcbiAgICAgICAgICBpZiAodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldFJuZygpLnN0YXJ0T2Zmc2V0ID09IDApXG4gICAgICAgICAgICBzZWxlY3RlZEVsZW1lbnQuYmVmb3JlKG5ld1RhYmxlKVxuXG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgc2VsZWN0ZWRFbGVtZW50LmFmdGVyKG5ld1RhYmxlKVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gSWYgc2VsZWN0ZWQgZWxlbWVudCBpcyBlbXB0eSwgcmVwbGFjZSBpdCB3aXRoIHRoZSBuZXcgdGFibGVcbiAgICAgICAgZWxzZVxuICAgICAgICAgIHNlbGVjdGVkRWxlbWVudC5yZXBsYWNlV2l0aChuZXdUYWJsZSlcblxuICAgICAgICAvLyBTYXZlIHVwZGF0ZXMgXG4gICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuXG4gICAgICAgIC8vIFVwZGF0ZSBhbGwgY2FwdGlvbnMgd2l0aCBSQVNIIGZ1bmN0aW9uXG4gICAgICAgIGNhcHRpb25zKClcblxuICAgICAgICAvLyBVcGRhdGUgYWxsIGNyb3NzLXJlZlxuICAgICAgICB1cGRhdGVSZWZlcmVuY2VzKClcblxuICAgICAgICAvLyBVcGRhdGUgUmVuZGVyZWQgUkFTSFxuICAgICAgICB1cGRhdGVJZnJhbWVGcm9tU2F2ZWRDb250ZW50KClcbiAgICAgIH0pXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSB0aGUgbmV3IHRhYmxlIHVzaW5nIHBhc3NlZCB3aWR0aCBhbmQgaGVpZ2h0XG4gICAgICovXG4gICAgY3JlYXRlOiBmdW5jdGlvbiAod2lkdGgsIGhlaWdodCwgaWQpIHtcblxuICAgICAgLy8gSWYgd2lkdGggYW5kIGhlaWd0aCBhcmUgcG9zaXRpdmVcbiAgICAgIHRyeSB7XG4gICAgICAgIGlmICh3aWR0aCA+IDAgJiYgaGVpZ2h0ID4gMCkge1xuXG4gICAgICAgICAgLy8gQ3JlYXRlIGZpZ3VyZSBhbmQgdGFibGVcbiAgICAgICAgICBsZXQgZmlndXJlID0gJChgPGZpZ3VyZSBpZD1cIiR7aWR9XCI+PC9maWd1cmU+YClcbiAgICAgICAgICBsZXQgdGFibGUgPSAkKGA8dGFibGU+PC90YWJsZT5gKVxuXG4gICAgICAgICAgLy8gUG9wdWxhdGUgd2l0aCB3aWR0aCAmIGhlaWd0aFxuICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDw9IGhlaWdodDsgaSsrKSB7XG5cbiAgICAgICAgICAgIGxldCByb3cgPSAkKGA8dHI+PC90cj5gKVxuICAgICAgICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB3aWR0aDsgeCsrKSB7XG5cbiAgICAgICAgICAgICAgaWYgKGkgPT0gMClcbiAgICAgICAgICAgICAgICByb3cuYXBwZW5kKGA8dGg+SGVhZGluZyBjZWxsICR7eCsxfTwvdGg+YClcblxuICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgcm93LmFwcGVuZChgPHRkPjxwPkRhdGEgY2VsbCAke3grMX08L3A+PC90ZD5gKVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0YWJsZS5hcHBlbmQocm93KVxuICAgICAgICAgIH1cblxuICAgICAgICAgIGZpZ3VyZS5hcHBlbmQodGFibGUpXG4gICAgICAgICAgZmlndXJlLmFwcGVuZChgPGZpZ2NhcHRpb24+Q2FwdGlvbi48L2ZpZ2NhcHRpb24+YClcblxuICAgICAgICAgIHJldHVybiBmaWd1cmVcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZSkge31cbiAgICB9XG4gIH1cbn0pXG5cbi8qKlxuICogUmFqZV9maWd1cmVcbiAqL1xudGlueW1jZS5QbHVnaW5NYW5hZ2VyLmFkZCgncmFqZV9pbWFnZScsIGZ1bmN0aW9uIChlZGl0b3IsIHVybCkge1xuXG4gIC8vIEFkZCBhIGJ1dHRvbiB0aGF0IGhhbmRsZSB0aGUgaW5saW5lIGVsZW1lbnRcbiAgZWRpdG9yLmFkZEJ1dHRvbigncmFqZV9pbWFnZScsIHtcbiAgICB0aXRsZTogJ3JhamVfaW1hZ2UnLFxuICAgIGljb246ICdpY29uLWltYWdlJyxcbiAgICB0b29sdGlwOiAnSW1hZ2UgYmxvY2snLFxuICAgIGRpc2FibGVkU3RhdGVTZWxlY3RvcjogRElTQUJMRV9TRUxFQ1RPUl9GSUdVUkVTLFxuXG4gICAgLy8gQnV0dG9uIGJlaGF2aW91clxuICAgIG9uY2xpY2s6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgbGV0IGZpbGVuYW1lID0gc2VsZWN0SW1hZ2UoKVxuXG4gICAgICBpZiAoZmlsZW5hbWUgIT0gbnVsbClcbiAgICAgICAgaW1hZ2UuYWRkKGZpbGVuYW1lLCBmaWxlbmFtZSlcbiAgICB9XG4gIH0pXG5cbiAgLy8gQmVjYXVzZSBzb21lIGJlaGF2aW91cnMgYXJlbid0IGFjY2VwdGVkLCBSQUpFIG11c3QgY2hlY2sgc2VsZWN0aW9uIGFuZCBhY2NlcHQgYmFja3NwYWNlLCBjYW5jIGFuZCBlbnRlciBwcmVzc1xuICBlZGl0b3Iub24oJ2tleURvd24nLCBmdW5jdGlvbiAoZSkge1xuXG5cbiAgICAvLyBrZXlDb2RlIDggaXMgYmFja3NwYWNlXG4gICAgaWYgKGUua2V5Q29kZSA9PSA4KVxuICAgICAgcmV0dXJuIGhhbmRsZUZpZ3VyZURlbGV0ZSh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24pXG5cbiAgICBpZiAoZS5rZXlDb2RlID09IDQ2KVxuICAgICAgcmV0dXJuIGhhbmRsZUZpZ3VyZUNhbmModGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uKVxuXG4gICAgLy8gSGFuZGxlIGVudGVyIGtleSBpbiBmaWdjYXB0aW9uXG4gICAgaWYgKGUua2V5Q29kZSA9PSAxMylcbiAgICAgIHJldHVybiBoYW5kbGVGaWd1cmVFbnRlcih0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24pXG5cbiAgfSlcblxuICBpbWFnZSA9IHtcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIGFkZDogZnVuY3Rpb24gKHVybCwgYWx0KSB7XG5cbiAgICAgIC8vIEdldCB0aGUgcmVmZXJlY2Ugb2YgdGhlIHNlbGVjdGVkIGVsZW1lbnRcbiAgICAgIGxldCBzZWxlY3RlZEVsZW1lbnQgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG4gICAgICBsZXQgbmV3RmlndXJlID0gdGhpcy5jcmVhdGUodXJsLCBhbHQsIGdldFN1Y2Nlc3NpdmVFbGVtZW50SWQoRklHVVJFX0lNQUdFX1NFTEVDVE9SLCBJTUFHRV9TVUZGSVgpKVxuXG4gICAgICAvLyBCZWdpbiBhdG9taWMgVU5ETyBsZXZlbCBcbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAvLyBDaGVjayBpZiB0aGUgc2VsZWN0ZWQgZWxlbWVudCBpcyBub3QgZW1wdHksIGFuZCBhZGQgdGFibGUgYWZ0ZXJcbiAgICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC50ZXh0KCkudHJpbSgpLmxlbmd0aCAhPSAwKSB7XG5cbiAgICAgICAgICAvLyBJZiBzZWxlY3Rpb24gaXMgYXQgc3RhcnQgb2YgdGhlIHNlbGVjdGVkIGVsZW1lbnRcbiAgICAgICAgICBpZiAodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldFJuZygpLnN0YXJ0T2Zmc2V0ID09IDApXG4gICAgICAgICAgICBzZWxlY3RlZEVsZW1lbnQuYmVmb3JlKG5ld0ZpZ3VyZSlcblxuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIHNlbGVjdGVkRWxlbWVudC5hZnRlcihuZXdGaWd1cmUpXG4gICAgICAgIH1cblxuICAgICAgICAvLyBJZiBzZWxlY3RlZCBlbGVtZW50IGlzIGVtcHR5LCByZXBsYWNlIGl0IHdpdGggdGhlIG5ldyB0YWJsZVxuICAgICAgICBlbHNlXG4gICAgICAgICAgc2VsZWN0ZWRFbGVtZW50LnJlcGxhY2VXaXRoKG5ld0ZpZ3VyZSlcblxuICAgICAgICAvLyBTYXZlIHVwZGF0ZXMgXG4gICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuXG4gICAgICAgIC8vIFVwZGF0ZSBhbGwgY2FwdGlvbnMgd2l0aCBSQVNIIGZ1bmN0aW9uXG4gICAgICAgIGNhcHRpb25zKClcblxuICAgICAgICAvLyBVcGRhdGUgYWxsIGNyb3NzLXJlZlxuICAgICAgICB1cGRhdGVSZWZlcmVuY2VzKClcblxuICAgICAgICAvLyBVcGRhdGUgUmVuZGVyZWQgUkFTSFxuICAgICAgICB1cGRhdGVJZnJhbWVGcm9tU2F2ZWRDb250ZW50KClcbiAgICAgIH0pXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIGNyZWF0ZTogZnVuY3Rpb24gKHVybCwgYWx0LCBpZCkge1xuICAgICAgcmV0dXJuICQoYDxmaWd1cmUgaWQ9XCIke2lkfVwiPjxwPjxpbWcgc3JjPVwiJHt1cmx9XCIgJHthbHQ/J2FsdD1cIicrYWx0KydcIic6Jyd9IC8+PC9wPjxmaWdjYXB0aW9uPkNhcHRpb24uPC9maWdjYXB0aW9uPjwvZmlndXJlPmApXG4gICAgfVxuICB9XG59KVxuXG4vKipcbiAqIFJhamVfZm9ybXVsYVxuICovXG50aW55bWNlLlBsdWdpbk1hbmFnZXIuYWRkKCdyYWplX2Zvcm11bGEnLCBmdW5jdGlvbiAoZWRpdG9yLCB1cmwpIHtcblxuICAvLyBBZGQgYSBidXR0b24gdGhhdCBoYW5kbGUgdGhlIGlubGluZSBlbGVtZW50XG4gIGVkaXRvci5hZGRCdXR0b24oJ3JhamVfZm9ybXVsYScsIHtcbiAgICB0aXRsZTogJ3JhamVfZm9ybXVsYScsXG4gICAgaWNvbjogJ2ljb24tZm9ybXVsYScsXG4gICAgdG9vbHRpcDogJ0Zvcm11bGEnLFxuICAgIGRpc2FibGVkU3RhdGVTZWxlY3RvcjogRElTQUJMRV9TRUxFQ1RPUl9GSUdVUkVTLFxuXG4gICAgLy8gQnV0dG9uIGJlaGF2aW91clxuICAgIG9uY2xpY2s6IGZ1bmN0aW9uICgpIHtcbiAgICAgIG9wZW5Gb3JtdWxhRWRpdG9yKClcbiAgICB9XG4gIH0pXG5cbiAgLy8gQmVjYXVzZSBzb21lIGJlaGF2aW91cnMgYXJlbid0IGFjY2VwdGVkLCBSQUpFIG11c3QgY2hlY2sgc2VsZWN0aW9uIGFuZCBhY2NlcHQgYmFja3NwYWNlLCBjYW5jIGFuZCBlbnRlciBwcmVzc1xuICBlZGl0b3Iub24oJ2tleURvd24nLCBmdW5jdGlvbiAoZSkge1xuXG4gICAgbGV0IHNlbGVjdGVkRWxlbWVudCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcblxuICAgIGlmIChmb3JtdWxhLmN1cnNvckluRm9ybXVsYShzZWxlY3RlZEVsZW1lbnQpKSB7XG5cbiAgICAgIC8vIGtleUNvZGUgOCBpcyBiYWNrc3BhY2VcbiAgICAgIGlmIChlLmtleUNvZGUgPT0gOCkge1xuICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpXG4gICAgICAgIHJldHVybiBoYW5kbGVGaWd1cmVEZWxldGUodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uKVxuICAgICAgfVxuXG4gICAgICBpZiAoZS5rZXlDb2RlID09IDQ2KSB7XG4gICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKClcbiAgICAgICAgcmV0dXJuIGhhbmRsZUZpZ3VyZUNhbmModGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uKVxuICAgICAgfVxuXG4gICAgICAvLyBIYW5kbGUgZW50ZXIga2V5IGluIGZpZ2NhcHRpb25cbiAgICAgIGlmIChlLmtleUNvZGUgPT0gMTMpIHtcbiAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKVxuICAgICAgICByZXR1cm4gaGFuZGxlRmlndXJlRW50ZXIodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uKVxuICAgICAgfVxuXG4gICAgICAvLyBCbG9jayBwcmludGFibGUgY2hhcnMgaW4gcFxuICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC5pcygncCcpICYmIGNoZWNrSWZQcmludGFibGVDaGFyKGUua2V5Q29kZSkpIHtcbiAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKVxuICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgIH1cbiAgICB9XG4gIH0pXG5cbiAgZWRpdG9yLm9uKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XG4gICAgbGV0IHNlbGVjdGVkRWxlbWVudCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcblxuICAgIC8vIE9wZW4gZm9ybXVsYSBlZGl0b3IgY2xpY2tpbmcgb24gbWF0aCBmb3JtdWxhc1xuICAgIC8vIE9ObHkgaWYgdGhlIGN1cnJlbnQgZWxlbWVudCB0aGUgc3BhbiB3aXRoIGNvbnRlbnRlZGl0YWJsZT1cImZhbHNlXCJcbiAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LmlzKCdzcGFuW2NvbnRlbnRlZGl0YWJsZT1mYWxzZV0nKSAmJiBmb3JtdWxhLmN1cnNvckluRm9ybXVsYShzZWxlY3RlZEVsZW1lbnQpKSB7XG5cbiAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKClcblxuICAgICAgbGV0IGZpZ3VyZSA9IHNlbGVjdGVkRWxlbWVudFxuXG4gICAgICBpZiAoIXNlbGVjdGVkRWxlbWVudC5pcyhGSUdVUkVfRk9STVVMQV9TRUxFQ1RPUikpXG4gICAgICAgIGZpZ3VyZSA9IHNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKEZJR1VSRV9GT1JNVUxBX1NFTEVDVE9SKVxuXG4gICAgICBvcGVuRm9ybXVsYUVkaXRvcih7XG4gICAgICAgIGZvcm11bGFfdmFsOiBmaWd1cmUuZmluZCgnc3ZnW2RhdGEtbWF0aC1vcmlnaW5hbC1pbnB1dF0nKS5hdHRyKCdkYXRhLW1hdGgtb3JpZ2luYWwtaW5wdXQnKSxcbiAgICAgICAgZm9ybXVsYV9pZDogZmlndXJlLmF0dHIoJ2lkJylcbiAgICAgIH0pXG4gICAgfVxuICB9KVxuXG4gIGZvcm11bGEgPSB7XG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgYWRkOiBmdW5jdGlvbiAoZm9ybXVsYV9zdmcpIHtcblxuICAgICAgbGV0IHNlbGVjdGVkRWxlbWVudCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcbiAgICAgIGxldCBpZCA9IGdldFN1Y2Nlc3NpdmVFbGVtZW50SWQoRklHVVJFX0ZPUk1VTEFfU0VMRUNUT1IsIEZPUk1VTEFfU1VGRklYKVxuICAgICAgbGV0IG5ld0Zvcm11bGEgPSB0aGlzLmNyZWF0ZShmb3JtdWxhX3N2ZywgaWQpXG5cbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAvLyBDaGVjayBpZiB0aGUgc2VsZWN0ZWQgZWxlbWVudCBpcyBub3QgZW1wdHksIGFuZCBhZGQgdGhlIG5ldyBmb3JtdWxhIHJpZ2h0IGFmdGVyXG4gICAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQudGV4dCgpLnRyaW0oKS5sZW5ndGggIT0gMClcbiAgICAgICAgICBzZWxlY3RlZEVsZW1lbnQuYWZ0ZXIobmV3Rm9ybXVsYSlcblxuICAgICAgICAvLyBJZiBzZWxlY3RlZCBlbGVtZW50IGlzIGVtcHR5LCByZXBsYWNlIGl0IHdpdGggdGhlIG5ldyBmb3JtdWxhXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBzZWxlY3RlZEVsZW1lbnQucmVwbGFjZVdpdGgobmV3Rm9ybXVsYSlcblxuICAgICAgICAvLyBTYXZlIHVwZGF0ZXMgXG4gICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuICAgICAgICBjYXB0aW9ucygpXG5cbiAgICAgICAgbmV3Rm9ybXVsYSA9ICQoYCMke2lkfWApXG5cbiAgICAgICAgZm9ybXVsYS51cGRhdGVTdHJ1Y3R1cmUobmV3Rm9ybXVsYSlcblxuICAgICAgICAvLyBBZGQgYSBuZXcgZW1wdHkgcCBhZnRlciB0aGUgZm9ybXVsYVxuICAgICAgICBpZiAoIW5ld0Zvcm11bGEubmV4dCgpLmxlbmd0aClcbiAgICAgICAgICBuZXdGb3JtdWxhLmFmdGVyKCc8cD48YnIvPjwvcD4nKVxuXG4gICAgICAgIC8vIFVwZGF0ZSBhbGwgY3Jvc3MtcmVmXG4gICAgICAgIHVwZGF0ZVJlZmVyZW5jZXMoKVxuXG4gICAgICAgIC8vIFVwZGF0ZSBSZW5kZXJlZCBSQVNIXG4gICAgICAgIHVwZGF0ZUlmcmFtZUZyb21TYXZlZENvbnRlbnQoKVxuXG4gICAgICAgIC8vIE1vdmUgdGhlIGNhcmV0IGF0IHRoZSBzdGFydCBvZiB0aGUgbmV4dCBlbGVtZW50XG4gICAgICAgIG1vdmVDYXJldCh0aW55bWNlLmFjdGl2ZUVkaXRvci5kb20uZ2V0TmV4dCh0aW55bWNlLmFjdGl2ZUVkaXRvci5kb20uZ2V0KGlkKSwgJyonKSwgdHJ1ZSlcbiAgICAgIH0pXG5cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgdXBkYXRlOiBmdW5jdGlvbiAoZm9ybXVsYV9zdmcsIGZvcm11bGFfaWQpIHtcblxuICAgICAgbGV0IHNlbGVjdGVkRmlndXJlID0gJChgIyR7Zm9ybXVsYV9pZH1gKVxuXG4gICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgc2VsZWN0ZWRGaWd1cmUuZmluZCgnc3ZnJykucmVwbGFjZVdpdGgoZm9ybXVsYV9zdmcpXG4gICAgICAgIHVwZGF0ZUlmcmFtZUZyb21TYXZlZENvbnRlbnQoKVxuICAgICAgfSlcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgY3JlYXRlOiBmdW5jdGlvbiAoZm9ybXVsYV9zdmcsIGlkKSB7XG4gICAgICByZXR1cm4gYDxmaWd1cmUgaWQ9XCIke2lkfVwiPjxwPjxzcGFuPiR7Zm9ybXVsYV9zdmdbMF0ub3V0ZXJIVE1MfTwvc3Bhbj48L3A+PC9maWd1cmU+YFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBjdXJzb3JJbkZvcm11bGE6IGZ1bmN0aW9uIChzZWxlY3RlZEVsZW1lbnQpIHtcblxuICAgICAgcmV0dXJuIChcblxuICAgICAgICAvLyBJZiB0aGUgc2VsZWN0ZWQgZWxlbWVudCBpcyB0aGUgZm9ybXVsYSBmaWd1cmVcbiAgICAgICAgKHNlbGVjdGVkRWxlbWVudC5pcyhGSUdVUkVfRk9STVVMQV9TRUxFQ1RPUikpIHx8XG5cbiAgICAgICAgLy8gSWYgdGhlIHNlbGVjdGVkIGVsZW1lbnQgaXMgaW5zaWRlIHRoZSBmb3JtdWxhIGZpZ3VyZVxuICAgICAgICBzZWxlY3RlZEVsZW1lbnQucGFyZW50cyhGSUdVUkVfRk9STVVMQV9TRUxFQ1RPUikubGVuZ3RoKSA9PSAxID8gdHJ1ZSA6IGZhbHNlXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIHVwZGF0ZVN0cnVjdHVyZTogZnVuY3Rpb24gKGZvcm11bGEpIHtcblxuICAgICAgLy8gQWRkIGEgbm90IGVkaXRhYmxlIHNwYW5cbiAgICAgIGxldCBwYXJhZ3JhcGggPSBmb3JtdWxhLmNoaWxkcmVuKCdwJylcbiAgICAgIGxldCBwYXJhZ3JhcGhDb250ZW50ID0gcGFyYWdyYXBoLmh0bWwoKVxuICAgICAgcGFyYWdyYXBoLmh0bWwoYDxzcGFuIGNvbnRlbnRlZGl0YWJsZT1cImZhbHNlXCI+JHtwYXJhZ3JhcGhDb250ZW50fTwvc3Bhbj5gKVxuICAgIH1cbiAgfVxufSlcblxuLyoqXG4gKiBSYWplX2xpc3RpbmdcbiAqL1xudGlueW1jZS5QbHVnaW5NYW5hZ2VyLmFkZCgncmFqZV9saXN0aW5nJywgZnVuY3Rpb24gKGVkaXRvciwgdXJsKSB7XG5cbiAgLy8gQWRkIGEgYnV0dG9uIHRoYXQgaGFuZGxlIHRoZSBpbmxpbmUgZWxlbWVudFxuICBlZGl0b3IuYWRkQnV0dG9uKCdyYWplX2xpc3RpbmcnLCB7XG4gICAgdGl0bGU6ICdyYWplX2xpc3RpbmcnLFxuICAgIGljb246ICdpY29uLWxpc3RpbmcnLFxuICAgIHRvb2x0aXA6ICdMaXN0aW5nJyxcbiAgICBkaXNhYmxlZFN0YXRlU2VsZWN0b3I6IERJU0FCTEVfU0VMRUNUT1JfRklHVVJFUyxcblxuICAgIC8vIEJ1dHRvbiBiZWhhdmlvdXJcbiAgICBvbmNsaWNrOiBmdW5jdGlvbiAoKSB7XG4gICAgICBsaXN0aW5nLmFkZCgpXG4gICAgfVxuICB9KVxuXG5cblxuICAvLyBCZWNhdXNlIHNvbWUgYmVoYXZpb3VycyBhcmVuJ3QgYWNjZXB0ZWQsIFJBSkUgbXVzdCBjaGVjayBzZWxlY3Rpb24gYW5kIGFjY2VwdCBiYWNrc3BhY2UsIGNhbmMgYW5kIGVudGVyIHByZXNzXG4gIGVkaXRvci5vbigna2V5RG93bicsIGZ1bmN0aW9uIChlKSB7XG5cbiAgICAvLyBOT1RFOiB0aGlzIGJlaHZhaW91ciBpcyB0aGUgc2FtZSBmb3IgY29kZWJsb2NrIFxuICAgIGxldCBzZWxlY3RlZEVsZW1lbnQgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG4gICAgaWYgKHNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKCdwcmU6aGFzKGNvZGUpJykubGVuZ3RoKSB7XG5cblxuICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC5pcygnY29kZScpKSB7XG5cblxuICAgICAgICAvLyBFTlRFUlxuICAgICAgICBpZiAoZS5rZXlDb2RlID09IDEzKSB7XG4gICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgICAgcmV0dXJuIGxpc3Rpbmcuc2V0Q29udGVudChgXFxuYClcbiAgICAgICAgfVxuXG4gICAgICAgIC8vVEFCXG4gICAgICAgIGlmIChlLmtleUNvZGUgPT0gOSkge1xuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgICAgIHJldHVybiBsaXN0aW5nLnNldENvbnRlbnQoYFxcdGApXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKGUua2V5Q29kZSA9PSAxMylcbiAgICAgICAgcmV0dXJuIGhhbmRsZUZpZ3VyZUVudGVyKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbilcblxuICAgICAgLy8ga2V5Q29kZSA4IGlzIGJhY2tzcGFjZVxuICAgICAgaWYgKGUua2V5Q29kZSA9PSA4KVxuICAgICAgICByZXR1cm4gaGFuZGxlRmlndXJlRGVsZXRlKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbilcblxuICAgICAgLypcbiAgICAgICAgLy8ga2V5Q29kZSA4IGlzIGJhY2tzcGFjZVxuICAgICAgICBpZiAoZS5rZXlDb2RlID09IDgpXG4gICAgICAgICAgcmV0dXJuIGhhbmRsZUZpZ3VyZURlbGV0ZSh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24pXG5cbiAgICAgICAgaWYgKGUua2V5Q29kZSA9PSA0NilcbiAgICAgICAgICByZXR1cm4gaGFuZGxlRmlndXJlQ2FuYyh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24pXG5cbiAgICAgICAgLy8gSGFuZGxlIGVudGVyIGtleSBpbiBmaWdjYXB0aW9uXG4gICAgICAgIGlmIChlLmtleUNvZGUgPT0gMTMpXG4gICAgICAgICAgcmV0dXJuIGhhbmRsZUZpZ3VyZUVudGVyKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbilcbiAgICAgICAgKi9cbiAgICB9XG4gICAgLypcbiAgICBpZiAoZS5rZXlDb2RlID09IDkpIHtcbiAgICAgIGlmICh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uaXNDb2xsYXBzZWQoKSAmJiAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpLnBhcmVudHMoYGNvZGUsJHtGSUdVUkVfU0VMRUNUT1J9YCkubGVuZ3RoKSB7XG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZXRDb250ZW50KCdcXHQnKVxuICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoZS5rZXlDb2RlID09IDM3KSB7XG4gICAgICBsZXQgcmFuZ2UgPSB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Um5nKClcbiAgICAgIGxldCBzdGFydE5vZGUgPSAkKHJhbmdlLnN0YXJ0Q29udGFpbmVyKVxuICAgICAgaWYgKHN0YXJ0Tm9kZS5wYXJlbnQoKS5pcygnY29kZScpICYmIChzdGFydE5vZGUucGFyZW50KCkuY29udGVudHMoKS5pbmRleChzdGFydE5vZGUpID09IDAgJiYgcmFuZ2Uuc3RhcnRPZmZzZXQgPT0gMSkpIHtcbiAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLnNldEN1cnNvckxvY2F0aW9uKHN0YXJ0Tm9kZS5wYXJlbnRzKEZJR1VSRV9TRUxFQ1RPUikucHJldigncCw6aGVhZGVyJylbMF0sIDEpXG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgfVxuICAgIH0qL1xuICB9KVxuXG4gIGxpc3RpbmcgPSB7XG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgYWRkOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgIGxldCBzZWxlY3RlZEVsZW1lbnQgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG4gICAgICBsZXQgbmV3TGlzdGluZyA9IHRoaXMuY3JlYXRlKGdldFN1Y2Nlc3NpdmVFbGVtZW50SWQoRklHVVJFX0xJU1RJTkdfU0VMRUNUT1IsIExJU1RJTkdfU1VGRklYKSlcblxuICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIC8vIENoZWNrIGlmIHRoZSBzZWxlY3RlZCBwYXJhZ3JhcGggaXMgbm90IGVtcHR5LCBhZGQgdGhlIG5ldyBsaXN0aW5nIHJpZ2h0IGJlbG93XG4gICAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQudGV4dCgpLnRyaW0oKS5sZW5ndGggIT0gMClcbiAgICAgICAgICBzZWxlY3RlZEVsZW1lbnQuYWZ0ZXIobmV3TGlzdGluZylcblxuICAgICAgICAvLyBJZiBzZWxlY3RlZCBwYXJhZ3JhcGggaXMgZW1wdHksIHJlcGxhY2UgaXQgd2l0aCB0aGUgbmV3IHRhYmxlXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBzZWxlY3RlZEVsZW1lbnQucmVwbGFjZVdpdGgobmV3TGlzdGluZylcblxuICAgICAgICAvLyBTYXZlIHVwZGF0ZXMgXG4gICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuXG4gICAgICAgIC8vIFVwZGF0ZSBhbGwgY2FwdGlvbnMgd2l0aCBSQVNIIGZ1bmN0aW9uXG4gICAgICAgIGNhcHRpb25zKClcblxuICAgICAgICAvLyBNb3ZlIHRoZSBjYXJldFxuICAgICAgICBzZWxlY3RSYW5nZShuZXdMaXN0aW5nLmZpbmQoJ2NvZGUnKVswXSwgMClcblxuICAgICAgICAvLyBVcGRhdGUgYWxsIGNyb3NzLXJlZlxuICAgICAgICB1cGRhdGVSZWZlcmVuY2VzKClcblxuICAgICAgICAvLyBVcGRhdGUgUmVuZGVyZWQgUkFTSFxuICAgICAgICB1cGRhdGVJZnJhbWVGcm9tU2F2ZWRDb250ZW50KClcbiAgICAgIH0pXG5cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgY3JlYXRlOiBmdW5jdGlvbiAoaWQpIHtcbiAgICAgIHJldHVybiAkKGA8ZmlndXJlIGlkPVwiJHtpZH1cIj48cHJlPjxjb2RlPiR7WkVST19TUEFDRX08L2NvZGU+PC9wcmU+PGZpZ2NhcHRpb24+Q2FwdGlvbi48L2ZpZ2NhcHRpb24+PC9maWd1cmU+YClcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgc2V0Q29udGVudDogZnVuY3Rpb24gKGNoYXIpIHtcbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZXRDb250ZW50KGNoYXIpXG4gICAgfVxuICB9XG59KVxuXG5cbi8qKlxuICogXG4gKi9cbnRpbnltY2UuUGx1Z2luTWFuYWdlci5hZGQoJ3JhamVfaW5saW5lX2Zvcm11bGEnLCBmdW5jdGlvbiAoZWRpdG9yLCB1cmwpIHtcblxuICBlZGl0b3IuYWRkQnV0dG9uKCdyYWplX2lubGluZV9mb3JtdWxhJywge1xuICAgIGljb246ICdpY29uLWlubGluZS1mb3JtdWxhJyxcbiAgICB0b29sdGlwOiAnSW5saW5lIGZvcm11bGEnLFxuICAgIGRpc2FibGVkU3RhdGVTZWxlY3RvcjogYCR7RElTQUJMRV9TRUxFQ1RPUl9JTkxJTkV9LDpoZWFkZXJgLFxuXG4gICAgLy8gQnV0dG9uIGJlaGF2aW91clxuICAgIG9uY2xpY2s6IGZ1bmN0aW9uICgpIHtcbiAgICAgIG9wZW5JbmxpbmVGb3JtdWxhRWRpdG9yKClcbiAgICB9XG4gIH0pXG5cbiAgZWRpdG9yLm9uKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XG4gICAgbGV0IHNlbGVjdGVkRWxlbWVudCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcblxuICAgIC8vIE9wZW4gZm9ybXVsYSBlZGl0b3IgY2xpY2tpbmcgb24gbWF0aCBmb3JtdWxhc1xuICAgIGlmIChzZWxlY3RlZEVsZW1lbnQuY2hpbGRyZW4oJ3N2Z1tyb2xlPW1hdGhdJykubGVuZ3RoKSB7XG5cbiAgICAgIG9wZW5JbmxpbmVGb3JtdWxhRWRpdG9yKHtcbiAgICAgICAgZm9ybXVsYV92YWw6IHNlbGVjdGVkRWxlbWVudC5jaGlsZHJlbignc3ZnW3JvbGU9bWF0aF0nKS5hdHRyKCdkYXRhLW1hdGgtb3JpZ2luYWwtaW5wdXQnKSxcbiAgICAgICAgZm9ybXVsYV9pZDogc2VsZWN0ZWRFbGVtZW50LmF0dHIoJ2lkJylcbiAgICAgIH0pXG4gICAgfVxuICB9KVxuXG4gIGlubGluZV9mb3JtdWxhID0ge1xuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIGFkZDogZnVuY3Rpb24gKGZvcm11bGFfc3ZnKSB7XG5cbiAgICAgIGxldCBzZWxlY3RlZEVsZW1lbnQgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG4gICAgICBsZXQgbmV3Rm9ybXVsYSA9IHRoaXMuY3JlYXRlKGZvcm11bGFfc3ZnLCBnZXRTdWNjZXNzaXZlRWxlbWVudElkKEZJR1VSRV9GT1JNVUxBX1NFTEVDVE9SLCBGT1JNVUxBX1NVRkZJWCkpXG5cbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2V0Q29udGVudChuZXdGb3JtdWxhKVxuXG4gICAgICAgIC8vIFNhdmUgdXBkYXRlcyBcbiAgICAgICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG5cbiAgICAgICAgY2FwdGlvbnMoKVxuXG4gICAgICAgIC8vIFVwZGF0ZSBhbGwgY3Jvc3MtcmVmXG4gICAgICAgIHVwZGF0ZVJlZmVyZW5jZXMoKVxuXG4gICAgICAgIC8vIFVwZGF0ZSBSZW5kZXJlZCBSQVNIXG4gICAgICAgIHVwZGF0ZUlmcmFtZUZyb21TYXZlZENvbnRlbnQoKVxuICAgICAgfSlcblxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICB1cGRhdGU6IGZ1bmN0aW9uIChmb3JtdWxhX3N2ZywgZm9ybXVsYV9pZCkge1xuXG4gICAgICBsZXQgc2VsZWN0ZWRGaWd1cmUgPSAkKGAjJHtmb3JtdWxhX2lkfWApXG5cbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICBzZWxlY3RlZEZpZ3VyZS5maW5kKCdzdmcnKS5yZXBsYWNlV2l0aChmb3JtdWxhX3N2ZylcbiAgICAgICAgdXBkYXRlSWZyYW1lRnJvbVNhdmVkQ29udGVudCgpXG4gICAgICB9KVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBjcmVhdGU6IGZ1bmN0aW9uIChmb3JtdWxhX3N2ZywgaWQpIHtcbiAgICAgIHJldHVybiBgPHNwYW4gaWQ9XCIke2lkfVwiIGNvbnRlbnRlZGl0YWJsZT1cImZhbHNlXCI+JHtmb3JtdWxhX3N2Z1swXS5vdXRlckhUTUx9PC9zcGFuPmBcbiAgICB9XG4gIH1cbn0pXG5cbi8qKlxuICogUmFqZSBjb2RlYmxvY2tcbiAqL1xudGlueW1jZS5QbHVnaW5NYW5hZ2VyLmFkZCgncmFqZV9jb2RlYmxvY2snLCBmdW5jdGlvbiAoZWRpdG9yLCB1cmwpIHtcblxuICAvLyBBZGQgYSBidXR0b24gdGhhdCBoYW5kbGUgdGhlIGlubGluZSBlbGVtZW50XG4gIGVkaXRvci5hZGRCdXR0b24oJ3JhamVfY29kZWJsb2NrJywge1xuICAgIHRpdGxlOiAncmFqZV9jb2RlYmxvY2snLFxuICAgIGljb246ICdpY29uLWJsb2NrLWNvZGUnLFxuICAgIHRvb2x0aXA6ICdCbG9jayBjb2RlJyxcbiAgICBkaXNhYmxlZFN0YXRlU2VsZWN0b3I6IGAke0RJU0FCTEVfU0VMRUNUT1JfRklHVVJFU30sY29kZSxwcmVgLFxuXG4gICAgLy8gQnV0dG9uIGJlaGF2aW91clxuICAgIG9uY2xpY2s6IGZ1bmN0aW9uICgpIHtcbiAgICAgIGJsb2NrY29kZS5hZGQoKVxuICAgIH1cbiAgfSlcblxuICBibG9ja2NvZGUgPSB7XG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgYWRkOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgIGxldCBzZWxlY3RlZEVsZW1lbnQgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG4gICAgICBsZXQgYmxvY2tDb2RlID0gdGhpcy5jcmVhdGUoZ2V0U3VjY2Vzc2l2ZUVsZW1lbnRJZChGSUdVUkVfTElTVElOR19TRUxFQ1RPUiwgTElTVElOR19TVUZGSVgpKVxuXG4gICAgICBpZiAoIXNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKCdwcmUsY29kZScpLmxlbmd0aCkge1xuXG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgIC8vIENoZWNrIGlmIHRoZSBzZWxlY3RlZCBwYXJhZ3JhcGggaXMgbm90IGVtcHR5LCBhZGQgdGhlIG5ldyBsaXN0aW5nIHJpZ2h0IGJlbG93XG4gICAgICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC50ZXh0KCkudHJpbSgpLmxlbmd0aCAhPSAwKVxuICAgICAgICAgICAgc2VsZWN0ZWRFbGVtZW50LmFmdGVyKGJsb2NrQ29kZSlcblxuICAgICAgICAgIC8vIElmIHNlbGVjdGVkIHBhcmFncmFwaCBpcyBlbXB0eSwgcmVwbGFjZSBpdCB3aXRoIHRoZSBuZXcgdGFibGVcbiAgICAgICAgICBlbHNlXG4gICAgICAgICAgICBzZWxlY3RlZEVsZW1lbnQucmVwbGFjZVdpdGgoYmxvY2tDb2RlKVxuXG4gICAgICAgICAgLy8gU2F2ZSB1cGRhdGVzIFxuICAgICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuXG4gICAgICAgICAgLy8gVXBkYXRlIGFsbCBjYXB0aW9ucyB3aXRoIFJBU0ggZnVuY3Rpb25cbiAgICAgICAgICBjYXB0aW9ucygpXG5cbiAgICAgICAgICAvLyBNb3ZlIHRoZSBjYXJldFxuICAgICAgICAgIHNlbGVjdFJhbmdlKGJsb2NrQ29kZS5maW5kKCdjb2RlJylbMF0sIDApXG5cbiAgICAgICAgICAvLyBVcGRhdGUgUmVuZGVyZWQgUkFTSFxuICAgICAgICAgIHVwZGF0ZUlmcmFtZUZyb21TYXZlZENvbnRlbnQoKVxuICAgICAgICB9KVxuICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBjcmVhdGU6IGZ1bmN0aW9uIChpZCkge1xuICAgICAgcmV0dXJuICQoYDxwcmU+PGNvZGU+JHtaRVJPX1NQQUNFfTwvY29kZT48L3ByZT5gKVxuICAgIH1cbiAgfVxufSlcblxuLyoqXG4gKiBSYWplIHF1b3RlYmxvY2tcbiAqL1xudGlueW1jZS5QbHVnaW5NYW5hZ2VyLmFkZCgncmFqZV9xdW90ZWJsb2NrJywgZnVuY3Rpb24gKGVkaXRvciwgdXJsKSB7XG5cbiAgLy8gQWRkIGEgYnV0dG9uIHRoYXQgaGFuZGxlIHRoZSBpbmxpbmUgZWxlbWVudFxuICBlZGl0b3IuYWRkQnV0dG9uKCdyYWplX3F1b3RlYmxvY2snLCB7XG4gICAgdGl0bGU6ICdyYWplX3F1b3RlYmxvY2snLFxuICAgIGljb246ICdpY29uLWJsb2NrLXF1b3RlJyxcbiAgICB0b29sdGlwOiAnQmxvY2sgcXVvdGUnLFxuICAgIGRpc2FibGVkU3RhdGVTZWxlY3RvcjogYCR7RElTQUJMRV9TRUxFQ1RPUl9GSUdVUkVTfSxibG9ja3F1b3RlYCxcblxuICAgIC8vIEJ1dHRvbiBiZWhhdmlvdXJcbiAgICBvbmNsaWNrOiBmdW5jdGlvbiAoKSB7XG4gICAgICBibG9ja3F1b3RlLmFkZCgpXG4gICAgfVxuICB9KVxuXG4gIGVkaXRvci5vbigna2V5RG93bicsIGZ1bmN0aW9uIChlKSB7XG5cblxuICAgIGxldCBzZWxlY3RlZEVsZW1lbnQgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG4gICAgaWYgKHNlbGVjdGVkRWxlbWVudC5pcygncCcpICYmIHNlbGVjdGVkRWxlbWVudC5wYXJlbnQoKS5pcygnYmxvY2txdW90ZScpKSB7XG5cbiAgICAgIC8vRU5URVJcbiAgICAgIGlmIChlLmtleUNvZGUgPT0gMTMpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG5cbiAgICAgICAgLy8gRXhpdCBmcm9tIHRoZSBibG9ja3F1b3RlIGlmIHRoZSBjdXJyZW50IHAgaXMgZW1wdHlcbiAgICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC50ZXh0KCkudHJpbSgpLmxlbmd0aCA9PSAwKVxuICAgICAgICAgIHJldHVybiBibG9ja3F1b3RlLmV4aXQoKVxuXG4gICAgICAgIGJsb2NrcXVvdGUuYWRkUGFyYWdyYXBoKClcbiAgICAgIH1cbiAgICB9XG4gIH0pXG5cbiAgYmxvY2txdW90ZSA9IHtcbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBhZGQ6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgbGV0IHNlbGVjdGVkRWxlbWVudCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcbiAgICAgIGxldCBibG9ja1F1b3RlID0gdGhpcy5jcmVhdGUoZ2V0U3VjY2Vzc2l2ZUVsZW1lbnRJZChGSUdVUkVfTElTVElOR19TRUxFQ1RPUiwgTElTVElOR19TVUZGSVgpKVxuXG4gICAgICBpZiAoIXNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKCdwcmUsY29kZScpLmxlbmd0aCkge1xuXG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgIC8vIENoZWNrIGlmIHRoZSBzZWxlY3RlZCBwYXJhZ3JhcGggaXMgbm90IGVtcHR5LCBhZGQgdGhlIG5ldyBsaXN0aW5nIHJpZ2h0IGJlbG93XG4gICAgICAgICAgaWYgKHNlbGVjdGVkRWxlbWVudC50ZXh0KCkudHJpbSgpLmxlbmd0aCAhPSAwKVxuICAgICAgICAgICAgc2VsZWN0ZWRFbGVtZW50LmFmdGVyKGJsb2NrUXVvdGUpXG5cbiAgICAgICAgICAvLyBJZiBzZWxlY3RlZCBwYXJhZ3JhcGggaXMgZW1wdHksIHJlcGxhY2UgaXQgd2l0aCB0aGUgbmV3IHRhYmxlXG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgc2VsZWN0ZWRFbGVtZW50LnJlcGxhY2VXaXRoKGJsb2NrUXVvdGUpXG5cbiAgICAgICAgICAvLyBTYXZlIHVwZGF0ZXMgXG4gICAgICAgICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG5cbiAgICAgICAgICAvLyBVcGRhdGUgYWxsIGNhcHRpb25zIHdpdGggUkFTSCBmdW5jdGlvblxuICAgICAgICAgIGNhcHRpb25zKClcblxuICAgICAgICAgIC8vIE1vdmUgdGhlIGNhcmV0XG4gICAgICAgICAgbW92ZUNhcmV0KGJsb2NrUXVvdGVbMF0pXG5cbiAgICAgICAgICAvLyBVcGRhdGUgUmVuZGVyZWQgUkFTSFxuICAgICAgICAgIHVwZGF0ZUlmcmFtZUZyb21TYXZlZENvbnRlbnQoKVxuICAgICAgICB9KVxuICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBjcmVhdGU6IGZ1bmN0aW9uIChpZCkge1xuICAgICAgcmV0dXJuICQoYDxibG9ja3F1b3RlPjxwPiR7WkVST19TUEFDRX08L3A+PC9ibG9ja3F1b3RlPmApXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIGdldExhc3ROb3RFbXB0eU5vZGU6IGZ1bmN0aW9uIChub2Rlcykge1xuXG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG5vZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmICgobm9kZXNbaV0ubm9kZVR5cGUgPT0gMyB8fCBub2Rlc1tpXS50YWdOYW1lID09ICdicicpICYmICFub2Rlc1tpXS5sZW5ndGgpXG4gICAgICAgICAgbm9kZXMuc3BsaWNlKGksIDEpXG4gICAgICB9XG5cbiAgICAgIHJldHVybiBub2Rlc1tub2Rlcy5sZW5ndGggLSAxXVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBhZGRQYXJhZ3JhcGg6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgY29uc3QgQlIgPSAnPGJyPidcblxuICAgICAgLy8gR2V0IHRoZSByZWZlcmVuY2VzIG9mIHRoZSBleGlzdGluZyBlbGVtZW50XG4gICAgICBsZXQgcGFyYWdyYXBoID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuXG4gICAgICAvLyBQbGFjZWhvbGRlciB0ZXh0IG9mIHRoZSBuZXcgbGlcbiAgICAgIGxldCB0ZXh0ID0gQlJcbiAgICAgIGxldCB0ZXh0Tm9kZXMgPSBwYXJhZ3JhcGguY29udGVudHMoKVxuXG4gICAgICAvLyBJZiB0aGVyZSBpcyBqdXN0IG9uZSBub2RlIHdyYXBwZWQgaW5zaWRlIHRoZSBwYXJhZ3JhcGhcbiAgICAgIGlmICh0ZXh0Tm9kZXMubGVuZ3RoID09IDEpIHtcblxuICAgICAgICAvLyBHZXQgdGhlIHN0YXJ0IG9mZnNldCBhbmQgdGV4dCBvZiB0aGUgY3VycmVudCBsaVxuICAgICAgICBsZXQgc3RhcnRPZmZzZXQgPSB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Um5nKCkuc3RhcnRPZmZzZXRcbiAgICAgICAgbGV0IHdob2xlVGV4dCA9IHBhcmFncmFwaC50ZXh0KClcblxuICAgICAgICAvLyBJZiB0aGUgY3Vyc29yIGlzbid0IGF0IHRoZSBlbmQgYnV0IGl0J3MgaW4gdGhlIG1pZGRsZVxuICAgICAgICAvLyBHZXQgdGhlIHJlbWFpbmluZyB0ZXh0IGZyb20gdGhlIGN1cnNvciB0byB0aGUgZW5kXG4gICAgICAgIGlmIChzdGFydE9mZnNldCAhPSB3aG9sZVRleHQubGVuZ3RoKVxuICAgICAgICAgIHRleHQgPSB3aG9sZVRleHQuc3Vic3RyaW5nKHN0YXJ0T2Zmc2V0LCB3aG9sZVRleHQubGVuZ3RoKVxuXG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgdGV4dCBvZiB0aGUgY3VycmVudCBsaVxuICAgICAgICAgIHBhcmFncmFwaC50ZXh0KHdob2xlVGV4dC5zdWJzdHJpbmcoMCwgc3RhcnRPZmZzZXQpKVxuXG4gICAgICAgICAgaWYgKCFwYXJhZ3JhcGgudGV4dCgpLmxlbmd0aClcbiAgICAgICAgICAgIHBhcmFncmFwaC5odG1sKEJSKVxuXG4gICAgICAgICAgLy8gQ3JlYXRlIGFuZCBhZGQgdGhlIG5ldyBsaVxuICAgICAgICAgIGxldCBuZXdQYXJhZ3JhcGggPSAkKGA8cD4ke3RleHR9PC9wPmApXG4gICAgICAgICAgcGFyYWdyYXBoLmFmdGVyKG5ld1BhcmFncmFwaClcblxuICAgICAgICAgIC8vIE1vdmUgdGhlIGNhcmV0IHRvIHRoZSBuZXcgbGlcbiAgICAgICAgICBtb3ZlQ2FyZXQobmV3UGFyYWdyYXBoWzBdLCB0cnVlKVxuXG4gICAgICAgICAgLy8gVXBkYXRlIHRoZSBjb250ZW50XG4gICAgICAgICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG4gICAgICAgIH0pXG4gICAgICB9XG5cbiAgICAgIC8vIEluc3RlYWQgaWYgdGhlcmUgYXJlIG11bHRpcGxlIG5vZGVzIGluc2lkZSB0aGUgcGFyYWdyYXBoXG4gICAgICBlbHNlIHtcblxuICAgICAgICAvLyBJc3RhbnRpYXRlIHRoZSByYW5nZSB0byBiZSBzZWxlY3RlZFxuICAgICAgICBsZXQgcmFuZ2UgPSBkb2N1bWVudC5jcmVhdGVSYW5nZSgpXG5cbiAgICAgICAgLy8gU3RhcnQgdGhlIHJhbmdlIGZyb20gdGhlIHNlbGVjdGVkIG5vZGUgYW5kIG9mZnNldCBhbmQgZW5kcyBpdCBhdCB0aGUgZW5kIG9mIHRoZSBsYXN0IG5vZGVcbiAgICAgICAgcmFuZ2Uuc2V0U3RhcnQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldFJuZygpLnN0YXJ0Q29udGFpbmVyLCB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Um5nKCkuc3RhcnRPZmZzZXQpXG4gICAgICAgIHJhbmdlLnNldEVuZCh0aGlzLmdldExhc3ROb3RFbXB0eU5vZGUodGV4dE5vZGVzKSwgMSlcblxuICAgICAgICAvLyBTZWxlY3QgdGhlIHJhbmdlXG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZXRSbmcocmFuZ2UpXG5cbiAgICAgICAgLy8gU2F2ZSB0aGUgaHRtbCBjb250ZW50XG4gICAgICAgIHdob2xlVGV4dCA9IHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRDb250ZW50KClcblxuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICBwYXJhZ3JhcGguaHRtbChwYXJhZ3JhcGguaHRtbCgpLnJlcGxhY2Uod2hvbGVUZXh0LCAnJykpXG5cbiAgICAgICAgICBpZiAoIXBhcmFncmFwaC50ZXh0KCkubGVuZ3RoKVxuICAgICAgICAgICAgcGFyYWdyYXBoLmh0bWwoQlIpXG5cbiAgICAgICAgICAvLyBDcmVhdGUgYW5kIGFkZCB0aGUgbmV3IGxpXG4gICAgICAgICAgbGV0IG5ld1BhcmFncmFwaCA9ICQoYDxwPiR7d2hvbGVUZXh0fTwvcD5gKVxuICAgICAgICAgIHBhcmFncmFwaC5hZnRlcihuZXdQYXJhZ3JhcGgpXG5cbiAgICAgICAgICAvLyBNb3ZlIHRoZSBjYXJldCB0byB0aGUgbmV3IGxpXG4gICAgICAgICAgbW92ZUNhcmV0KG5ld1BhcmFncmFwaFswXSwgdHJ1ZSlcblxuICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgY29udGVudFxuICAgICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuICAgICAgICB9KVxuICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBleGl0OiBmdW5jdGlvbiAoKSB7XG4gICAgICBsZXQgcGFyYWdyYXBoID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuICAgICAgbGV0IGJsb2NrcXVvdGUgPSBwYXJhZ3JhcGgucGFyZW50KClcblxuICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIHBhcmFncmFwaC5yZW1vdmUoKVxuXG4gICAgICAgIGlmICghYmxvY2txdW90ZS5uZXh0KCkubGVuZ3RoKSB7XG4gICAgICAgICAgYmxvY2txdW90ZS5hZnRlcigkKGA8cD48YnIvPjwvcD5gKSlcbiAgICAgICAgfVxuXG4gICAgICAgIG1vdmVDYXJldChibG9ja3F1b3RlLm5leHQoKVswXSlcblxuICAgICAgfSlcbiAgICB9XG4gIH1cbn0pXG5cbi8qKlxuICogVXBkYXRlIHRhYmxlIGNhcHRpb25zIHdpdGggYSBSQVNIIGZ1bmNpb24gXG4gKi9cbmZ1bmN0aW9uIGNhcHRpb25zKCkge1xuXG4gIC8qIENhcHRpb25zICovXG4gICQoZmlndXJlYm94X3NlbGVjdG9yKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY3VyX2NhcHRpb24gPSAkKHRoaXMpLnBhcmVudHMoXCJmaWd1cmVcIikuZmluZChcImZpZ2NhcHRpb25cIik7XG4gICAgdmFyIGN1cl9udW1iZXIgPSAkKHRoaXMpLmZpbmROdW1iZXIoZmlndXJlYm94X3NlbGVjdG9yKTtcbiAgICBjdXJfY2FwdGlvbi5maW5kKCdzdHJvbmcnKS5yZW1vdmUoKTtcbiAgICBjdXJfY2FwdGlvbi5odG1sKFwiPHN0cm9uZyBjbGFzcz1cXFwiY2dlblxcXCIgZGF0YS1yYXNoLW9yaWdpbmFsLWNvbnRlbnQ9XFxcIlxcXCIgY29udGVudGVkaXRhYmxlPVxcXCJmYWxzZVxcXCI+RmlndXJlIFwiICsgY3VyX251bWJlciArXG4gICAgICBcIi4gPC9zdHJvbmc+XCIgKyBjdXJfY2FwdGlvbi5odG1sKCkpO1xuICB9KTtcbiAgJCh0YWJsZWJveF9zZWxlY3RvcikuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGN1cl9jYXB0aW9uID0gJCh0aGlzKS5wYXJlbnRzKFwiZmlndXJlXCIpLmZpbmQoXCJmaWdjYXB0aW9uXCIpO1xuICAgIHZhciBjdXJfbnVtYmVyID0gJCh0aGlzKS5maW5kTnVtYmVyKHRhYmxlYm94X3NlbGVjdG9yKTtcbiAgICBjdXJfY2FwdGlvbi5maW5kKCdzdHJvbmcnKS5yZW1vdmUoKTtcbiAgICBjdXJfY2FwdGlvbi5odG1sKFwiPHN0cm9uZyBjbGFzcz1cXFwiY2dlblxcXCIgZGF0YS1yYXNoLW9yaWdpbmFsLWNvbnRlbnQ9XFxcIlxcXCIgY29udGVudGVkaXRhYmxlPVxcXCJmYWxzZVxcXCIgPlRhYmxlIFwiICsgY3VyX251bWJlciArXG4gICAgICBcIi4gPC9zdHJvbmc+XCIgKyBjdXJfY2FwdGlvbi5odG1sKCkpO1xuICB9KTtcbiAgJChmb3JtdWxhYm94X3NlbGVjdG9yKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY3VyX2NhcHRpb24gPSAkKHRoaXMpLnBhcmVudHMoXCJmaWd1cmVcIikuZmluZChcInBcIik7XG4gICAgdmFyIGN1cl9udW1iZXIgPSAkKHRoaXMpLmZpbmROdW1iZXIoZm9ybXVsYWJveF9zZWxlY3Rvcik7XG5cbiAgICBpZiAoY3VyX2NhcHRpb24uZmluZCgnc3Bhbi5jZ2VuJykubGVuZ3RoKSB7XG4gICAgICBjdXJfY2FwdGlvbi5maW5kKCdzcGFuLmNnZW4nKS5yZW1vdmUoKTtcbiAgICAgIGN1cl9jYXB0aW9uLmZpbmQoJ3NwYW5bY29udGVudGVkaXRhYmxlXScpLmFwcGVuZChcIjxzcGFuIGNsYXNzPVxcXCJjZ2VuXFxcIiBkYXRhLXJhc2gtb3JpZ2luYWwtY29udGVudD1cXFwiXFxcIiA+IChcIiArIGN1cl9udW1iZXIgKyBcIik8L3NwYW4+XCIpXG4gICAgfSBlbHNlXG4gICAgICBjdXJfY2FwdGlvbi5odG1sKGN1cl9jYXB0aW9uLmh0bWwoKSArIFwiPHNwYW4gY2xhc3M9XFxcImNnZW5cXFwiIGRhdGEtcmFzaC1vcmlnaW5hbC1jb250ZW50PVxcXCJcXFwiID4gKFwiICtcbiAgICAgICAgY3VyX251bWJlciArIFwiKTwvc3Bhbj5cIik7XG4gIH0pO1xuICAkKGxpc3Rpbmdib3hfc2VsZWN0b3IpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgIHZhciBjdXJfY2FwdGlvbiA9ICQodGhpcykucGFyZW50cyhcImZpZ3VyZVwiKS5maW5kKFwiZmlnY2FwdGlvblwiKTtcbiAgICB2YXIgY3VyX251bWJlciA9ICQodGhpcykuZmluZE51bWJlcihsaXN0aW5nYm94X3NlbGVjdG9yKTtcbiAgICBjdXJfY2FwdGlvbi5maW5kKCdzdHJvbmcnKS5yZW1vdmUoKTtcbiAgICBjdXJfY2FwdGlvbi5odG1sKFwiPHN0cm9uZyBjbGFzcz1cXFwiY2dlblxcXCIgZGF0YS1yYXNoLW9yaWdpbmFsLWNvbnRlbnQ9XFxcIlxcXCIgY29udGVudGVkaXRhYmxlPVxcXCJmYWxzZVxcXCI+TGlzdGluZyBcIiArIGN1cl9udW1iZXIgK1xuICAgICAgXCIuIDwvc3Ryb25nPlwiICsgY3VyX2NhcHRpb24uaHRtbCgpKTtcbiAgfSk7XG4gIC8qIC9FTkQgQ2FwdGlvbnMgKi9cbn1cblxuLyoqXG4gKiBcbiAqIEBwYXJhbSB7Kn0gc2VsID0+IHRpbnltY2Ugc2VsZWN0aW9uXG4gKiBcbiAqIE1haW5seSBpdCBjaGVja3Mgd2hlcmUgc2VsZWN0aW9uIHN0YXJ0cyBhbmQgZW5kcyB0byBibG9jayB1bmFsbG93ZWQgZGVsZXRpb25cbiAqIEluIHNhbWUgZmlndXJlIGFyZW4ndCBibG9ja2VkLCB1bmxlc3Mgc2VsZWN0aW9uIHN0YXJ0IE9SIGVuZCBpbnNpZGUgZmlnY2FwdGlvbiAobm90IGJvdGgpXG4gKi9cbmZ1bmN0aW9uIGhhbmRsZUZpZ3VyZURlbGV0ZShzZWwpIHtcblxuICB0cnkge1xuXG4gICAgLy8gR2V0IHJlZmVyZW5jZSBvZiBzdGFydCBhbmQgZW5kIG5vZGVcbiAgICBsZXQgc3RhcnROb2RlID0gJChzZWwuZ2V0Um5nKCkuc3RhcnRDb250YWluZXIpXG4gICAgbGV0IHN0YXJ0Tm9kZVBhcmVudCA9IHN0YXJ0Tm9kZS5wYXJlbnRzKEZJR1VSRV9TRUxFQ1RPUilcblxuICAgIGxldCBlbmROb2RlID0gJChzZWwuZ2V0Um5nKCkuZW5kQ29udGFpbmVyKVxuICAgIGxldCBlbmROb2RlUGFyZW50ID0gZW5kTm9kZS5wYXJlbnRzKEZJR1VSRV9TRUxFQ1RPUilcblxuICAgIC8vIElmIGF0IGxlYXN0IHNlbGVjdGlvbiBzdGFydCBvciBlbmQgaXMgaW5zaWRlIHRoZSBmaWd1cmVcbiAgICBpZiAoc3RhcnROb2RlUGFyZW50Lmxlbmd0aCB8fCBlbmROb2RlUGFyZW50Lmxlbmd0aCkge1xuXG4gICAgICAvLyBJZiBzZWxlY3Rpb24gd3JhcHMgZW50aXJlbHkgYSBmaWd1cmUgZnJvbSB0aGUgc3RhcnQgb2YgZmlyc3QgZWxlbWVudCAodGggaW4gdGFibGUpIGFuZCBzZWxlY3Rpb24gZW5kc1xuICAgICAgaWYgKGVuZE5vZGUucGFyZW50cygnZmlnY2FwdGlvbicpLmxlbmd0aCkge1xuXG4gICAgICAgIGxldCBjb250ZW50cyA9IGVuZE5vZGUucGFyZW50KCkuY29udGVudHMoKVxuICAgICAgICBpZiAoc3RhcnROb2RlLmlzKEZJR1VSRV9TRUxFQ1RPUikgJiYgY29udGVudHMuaW5kZXgoZW5kTm9kZSkgPT0gY29udGVudHMubGVuZ3RoIC0gMSAmJiBzZWwuZ2V0Um5nKCkuZW5kT2Zmc2V0ID09IGVuZE5vZGUudGV4dCgpLmxlbmd0aCkge1xuICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgICAgLy8gTW92ZSBjdXJzb3IgYXQgdGhlIHByZXZpb3VzIGVsZW1lbnQgYW5kIHJlbW92ZSBmaWd1cmVcbiAgICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLmZvY3VzKClcbiAgICAgICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZXRDdXJzb3JMb2NhdGlvbihzdGFydE5vZGUucHJldigpWzBdLCAxKVxuICAgICAgICAgICAgc3RhcnROb2RlLnJlbW92ZSgpXG5cbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gSWYgc2VsZWN0aW9uIGRvZXNuJ3Qgc3RhcnQgYW5kIGVuZCBpbiB0aGUgc2FtZSBmaWd1cmUsIGJ1dCBvbmUgYmVldHdlbiBzdGFydCBvciBlbmQgaXMgaW5zaWRlIHRoZSBmaWdjYXB0aW9uLCBtdXN0IGJsb2NrXG4gICAgICBpZiAoc3RhcnROb2RlLnBhcmVudHMoJ2ZpZ2NhcHRpb24nKS5sZW5ndGggIT0gZW5kTm9kZS5wYXJlbnRzKCdmaWdjYXB0aW9uJykubGVuZ3RoICYmIChzdGFydE5vZGUucGFyZW50cygnZmlnY2FwdGlvbicpLmxlbmd0aCB8fCBlbmROb2RlLnBhcmVudHMoJ2ZpZ2NhcHRpb24nKS5sZW5ndGgpKVxuICAgICAgICByZXR1cm4gZmFsc2VcblxuICAgICAgLy8gSWYgdGhlIGZpZ3VyZSBpcyBub3QgdGhlIHNhbWUsIG11c3QgYmxvY2tcbiAgICAgIC8vIEJlY2F1c2UgYSBzZWxlY3Rpb24gY2FuIHN0YXJ0IGluIGZpZ3VyZVggYW5kIGVuZCBpbiBmaWd1cmVZXG4gICAgICBpZiAoKHN0YXJ0Tm9kZVBhcmVudC5hdHRyKCdpZCcpICE9IGVuZE5vZGVQYXJlbnQuYXR0cignaWQnKSkpXG4gICAgICAgIHJldHVybiBmYWxzZVxuXG4gICAgICAvLyBJZiBjdXJzb3IgaXMgYXQgc3RhcnQgb2YgY29kZSBwcmV2ZW50XG4gICAgICBpZiAoc3RhcnROb2RlLnBhcmVudHMoRklHVVJFX1NFTEVDVE9SKS5maW5kKCdwcmUnKS5sZW5ndGgpIHtcblxuICAgICAgICAvLyBJZiBhdCB0aGUgc3RhcnQgb2YgcHJlPmNvZGUsIHByZXNzaW5nIDJ0aW1lcyBiYWNrc3BhY2Ugd2lsbCByZW1vdmUgZXZlcnl0aGluZyBcbiAgICAgICAgaWYgKHN0YXJ0Tm9kZS5wYXJlbnQoKS5pcygnY29kZScpICYmIChzdGFydE5vZGUucGFyZW50KCkuY29udGVudHMoKS5pbmRleChzdGFydE5vZGUpID09IDAgJiYgc2VsLmdldFJuZygpLnN0YXJ0T2Zmc2V0ID09IDEpKSB7XG4gICAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc3RhcnROb2RlLnBhcmVudHMoRklHVVJFX1NFTEVDVE9SKS5yZW1vdmUoKVxuICAgICAgICAgIH0pXG4gICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgIH1cblxuXG4gICAgICAgIGlmIChzdGFydE5vZGUucGFyZW50KCkuaXMoJ3ByZScpICYmIHNlbC5nZXRSbmcoKS5zdGFydE9mZnNldCA9PSAwKVxuICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0cnVlXG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxufVxuXG4vKipcbiAqIFxuICogQHBhcmFtIHsqfSBzZWwgXG4gKi9cbmZ1bmN0aW9uIGhhbmRsZUZpZ3VyZUNhbmMoc2VsKSB7XG5cbiAgLy8gR2V0IHJlZmVyZW5jZSBvZiBzdGFydCBhbmQgZW5kIG5vZGVcbiAgbGV0IHN0YXJ0Tm9kZSA9ICQoc2VsLmdldFJuZygpLnN0YXJ0Q29udGFpbmVyKVxuICBsZXQgc3RhcnROb2RlUGFyZW50ID0gc3RhcnROb2RlLnBhcmVudHMoRklHVVJFX1NFTEVDVE9SKVxuXG4gIGxldCBlbmROb2RlID0gJChzZWwuZ2V0Um5nKCkuZW5kQ29udGFpbmVyKVxuICBsZXQgZW5kTm9kZVBhcmVudCA9IGVuZE5vZGUucGFyZW50cyhGSUdVUkVfU0VMRUNUT1IpXG5cbiAgLy8gSWYgYXQgbGVhc3Qgc2VsZWN0aW9uIHN0YXJ0IG9yIGVuZCBpcyBpbnNpZGUgdGhlIGZpZ3VyZVxuICBpZiAoc3RhcnROb2RlUGFyZW50Lmxlbmd0aCB8fCBlbmROb2RlUGFyZW50Lmxlbmd0aCkge1xuXG4gICAgLy8gSWYgc2VsZWN0aW9uIGRvZXNuJ3Qgc3RhcnQgYW5kIGVuZCBpbiB0aGUgc2FtZSBmaWd1cmUsIGJ1dCBvbmUgYmVldHdlbiBzdGFydCBvciBlbmQgaXMgaW5zaWRlIHRoZSBmaWdjYXB0aW9uLCBtdXN0IGJsb2NrXG4gICAgaWYgKHN0YXJ0Tm9kZS5wYXJlbnRzKCdmaWdjYXB0aW9uJykubGVuZ3RoICE9IGVuZE5vZGUucGFyZW50cygnZmlnY2FwdGlvbicpLmxlbmd0aCAmJiAoc3RhcnROb2RlLnBhcmVudHMoJ2ZpZ2NhcHRpb24nKS5sZW5ndGggfHwgZW5kTm9kZS5wYXJlbnRzKCdmaWdjYXB0aW9uJykubGVuZ3RoKSlcbiAgICAgIHJldHVybiBmYWxzZVxuXG4gICAgLy8gSWYgdGhlIGZpZ3VyZSBpcyBub3QgdGhlIHNhbWUsIG11c3QgYmxvY2tcbiAgICAvLyBCZWNhdXNlIGEgc2VsZWN0aW9uIGNhbiBzdGFydCBpbiBmaWd1cmVYIGFuZCBlbmQgaW4gZmlndXJlWVxuICAgIGlmICgoc3RhcnROb2RlUGFyZW50LmF0dHIoJ2lkJykgIT0gZW5kTm9kZVBhcmVudC5hdHRyKCdpZCcpKSlcbiAgICAgIHJldHVybiBmYWxzZVxuXG4gIH1cblxuICAvLyBUaGlzIGFsZ29yaXRobSBkb2Vzbid0IHdvcmsgaWYgY2FyZXQgaXMgaW4gZW1wdHkgdGV4dCBlbGVtZW50XG5cbiAgLy8gQ3VycmVudCBlbGVtZW50IGNhbiBiZSBvciB0ZXh0IG9yIHBcbiAgbGV0IHBhcmFncmFwaCA9IHN0YXJ0Tm9kZS5pcygncCcpID8gc3RhcnROb2RlIDogc3RhcnROb2RlLnBhcmVudHMoJ3AnKS5maXJzdCgpXG4gIC8vIFNhdmUgYWxsIGNobGRyZW4gbm9kZXMgKHRleHQgaW5jbHVkZWQpXG4gIGxldCBwYXJhZ3JhcGhDb250ZW50ID0gcGFyYWdyYXBoLmNvbnRlbnRzKClcblxuICAvLyBJZiBuZXh0IHRoZXJlIGlzIGEgZmlndXJlXG4gIGlmIChwYXJhZ3JhcGgubmV4dCgpLmlzKEZJR1VSRV9TRUxFQ1RPUikpIHtcblxuICAgIGlmIChlbmROb2RlWzBdLm5vZGVUeXBlID09IDMpIHtcblxuICAgICAgLy8gSWYgdGhlIGVuZCBub2RlIGlzIGEgdGV4dCBpbnNpZGUgYSBzdHJvbmcsIGl0cyBpbmRleCB3aWxsIGJlIC0xLlxuICAgICAgLy8gSW4gdGhpcyBjYXNlIHRoZSBlZGl0b3IgbXVzdCBpdGVyYXRlIHVudGlsIGl0IGZhY2UgYSBpbmxpbmUgZWxlbWVudFxuICAgICAgaWYgKHBhcmFncmFwaENvbnRlbnQuaW5kZXgoZW5kTm9kZSkgPT0gLTEpIC8vJiYgcGFyYWdyYXBoLnBhcmVudHMoU0VDVElPTl9TRUxFQ1RPUikubGVuZ3RoKVxuICAgICAgICBlbmROb2RlID0gZW5kTm9kZS5wYXJlbnQoKVxuXG4gICAgICAvLyBJZiBpbmRleCBvZiB0aGUgaW5saW5lIGVsZW1lbnQgaXMgZXF1YWwgb2YgY2hpbGRyZW4gbm9kZSBsZW5ndGhcbiAgICAgIC8vIEFORCB0aGUgY3Vyc29yIGlzIGF0IHRoZSBsYXN0IHBvc2l0aW9uXG4gICAgICAvLyBSZW1vdmUgdGhlIG5leHQgZmlndXJlIGluIG9uZSB1bmRvIGxldmVsXG4gICAgICBpZiAocGFyYWdyYXBoQ29udGVudC5pbmRleChlbmROb2RlKSArIDEgPT0gcGFyYWdyYXBoQ29udGVudC5sZW5ndGggJiYgcGFyYWdyYXBoQ29udGVudC5sYXN0KCkudGV4dCgpLmxlbmd0aCA9PSBzZWwuZ2V0Um5nKCkuZW5kT2Zmc2V0KSB7XG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBwYXJhZ3JhcGgubmV4dCgpLnJlbW92ZSgpXG4gICAgICAgIH0pXG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0cnVlXG59XG5cbi8qKlxuICogXG4gKiBAcGFyYW0geyp9IHNlbCA9PiB0aW55bWNlIHNlbGVjdGlvblxuICogXG4gKiBBZGQgYSBwYXJhZ3JhcGggYWZ0ZXIgdGhlIGZpZ3VyZVxuICovXG5mdW5jdGlvbiBoYW5kbGVGaWd1cmVFbnRlcihzZWwpIHtcblxuICBsZXQgc2VsZWN0ZWRFbGVtZW50ID0gJChzZWwuZ2V0Tm9kZSgpKVxuICBpZiAoc2VsZWN0ZWRFbGVtZW50LmlzKCdmaWdjYXB0aW9uJykgfHwgKHNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKEZJR1VSRV9TRUxFQ1RPUikubGVuZ3RoICYmIHNlbGVjdGVkRWxlbWVudC5pcygncCcpKSkge1xuXG4gICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAvL2FkZCBhIG5ldyBwYXJhZ3JhcGggYWZ0ZXIgdGhlIGZpZ3VyZVxuICAgICAgc2VsZWN0ZWRFbGVtZW50LnBhcmVudChGSUdVUkVfU0VMRUNUT1IpLmFmdGVyKCc8cD48YnIvPjwvcD4nKVxuXG4gICAgICAvL21vdmUgY2FyZXQgYXQgdGhlIHN0YXJ0IG9mIG5ldyBwXG4gICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2V0Q3Vyc29yTG9jYXRpb24oc2VsZWN0ZWRFbGVtZW50LnBhcmVudChGSUdVUkVfU0VMRUNUT1IpWzBdLm5leHRTaWJsaW5nLCAwKVxuICAgIH0pXG4gICAgcmV0dXJuIGZhbHNlXG4gIH0gZWxzZSBpZiAoc2VsZWN0ZWRFbGVtZW50LmlzKCd0aCcpKVxuICAgIHJldHVybiBmYWxzZVxuICByZXR1cm4gdHJ1ZVxufVxuXG4vKipcbiAqIFxuICogQHBhcmFtIHsqfSBzZWwgPT4gdGlueW1jZSBzZWxlY3Rpb25cbiAqL1xuZnVuY3Rpb24gaGFuZGxlRmlndXJlQ2hhbmdlKHNlbCkge1xuXG4gIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuXG4gIC8vIElmIHJhc2gtZ2VuZXJhdGVkIHNlY3Rpb24gaXMgZGVsZXRlLCByZS1hZGQgaXRcbiAgaWYgKCQoJ2ZpZ2NhcHRpb246bm90KDpoYXMoc3Ryb25nKSknKS5sZW5ndGgpIHtcbiAgICBjYXB0aW9ucygpXG4gICAgdXBkYXRlSWZyYW1lRnJvbVNhdmVkQ29udGVudCgpXG4gIH1cbn0iLCIvKipcbiAqIHJhamVfaW5saW5lX2NvZGUgcGx1Z2luIFJBSkVcbiAqL1xuXG4vKipcbiAqIFxuICovXG5sZXQgaW5saW5lID0ge1xuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGhhbmRsZTogZnVuY3Rpb24gKHR5cGUpIHtcbiAgICBsZXQgc2VsZWN0ZWRFbGVtZW50ID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuXG4gICAgLy8gSWYgdGhlcmUgaXNuJ3QgYW55IGlubGluZSBjb2RlXG4gICAgaWYgKCFzZWxlY3RlZEVsZW1lbnQuaXModHlwZSkgJiYgIXNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKHR5cGUpLmxlbmd0aCkge1xuXG4gICAgICBsZXQgdGV4dCA9IFpFUk9fU1BBQ0VcblxuICAgICAgLy8gQ2hlY2sgaWYgdGhlIHNlbGVjdGlvbiBzdGFydHMgYW5kIGVuZHMgaW4gdGhlIHNhbWUgcGFyYWdyYXBoXG4gICAgICBpZiAoIXRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5pc0NvbGxhcHNlZCgpKSB7XG5cbiAgICAgICAgbGV0IHN0YXJ0Tm9kZSA9IHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRTdGFydCgpXG4gICAgICAgIGxldCBlbmROb2RlID0gdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldEVuZCgpXG5cbiAgICAgICAgLy8gTm90aWZ5IHRoZSBlcnJvciBhbmQgZXhpdFxuICAgICAgICBpZiAoc3RhcnROb2RlICE9IGVuZE5vZGUpIHtcbiAgICAgICAgICBub3RpZnkoSU5MSU5FX0VSUk9SUywgJ2Vycm9yJywgMzAwMClcbiAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNhdmUgdGhlIHNlbGVjdGVkIGNvbnRlbnQgYXMgdGV4dFxuICAgICAgICB0ZXh0ICs9IHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRDb250ZW50KClcbiAgICAgIH1cblxuICAgICAgLy8gVXBkYXRlIHRoZSBjdXJyZW50IHNlbGVjdGlvbiB3aXRoIGNvZGUgZWxlbWVudFxuICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIC8vIEdldCB0aGUgaW5kZXggb2YgdGhlIGN1cnJlbnQgc2VsZWN0ZWQgbm9kZVxuICAgICAgICBsZXQgcHJldmlvdXNOb2RlSW5kZXggPSBzZWxlY3RlZEVsZW1lbnQuY29udGVudHMoKS5pbmRleCgkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRSbmcoKS5zdGFydENvbnRhaW5lcikpXG5cbiAgICAgICAgLy8gQWRkIGNvZGUgZWxlbWVudFxuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2V0Q29udGVudChgPCR7dHlwZX0+JHt0ZXh0fTwvJHt0eXBlfT4keyh0eXBlID09ICdxJyA/IFpFUk9fU1BBQ0UgOiAnJyl9YClcbiAgICAgICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG5cbiAgICAgICAgLy8gTW92ZSBjYXJldCBhdCB0aGUgZW5kIG9mIHRoZSBzdWNjZXNzaXZlIG5vZGUgb2YgcHJldmlvdXMgc2VsZWN0ZWQgbm9kZVxuICAgICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uc2V0Q3Vyc29yTG9jYXRpb24oc2VsZWN0ZWRFbGVtZW50LmNvbnRlbnRzKClbcHJldmlvdXNOb2RlSW5kZXggKyAxXSwgMSlcbiAgICAgIH0pXG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGV4aXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAvLyBHZXQgdGhlIGN1cnJlbnQgbm9kZSBpbmRleCwgcmVsYXRpdmUgdG8gaXRzIHBhcmVudFxuICAgIGxldCBzZWxlY3RlZEVsZW1lbnQgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG4gICAgbGV0IHBhcmVudENvbnRlbnQgPSBzZWxlY3RlZEVsZW1lbnQucGFyZW50KCkuY29udGVudHMoKVxuICAgIGxldCBpbmRleCA9IHBhcmVudENvbnRlbnQuaW5kZXgoc2VsZWN0ZWRFbGVtZW50KVxuXG4gICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAvLyBDaGVjayBpZiB0aGUgY3VycmVudCBub2RlIGhhcyBhIHRleHQgYWZ0ZXJcbiAgICAgIGlmICh0eXBlb2YgcGFyZW50Q29udGVudFtpbmRleCArIDFdICE9ICd1bmRlZmluZWQnICYmICQocGFyZW50Q29udGVudFtpbmRleCArIDFdKS5pcygndGV4dCcpKSB7XG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZXRDdXJzb3JMb2NhdGlvbihwYXJlbnRDb250ZW50W2luZGV4ICsgMV0sIDApXG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZXRDb250ZW50KFpFUk9fU1BBQ0UpXG4gICAgICB9XG5cbiAgICAgIC8vIElmIHRoZSBub2RlIGhhc24ndCB0ZXh0IGFmdGVyLCByYWplIGhhcyB0byBhZGQgaXRcbiAgICAgIGVsc2Uge1xuICAgICAgICBzZWxlY3RlZEVsZW1lbnQuYWZ0ZXIoWkVST19TUEFDRSlcbiAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLnNldEN1cnNvckxvY2F0aW9uKHBhcmVudENvbnRlbnRbaW5kZXggKyAxXSwgMClcbiAgICAgIH1cbiAgICB9KVxuICB9LFxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIHJlcGxhY2VUZXh0OiBmdW5jdGlvbiAoY2hhcikge1xuXG4gICAgbGV0IHNlbGVjdGVkRWxlbWVudCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcbiAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgIC8vIFNldCB0aGUgbmV3IGNoYXIgYW5kIG92ZXJ3cml0ZSBjdXJyZW50IHRleHRcbiAgICAgIHNlbGVjdGVkRWxlbWVudC5odG1sKGNoYXIpXG5cbiAgICAgIC8vIE1vdmUgdGhlIGNhcmV0IGF0IHRoZSBlbmQgb2YgY3VycmVudCB0ZXh0XG4gICAgICBsZXQgY29udGVudCA9IHNlbGVjdGVkRWxlbWVudC5jb250ZW50cygpXG4gICAgICBtb3ZlQ2FyZXQoY29udGVudFtjb250ZW50Lmxlbmd0aCAtIDFdKVxuICAgIH0pXG4gIH1cbn1cblxuLyoqXG4gKiBcbiAqL1xudGlueW1jZS5QbHVnaW5NYW5hZ2VyLmFkZCgncmFqZV9pbmxpbmVDb2RlJywgZnVuY3Rpb24gKGVkaXRvciwgdXJsKSB7XG5cbiAgY29uc3QgQ09ERSA9ICdjb2RlJ1xuXG4gIC8vIEFkZCBhIGJ1dHRvbiB0aGF0IG9wZW5zIGEgd2luZG93XG4gIGVkaXRvci5hZGRCdXR0b24oJ3JhamVfaW5saW5lQ29kZScsIHtcbiAgICB0aXRsZTogJ2lubGluZV9jb2RlJyxcbiAgICBpY29uOiAnaWNvbi1pbmxpbmUtY29kZScsXG4gICAgdG9vbHRpcDogJ0lubGluZSBjb2RlJyxcbiAgICBkaXNhYmxlZFN0YXRlU2VsZWN0b3I6IERJU0FCTEVfU0VMRUNUT1JfSU5MSU5FLFxuXG4gICAgLy8gQnV0dG9uIGJlaGF2aW91clxuICAgIG9uY2xpY2s6IGZ1bmN0aW9uICgpIHtcbiAgICAgIGlubGluZS5oYW5kbGUoQ09ERSlcbiAgICB9XG4gIH0pXG5cbiAgZWRpdG9yLm9uKCdrZXlEb3duJywgZnVuY3Rpb24gKGUpIHtcblxuXG4gICAgLy8gQ2hlY2sgaWYgdGhlIHNlbGVjdGVkIGVsZW1lbnQgaXMgYSBDT0RFIHRoYXQgaXNuJ3QgaW5zaWRlIGEgRklHVVJFIG9yIFBSRVxuICAgIGxldCBzZWxlY3RlZEVsZW1lbnQgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG4gICAgaWYgKHNlbGVjdGVkRWxlbWVudC5pcygnY29kZScpICYmICFzZWxlY3RlZEVsZW1lbnQucGFyZW50cyhGSUdVUkVfU0VMRUNUT1IpLmxlbmd0aCAmJiAhc2VsZWN0ZWRFbGVtZW50LnBhcmVudHMoJ3ByZScpLmxlbmd0aCkge1xuXG4gICAgICAvLyBDaGVjayBpZiBFTlRFUiBpcyBwcmVzc2VkXG4gICAgICBpZiAoZS5rZXlDb2RlID09IDEzKSB7XG5cbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKClcbiAgICAgICAgaW5saW5lLmV4aXQoKVxuICAgICAgfVxuXG4gICAgICAvL0NoZWNrIGlmIGEgUFJJTlRBQkxFIENIQVIgaXMgcHJlc3NlZFxuICAgICAgaWYgKGNoZWNrSWZQcmludGFibGVDaGFyKGUua2V5Q29kZSkpIHtcblxuICAgICAgICAvLyBJZiB0aGUgZmlyc3QgY2hhciBpcyBaRVJPX1NQQUNFIGFuZCB0aGUgY29kZSBoYXMgbm8gY2hhclxuICAgICAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LnRleHQoKS5sZW5ndGggPT0gMiAmJiBgJiMke3NlbGVjdGVkRWxlbWVudC50ZXh0KCkuY2hhckNvZGVBdCgwKX07YCA9PSBaRVJPX1NQQUNFKSB7XG5cbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpXG4gICAgICAgICAgaW5saW5lLnJlcGxhY2VUZXh0KGUua2V5KVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9KVxufSlcblxuLyoqXG4gKiAgSW5saW5lIHF1b3RlIHBsdWdpbiBSQUpFXG4gKi9cbnRpbnltY2UuUGx1Z2luTWFuYWdlci5hZGQoJ3JhamVfaW5saW5lUXVvdGUnLCBmdW5jdGlvbiAoZWRpdG9yLCB1cmwpIHtcblxuICBjb25zdCBRID0gJ3EnXG5cbiAgLy8gQWRkIGEgYnV0dG9uIHRoYXQgaGFuZGxlIHRoZSBpbmxpbmUgZWxlbWVudFxuICBlZGl0b3IuYWRkQnV0dG9uKCdyYWplX2lubGluZVF1b3RlJywge1xuICAgIHRpdGxlOiAnaW5saW5lX3F1b3RlJyxcbiAgICBpY29uOiAnaWNvbi1pbmxpbmUtcXVvdGUnLFxuICAgIHRvb2x0aXA6ICdJbmxpbmUgcXVvdGUnLFxuICAgIGRpc2FibGVkU3RhdGVTZWxlY3RvcjogRElTQUJMRV9TRUxFQ1RPUl9JTkxJTkUsXG5cbiAgICAvLyBCdXR0b24gYmVoYXZpb3VyXG4gICAgb25jbGljazogZnVuY3Rpb24gKCkge1xuICAgICAgaW5saW5lLmhhbmRsZSgncScpXG4gICAgfVxuICB9KVxuXG4gIGVkaXRvci5vbigna2V5RG93bicsIGZ1bmN0aW9uIChlKSB7XG5cbiAgICAvLyBDaGVjayBpZiB0aGUgc2VsZWN0ZWQgZWxlbWVudCBpcyBhIENPREUgdGhhdCBpc24ndCBpbnNpZGUgYSBGSUdVUkUgb3IgUFJFXG4gICAgbGV0IHNlbGVjdGVkRWxlbWVudCA9ICQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSlcbiAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LmlzKCdxJykpIHtcblxuICAgICAgLy8gQ2hlY2sgaWYgRU5URVIgaXMgcHJlc3NlZFxuICAgICAgaWYgKGUua2V5Q29kZSA9PSAxMykge1xuXG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpXG4gICAgICAgIGlubGluZS5leGl0KClcbiAgICAgIH1cblxuICAgICAgLy8gQ2hlY2sgaWYgYSBQUklOVEFCTEUgQ0hBUiBpcyBwcmVzc2VkXG4gICAgICBpZiAoY2hlY2tJZlByaW50YWJsZUNoYXIoZS5rZXlDb2RlKSkge1xuXG4gICAgICAgIC8vIElmIHRoZSBmaXJzdCBjaGFyIGlzIFpFUk9fU1BBQ0UgYW5kIHRoZSBjb2RlIGhhcyBubyBjaGFyXG4gICAgICAgIGlmIChzZWxlY3RlZEVsZW1lbnQudGV4dCgpLmxlbmd0aCA9PSAxICYmIGAmIyR7c2VsZWN0ZWRFbGVtZW50LnRleHQoKS5jaGFyQ29kZUF0KDApfTtgID09IFpFUk9fU1BBQ0UpIHtcblxuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKClcbiAgICAgICAgICBpbmxpbmUucmVwbGFjZVRleHQoZS5rZXkpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH0pXG59KVxuXG4vKipcbiAqIFxuICovXG50aW55bWNlLlBsdWdpbk1hbmFnZXIuYWRkKCdyYWplX2V4dGVybmFsTGluaycsIGZ1bmN0aW9uIChlZGl0b3IsIHVybCkge1xuXG4gIGVkaXRvci5hZGRCdXR0b24oJ3JhamVfZXh0ZXJuYWxMaW5rJywge1xuICAgIHRpdGxlOiAnZXh0ZXJuYWxfbGluaycsXG4gICAgaWNvbjogJ2ljb24tZXh0ZXJuYWwtbGluaycsXG4gICAgdG9vbHRpcDogJ0V4dGVybmFsIGxpbmsnLFxuICAgIGRpc2FibGVkU3RhdGVTZWxlY3RvcjogRElTQUJMRV9TRUxFQ1RPUl9JTkxJTkUsXG5cbiAgICAvLyBCdXR0b24gYmVoYXZpb3VyXG4gICAgb25jbGljazogZnVuY3Rpb24gKCkge31cbiAgfSlcblxuXG4gIGxldCBsaW5rID0ge1xuICAgIGFkZDogZnVuY3Rpb24gKCkge1xuXG4gICAgfVxuICB9XG59KVxuXG4vKipcbiAqIFxuICovXG50aW55bWNlLlBsdWdpbk1hbmFnZXIuYWRkKCdyYWplX2lubGluZUZpZ3VyZScsIGZ1bmN0aW9uIChlZGl0b3IsIHVybCkge1xuICBlZGl0b3IuYWRkQnV0dG9uKCdyYWplX2lubGluZUZpZ3VyZScsIHtcbiAgICB0ZXh0OiAnaW5saW5lX2ZpZ3VyZScsXG4gICAgdG9vbHRpcDogJ0lubGluZSBxdW90ZScsXG4gICAgZGlzYWJsZWRTdGF0ZVNlbGVjdG9yOiBESVNBQkxFX1NFTEVDVE9SX0lOTElORSxcblxuICAgIC8vIEJ1dHRvbiBiZWhhdmlvdXJcbiAgICBvbmNsaWNrOiBmdW5jdGlvbiAoKSB7fVxuICB9KVxufSkiLCJ0aW55bWNlLlBsdWdpbk1hbmFnZXIuYWRkKCdyYWplX2xpc3RzJywgZnVuY3Rpb24gKGVkaXRvciwgdXJsKSB7XG5cbiAgY29uc3QgT0wgPSAnb2wnXG4gIGNvbnN0IFVMID0gJ3VsJ1xuXG4gIGVkaXRvci5hZGRCdXR0b24oJ3JhamVfb2wnLCB7XG4gICAgdGl0bGU6ICdyYWplX29sJyxcbiAgICBpY29uOiAnaWNvbi1vbCcsXG4gICAgdG9vbHRpcDogJ09yZGVyZWQgbGlzdCcsXG4gICAgZGlzYWJsZWRTdGF0ZVNlbGVjdG9yOiBESVNBQkxFX1NFTEVDVE9SX0ZJR1VSRVMsXG5cbiAgICAvLyBCdXR0b24gYmVoYXZpb3VyXG4gICAgb25jbGljazogZnVuY3Rpb24gKCkge1xuICAgICAgbGlzdC5hZGQoT0wpXG4gICAgfVxuICB9KVxuXG4gIGVkaXRvci5hZGRCdXR0b24oJ3JhamVfdWwnLCB7XG4gICAgdGl0bGU6ICdyYWplX3VsJyxcbiAgICBpY29uOiAnaWNvbi11bCcsXG4gICAgdG9vbHRpcDogJ1Vub3JkZXJlZCBsaXN0JyxcbiAgICBkaXNhYmxlZFN0YXRlU2VsZWN0b3I6IERJU0FCTEVfU0VMRUNUT1JfRklHVVJFUyxcblxuICAgIC8vIEJ1dHRvbiBiZWhhdmlvdXJcbiAgICBvbmNsaWNrOiBmdW5jdGlvbiAoKSB7XG4gICAgICBsaXN0LmFkZChVTClcbiAgICB9XG4gIH0pXG5cbiAgLyoqXG4gICAqIFxuICAgKi9cbiAgZWRpdG9yLm9uKCdrZXlEb3duJywgZnVuY3Rpb24gKGUpIHtcblxuXG4gICAgLy8gQ2hlY2sgaWYgdGhlIHNlbGVjdGVkIGVsZW1lbnQgaXMgYSBQIGluc2lkZSBhIGxpc3QgKE9MLCBVTClcbiAgICBsZXQgc2VsZWN0ZWRFbGVtZW50ID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuICAgIGlmIChzZWxlY3RlZEVsZW1lbnQuaXMoJ3AnKSAmJiAoc2VsZWN0ZWRFbGVtZW50LnBhcmVudHMoJ3VsJykubGVuZ3RoIHx8IHNlbGVjdGVkRWxlbWVudC5wYXJlbnRzKCdsaScpLmxlbmd0aCkpIHtcblxuXG4gICAgICAvKipcbiAgICAgICAqIENoZWNrIGlmIENNRCtFTlRFUiBvciBDVFJMK0VOVEVSIGFyZSBwcmVzc2VkXG4gICAgICAgKi9cbiAgICAgIGlmICgoZS5tZXRhS2V5IHx8IGUuY3RybEtleSkgJiYgZS5rZXlDb2RlID09IDEzKSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgICBsaXN0LmFkZFBhcmFncmFwaCgpXG4gICAgICB9XG5cbiAgICAgIC8qKlxuICAgICAgICogQ2hlY2sgaWYgU0hJRlQrVEFCIGlzIHByZXNzZWRcbiAgICAgICAqL1xuICAgICAgZWxzZSBpZiAoZS5zaGlmdEtleSAmJiBlLmtleUNvZGUgPT0gOSkge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgbGlzdC5kZU5lc3QoKVxuICAgICAgfVxuXG4gICAgICAvKipcbiAgICAgICAqIENoZWNrIGlmIEVOVEVSIGlzIHByZXNzZWRcbiAgICAgICAqL1xuICAgICAgZWxzZSBpZiAoZS5rZXlDb2RlID09IDEzKSB7XG5cbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIHNlbGVjdGlvbiBpcyBjb2xsYXBzZWRcbiAgICAgICAgaWYgKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5pc0NvbGxhcHNlZCgpKSB7XG5cbiAgICAgICAgICBpZiAoIXNlbGVjdGVkRWxlbWVudC50ZXh0KCkudHJpbSgpLmxlbmd0aCkge1xuXG4gICAgICAgICAgICAvLyBEZSBuZXN0XG4gICAgICAgICAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LnBhcmVudHMoJ3VsLG9sJykubGVuZ3RoID4gMSlcbiAgICAgICAgICAgICAgbGlzdC5kZU5lc3QoKVxuXG4gICAgICAgICAgICAvLyBSZW1vdmUgdGhlIGVtcHR5IExJXG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgIGxpc3QucmVtb3ZlTGlzdEl0ZW0oKVxuXG4gICAgICAgICAgfSBlbHNlXG4gICAgICAgICAgICBsaXN0LmFkZExpc3RJdGVtKClcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvKipcbiAgICAgICAqIENoZWNrIGlmIFRBQiBpcyBwcmVzc2VkXG4gICAgICAgKi9cbiAgICAgIGVsc2UgaWYgKGUua2V5Q29kZSA9PSA5KSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgICBsaXN0Lm5lc3QoKVxuICAgICAgfVxuICAgIH1cbiAgfSlcblxuXG4gIC8qKlxuICAgKiBcbiAgICovXG4gIGxldCBsaXN0ID0ge1xuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgYWRkOiBmdW5jdGlvbiAodHlwZSkge1xuXG4gICAgICAvLyBHZXQgdGhlIGN1cnJlbnQgZWxlbWVudCBcbiAgICAgIGxldCBzZWxlY3RlZEVsZW1lbnQgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG4gICAgICBsZXQgdGV4dCA9ICc8YnI+J1xuXG4gICAgICAvLyBJZiB0aGUgY3VycmVudCBlbGVtZW50IGhhcyB0ZXh0LCBzYXZlIGl0XG4gICAgICBpZiAoc2VsZWN0ZWRFbGVtZW50LnRleHQoKS50cmltKCkubGVuZ3RoID4gMClcbiAgICAgICAgdGV4dCA9IHNlbGVjdGVkRWxlbWVudC50ZXh0KCkudHJpbSgpXG5cbiAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICBsZXQgbmV3TGlzdCA9ICQoYDwke3R5cGV9PjxsaT48cD4ke3RleHR9PC9wPjwvbGk+PC8ke3R5cGV9PmApXG5cbiAgICAgICAgLy8gQWRkIHRoZSBuZXcgZWxlbWVudFxuICAgICAgICBzZWxlY3RlZEVsZW1lbnQucmVwbGFjZVdpdGgobmV3TGlzdClcblxuICAgICAgICAvLyBTYXZlIGNoYW5nZXNcbiAgICAgICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG5cbiAgICAgICAgLy8gTW92ZSB0aGUgY3Vyc29yXG4gICAgICAgIG1vdmVDYXJldChuZXdMaXN0LmZpbmQoJ3AnKVswXSwgZmFsc2UpXG4gICAgICB9KVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBhZGRMaXN0SXRlbTogZnVuY3Rpb24gKCkge1xuXG4gICAgICBjb25zdCBCUiA9ICc8YnI+J1xuXG4gICAgICAvLyBHZXQgdGhlIHJlZmVyZW5jZXMgb2YgdGhlIGV4aXN0aW5nIGVsZW1lbnRcbiAgICAgIGxldCBwID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKVxuICAgICAgbGV0IGxpc3RJdGVtID0gcC5wYXJlbnQoJ2xpJylcblxuICAgICAgLy8gUGxhY2Vob2xkZXIgdGV4dCBvZiB0aGUgbmV3IGxpXG4gICAgICBsZXQgbmV3VGV4dCA9IEJSXG4gICAgICBsZXQgbm9kZXMgPSBwLmNvbnRlbnRzKClcblxuICAgICAgLy8gSWYgdGhlcmUgaXMganVzdCBvbmUgbm9kZSB3cmFwcGVkIGluc2lkZSB0aGUgcGFyYWdyYXBoXG4gICAgICBpZiAobm9kZXMubGVuZ3RoID09IDEpIHtcblxuICAgICAgICAvLyBHZXQgdGhlIHN0YXJ0IG9mZnNldCBhbmQgdGV4dCBvZiB0aGUgY3VycmVudCBsaVxuICAgICAgICBsZXQgc3RhcnRPZmZzZXQgPSB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Um5nKCkuc3RhcnRPZmZzZXRcbiAgICAgICAgbGV0IHBUZXh0ID0gcC50ZXh0KClcblxuICAgICAgICAvLyBJZiB0aGUgY3Vyc29yIGlzbid0IGF0IHRoZSBlbmRcbiAgICAgICAgaWYgKHN0YXJ0T2Zmc2V0ICE9IHBUZXh0Lmxlbmd0aCkge1xuXG4gICAgICAgICAgLy8gR2V0IHRoZSByZW1haW5pbmcgdGV4dFxuICAgICAgICAgIG5ld1RleHQgPSBwVGV4dC5zdWJzdHJpbmcoc3RhcnRPZmZzZXQsIHBUZXh0Lmxlbmd0aClcbiAgICAgICAgfVxuXG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVuZG9NYW5hZ2VyLnRyYW5zYWN0KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgdGV4dCBvZiB0aGUgY3VycmVudCBsaVxuICAgICAgICAgIHAudGV4dChwVGV4dC5zdWJzdHJpbmcoMCwgc3RhcnRPZmZzZXQpKVxuXG4gICAgICAgICAgaWYgKCFwLnRleHQoKS5sZW5ndGgpXG4gICAgICAgICAgICBwLmh0bWwoQlIpXG5cbiAgICAgICAgICAvLyBDcmVhdGUgYW5kIGFkZCB0aGUgbmV3IGxpXG4gICAgICAgICAgbGV0IG5ld0xpc3RJdGVtID0gJChgPGxpPjxwPiR7bmV3VGV4dH08L3A+PC9saT5gKVxuICAgICAgICAgIGxpc3RJdGVtLmFmdGVyKG5ld0xpc3RJdGVtKVxuXG4gICAgICAgICAgLy8gTW92ZSB0aGUgY2FyZXQgdG8gdGhlIG5ldyBsaVxuICAgICAgICAgIG1vdmVDYXJldChuZXdMaXN0SXRlbVswXSwgdHJ1ZSlcblxuICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgY29udGVudFxuICAgICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuICAgICAgICB9KVxuICAgICAgfVxuXG4gICAgICAvLyBJbnN0ZWFkIGlmIHRoZXJlIGFyZSBtdWx0aXBsZSBub2RlcyBpbnNpZGUgdGhlIHBhcmFncmFwaFxuICAgICAgZWxzZSB7XG5cbiAgICAgICAgLy8gSXN0YW50aWF0ZSB0aGUgcmFuZ2UgdG8gYmUgc2VsZWN0ZWRcbiAgICAgICAgbGV0IHJhbmdlID0gZG9jdW1lbnQuY3JlYXRlUmFuZ2UoKVxuXG4gICAgICAgIC8vIFN0YXJ0IHRoZSByYW5nZSBmcm9tIHRoZSBzZWxlY3RlZCBub2RlIGFuZCBvZmZzZXQgYW5kIGVuZHMgaXQgYXQgdGhlIGVuZCBvZiB0aGUgbGFzdCBub2RlXG4gICAgICAgIHJhbmdlLnNldFN0YXJ0KHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXRSbmcoKS5zdGFydENvbnRhaW5lciwgdGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldFJuZygpLnN0YXJ0T2Zmc2V0KVxuICAgICAgICByYW5nZS5zZXRFbmQodGhpcy5nZXRMYXN0Tm90RW1wdHlOb2RlKG5vZGVzKSwgMSlcblxuICAgICAgICAvLyBTZWxlY3QgdGhlIHJhbmdlXG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5zZXRSbmcocmFuZ2UpXG5cbiAgICAgICAgLy8gU2F2ZSB0aGUgaHRtbCBjb250ZW50XG4gICAgICAgIG5ld1RleHQgPSB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Q29udGVudCgpXG5cbiAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgcC5odG1sKHAuaHRtbCgpLnJlcGxhY2UobmV3VGV4dCwgJycpKVxuXG4gICAgICAgICAgaWYgKCFwLnRleHQoKS5sZW5ndGgpXG4gICAgICAgICAgICBwLmh0bWwoQlIpXG5cbiAgICAgICAgICAvLyBDcmVhdGUgYW5kIGFkZCB0aGUgbmV3IGxpXG4gICAgICAgICAgbGV0IG5ld0xpc3RJdGVtID0gJChgPGxpPjxwPiR7bmV3VGV4dH08L3A+PC9saT5gKVxuICAgICAgICAgIGxpc3RJdGVtLmFmdGVyKG5ld0xpc3RJdGVtKVxuXG4gICAgICAgICAgLy8gTW92ZSB0aGUgY2FyZXQgdG8gdGhlIG5ldyBsaVxuICAgICAgICAgIG1vdmVDYXJldChuZXdMaXN0SXRlbVswXSwgdHJ1ZSlcblxuICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgY29udGVudFxuICAgICAgICAgIHRpbnltY2UudHJpZ2dlclNhdmUoKVxuICAgICAgICB9KVxuICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBnZXRMYXN0Tm90RW1wdHlOb2RlOiBmdW5jdGlvbiAobm9kZXMpIHtcblxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBub2Rlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAobm9kZXNbaV0ubm9kZVR5cGUgPT0gMyAmJiAhbm9kZXNbaV0ubGVuZ3RoKVxuICAgICAgICAgIG5vZGVzLnNwbGljZShpLCAxKVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gbm9kZXNbbm9kZXMubGVuZ3RoIC0gMV1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgcmVtb3ZlTGlzdEl0ZW06IGZ1bmN0aW9uICgpIHtcblxuICAgICAgLy8gR2V0IHRoZSBzZWxlY3RlZCBsaXN0SXRlbVxuICAgICAgbGV0IGxpc3RJdGVtID0gJCh0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Tm9kZSgpKS5wYXJlbnQoJ2xpJylcblxuICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIC8vIEFkZCBhIGVtcHR5IHBhcmFncmFwaCBhZnRlciB0aGUgbGlzdFxuICAgICAgICBsZXQgbmV3UCA9ICQoJzxwPjxicj48L3A+JylcbiAgICAgICAgbGlzdEl0ZW0ucGFyZW50KCkuYWZ0ZXIobmV3UClcblxuICAgICAgICAvLyBDaGVjayBpZiB0aGUgbGlzdCBoYXMgZXhhY3RseSBvbmUgY2hpbGQgcmVtb3ZlIHRoZSBsaXN0XG4gICAgICAgIGlmIChsaXN0SXRlbS5wYXJlbnQoKS5jaGlsZHJlbignbGknKS5sZW5ndGggPT0gMSkge1xuICAgICAgICAgIGxldCBsaXN0ID0gbGlzdEl0ZW0ucGFyZW50KClcbiAgICAgICAgICBsaXN0LnJlbW92ZSgpXG4gICAgICAgIH1cblxuICAgICAgICAvLyBJZiB0aGUgbGlzdCBoYXMgbW9yZSBjaGlsZHJlbiByZW1vdmUgdGhlIHNlbGVjdGVkIGNoaWxkXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBsaXN0SXRlbS5yZW1vdmUoKVxuXG4gICAgICAgIG1vdmVDYXJldChuZXdQWzBdKVxuXG4gICAgICAgIC8vIFVwZGF0ZSB0aGUgY29udGVudFxuICAgICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcbiAgICAgIH0pXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIG5lc3Q6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgbGV0IHAgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG4gICAgICBsZXQgbGlzdEl0ZW0gPSBwLnBhcmVudCgnbGknKVxuXG4gICAgICAvLyBDaGVjayBpZiB0aGUgY3VycmVudCBsaSBoYXMgYXQgbGVhc3Qgb25lIHByZXZpb3VzIGVsZW1lbnRcbiAgICAgIGlmIChsaXN0SXRlbS5wcmV2QWxsKCkubGVuZ3RoID4gMCkge1xuXG4gICAgICAgIC8vIENyZWF0ZSB0aGUgbmV3IGxpc3RcbiAgICAgICAgbGV0IHRleHQgPSAnPGJyPidcblxuICAgICAgICBpZiAocC50ZXh0KCkudHJpbSgpLmxlbmd0aClcbiAgICAgICAgICB0ZXh0ID0gcC50ZXh0KCkudHJpbSgpXG5cbiAgICAgICAgLy8gR2V0IHR5cGUgb2YgdGhlIHBhcmVudCBsaXN0XG4gICAgICAgIGxldCB0eXBlID0gbGlzdEl0ZW0ucGFyZW50KClbMF0udGFnTmFtZS50b0xvd2VyQ2FzZSgpXG5cbiAgICAgICAgLy8gQ3JlYXRlIHRoZSBuZXcgbmVzdGVkIGxpc3RcbiAgICAgICAgbGV0IG5ld0xpc3RJdGVtID0gJChsaXN0SXRlbVswXS5vdXRlckhUTUwpXG5cbiAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgLy8gSWYgdGhlIHByZXZpb3VzIGVsZW1lbnQgaGFzIGEgbGlzdFxuICAgICAgICAgIGlmIChsaXN0SXRlbS5wcmV2KCkuZmluZCgndWwsb2wnKS5sZW5ndGgpXG4gICAgICAgICAgICBsaXN0SXRlbS5wcmV2KCkuZmluZCgndWwsb2wnKS5hcHBlbmQobmV3TGlzdEl0ZW0pXG5cbiAgICAgICAgICAvLyBBZGQgdGhlIG5ldyBsaXN0IGluc2lkZSB0aGUgcHJldmlvdXMgbGlcbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIG5ld0xpc3RJdGVtID0gJChgPCR7dHlwZX0+JHtuZXdMaXN0SXRlbVswXS5vdXRlckhUTUx9PC8ke3R5cGV9PmApXG4gICAgICAgICAgICBsaXN0SXRlbS5wcmV2KCkuYXBwZW5kKG5ld0xpc3RJdGVtKVxuICAgICAgICAgIH1cblxuICAgICAgICAgIGxpc3RJdGVtLnJlbW92ZSgpXG5cbiAgICAgICAgICAvLyBNb3ZlIHRoZSBjYXJldCBhdCB0aGUgZW5kIG9mIHRoZSBuZXcgcCBcbiAgICAgICAgICBtb3ZlQ2FyZXQobmV3TGlzdEl0ZW0uZmluZCgncCcpWzBdKVxuXG4gICAgICAgICAgdGlueW1jZS50cmlnZ2VyU2F2ZSgpXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIGRlTmVzdDogZnVuY3Rpb24gKCkge1xuXG4gICAgICBsZXQgbGlzdEl0ZW0gPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpLnBhcmVudCgnbGknKVxuICAgICAgbGV0IGxpc3QgPSBsaXN0SXRlbS5wYXJlbnQoKVxuXG4gICAgICAvLyBDaGVjayBpZiB0aGUgY3VycmVudCBsaXN0IGhhcyBhdCBsZWFzdCBhbm90aGVyIGxpc3QgYXMgcGFyZW50XG4gICAgICBpZiAobGlzdEl0ZW0ucGFyZW50cygndWwsb2wnKS5sZW5ndGggPiAxKSB7XG5cbiAgICAgICAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgLy8gR2V0IGFsbCBsaTogY3VycmVudCBhbmQgaWYgdGhlcmUgYXJlIHN1Y2Nlc3NpdmVcbiAgICAgICAgICBsZXQgbmV4dExpID0gW2xpc3RJdGVtXVxuICAgICAgICAgIGlmIChsaXN0SXRlbS5uZXh0QWxsKCkubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgbGlzdEl0ZW0ubmV4dEFsbCgpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICBuZXh0TGkucHVzaCgkKHRoaXMpKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBNb3ZlIGFsbCBsaSBvdXQgZnJvbSB0aGUgbmVzdGVkIGxpc3RcbiAgICAgICAgICBmb3IgKGxldCBpID0gbmV4dExpLmxlbmd0aCAtIDE7IGkgPiAtMTsgaS0tKSB7XG4gICAgICAgICAgICBuZXh0TGlbaV0ucmVtb3ZlKClcbiAgICAgICAgICAgIGxpc3QucGFyZW50KCkuYWZ0ZXIobmV4dExpW2ldKVxuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIElmIGVtcHR5IHJlbW92ZSB0aGUgbGlzdFxuICAgICAgICAgIGlmICghbGlzdC5jaGlsZHJlbignbGknKS5sZW5ndGgpXG4gICAgICAgICAgICBsaXN0LnJlbW92ZSgpXG5cbiAgICAgICAgICAvLyBNb3ZlIHRoZSBjYXJldCBhdCB0aGUgZW5kXG4gICAgICAgICAgbW92ZUNhcmV0KGxpc3RJdGVtLmZpbmQoJ3AnKVswXSlcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgYWRkUGFyYWdyYXBoOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgIC8vIEdldCByZWZlcmVuY2VzIG9mIGN1cnJlbnQgcFxuICAgICAgbGV0IHAgPSAkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpXG4gICAgICBsZXQgc3RhcnRPZmZzZXQgPSB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb24uZ2V0Um5nKCkuc3RhcnRPZmZzZXRcbiAgICAgIGxldCBwVGV4dCA9IHAudGV4dCgpLnRyaW0oKVxuXG4gICAgICBsZXQgdGV4dCA9ICc8YnI+J1xuXG4gICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci51bmRvTWFuYWdlci50cmFuc2FjdChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgLy8gSWYgdGhlIEVOVEVSIGJyZWFrcyBwXG4gICAgICAgIGlmIChzdGFydE9mZnNldCAhPSBwVGV4dC5sZW5ndGgpIHtcblxuICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgdGV4dCBvZiB0aGUgY3VycmVudCBsaVxuICAgICAgICAgIHAudGV4dChwVGV4dC5zdWJzdHJpbmcoMCwgc3RhcnRPZmZzZXQpKVxuXG4gICAgICAgICAgLy8gR2V0IHRoZSByZW1haW5pbmcgdGV4dFxuICAgICAgICAgIHRleHQgPSBwVGV4dC5zdWJzdHJpbmcoc3RhcnRPZmZzZXQsIHBUZXh0Lmxlbmd0aClcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENyZWF0ZSBhbmQgYWRkIHRoZSBlbGVtZW50XG4gICAgICAgIGxldCBuZXdQID0gJChgPHA+JHt0ZXh0fTwvcD5gKVxuICAgICAgICBwLmFmdGVyKG5ld1ApXG5cbiAgICAgICAgbW92ZUNhcmV0KG5ld1BbMF0sIHRydWUpXG4gICAgICB9KVxuICAgIH1cbiAgfVxufSkiLCIvKipcbiAqIFxuICovXG5cbmZ1bmN0aW9uIG9wZW5NZXRhZGF0YURpYWxvZygpIHtcbiAgdGlueW1jZS5hY3RpdmVFZGl0b3Iud2luZG93TWFuYWdlci5vcGVuKHtcbiAgICB0aXRsZTogJ0VkaXQgbWV0YWRhdGEnLFxuICAgIHVybDogJ2pzL3JhamUtY29yZS9wbHVnaW4vcmFqZV9tZXRhZGF0YS5odG1sJyxcbiAgICB3aWR0aDogOTUwLFxuICAgIGhlaWdodDogODAwLFxuICAgIG9uQ2xvc2U6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgaWYgKHRpbnltY2UuYWN0aXZlRWRpdG9yLnVwZGF0ZWRfbWV0YWRhdGEgIT0gbnVsbCkge1xuXG4gICAgICAgIG1ldGFkYXRhLnVwZGF0ZSh0aW55bWNlLmFjdGl2ZUVkaXRvci51cGRhdGVkX21ldGFkYXRhKVxuXG4gICAgICAgIHRpbnltY2UuYWN0aXZlRWRpdG9yLnVwZGF0ZWRfbWV0YWRhdGEgPT0gbnVsbFxuICAgICAgfVxuXG4gICAgICB0aW55bWNlLmFjdGl2ZUVkaXRvci53aW5kb3dNYW5hZ2VyLmNsb3NlKClcbiAgICB9XG4gIH0sIG1ldGFkYXRhLmdldEFsbE1ldGFkYXRhKCkpXG59XG5cbnRpbnltY2UuUGx1Z2luTWFuYWdlci5hZGQoJ3JhamVfbWV0YWRhdGEnLCBmdW5jdGlvbiAoZWRpdG9yLCB1cmwpIHtcblxuICAvLyBBZGQgYSBidXR0b24gdGhhdCBoYW5kbGUgdGhlIGlubGluZSBlbGVtZW50XG4gIGVkaXRvci5hZGRCdXR0b24oJ3JhamVfbWV0YWRhdGEnLCB7XG4gICAgdGV4dDogJ01ldGFkYXRhJyxcbiAgICBpY29uOiBmYWxzZSxcbiAgICB0b29sdGlwOiAnRWRpdCBtZXRhZGF0YScsXG5cbiAgICAvLyBCdXR0b24gYmVoYXZpb3VyXG4gICAgb25jbGljazogZnVuY3Rpb24gKCkge1xuICAgICAgb3Blbk1ldGFkYXRhRGlhbG9nKClcbiAgICB9XG4gIH0pXG5cbiAgZWRpdG9yLm9uKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XG4gICAgaWYgKCQodGlueW1jZS5hY3RpdmVFZGl0b3Iuc2VsZWN0aW9uLmdldE5vZGUoKSkuaXMoSEVBREVSX1NFTEVDVE9SKSlcbiAgICAgIG9wZW5NZXRhZGF0YURpYWxvZygpXG4gIH0pXG5cbiAgbWV0YWRhdGEgPSB7XG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBnZXRBbGxNZXRhZGF0YTogZnVuY3Rpb24gKCkge1xuICAgICAgbGV0IGhlYWRlciA9ICQoSEVBREVSX1NFTEVDVE9SKVxuICAgICAgbGV0IHN1YnRpdGxlID0gaGVhZGVyLmZpbmQoJ2gxLnRpdGxlID4gc21hbGwnKS50ZXh0KClcbiAgICAgIGxldCBkYXRhID0ge1xuICAgICAgICBzdWJ0aXRsZTogc3VidGl0bGUsXG4gICAgICAgIHRpdGxlOiBoZWFkZXIuZmluZCgnaDEudGl0bGUnKS50ZXh0KCkucmVwbGFjZShzdWJ0aXRsZSwgJycpLFxuICAgICAgICBhdXRob3JzOiBtZXRhZGF0YS5nZXRBdXRob3JzKGhlYWRlciksXG4gICAgICAgIGNhdGVnb3JpZXM6IG1ldGFkYXRhLmdldENhdGVnb3JpZXMoaGVhZGVyKSxcbiAgICAgICAga2V5d29yZHM6IG1ldGFkYXRhLmdldEtleXdvcmRzKGhlYWRlcilcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGRhdGFcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICovXG4gICAgZ2V0QXV0aG9yczogZnVuY3Rpb24gKGhlYWRlcikge1xuICAgICAgbGV0IGF1dGhvcnMgPSBbXVxuXG4gICAgICBoZWFkZXIuZmluZCgnYWRkcmVzcy5sZWFkLmF1dGhvcnMnKS5lYWNoKGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAvLyBHZXQgYWxsIGFmZmlsaWF0aW9uc1xuICAgICAgICBsZXQgYWZmaWxpYXRpb25zID0gW11cbiAgICAgICAgJCh0aGlzKS5maW5kKCdzcGFuJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgYWZmaWxpYXRpb25zLnB1c2goJCh0aGlzKS50ZXh0KCkpXG4gICAgICAgIH0pXG5cbiAgICAgICAgLy8gcHVzaCBzaW5nbGUgYXV0aG9yXG4gICAgICAgIGF1dGhvcnMucHVzaCh7XG4gICAgICAgICAgbmFtZTogJCh0aGlzKS5jaGlsZHJlbignc3Ryb25nLmF1dGhvcl9uYW1lJykudGV4dCgpLFxuICAgICAgICAgIGVtYWlsOiAkKHRoaXMpLmZpbmQoJ2NvZGUuZW1haWwgPiBhJykudGV4dCgpLFxuICAgICAgICAgIGFmZmlsaWF0aW9uczogYWZmaWxpYXRpb25zXG4gICAgICAgIH0pXG4gICAgICB9KVxuXG4gICAgICByZXR1cm4gYXV0aG9yc1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBnZXRDYXRlZ29yaWVzOiBmdW5jdGlvbiAoaGVhZGVyKSB7XG4gICAgICBsZXQgY2F0ZWdvcmllcyA9IFtdXG5cbiAgICAgIGhlYWRlci5maW5kKCdwLmFjbV9zdWJqZWN0X2NhdGVnb3JpZXMgPiBjb2RlJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNhdGVnb3JpZXMucHVzaCgkKHRoaXMpLnRleHQoKSlcbiAgICAgIH0pXG5cbiAgICAgIHJldHVybiBjYXRlZ29yaWVzXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIGdldEtleXdvcmRzOiBmdW5jdGlvbiAoaGVhZGVyKSB7XG4gICAgICBsZXQga2V5d29yZHMgPSBbXVxuXG4gICAgICBoZWFkZXIuZmluZCgndWwubGlzdC1pbmxpbmUgPiBsaSA+IGNvZGUnKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAga2V5d29yZHMucHVzaCgkKHRoaXMpLnRleHQoKSlcbiAgICAgIH0pXG5cbiAgICAgIHJldHVybiBrZXl3b3Jkc1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICB1cGRhdGU6IGZ1bmN0aW9uICh1cGRhdGVkTWV0YWRhdGEpIHtcblxuICAgICAgJCgnaGVhZCBtZXRhW3Byb3BlcnR5XSwgaGVhZCBsaW5rW3Byb3BlcnR5XSwgaGVhZCBtZXRhW25hbWVdJykucmVtb3ZlKClcblxuICAgICAgbGV0IGN1cnJlbnRNZXRhZGF0YSA9IG1ldGFkYXRhLmdldEFsbE1ldGFkYXRhKClcblxuICAgICAgLy8gVXBkYXRlIHRpdGxlIGFuZCBzdWJ0aXRsZVxuICAgICAgaWYgKHVwZGF0ZWRNZXRhZGF0YS50aXRsZSAhPSBjdXJyZW50TWV0YWRhdGEudGl0bGUgfHwgdXBkYXRlZE1ldGFkYXRhLnN1YnRpdGxlICE9IGN1cnJlbnRNZXRhZGF0YS5zdWJ0aXRsZSkge1xuICAgICAgICBsZXQgdGV4dCA9IHVwZGF0ZWRNZXRhZGF0YS50aXRsZVxuXG4gICAgICAgIGlmICh1cGRhdGVkTWV0YWRhdGEuc3VidGl0bGUudHJpbSgpLmxlbmd0aClcbiAgICAgICAgICB0ZXh0ICs9IGAgLS0gJHt1cGRhdGVkTWV0YWRhdGEuc3VidGl0bGV9YFxuXG4gICAgICAgICQoJ3RpdGxlJykudGV4dCh0ZXh0KVxuICAgICAgfVxuXG4gICAgICBsZXQgYWZmaWxpYXRpb25zQ2FjaGUgPSBbXVxuXG4gICAgICB1cGRhdGVkTWV0YWRhdGEuYXV0aG9ycy5mb3JFYWNoKGZ1bmN0aW9uIChhdXRob3IpIHtcblxuICAgICAgICAkKCdoZWFkJykuYXBwZW5kKGA8bWV0YSBhYm91dD1cIm1haWx0bzoke2F1dGhvci5lbWFpbH1cIiB0eXBlb2Y9XCJzY2hlbWE6UGVyc29uXCIgcHJvcGVydHk9XCJzY2hlbWE6bmFtZVwiIG5hbWU9XCJkYy5jcmVhdG9yXCIgY29udGVudD1cIiR7YXV0aG9yLm5hbWV9XCI+YClcbiAgICAgICAgJCgnaGVhZCcpLmFwcGVuZChgPG1ldGEgYWJvdXQ9XCJtYWlsdG86JHthdXRob3IuZW1haWx9XCIgcHJvcGVydHk9XCJzY2hlbWE6ZW1haWxcIiBjb250ZW50PVwiJHthdXRob3IuZW1haWx9XCI+YClcblxuICAgICAgICBhdXRob3IuYWZmaWxpYXRpb25zLmZvckVhY2goZnVuY3Rpb24gKGFmZmlsaWF0aW9uKSB7XG5cbiAgICAgICAgICAvLyBMb29rIHVwIGZvciBhbHJlYWR5IGV4aXN0aW5nIGFmZmlsaWF0aW9uXG4gICAgICAgICAgbGV0IHRvQWRkID0gdHJ1ZVxuICAgICAgICAgIGxldCBpZFxuXG4gICAgICAgICAgYWZmaWxpYXRpb25zQ2FjaGUuZm9yRWFjaChmdW5jdGlvbiAoYWZmaWxpYXRpb25DYWNoZSkge1xuICAgICAgICAgICAgaWYgKGFmZmlsaWF0aW9uQ2FjaGUuY29udGVudCA9PSBhZmZpbGlhdGlvbikge1xuICAgICAgICAgICAgICB0b0FkZCA9IGZhbHNlXG4gICAgICAgICAgICAgIGlkID0gYWZmaWxpYXRpb25DYWNoZS5pZFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pXG5cbiAgICAgICAgICAvLyBJZiB0aGVyZSBpcyBubyBleGlzdGluZyBhZmZpbGlhdGlvbiwgYWRkIGl0XG4gICAgICAgICAgaWYgKHRvQWRkKSB7XG4gICAgICAgICAgICBsZXQgZ2VuZXJhdGVkSWQgPSBgI2FmZmlsaWF0aW9uXyR7YWZmaWxpYXRpb25zQ2FjaGUubGVuZ3RoKzF9YFxuICAgICAgICAgICAgYWZmaWxpYXRpb25zQ2FjaGUucHVzaCh7XG4gICAgICAgICAgICAgIGlkOiBnZW5lcmF0ZWRJZCxcbiAgICAgICAgICAgICAgY29udGVudDogYWZmaWxpYXRpb25cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICBpZCA9IGdlbmVyYXRlZElkXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgJCgnaGVhZCcpLmFwcGVuZChgPGxpbmsgYWJvdXQ9XCJtYWlsdG86JHthdXRob3IuZW1haWx9XCIgcHJvcGVydHk9XCJzY2hlbWE6YWZmaWxpYXRpb25cIiBocmVmPVwiJHtpZH1cIj5gKVxuICAgICAgICB9KVxuICAgICAgfSlcblxuICAgICAgYWZmaWxpYXRpb25zQ2FjaGUuZm9yRWFjaChmdW5jdGlvbiAoYWZmaWxpYXRpb25DYWNoZSkge1xuICAgICAgICAkKCdoZWFkJykuYXBwZW5kKGA8bWV0YSBhYm91dD1cIiR7YWZmaWxpYXRpb25DYWNoZS5pZH1cIiB0eXBlb2Y9XCJzY2hlbWE6T3JnYW5pemF0aW9uXCIgcHJvcGVydHk9XCJzY2hlbWE6bmFtZVwiIGNvbnRlbnQ9XCIke2FmZmlsaWF0aW9uQ2FjaGUuY29udGVudH1cIj5gKVxuICAgICAgfSlcblxuICAgICAgdXBkYXRlZE1ldGFkYXRhLmNhdGVnb3JpZXMuZm9yRWFjaChmdW5jdGlvbihjYXRlZ29yeSl7XG4gICAgICAgICQoJ2hlYWQnKS5hcHBlbmQoYDxtZXRhIG5hbWU9XCJkY3Rlcm1zLnN1YmplY3RcIiBjb250ZW50PVwiJHtjYXRlZ29yeX1cIi8+YClcbiAgICAgIH0pXG5cbiAgICAgIHVwZGF0ZWRNZXRhZGF0YS5rZXl3b3Jkcy5mb3JFYWNoKGZ1bmN0aW9uKGtleXdvcmQpe1xuICAgICAgICAkKCdoZWFkJykuYXBwZW5kKGA8bWV0YSBwcm9wZXJ0eT1cInByaXNtOmtleXdvcmRcIiBjb250ZW50PVwiJHtrZXl3b3JkfVwiLz5gKVxuICAgICAgfSlcblxuICAgICAgJCgnI3JhamVfcm9vdCcpLmFkZEhlYWRlckhUTUwoKVxuICAgICAgc2V0Tm9uRWRpdGFibGVIZWFkZXIoKVxuICAgICAgdXBkYXRlSWZyYW1lRnJvbVNhdmVkQ29udGVudCgpXG4gICAgfVxuICB9XG5cbn0pIiwidGlueW1jZS5QbHVnaW5NYW5hZ2VyLmFkZCgncmFqZV9zYXZlJywgZnVuY3Rpb24gKGVkaXRvciwgdXJsKSB7XG5cbiAgc2F2ZU1hbmFnZXIgPSB7XG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBpbml0U2F2ZTogZnVuY3Rpb24gKCkge1xuICAgICAgLy8gUmV0dXJuIHRoZSBtZXNzYWdlIGZvciB0aGUgYmFja2VuZFxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdGl0bGU6IHNhdmVNYW5hZ2VyLmdldFRpdGxlKCksXG4gICAgICAgIGRvY3VtZW50OiBzYXZlTWFuYWdlci5nZXREZXJhc2hlZEFydGljbGUoKVxuICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKi9cbiAgICBzYXZlQXM6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgLy8gU2VuZCBtZXNzYWdlIHRvIHRoZSBiYWNrZW5kXG4gICAgICBzYXZlQXNBcnRpY2xlKHNhdmVNYW5hZ2VyLmluaXRTYXZlKCkpXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqL1xuICAgIHNhdmU6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgLy8gU2VuZCBtZXNzYWdlIHRvIHRoZSBiYWNrZW5kXG4gICAgICBzYXZlQXJ0aWNsZShzYXZlTWFuYWdlci5pbml0U2F2ZSgpKVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm4gdGhlIFJBU0ggYXJ0aWNsZSByZW5kZXJlZCAod2l0aG91dCB0aW55bWNlKVxuICAgICAqL1xuICAgIGdldERlcmFzaGVkQXJ0aWNsZTogZnVuY3Rpb24gKCkge1xuXG4gICAgICB0aW55bWNlLnRyaWdnZXJTYXZlKClcblxuICAgICAgLy8gU2F2ZSBodG1sIHJlZmVyZW5jZXNcbiAgICAgIGxldCBhcnRpY2xlID0gJCgnaHRtbCcpLmNsb25lKClcbiAgICAgIGxldCB0aW55bWNlU2F2ZWRDb250ZW50ID0gYXJ0aWNsZS5maW5kKCcjcmFqZV9yb290JylcblxuICAgICAgYXJ0aWNsZS5yZW1vdmVBdHRyKCdjbGFzcycpXG5cbiAgICAgIC8vcmVwbGFjZSBib2R5IHdpdGggdGhlIHJpZ2h0IG9uZSAodGhpcyBhY3Rpb24gcmVtb3ZlIHRpbnltY2UpXG4gICAgICBhcnRpY2xlLmZpbmQoJ2JvZHknKS5odG1sKHRpbnltY2VTYXZlZENvbnRlbnQuaHRtbCgpKVxuICAgICAgYXJ0aWNsZS5maW5kKCdib2R5JykucmVtb3ZlQXR0cignc3R5bGUnKVxuICAgICAgYXJ0aWNsZS5maW5kKCdib2R5JykucmVtb3ZlQXR0cignY2xhc3MnKVxuXG4gICAgICAvL3JlbW92ZSBhbGwgc3R5bGUgYW5kIGxpbmsgdW4tbmVlZGVkIGZyb20gdGhlIGhlYWRcbiAgICAgIGFydGljbGUuZmluZCgnaGVhZCcpLmNoaWxkcmVuKCdzdHlsZVt0eXBlPVwidGV4dC9jc3NcIl0nKS5yZW1vdmUoKVxuICAgICAgYXJ0aWNsZS5maW5kKCdoZWFkJykuY2hpbGRyZW4oJ2xpbmtbaWRdJykucmVtb3ZlKClcblxuICAgICAgLy8gSWYgdGhlIHBsdWdpbiByYWplX2Fubm90YXRpb25zIGlzIGFkZGVkIHRvIHRpbnltY2UgXG4gICAgICBpZiAodHlwZW9mIHRpbnltY2UuYWN0aXZlRWRpdG9yLnBsdWdpbnMucmFqZV9hbm5vdGF0aW9ucyAhPSB1bmRlZmluZWQpXG4gICAgICAgIGFydGljbGUgPSB1cGRhdGVBbm5vdGF0aW9uc09uU2F2ZShhcnRpY2xlKVxuXG4gICAgICAvLyBFeGVjdXRlIGRlcmFzaCAocmVwbGFjZSBhbGwgY2dlbiBlbGVtZW50cyB3aXRoIGl0cyBvcmlnaW5hbCBjb250ZW50KVxuICAgICAgYXJ0aWNsZS5maW5kKCcqW2RhdGEtcmFzaC1vcmlnaW5hbC1jb250ZW50XScpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICBsZXQgb3JpZ2luYWxDb250ZW50ID0gJCh0aGlzKS5hdHRyKCdkYXRhLXJhc2gtb3JpZ2luYWwtY29udGVudCcpXG4gICAgICAgICQodGhpcykucmVwbGFjZVdpdGgob3JpZ2luYWxDb250ZW50KVxuICAgICAgfSlcblxuICAgICAgYXJ0aWNsZS5maW5kKCcqW2RhdGEtcmFzaC1vcmlnaW5hbC1wYXJlbnQtY29udGVudF0nKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbGV0IG9yaWdpbmFsQ29udGVudCA9ICQodGhpcykuYXR0cignZGF0YS1yYXNoLW9yaWdpbmFsLXBhcmVudC1jb250ZW50JylcbiAgICAgICAgJCh0aGlzKS5wYXJlbnQoKS5yZXBsYWNlV2l0aChvcmlnaW5hbENvbnRlbnQpXG4gICAgICB9KVxuXG4gICAgICAvLyBFeGVjdXRlIGRlcmFzaCBjaGFuZ2luZyB0aGUgd3JhcHBlclxuICAgICAgYXJ0aWNsZS5maW5kKCcqW2RhdGEtcmFzaC1vcmlnaW5hbC13cmFwcGVyXScpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICBsZXQgY29udGVudCA9ICQodGhpcykuaHRtbCgpXG4gICAgICAgIGxldCB3cmFwcGVyID0gJCh0aGlzKS5hdHRyKCdkYXRhLXJhc2gtb3JpZ2luYWwtd3JhcHBlcicpXG4gICAgICAgICQodGhpcykucmVwbGFjZVdpdGgoYDwke3dyYXBwZXJ9PiR7Y29udGVudH08LyR7d3JhcHBlcn0+YClcbiAgICAgIH0pXG5cbiAgICAgIC8vIFJlbW92ZSB0YXJnZXQgZnJvbSBUaW55TUNFIGxpbmtcbiAgICAgIGFydGljbGUuZmluZCgnYVt0YXJnZXRdJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICQodGhpcykucmVtb3ZlQXR0cigndGFyZ2V0JylcbiAgICAgIH0pXG5cbiAgICAgIC8vIFJlbW92ZSBjb250ZW50ZWRpdGFibGUgZnJvbSBUaW55TUNFIGxpbmtcbiAgICAgIGFydGljbGUuZmluZCgnYVtjb250ZW50ZWRpdGFibGVdJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICQodGhpcykucmVtb3ZlQXR0cignY29udGVudGVkaXRhYmxlJylcbiAgICAgIH0pXG5cbiAgICAgIC8vIFJlbW92ZSBub3QgYWxsb3dlZCBzcGFuIGVsbWVudHMgaW5zaWRlIHRoZSBmb3JtdWxhLCBpbmxpbmVfZm9ybXVsYVxuICAgICAgYXJ0aWNsZS5maW5kKGAke0ZJR1VSRV9GT1JNVUxBX1NFTEVDVE9SfSwke0lOTElORV9GT1JNVUxBX1NFTEVDVE9SfWApLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICAkKHRoaXMpLmNoaWxkcmVuKCdwJykuaHRtbCgkKHRoaXMpLmZpbmQoJ3NwYW5bY29udGVudGVkaXRhYmxlXScpLmh0bWwoKSlcbiAgICAgIH0pXG5cbiAgICAgIGFydGljbGUuZmluZChgJHtGSUdVUkVfRk9STVVMQV9TRUxFQ1RPUn0sJHtJTkxJTkVfRk9STVVMQV9TRUxFQ1RPUn1gKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbGV0IHN2ZyA9ICQodGhpcykuZmluZCgnc3ZnW2RhdGEtbWF0aG1sXScpXG4gICAgICAgIGlmIChzdmcubGVuZ3RoKSB7XG5cbiAgICAgICAgICAkKHRoaXMpLmF0dHIoREFUQV9NQVRIX09SSUdJTkFMX0lOUFVULCBzdmcuYXR0cihEQVRBX01BVEhfT1JJR0lOQUxfSU5QVVQpKVxuICAgICAgICAgICQodGhpcykuY2hpbGRyZW4oJ3AnKS5odG1sKHN2Zy5hdHRyKCdkYXRhLW1hdGhtbCcpKVxuICAgICAgICB9XG4gICAgICB9KVxuXG4gICAgICAvLyBSZXBsYWNlIHRib2R5IHdpdGggaXRzIGNvbnRlbnQgI1xuICAgICAgYXJ0aWNsZS5maW5kKCd0Ym9keScpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICAkKHRoaXMpLnJlcGxhY2VXaXRoKCQodGhpcykuaHRtbCgpKVxuICAgICAgfSlcblxuICAgICAgcmV0dXJuIGA8IURPQ1RZUEUgaHRtbD4ke25ldyBYTUxTZXJpYWxpemVyKCkuc2VyaWFsaXplVG9TdHJpbmcoYXJ0aWNsZVswXSl9YFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm4gdGhlIHRpdGxlIFxuICAgICAqL1xuICAgIGdldFRpdGxlOiBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gJCgndGl0bGUnKS50ZXh0KClcbiAgICB9LFxuXG4gIH1cbn0pIiwiY29uc3Qgbm90X2Fubm90YWJsZV9lbGVtZW50cyA9IGAke05PTl9FRElUQUJMRV9IRUFERVJfU0VMRUNUT1J9LCR7U0lERUJBUl9BTk5PVEFUSU9OfSwke0lOTElORV9GT1JNVUxBX1NFTEVDVE9SfWBcbmNvbnN0IGFubm90YXRvclBvcHVwU2VsZWN0b3IgPSAnI2Fubm90YXRvclBvcHVwJ1xuY29uc3QgYW5ub3RhdG9yRm9ybVBvcHVwU2VsZWN0b3IgPSAnI2Fubm90YXRvckZvcm1Qb3B1cCdcbmNvbnN0IGFubm90YXRpb25XcmFwcGVyID0gJ3NwYW5bZGF0YS1yYXNoLWFubm90YXRpb24tdHlwZV0nXG5cbnRpbnltY2UuUGx1Z2luTWFuYWdlci5hZGQoJ3JhamVfYW5ub3RhdGlvbnMnLCBmdW5jdGlvbiAoZWRpdG9yKSB7XG5cbiAgZWRpdG9yLm9uKCdjbGljaycsIGUgPT4ge1xuXG4gICAgbGV0IGNsaWNrZWRFbGVtZW50ID0gJChlLnNyY0VsZW1lbnQpXG5cbiAgICBpZiAoY2xpY2tlZEVsZW1lbnQucGFyZW50cyhTSURFQkFSX0FOTk9UQVRJT04pLmxlbmd0aCkge1xuXG4gICAgICAvLyBUb2dnbGUgYW5ub3RhdGlvbiBidXR0b25cbiAgICAgIGlmIChjbGlja2VkRWxlbWVudC5pcygnc3BhbiN0b2dnbGVBbm5vdGF0aW9ucycpIHx8IGNsaWNrZWRFbGVtZW50LnBhcmVudCgpLmlzKCdzcGFuI3RvZ2dsZUFubm90YXRpb25zJykpIHtcbiAgICAgICAgcmFzaC50b2dnbGVBbm5vdGF0aW9ucygpXG4gICAgICAgIHVwZGF0ZUlmcmFtZUZyb21TYXZlZENvbnRlbnQoKVxuICAgICAgfVxuXG4gICAgICAvLyBUb2dnbGUgc2lkZWJhciBidXR0b25cbiAgICAgIGVsc2UgaWYgKGNsaWNrZWRFbGVtZW50LmlzKCdzcGFuI3RvZ2dsZVNpZGViYXInKSB8fCBjbGlja2VkRWxlbWVudC5wYXJlbnQoKS5pcygnc3BhbiN0b2dnbGVTaWRlYmFyJykpIHtcbiAgICAgICAgcmFzaC50b2dnbGVTaWRlYmFyKClcbiAgICAgICAgdXBkYXRlSWZyYW1lRnJvbVNhdmVkQ29udGVudCgpXG4gICAgICB9XG5cbiAgICAgIC8vIFNob3cgYW5ub3RhdGlvbiBcbiAgICAgIGVsc2UgaWYgKGNsaWNrZWRFbGVtZW50LmlzKCdzcGFuW2RhdGEtcmFzaC1hbm5vdGF0aW9uLWlkXScpKSB7XG5cbiAgICAgICAgcmFzaC5kaXNwbGF5TGFzdFJlcGxheUFyZWEoY2xpY2tlZEVsZW1lbnQuYXR0cignZGF0YS1yYXNoLWFubm90YXRpb24taWQnKSlcbiAgICAgICAgcmFzaC5zaG93QW5ub3RhdGlvbihjbGlja2VkRWxlbWVudC5hdHRyKCd0aXRsZScpLnNwbGl0KCcsJykpXG4gICAgICAgIHVwZGF0ZUlmcmFtZUZyb21TYXZlZENvbnRlbnQoKVxuICAgICAgfVxuXG4gICAgICAvLyBGb2N1cyB0ZXh0IGFyZWFcbiAgICAgIGVsc2UgaWYgKGNsaWNrZWRFbGVtZW50LmlzKCd0ZXh0YXJlYScpKVxuICAgICAgICAkKHRoaXMpLmZvY3VzKClcblxuICAgICAgZWxzZSBpZiAoY2xpY2tlZEVsZW1lbnQuaXMoYC5zaWRlX25vdGVfcmVwbHlfYnV0dG9uYCkpIHtcblxuICAgICAgICBjb25zdCBwYXJlbnRzID0gY2xpY2tlZEVsZW1lbnQucGFyZW50cygnW2RhdGEtcmFzaC1hbm5vdGF0aW9uLWlkXScpXG5cbiAgICAgICAgY29uc3QgYW5jZXN0b3Jfbm90ZV9ib2R5ID0gcGFyZW50cy5sYXN0KClcbiAgICAgICAgY29uc3QgcGFyZW50X25vdGVfYm9keSA9IHBhcmVudHMuZmlyc3QoKVxuICAgICAgICBjb25zdCBwYXJlbnRfbm90ZV9pZCA9IHBhcmVudF9ub3RlX2JvZHkuYXR0cignZGF0YS1yYXNoLWFubm90YXRpb24taWQnKVxuXG4gICAgICAgIGNvbnN0IHJlcGxheWluZ1RleHQgPSBwYXJlbnRfbm90ZV9ib2R5LmZpbmQoJ3RleHRhcmVhJykudmFsKClcblxuICAgICAgICAvLyBDaGVjayBpZiB0aGUgdGV4dCBpcyBva1xuICAgICAgICBpZiAocmVwbGF5aW5nVGV4dC50cmltKCkubGVuZ3RoID4gMCkge1xuICAgICAgICAgIGNyZWF0ZUFubm90YXRpb25SZXBseWluZyhyZXBsYXlpbmdUZXh0LCBwYXJlbnRfbm90ZV9pZClcbiAgICAgICAgICB1cGRhdGVJZnJhbWVGcm9tU2F2ZWRDb250ZW50KClcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIENsb3NlIGFubm90YXRvckZvcm1Qb3B1cCBpZiB0aGUgdXNlciBjbGljayBzb21ld2hlcmUgZWxzZVxuICAgIGlmICgkKGFubm90YXRvckZvcm1Qb3B1cFNlbGVjdG9yKS5pcygnOnZpc2libGUnKSAmJiAoIWNsaWNrZWRFbGVtZW50LmlzKGFubm90YXRvckZvcm1Qb3B1cFNlbGVjdG9yKSB8fCAhY2xpY2tlZEVsZW1lbnQucGFyZW50cyhhbm5vdGF0b3JGb3JtUG9wdXBTZWxlY3RvcikubGVuZ3RoKSlcbiAgICAgIGhpZGVBbm5vdGF0aW9uRm9ybVBvcHVwKClcbiAgfSlcblxuICBlZGl0b3Iub24oJ01vdXNlVXAnLCBlID0+IHtcblxuICAgIGhpZGVBbm5vdGF0aW9uUG9wdXAoKVxuXG4gICAgLy8gSWYgdGhlIHNlbGVjdGlvbiBpcyBub3QgY29sbGFwc2VkIGFuZCB0aGUgZWxlbWVudCBzZWxlY3RlZCBpcyBhbiBcImFubm90YWJsZSBlbGVtZW50XCJcbiAgICBpZiAoIXRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5pc0NvbGxhcHNlZCgpICYmICEkKHRpbnltY2UuYWN0aXZlRWRpdG9yLnNlbGVjdGlvbi5nZXROb2RlKCkpLmlzKG5vdF9hbm5vdGFibGVfZWxlbWVudHMpKVxuICAgICAgaGFuZGxlQW5ub3RhdGlvbihlKVxuICB9KVxufSlcblxuXG4vKipcbiAqIFxuICovXG5oYW5kbGVBbm5vdGF0aW9uID0gZSA9PiB7XG5cbiAgLy8gU2hvdyB0aGUgcG9wdXBcbiAgc2hvd0Fubm90YXRpb25Qb3B1cChlLmNsaWVudFgsIGUuY2xpZW50WSlcbn1cblxuLyoqXG4gKiBcbiAqL1xuY3JlYXRlQW5ub3RhdGlvbkNvbW1lbnRpbmcgPSB0ZXh0ID0+IHtcblxuICBjb25zdCBjcmVhdG9yID0gaXBjUmVuZGVyZXIuc2VuZFN5bmMoJ2dldFNldHRpbmdzJykudXNlcm5hbWVcblxuICBjb25zdCBzZWxlY3Rpb24gPSB0aW55bWNlLmFjdGl2ZUVkaXRvci5zZWxlY3Rpb25cbiAgY29uc3QgcmFuZ2UgPSBzZWxlY3Rpb24uZ2V0Um5nKClcbiAgY29uc3QgbGFzdEFubm90YXRpb24gPSBBbm5vdGF0aW9uLmdldExhc3RBbm5vdGF0aW9uKClcblxuICBjb25zdCBzdGFydFhQYXRoID0gQW5ub3RhdGlvbi5nZXRYUGF0aCgkKHNlbGVjdGlvbi5nZXRTdGFydCgpKSlcbiAgY29uc3Qgc3RhcnRPZmZzZXQgPSBBbm5vdGF0aW9uLmdldE9mZnNldChyYW5nZS5zdGFydENvbnRhaW5lciwgcmFuZ2Uuc3RhcnRPZmZzZXQsIHN0YXJ0WFBhdGgpXG5cbiAgY29uc3QgZW5kWFBhdGggPSBBbm5vdGF0aW9uLmdldFhQYXRoKCQoc2VsZWN0aW9uLmdldEVuZCgpKSlcbiAgY29uc3QgZW5kT2Zmc2V0ID0gQW5ub3RhdGlvbi5nZXRPZmZzZXQocmFuZ2UuZW5kQ29udGFpbmVyLCByYW5nZS5lbmRPZmZzZXQsIGVuZFhQYXRoKVxuXG4gIGNvbnN0IGRhdGEgPSB7XG4gICAgXCJpZFwiOiBsYXN0QW5ub3RhdGlvbi5pZCxcbiAgICBcIkBjb250ZW54dFwiOiBcImh0dHA6Ly93d3cudzMub3JnL25zL2Fubm8uanNvbmxkXCIsXG4gICAgXCJjcmVhdGVkXCI6IERhdGUubm93KCkgKyAoLShuZXcgRGF0ZSgpLmdldFRpbWV6b25lT2Zmc2V0KCkgKiA2MDAwMCkpLFxuICAgIFwiYm9keVZhbHVlXCI6IHRleHQsXG4gICAgXCJjcmVhdG9yXCI6IGNyZWF0b3IsXG4gICAgXCJNb3RpdmF0aW9uXCI6IGNvbW1lbnRpbmcsXG4gICAgXCJ0YXJnZXRcIjoge1xuICAgICAgXCJzZWxlY3RvclwiOiB7XG4gICAgICAgIFwic3RhcnRTZWxlY3RvclwiOiB7XG4gICAgICAgICAgXCJAdHlwZVwiOiBcIlhQYXRoU2VsZWN0b3JcIixcbiAgICAgICAgICBcIkB2YWx1ZVwiOiBzdGFydFhQYXRoXG4gICAgICAgIH0sXG4gICAgICAgIFwiZW5kU2VsZWN0b3JcIjoge1xuICAgICAgICAgIFwiQHR5cGVcIjogXCJYUGF0aFNlbGVjdG9yXCIsXG4gICAgICAgICAgXCJAdmFsdWVcIjogZW5kWFBhdGhcbiAgICAgICAgfSxcbiAgICAgICAgXCJzdGFydFwiOiB7XG4gICAgICAgICAgXCJAdHlwZVwiOiBcIkRhdGFQb3NpdGlvblNlbGVjdG9yXCIsXG4gICAgICAgICAgXCJAdmFsdWVcIjogc3RhcnRPZmZzZXRcbiAgICAgICAgfSxcbiAgICAgICAgXCJlbmRcIjoge1xuICAgICAgICAgIFwiQHR5cGVcIjogXCJEYXRhUG9zaXRpb25TZWxlY3RvclwiLFxuICAgICAgICAgIFwiQHZhbHVlXCI6IGVuZE9mZnNldFxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgJCgnI3JhamVfcm9vdCcpLmFwcGVuZChgPHNjcmlwdCBpZD1cIiR7ZGF0YS5pZH1cIiB0eXBlPVwiYXBwbGljYXRpb24vbGQranNvblwiPiR7SlNPTi5zdHJpbmdpZnkoZGF0YSwgbnVsbCwgMikgfTwvc2NyaXB0PmApXG4gICAgcmFzaC5jbGVhckFubm90YXRpb25zKClcbiAgICByYXNoLnJlbmRlckFubm90YXRpb25zKClcbiAgICB1cGRhdGVJZnJhbWVGcm9tU2F2ZWRDb250ZW50KClcbiAgfSlcbn1cblxuLyoqXG4gKiBcbiAqL1xuY3JlYXRlQW5ub3RhdGlvblJlcGx5aW5nID0gKHRleHQsIHRhcmdldElkKSA9PiB7XG5cbiAgY29uc3QgY3JlYXRvciA9IGlwY1JlbmRlcmVyLnNlbmRTeW5jKCdnZXRTZXR0aW5ncycpLnVzZXJuYW1lXG4gIGNvbnN0IGxhc3RBbm5vdGF0aW9uID0gQW5ub3RhdGlvbi5nZXRMYXN0QW5ub3RhdGlvbigpXG5cbiAgY29uc3QgZGF0YSA9IHtcbiAgICBcImlkXCI6IGxhc3RBbm5vdGF0aW9uLmlkLFxuICAgIFwiQGNvbnRlbnh0XCI6IFwiaHR0cDovL3d3dy53My5vcmcvbnMvYW5uby5qc29ubGRcIixcbiAgICBcImNyZWF0ZWRcIjogRGF0ZS5ub3coKSxcbiAgICBcImJvZHlWYWx1ZVwiOiB0ZXh0LFxuICAgIFwiY3JlYXRvclwiOiBjcmVhdG9yLFxuICAgIFwiTW90aXZhdGlvblwiOiByZXBseWluZyxcbiAgICBcInRhcmdldFwiOiB0YXJnZXRJZFxuICB9XG5cbiAgLy8gQWRkIHRoZSBuZXcgYW5ub3RhdGlvbiB3aXRob3V0IGNsZWFyaW5nIGV2ZXJ5dGhpbmdcbiAgdGlueW1jZS5hY3RpdmVFZGl0b3IudW5kb01hbmFnZXIudHJhbnNhY3QoZnVuY3Rpb24gKCkge1xuXG4gICAgJCgnI3JhamVfcm9vdCcpLmFwcGVuZChgPHNjcmlwdCBpZD1cIiR7ZGF0YS5pZH1cIiB0eXBlPVwiYXBwbGljYXRpb24vbGQranNvblwiPiR7SlNPTi5zdHJpbmdpZnkoZGF0YSwgbnVsbCwgMikgfTwvc2NyaXB0PmApXG4gICAgcmFzaC5yZW5kZXJTaW5nbGVBbm5vdGF0aW9uKGRhdGEpXG4gICAgcmFzaC5kaXNwbGF5TGFzdFJlcGxheUFyZWEoZGF0YS50YXJnZXQpXG4gICAgdXBkYXRlSWZyYW1lRnJvbVNhdmVkQ29udGVudCgpXG4gIH0pXG59XG5cbi8qKlxuICogXG4gKi9cbnNob3dBbm5vdGF0aW9uUG9wdXAgPSAoeCwgeSkgPT4ge1xuXG4gIGxldCBhbm5vdGF0b3JQb3B1cCA9ICQoYFxuICAgIDxkaXYgaWQ9J2Fubm90YXRvclBvcHVwJz5cbiAgICAgIDxkaXYgY2xhc3M9XCJhbm5vdGF0b3JQb3B1cF9hcnJvd1wiPjwvZGl2PlxuICAgICAgPHNwYW4gY2xhc3M9XCJnbHlwaGljb24gZ2x5cGhpY29uLXBlbmNpbFwiIGFyaWEtaGlkZGVuPVwidHJ1ZVwiPjwvc3Bhbj5cbiAgICA8L2Rpdj5gKVxuXG4gIGFubm90YXRvclBvcHVwLmNzcyh7XG4gICAgdG9wOiB5IC0gMjAsXG4gICAgbGVmdDogeCAtIDE4LjVcbiAgfSlcblxuICBhbm5vdGF0b3JQb3B1cC5vbignY2xpY2snLCBmdW5jdGlvbiAoKSB7XG4gICAgc2hvd0Fubm90YXRpb25Gb3JtUG9wdXAoKVxuICB9KVxuXG4gIGFubm90YXRvclBvcHVwLmFwcGVuZFRvKCdib2R5Jylcbn1cblxuLyoqXG4gKiBcbiAqL1xuc2hvd0Fubm90YXRpb25Gb3JtUG9wdXAgPSAoKSA9PiB7XG5cbiAgbGV0IGFubm90YXRvckZvcm1Qb3B1cCA9ICQoYFxuICAgIDxkaXYgaWQ9XCJhbm5vdGF0b3JGb3JtUG9wdXBcIj5cbiAgICAgIDx0ZXh0YXJlYSBjbGFzcz1cImZvcm0tY29udHJvbFwiIHJvd3M9XCIzXCI+PC90ZXh0YXJlYT5cbiAgICAgIDxkaXYgY2xhc3M9XCJhbm5vdGF0b3JGb3JtUG9wdXBfZm9vdGVyXCI+XG4gICAgICAgIDxhIGlkPVwiYW5ub3RhdG9yRm9ybVBvcHVwX3NhdmVcIiBjbGFzcz1cImJ0biBidG4tc3VjY2VzcyBidG4teHNcIj5Bbm5vdGF0ZTwvYT5cbiAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuICBgKVxuXG4gIGFubm90YXRvckZvcm1Qb3B1cC5hcHBlbmRUbygnYm9keScpXG5cbiAgYW5ub3RhdG9yRm9ybVBvcHVwLmNzcyh7XG4gICAgdG9wOiAkKGFubm90YXRvclBvcHVwU2VsZWN0b3IpLm9mZnNldCgpLnRvcCAtIGFubm90YXRvckZvcm1Qb3B1cC5oZWlnaHQoKSAvIDIgLSAyMCxcbiAgICBsZWZ0OiAkKGFubm90YXRvclBvcHVwU2VsZWN0b3IpLm9mZnNldCgpLmxlZnRcbiAgfSlcblxuICAkKGAke2Fubm90YXRvckZvcm1Qb3B1cFNlbGVjdG9yfSBhLmJ0bi1zdWNjZXNzYCkub24oJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xuXG4gICAgY3JlYXRlQW5ub3RhdGlvbkNvbW1lbnRpbmcoJChgJHthbm5vdGF0b3JGb3JtUG9wdXBTZWxlY3Rvcn0+dGV4dGFyZWFgKS52YWwoKSwgY29tbWVudGluZylcbiAgICBoaWRlQW5ub3RhdGlvbkZvcm1Qb3B1cCgpXG4gIH0pXG5cbiAgLy8gSGlkZSB0aGUgbGFzdCBhbm5vdGF0aW9uIHBvcHVwXG4gIGhpZGVBbm5vdGF0aW9uUG9wdXAoKVxuXG4gICQoYCR7YW5ub3RhdG9yRm9ybVBvcHVwU2VsZWN0b3J9PnRleHRhcmVhYCkuZm9jdXMoKVxuXG59XG5cbi8qKlxuICogXG4gKi9cbmhpZGVBbm5vdGF0aW9uRm9ybVBvcHVwID0gKCkgPT4ge1xuICAkKGFubm90YXRvckZvcm1Qb3B1cFNlbGVjdG9yKS5yZW1vdmUoKVxufVxuXG4vKipcbiAqIFxuICovXG5oaWRlQW5ub3RhdGlvblBvcHVwID0gKCkgPT4ge1xuICAkKGFubm90YXRvclBvcHVwU2VsZWN0b3IpLnJlbW92ZSgpXG59XG5cbi8qKlxuICogXG4gKi9cbnVwZGF0ZUFubm90YXRpb25zT25TYXZlID0gYXJ0aWNsZSA9PiB7XG5cbiAgLyoqXG4gICAqIFxuICAgKiBAcGFyYW0ge0pRdWVyeSBvYmplY3R9IG5vZGUgXG4gICAqIEBwYXJhbSB7SW50ZWdlcn0gb2Zmc2V0IG9wdGlvbmFsLCBpdCdzIG5lZWRlZCBmb3IgdGhlIGVuZGluZyBvZmZzZXRcbiAgICovXG4gIGNvbnN0IGdldE9mZnNldCA9IChub2RlLCBvZmZzZXQgPSAwKSA9PiB7XG5cbiAgICBub2RlID0gbm9kZVswXS5wcmV2aW91c1NpYmxpbmdcblxuICAgIHdoaWxlIChub2RlICE9IG51bGwpIHtcblxuICAgICAgaWYgKG5vZGUubm9kZVR5cGUgPT0gMylcbiAgICAgICAgb2Zmc2V0ICs9IG5vZGUubGVuZ3RoXG4gICAgICBlbHNlXG4gICAgICAgIG9mZnNldCArPSBub2RlLmlubmVyVGV4dC5sZW5ndGhcblxuICAgICAgbm9kZSA9IG5vZGUucHJldmlvdXNTaWJsaW5nXG4gICAgfVxuXG4gICAgcmV0dXJuIG9mZnNldFxuICB9XG5cbiAgLy8gR2V0IGFsbCBhbm5vdGF0aW9uIHNjcmlwdHNcbiAgYXJ0aWNsZS5maW5kKCdzY3JpcHRbdHlwZT1cImFwcGxpY2F0aW9uL2xkK2pzb25cIl0nKS5lYWNoKGZ1bmN0aW9uICgpIHtcblxuICAgIC8vVE9ETyB1cGRhdGUgYWxzbyB0aGUgTWFwKClcblxuICAgIC8vIENoYW5nZSB0aGUgb2Zmc2V0cyBhbmQgdGhlIHNlbGVjdG9yc1xuICAgIGxldCBqc29uID0gSlNPTi5wYXJzZSgkKHRoaXMpLmh0bWwoKSlcblxuICAgIC8vIEdldCB0aGUgaWQgb2YgdGhlIGN1cnJlbnQgYW5ub3RhdGlvblxuICAgIGNvbnN0IGlkID0ganNvbi5pZFxuXG4gICAgLy8gR2V0IHRoZSBsaXN0IG9mIGhpZ2hsaWdodGVkIGFubm90YXRpb25zXG4gICAgY29uc3QgZmlyc3QgPSAkKGBzcGFuLmNnZW4uYW5ub3RhdGlvbl9oaWxpZ2h0W2RhdGEtcmFzaC1hbm5vdGF0aW9uLWlkPVwiJHtpZH1cIl1gKS5maXJzdCgpXG4gICAgY29uc3QgbGFzdCA9ICQoYHNwYW4uY2dlbi5hbm5vdGF0aW9uX2hpbGlnaHRbZGF0YS1yYXNoLWFubm90YXRpb24taWQ9XCIke2lkfVwiXWApLmxhc3QoKVxuXG4gICAgLy8gVXBkYXRlIGJvdGggc3RhcnQgYW5kIGVuZCBvZmZzZXRzLCB0aGUgZW5kaW5nIG9mZnNldCBoYXMgYWxzbyB0aGUgY3Vycm50IGxlbmd0aFxuICAgIGpzb24udGFyZ2V0LnNlbGVjdG9yLnN0YXJ0WydAdmFsdWUnXSA9IGdldE9mZnNldChmaXJzdClcbiAgICBqc29uLnRhcmdldC5zZWxlY3Rvci5lbmRbJ0B2YWx1ZSddID0gZ2V0T2Zmc2V0KGxhc3QsIGxhc3QudGV4dCgpLmxlbmd0aClcblxuICAgIC8vIFVwZGF0ZSBib3RoIHN0YXJ0IGFuZCBlbmQgc2VsZWN0b3JzIHdpdGggdGhlIHJpZ2h0IHhwYXRoXG4gICAganNvbi50YXJnZXQuc2VsZWN0b3Iuc3RhcnRTZWxlY3RvclsnQHZhbHVlJ10gPSBBbm5vdGF0aW9uLmdldFhQYXRoKGZpcnN0KVxuICAgIGpzb24udGFyZ2V0LnNlbGVjdG9yLmVuZFNlbGVjdG9yWydAdmFsdWUnXSA9IEFubm90YXRpb24uZ2V0WFBhdGgobGFzdClcblxuICAgICQodGhpcykuaHRtbChKU09OLnN0cmluZ2lmeShqc29uLCBudWxsLCAyKSlcbiAgfSlcblxuICAvLyBDaGFuZ2UgZGF0YS1yYXNoLW9yaWdpbmFsWy1wYXJlbnRdLWNvbnRlbnRcbiAgY29uc3QgY29udGVudCA9ICdkYXRhLXJhc2gtb3JpZ2luYWwtY29udGVudCdcbiAgY29uc3QgcGFyZW50ID0gJ2RhdGEtcmFzaC1vcmlnaW5hbC1wYXJlbnQtY29udGVudCdcbiAgbGV0IGF0dHJpYnV0ZVxuXG4gIGFydGljbGUuZmluZChhbm5vdGF0aW9uV3JhcHBlcikuZWFjaChmdW5jdGlvbiAoKSB7XG5cbiAgICBpZiAoJCh0aGlzKS5hdHRyKGNvbnRlbnQpKVxuICAgICAgYXR0cmlidXRlID0gY29udGVudFxuXG4gICAgaWYgKCQodGhpcykuYXR0cihwYXJlbnQpKVxuICAgICAgYXR0cmlidXRlID0gcGFyZW50XG5cbiAgICAkKHRoaXMpLmF0dHIoYXR0cmlidXRlLCAkKHRoaXMpLmh0bWwoKSlcbiAgfSlcblxuICByZXR1cm4gYXJ0aWNsZVxufSJdfQ==

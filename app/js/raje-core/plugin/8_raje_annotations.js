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
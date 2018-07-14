tinymce.PluginManager.add('raje_annotations', function (editor, url) {

  editor.on('click', function (e) {

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
  })

  editor.on('MouseUp', () => {

    // If the selection is not collapsed
    if (!tinymce.activeEditor.selection.isCollapsed()) {

      // Get the node selected
      let selectedElement = $(tinymce.activeEditor.selection.getNode())

      // If is the text
      if (!selectedElement.is(NON_EDITABLE_HEADER_SELECTOR) && !selectedElement.is(SIDEBAR_ANNOTATION)) {

        createAnnotation()
      }
    }
  })
})

const createAnnotation = () => {

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
    "bodyValue": 'tmp',
    "creator": 'spino9330',
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

  lastAnnotation.element.after(`<script id="${data.id}" type="application/ld+json">${JSON.stringify(data, null, 2) }</script>`)

  rash.clearAnnotations()
  rash.renderAnnotations()

  updateIframeFromSavedContent()
}
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

  editor.on('MouseUp', function (e) {
    //$('.annotatorPopup').hide()
    if (!tinymce.activeEditor.selection.isCollapsed()) {

      let selectedElement = $(tinymce.activeEditor.selection.getNode())

      if (!selectedElement.is(NON_EDITABLE_HEADER_SELECTOR) && !selectedElement.is(SIDEBAR_ANNOTATION)) {

        /*
        $('.annotatorPopup').show()
        $('.annotatorPopup').css({
          left: e.pageX - 50,
          top: e.pageY - 20
        })
        */
      }
    }
  })
})

const commenting = 'commenting'

const annotations = {

  _createBody: (id, bodyValue, creator) => {
    return {
      id: id,
      "@contenxt": "http://www.w3.org/ns/anno.jsonld",
      created: Date.now(),
      bodyValue: bodyValue,
      creator: creator,
      Motivation: commenting
    }
  },

  createScript: (data) => {
    $('head').append(`<script id="${data.id}" type="application/ld+json">${JSON.stringify(annotations._createBody(data.id,data.bodyValue,data.creator))}</script>`)
  }
}
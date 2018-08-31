const replying = 'replying'
const commenting = 'commenting'
const start_role = 'start'
const end_role = 'end'

const raje_string = 'raje'
const rash_string = 'rash'

const active_class = 'active'
const selected_class = 'selected'
const annotation_highlight_class = 'annotation_highlight'
const hidden_class = 'hidden'

const side_note_reply_selector = '.side_note_reply'
const side_note_reply_button_selector = '.side_note_reply_button'

const data_rash_original_content = 'data-rash-original-content'
const data_rash_original_parent_content = 'data-rash-original-parent-content'

class AnnotationContext {

  constructor(semanticAnnotation) {

    const type = (tinymce.activeEditor) ? raje_string : rash_string

    switch (type) {

      case raje_string:
        this.annotation = new AnnotationRaje(semanticAnnotation)
        break

      case rash_string:
        this.annotation = new AnnotationRash(semanticAnnotation)
        break
    }
  }

  static render() {

    const type = (tinymce.activeEditor) ? raje_string : rash_string

    switch (type) {

      case raje_string:
        AnnotationRaje.render()
        break

      case rash_string:
        AnnotationRash.render()
        break
    }
  }

  static renderSingle(id, body) {
    Annotation.renderSingle(id, body)
  }

  static getOffset(container, offset, path) {
    const type = (tinymce.activeEditor) ? raje_string : rash_string

    switch (type) {

      case raje_string:
        return AnnotationRaje.getOffset(container, offset, path)

      case rash_string:
        return AnnotationRash.getOffset(container, offset, path)
    }
  }

  static getCssSelector(node) {
    return Annotation.getCssSelector(node)
  }

  static getNextAnnotationId() {
    return Annotation.getNextAnnotationId()
  }

  // TODO change rash/raje
  static showAnnotationFromAttribute(titleAttribute) {

    AnnotationContext.toggleAnnotationToolbar()

    titleAttribute = titleAttribute.split(',')

    /*
      // Get the side note and the list of replying children
      let side_note_body = $(ANNOTATIONS.get(noteId).side_note_body_selector)

      // Get the root annotation 
      if (!side_note_body.parent().is(annotation_sidebar_selector))
        side_note_body = side_note_body.parentsUntil(annotation_sidebar_selector)

      // Get the list of replying annotations
      const replayingChildren = side_note_body.find('[data-rash-annotation-id]')

      // Remove all classes active
      side_note_body.find(side_note_reply_selector).removeClass('active')
      replayingChildren.each(function () {
        $(this).find(side_note_reply_selector).removeClass('active')
      })

      // Set as active the last note of the list 
      if (replayingChildren.length > 0)
        replayingChildren.last().find(side_note_reply_selector).addClass('active')

      else
        side_note_body.find(side_note_reply_selector).addClass('active')
      */

    for (let id of titleAttribute) {

      const sideNoteBodyElement = tinymce.activeEditor.$(ANNOTATIONS.get(id).side_note_body_selector).first()

      sideNoteBodyElement.toggleClass(active_class)
      sideNoteBodyElement.find(side_note_reply_selector).last().addClass(active_class)
    }
  }

  // TODO change rash/raje
  static highlightAnnotationFromAttribute(titleAttribute) {

    titleAttribute = titleAttribute.split(',')

    for (let id of titleAttribute)
      tinymce.activeEditor.$(ANNOTATIONS.get(id).note_selector).toggleClass(selected_class)
  }

  // TODO change rash/raje
  static toggleAnnotationToolbar() {

    tinymce.activeEditor.$(annotation_sidebar_selector).toggleClass(active_class)

    ANNOTATIONS.forEach(annotation => {
      tinymce.activeEditor.$(annotation.side_note_body_selector).removeClass(active_class)
      tinymce.activeEditor.$(annotation.side_note_body_selector).find(side_note_reply_selector).removeClass(active_class)
    })
  }

  // TODO change rash/raje
  static toggleAnnotation() {

    tinymce.activeEditor.$(annotation_sidebar_selector).removeClass(active_class)

    ANNOTATIONS.forEach(annotation => annotation.hide())
  }

  static clearAnnotations() {

    ANNOTATIONS.forEach(annotation => {
      annotation.remove()
    })

    ANNOTATIONS.clear()
  }
}

class Annotation {
  constructor(semanticAnnotation) {

    this.semanticAnnotation = semanticAnnotation
    this.role = semanticAnnotation.Motivation
    this.id = semanticAnnotation.id

    // Save the html elements connected to the annotation
    this.side_note_selector = `.side_note[data-rash-annotation-id="${this.semanticAnnotation.id}"]`
    this.side_note_body_selector = `.side_note_body[data-rash-annotation-id="${this.semanticAnnotation.id}"]`

    this.note_selector = `[data-rash-annotation-id="${this.semanticAnnotation.id}"][data-rash-annotation-type="wrap"]`

    this.start_marker_selector = `span[data-rash-annotation-id="${this.semanticAnnotation.id}"][data-rash-annotation-role="${start_role}"]`
    this.end_marker_selector = `span[data-rash-annotation-id="${this.semanticAnnotation.id}"][data-rash-annotation-role="${end_role}"]`

    switch (this.semanticAnnotation.Motivation) {

      case commenting:
        // Create the starting selector
        this.startSelector = {
          selector: semanticAnnotation.target.selector.startSelector[json_value_key],
          offset: semanticAnnotation.target.selector.start[json_value_key],
          role: start_role
        }

        this.endSelector = {
          selector: semanticAnnotation.target.selector.endSelector[json_value_key],
          offset: semanticAnnotation.target.selector.end[json_value_key],
          role: end_role
        }

        this._addMarker()
        break

      case replying:
        this._addReply()
        break

    }
  }

  /**
   * 
   */
  _getAnnotationBody() {

    return `
      <div class="side_note_wrapper">
        <div class="side_node_text">${this.semanticAnnotation.bodyValue}</div>
        <div><a href="#">@${this.semanticAnnotation.creator}</a></div>
        <div class="side_note_date">${new Date(this.semanticAnnotation.created).toUTCString()}</div>
        <div class="side_note_reply container-fluid">
          <div class="row"><textarea rows="3" contenteditable class="form-control"></textarea></div>
          <div class="row"><a class="btn btn-primary btn-xs side_note_reply_button">reply</a></div> 
        </div>
      </div>`
  }

  /**
   * 
   */
  _getMarker(role) {
    return $(`<span class="cgen" data-rash-original-content="" data-rash-annotation-role="${role}" data-rash-annotation-id="${this.semanticAnnotation.id}"/>`)
  }

  /**
   * 
   */
  getId() {
    return this.semanticAnnotation.id
  }

  /**
   * 
   */
  getParentAnnotation() {

    if (this.role == replying)
      return ANNOTATIONS.get(this.semanticAnnotation.target)

    else
      return this
  }

  /**
   * 
   */
  getRootAnnotation() {

    let annotation = this

    while (annotation.role == replying)
      annotation = ANNOTATIONS.get(this.semanticAnnotation.target)

    return annotation
  }

  /**
   * 
   */
  static getNextAnnotationId() {

    const suffix = 'annotation_'
    let id = 0

    ANNOTATIONS.forEach(annotation => {
      const annotationId = annotation.id.replace(suffix, '')
      id = id > annotationId ? id : annotationId
    })

    id++

    return `${suffix}${id}`
  }

  /**
   * 
   * @param {*} node 
   */
  static getCssSelector(node) {

    const ending = 'body'

    // The allowed starting elements
    const not_blocked_elements = 'section, p, :header, table, tr, th, td, tbody, ol, ul, li'

    // Create the needed vars
    let parents = []

    if (node.is(not_blocked_elements))
      parents.push(node)

    // Add the entire collection inside the array of parent elements
    node.parentsUntil(ending).each(function () {
      if ($(this).is(not_blocked_elements))
        parents.push($(this))
    })

    let lastParent = parents.pop()
    let cssSelector = `${lastParent[0].nodeName.toLowerCase()}#${lastParent.attr('id')}`

    // Reverse the array in order to have the parents in the left
    parents.reverse()

    // Create the cssSelector for all elements
    for (let element of parents) {

      const nodeName = element[0].nodeName
      cssSelector += `>${nodeName.toLowerCase()}`

      // In the case that the element has siblings
      if (element.siblings(nodeName).length) {
        cssSelector += `:nth-child(${element.prevAll().length + 1})`
      }
    }

    return cssSelector
  }

  /**
   * 
   * @param {*} id 
   * @param {*} body 
   */
  static renderSingle(id, body) {
    ANNOTATIONS.set(id, new AnnotationContext(body).annotation)
  }
}

class AnnotationRaje extends Annotation {

  /**
   * 
   * @param JSONObject semanticAnnotation 
   */
  constructor(semanticAnnotation) {
    super(semanticAnnotation)
  }
  /**
   * 
   */
  setEvents() {
    this._setClickEvents()
    this._setHoverEvents()
  }

  /**
   * 
   */
  _setClickEvents() {

    const instance = this

    const sideNoteElement = tinymce.activeEditor.$(this.side_note_selector)
    if (sideNoteElement.length) {

      sideNoteElement.off('click')
      sideNoteElement.on('click', function () {
        AnnotationContext.showAnnotationFromAttribute(tinymce.activeEditor.$(instance.side_note_selector).attr('title'))
      })
    }

    const replyElement = tinymce.activeEditor.$(this.side_note_body_selector).find(side_note_reply_selector)

    if (replyElement.length) {

      replyElement.find(side_note_reply_button_selector).off('click')
      replyElement.find(side_note_reply_button_selector).on('click', function () {

        const replayingText = replyElement.find('textarea')[0].value
        const parentAnnotationId = instance.getParentAnnotation().id

        createAnnotationReplying(replayingText, parentAnnotationId)
      })
    }
  }

  /**
   * 
   */
  _setHoverEvents() {

    const instance = this

    if (tinymce.activeEditor.$(this.side_note_selector).length)
      tinymce.activeEditor.$(this.side_note_selector).on('mouseenter mouseleave', function () {
        AnnotationContext.highlightAnnotationFromAttribute(tinymce.activeEditor.$(instance.side_note_selector).attr('title'))
      })

    if (tinymce.activeEditor.$(this.side_note_body_selector).length)
      tinymce.activeEditor.$(this.side_note_body_selector).on('mouseenter mouseleave', function () {
        AnnotationContext.highlightAnnotationFromAttribute(tinymce.activeEditor.$(instance.side_note_body_selector).attr('data-rash-annotation-id'))
      })
  }

  /**
   * 
   */
  _addMarker() {

    // Save the elements
    this.startElement = tinymce.activeEditor.$(this.startSelector.selector)
    this.endElement = tinymce.activeEditor.$(this.endSelector.selector)

    // Check if the annotation wraps entirely a html element
    if (this.startElement[0].isEqualNode(this.endElement[0]) && (this.startSelector.offset == 0 && this.endElement.text().length == this.endSelector.offset))
      this._wrapElement(this.startElement)

    // Else do it normally
    else {
      this._createMarker(this.startElement, this.startSelector)
      this._createMarker(this.endElement, this.endSelector)

      this._fragmentateAnnotation()
    }

    this._createSideAnnotation()

    this.setEvents()

    this._removeMarkers()

    tinymce.triggerSave()
  }

  /**
   * 
   * This function creates and add the marker to the html based on the element (given by the XPATH from the annotation)
   * and the selector which contains both the XPATH selector and the offset
   * 
   * @param JQueryObject element 
   * @param JSONObject selector 
   */
  _createMarker(element, selector) {

    /**
     * 
     * This function creates a range starting in the node at the selected offset, and add the marker with the role
     * 
     * @param textualNode node 
     * @param JSONObject selector 
     * @param Integer offset 
     */
    const _createRangeMarker = (node, selector, offset) => {

      // Create the range and set its start
      const range = new Range()
      range.setStart(node, offset)

      // Insert a node where the range starts
      range.insertNode(this._getMarker(selector.role)[0])

      written = true
    }

    /**
     * 
     * Analyze all the nodes contained inside @param element, keeping all the offsets
     * 
     * @param JQqueryObject element 
     */
    const _analyzeContent = element => {

      // Iterate over all the nodes contained in the element
      for (let node of element.childNodes) {

        // Exit from all loops if 
        if (written)
          break

        // If the node is a html element with text, recursively go deep and analyze its nodes 
        if (node.nodeType !== 3)
          _analyzeContent(node)

        // If the node is a textualNode, do the normal behaviour
        else {

          // Collapse all whitespaces in one
          node.nodeValue = node.nodeValue.replace(/\s+/g, ' ')

          // Store the ending offset of the 
          maxOffset += node.length

          // Add the marker if it has to be added inside the current node
          if (selector.offset >= minOffset && selector.offset <= maxOffset)
            _createRangeMarker(node, selector, selector.offset - minOffset)

          // Update the leftOffset
          minOffset = maxOffset
        }
      }
    }

    // Set variables that are used to iterate over the nodes
    let minOffset = 0
    let maxOffset = 0
    let written = false

    _analyzeContent(element[0])
  }

  /**
   * 
   * Wrap all the nodes between the two markers inside a span
   */
  _fragmentateAnnotation() {

    // Save all the elements that must be wrapped
    let elements = []
    const endMarker = tinymce.activeEditor.$(this.end_marker_selector)[0]

    // Start from the next element of the starting marker and iterate until the endMarker is found
    let next = tinymce.activeEditor.$(this.start_marker_selector)[0].nextSibling
    while (next != null && !next.isEqualNode(endMarker)) {

      // If the element is a node, that containt the marker at any level
      if (next.nodeType != 3 && ($(next).is('tr,th,td') || $(next).find(this.end_marker_selector).length))
        next = next.firstChild

      else {

        // Add the element that must has to be wrapped, inside the array
        elements.push(next)

        // If the next sibling doesn't exist, go up and look at the next element of the parent
        if (next.nextSibling == null) {

          do
            next = next.parentElement

          while (next.nextSibling == null)
        }

        next = next.nextSibling
      }
    }

    let index = 0

    // Wrap all parts of annotations inside a span
    elements.map((node) => {

      // Don't print all elements that are not text or html nodes
      if ((node.nodeType != 1 && node.nodeType != 3)) //|| $(node).is('data-rash-annotation-id'))
        return

      let text = node.nodeType !== 3 ? node.outerHTML : node.nodeValue

      // TODO add the rash-original-content tag
      if (text.trim().length != 0) {

        // If the element is a block element, wrap its content inside a wrapper
        if ($(node).is('p,:header'))
          $(node).html(`<span data-rash-original-parent-content="${text}" data-rash-annotation-index="${++index}" data-rash-annotation-type="wrap" title="#${this.semanticAnnotation.id}" data-rash-annotation-id="${this.semanticAnnotation.id}" class="cgen annotation_highlight">${$(text).html()}</span>`)

        // Or wrap its content in a note
        else
          $(node).replaceWith(`<span data-rash-original-content="${text}" data-rash-annotation-index="${++index}" data-rash-annotation-type="wrap" title="#${this.semanticAnnotation.id}" data-rash-annotation-id="${this.semanticAnnotation.id}" class="cgen annotation_highlight">${text}</span>`)
      }

    })
  }

  /**
   * 
   */
  _createSideAnnotation() {

    /**
     * 
     * @param {*} top 
     */
    const nearAnnotation = (top) => {
      ANNOTATIONS.forEach(annotation => {
        if (Math.abs(top - annotation.top) < 100)
          return annotation
      })
    }

    this.coordinates = this._getCoordinates()

    // Get he average distance between the starting and the ending element
    this.top = (this.coordinates.start.top + this.coordinates.end.top) / 2

    let side_note

    // Check if there is another annotation
    let annotation = nearAnnotation(this.top)
    if (typeof annotation != 'undefined') {

      side_note = $(`span.side_note[data-rash-annotation-id="${annotation.semanticAnnotation.id}"]`)

      side_note.attr('title', `${side_note.attr('title')},${this.semanticAnnotation.id}`)
      side_note.text(parseInt(side_note.text(), 10) + parseInt(1, 10))

      this.top = annotation.top
    }

    // Create a new annotation in this way
    else {

      side_note = $(`<span style="top:${this.top}px" title="${this.semanticAnnotation.id}" data-rash-annotation-id="${this.semanticAnnotation.id}" class="btn btn-default cgen side_note">1</span>`)

      tinymce.activeEditor.$(annotation_sidebar_selector).append(side_note)
    }

    // Create annotation body
    let side_note_body = $(`
      <div style="top:${this.top}px" class="cgen side_note_body" data-rash-annotation-id="${this.semanticAnnotation.id}">${this._getAnnotationBody()}</div>`)

    tinymce.activeEditor.$(annotation_sidebar_selector).append(side_note_body)
  }

  /**
   * 
   */
  _removeMarkers() {

    tinymce.activeEditor.$(this.start_marker_selector).remove()
    tinymce.activeEditor.$(this.end_marker_selector).remove()
  }

  /**
   * 
   */
  _addReply() {

    // Append the new annotation to its parent
    const parentSideNoteBody = tinymce.activeEditor.$(this.getParentAnnotation().side_note_body_selector).first()

    const replyNoteElement = `<div data-rash-annotation-id="${this.semanticAnnotation.id}" class="side_note_body" ><hr/>${this._getAnnotationBody()}`
    parentSideNoteBody.find('.side_note_wrapper').append(replyNoteElement)

    // Remove the reply element from the parent
    parentSideNoteBody.find(side_note_reply_selector).removeClass(active_class)

    // Show the reply element to the new note
    tinymce.activeEditor.$(this.side_note_body_selector).find(side_note_reply_selector).last().addClass(active_class)

    // Update click events
    this._setClickEvents()
  }

  /**
   * 
   */
  _getCoordinates() {

    let startRange = new Range()
    let endRange = new Range()

    startRange.selectNode(tinymce.activeEditor.$(this.start_marker_selector)[0])
    endRange.selectNode(tinymce.activeEditor.$(this.end_marker_selector)[0])

    return {
      start: startRange.getBoundingClientRect(),
      end: endRange.getBoundingClientRect()
    }
  }

  /**
   * 
   */
  remove() {

    // Remove side note elements
    tinymce.activeEditor.$(this.side_note_selector).remove()
    tinymce.activeEditor.$(this.side_note_body_selector).remove()

    // Replace notes with content or parent content
    tinymce.activeEditor.$(this.note_selector).each(function () {

      if ($(this).attr(data_rash_original_content))
        $(this).replaceWith($(this).attr(data_rash_original_content))

      else if ($(this).attr(data_rash_original_parent_content))
        $(this).parent().replaceWith($(this).attr(data_rash_original_parent_content))
    })
  }

  /**
   * 
   */
  hide() {

    tinymce.activeEditor.$(this.side_note_body_selector).removeClass(active_class)

    tinymce.activeEditor.$(this.side_note_selector).toggleClass(hidden_class)
    tinymce.activeEditor.$(this.note_selector).toggleClass(annotation_highlight_class)
  }

  /**
   * 
   */
  static render() {
    tinymce.activeEditor.$(semantic_annotation_selector).each(function () {
      const newNote = new AnnotationContext(JSON.parse($(this).html())).annotation
      ANNOTATIONS.set(newNote.getId(), newNote)
    })
  }

  /**
   * 
   * @param {*} container 
   * @param {*} offset 
   * @param {*} path 
   */
  static getOffset(container, offset, path) {

    /**
     * 
     * Analyze all the nodes contained inside @param element, keeping all the offsets
     * 
     * @param JQqueryObject element 
     */
    const _analyzeContent = element => {

      for (let node of element.childNodes) {

        if (found)
          break

        // If the 
        if (node.nodeType == 1) {

          // If the element is the svg formula
          if ($(node).is('svg[data-math-original-input]'))
            minOffset += $(node).attr('data-math-original-input').length

          // Or do the normal behaviour
          else
            _analyzeContent(node)
        }

        // Act normally if the element is a text node
        else {

          node.nodeValue = node.nodeValue.replace(/\s+/g, ' ')

          if (container.isEqualNode(node)) {
            offset += minOffset
            found = true
          }

          minOffset += node.length
        }
      }
    }

    let minOffset = 0
    let found = false

    _analyzeContent(tinymce.activeEditor.$(path)[0])

    return offset
  }
}

class AnnotationRash extends Annotation {
  constructor(semanticAnnotation) {
    super(semanticAnnotation)
  }

  static render() {}

  _getCoordinates(start_selector, end_selector) {

    let startRange = new Range()
    let endRange = new Range()

    startRange.selectNode($(start_selector)[0])
    endRange.selectNode($(end_selector)[0])

    return {
      start: startRange.getBoundingClientRect(),
      end: endRange.getBoundingClientRect()
    }
  }
}

//#region old annotation
/*
  class Annotation1 {


    constructor(semanticAnnotation) {

      this.semanticAnnotation = semanticAnnotation

      // Save the html elements connected to the annotation
      this.side_note_selector = `.side_note[data-rash-annotation-id="${this.semanticAnnotation.id}"]`
      this.side_note_body_selector = `.side_note_body[data-rash-annotation-id="${this.semanticAnnotation.id}"]`

      this.note_selector = `.annotation_highlight[data-rash-annotation-id="${this.semanticAnnotation.id}"]`

      this.start_marker_selector = `span[data-rash-annotation-id="${this.semanticAnnotation.id}"][data-rash-annotation-role="${start_role}"]`
      this.end_marker_selector = `span[data-rash-annotation-id="${this.semanticAnnotation.id}"][data-rash-annotation-role="${end_role}"]`

      switch (this.semanticAnnotation.Motivation) {

        case commenting:
          // Create the starting selector
          this.startSelector = {
            selector: semanticAnnotation.target.selector.startSelector[json_value_key],
            offset: semanticAnnotation.target.selector.start[json_value_key],
            role: 'start'
          }

          this.endSelector = {
            selector: semanticAnnotation.target.selector.endSelector[json_value_key],
            offset: semanticAnnotation.target.selector.end[json_value_key],
            role: 'end'
          }

          this._addMarker()
          break

        case replying:
          this._addReply()
          break

      }
    }

    _addMarker() {

      // Save the elements
      this.startElement = $(document).xpath(this.startSelector.selector)
      this.endElement = $(document).xpath(this.endSelector.selector)

      // Check if the annotation wraps entirely a html element
      if (this.startElement.is(this.endElement) && (this.startSelector.offset == 0 && this.endElement.text().length == this.endSelector.offset))
        this._wrapElement(this.startElement)

      // Else do it normally
      else {
        this._createMarker(this.startElement, this.startSelector)
        this._createMarker(this.endElement, this.endSelector)

        this._fragmentateAnnotation()
      }

      this._createSideAnnotation()
      this._removeMarkers()
    }

  
    getId() {
      return this.semanticAnnotation.id
    }

  
    _removeMarkers() {

      $(this.start_marker_selector).remove()
      $(this.end_marker_selector).remove()
    }

    _addReply() {

      this.startElement = $(`${annotation_sidebar_selector} div[data-rash-annotation-id='${this.semanticAnnotation.target}']`)

      if (!this.startElement.parent().is(annotation_sidebar_selector))
        this.startElement.parentsUntil(annotation_sidebar_selector)

      this.startElement.append(`<div data-rash-annotation-id="${this.semanticAnnotation.id}" class="side_note_body" ><hr/>${this._getAnnotationBody()}`)
    }


    _createSideAnnotation() {


      const nearAnnotation = (top) => {
        ANNOTATIONS.forEach(annotation => {
          if (Math.abs(top - annotation.top) < 100)
            return annotation
        })
      }

      this.coordinates = this._getCoordinates()

      // Get he average distance between the starting and the ending element
      this.top = (this.coordinates.start.top + this.coordinates.end.top) / 2

      let side_note

      // Check if there is another annotation
      let annotation = nearAnnotation(this.top)
      if (typeof annotation != 'undefined') {

        side_note = $(`span.side_note[data-rash-annotation-id="${annotation.semanticAnnotation.id}"]`)

        side_note.attr('title', `${side_note.attr('title')},${this.semanticAnnotation.id}`)
        side_note.text(parseInt(side_note.text(), 10) + parseInt(1, 10))

        this.top = annotation.top
      }

      // Create a new annotation in this way
      else {

        side_note = $(`<span style="top:${this.top}px" title="${this.semanticAnnotation.id}" data-rash-annotation-id="${this.semanticAnnotation.id}" class="btn btn-default cgen side_note">1</span>`)

        $(annotation_sidebar_selector).append(side_note)
      }

      const referencedNotes = side_note.attr('title').split(',')

      // Remove the previous hover function
      side_note.unbind('mouseenter mouseleave click')

      // Add the new hover function
      side_note.on('mouseenter mouseleave', function () {

        let selector = getWrapAnnotationSelector(referencedNotes[0])

        for (let i = 1; i < referencedNotes.length; i++)
          selector += `,${getWrapAnnotationSelector(referencedNotes[i])}`

        $(selector).each(function () {
          $(this).toggleClass('selected')
        })
      })

      side_note.on('click', function () {
        rash.showAnnotation(referencedNotes)
      })

      // Create annotation body
      let side_note_body = $(`
        <div style="top:${this.top}px" class="cgen side_note_body" data-rash-annotation-id="${this.semanticAnnotation.id}">${this._getAnnotationBody()}</div>`)

      side_note_body.on('mouseenter mouseleave', function () {
        $(getWrapAnnotationSelector($(this).attr('data-rash-annotation-id'))).each(function () {
          $(this).toggleClass('selected')
        })
      })

      $(annotation_sidebar_selector).append(side_note_body)
    }


    _getCoordinates() {

      let selector = ($(raje_iframe_selector).length > 0) ? raje_string : rash_string

      return new CoordinateContext(selector).coordinateContextInterface(this.start_marker_selector, this.end_marker_selector)
    }
  }
  */
//#endregion
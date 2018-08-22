const replying = 'replying'
const commenting = 'commenting'
const start_role = 'start'
const end_role = 'end'
const raje_iframe_selector = '#raje_root_ifr'

const raje_string = 'raje'
const rash_string = 'rash'

/**
 * 
 */
class Annotation {

  /**
   * 
   * @param {*} semanticAnnotation 
   */
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

  /**
   * 
   */
  _getMarker(role) {
    return $(`<span class="cgen" data-rash-original-content="" data-rash-annotation-role="${role}" data-rash-annotation-id="${this.semanticAnnotation.id}"/>`)
  }

  /**
   * 
   */
  _getAnnotationBody() {
    return `
      <div class="side_note_wrapper">
        <div class="side_node_text">${this.semanticAnnotation.bodyValue}</div>
        <div><a href="#">@${this.semanticAnnotation.creator}</a></div>
        <div class="side_note_date">${new Date(this.semanticAnnotation.created).toUTCString().replace(':00 GMT','')}</div>
        <div class="btn btn-primary side_note_replay">replay</div>
      </div>`
  }

  /**
   * 
   */
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

  /**
   * 
   */
  getId() {
    return this.semanticAnnotation.id
  }

  /**
   * 
   */
  _removeMarkers() {

    $(this.start_marker_selector).remove()
    $(this.end_marker_selector).remove()
  }

  /**
   * 
   */
  _addReply() {

    this.startElement = $(`${annotation_sidebar_selector} div[data-rash-annotation-id='${this.semanticAnnotation.target}']`)

    if (!this.startElement.parent().is(annotation_sidebar_selector))
      this.startElement.parentsUntil(annotation_sidebar_selector)

    if (this.startElement.children('ul').length == 0)
      this.startElement.append($('<ul></ul>'))

    this.startElement.children('ul').append(`<div data-rash-annotation-id="${this.semanticAnnotation.id}" ><hr/>${this._getAnnotationBody()}</li>`)
  }

  /**
   * 
   * @param {*} element 
   */
  _wrapElement(element) {

    element.addClass('annotation_element')
    element.attr('title', this.semanticAnnotation.id)
    element.attr('data-rash-annotation-id', this.semanticAnnotation.id)
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

    // Start from the next element of the starting marker and iterate until the endMarker is found
    let next = $(this.start_marker_selector)[0].nextSibling
    while (next != null && next != $(this.end_marker_selector)[0]) {

      // If the element is a node, that containt the marker at any level
      if (next.nodeType != 3 && ($(next).is('tr,th,td') || $(next).find($(this.end_marker_selector)[0]).length > 0))
        next = next.firstChild

      else {

        // Add the element that must has to be wrapped, inside the array
        elements.push(next)

        // If the next sibling doesn't exist, go up and look at the next element of the parent
        if (next.nextSibling == null)
          next = next.parentElement.nextSibling

        // Otherwise preceed normally
        else
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

  /**
   * 
   */
  remove() {
    let id = this.getId()

    $(`span[data-rash-annotation-id="${id}"][data-rash-original-content]`).each(function () {
      $(this).replaceWith($(this).attr('data-rash-original-content'))
    })

    $(`span[data-rash-annotation-id="${id}"][data-rash-original-parent-content]`).each(function () {
      $(this).parent().replaceWith($(this).attr('data-rash-original-parent-content'))
    })

    $(`*[data-rash-annotation-id="${id}"]`).each(function () {
      $(this).remove()
    })
  }

  /**
   * 
   */
  static getXPath(node) {

    // The allowed starting elements
    const not_blocked_elements = 'section, p, :header, table, tr, th, td, tbody, ol, ul, li'

    // Create the neede vars
    let xpath = '/'
    let parents = []

    if (node.is(not_blocked_elements))
      parents.push(node)

    // Add the entire collection inside the array of parent elements
    node.parentsUntil('body').each(function () {
      if ($(this).is(not_blocked_elements))
        parents.push($(this))
    })

    // Reverse the array in order to have the parents in the left
    parents.reverse()

    // Create the Xpath for all elements
    for (let element of parents)
      xpath += `/${element[0].nodeName.toLowerCase()}[${element.prevAll(element[0].nodeName).length + 1}]`


    return xpath
  }

  /**
   * 
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

    _analyzeContent($(document).xpath(path)[0])

    return offset
  }

  /**
   * 
   */
  static getLastAnnotation() {

    const annotation_prefix = 'annotation_'
    let lastId = 0
    let lastAnnotation = $('head').children().last()

    $(semantic_annotation_selector).each(function () {
      let currentId = parseInt($(this).attr('id').replace(annotation_prefix, ''))

      if (currentId > lastId) {
        lastId = currentId
        lastAnnotation = $(`${semantic_annotation_selector}#${annotation_prefix + lastId}`)
      }
    })

    return {
      id: annotation_prefix + (lastId + 1),
      element: lastAnnotation
    }
  }

  /**
   * 
   */
  _getCoordinates() {

    let selector = ($(raje_iframe_selector).length > 0) ? raje_string : rash_string

    return new CoordinateContext(selector).coordinateContextInterface(this.start_marker_selector, this.end_marker_selector)
  }
}

//#region Strategy design pattern for the coordinates

class CoordinateContext {

  constructor(type) {
    switch (type) {
      case raje_string:
        this.strategy = new CoordinateStrategyRaje()
        break

      case rash_string:
        this.strategy = new CoordinateStrategyRash()
        break
    }
  }

  coordinateContextInterface(start_marker, end_marker) {
    return this.strategy.getCoordinates(start_marker, end_marker)
  }
}

class CoordinateStrategy {

  getCoordinates() {}
}

class CoordinateStrategyRaje extends CoordinateStrategy {

  getCoordinates(start_selector, end_selector) {

    updateIframeFromSavedContent()

    let startRange = new Range()
    let endRange = new Range()

    startRange.selectNode($(raje_iframe_selector).contents().find(start_selector)[0])
    endRange.selectNode($(raje_iframe_selector).contents().find(end_selector)[0])

    return {
      start: startRange.getBoundingClientRect(),
      end: endRange.getBoundingClientRect()
    }
  }
}

class CoordinateStrategyRash extends CoordinateStrategy {

  getCoordinates(start_selector, end_selector) {

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

//#endregion
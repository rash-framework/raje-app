/*
 * rash.js - Version Version 0.7, June, 2018
 * Copyright (c) 2014-2018, Silvio Peroni <essepuntato@gmail.com> 
 * 
 * with precious contributions by Ruben Verborgh, Vincenzo Rubano and Gianmarco Spinaci
 * 
 * Permission to use, copy, modify, and/or distribute this software for any purpose with 
 * or without fee is hereby granted, provided that the above copyright notice and this 
 * permission notice appear in all copies.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD 
 * TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. 
 * IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR 
 * CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR 
 * PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING 
 * OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */

let ANNOTATIONS = new Map()

/* Additional jQuery functions */
jQuery.fn.extend({
  countWords: function () {
    var text = $(this).text()
    var regex = /\s+/gi
    var total_word_count = text.trim().replace(regex, ' ').split(' ').length
    var table_text = $(this).find('table').text()
    var table_word_count = table_text.trim().replace(regex, ' ').split(' ').length
    return total_word_count - table_word_count
  },
  countElements: function (css_selector) {
    return $(this).find(css_selector).length
  },
  findNumberRaje: function (css_selector) {
    var cur_count = 0
    var cur_el = $(this)
    var found = false
    tinymce.activeEditor.$(css_selector).each(function () {
      if (!found) {
        cur_count++
        found = cur_el[0] === $(this)[0]
      }
    })
    return cur_count
  },
  findNumber: function (css_selector) {
    var cur_count = 0
    var cur_el = $(this)
    var found = false
    $(css_selector).each(function () {
      if (!found) {
        cur_count++
        found = cur_el[0] === $(this)[0]
      }
    })
    return cur_count
  },
  findHierarchicalNumber: function (css_selector) {
    var cur_count = 1
    $(this).prevAll(css_selector).each(function () {
      cur_count++
    })
    var parents = $(this).parents(css_selector)
    if (parents.length > 0) {
      return $(parents[0]).findHierarchicalNumber(css_selector) + "." + cur_count
    } else {
      return cur_count
    }
  },
  changeCSS: function (currentStyle) {
    if (currentStyle) {
      var current_path = null
      $('link[rel="stylesheet"]').each(function () {
        if (current_path == null) {
          var cur_href = $(this).attr('href')
          if (cur_href.match(/\.css$/)) {
            var cur_index = cur_href.lastIndexOf('/')
            if (cur_index < 0) {
              current_path = ''
            } else {
              current_path = cur_href.substring(0, cur_index + 1)
            }
          }
        }
      })
      if (current_path == null) {
        current_path = ''
      }

      if (currentStyle == '#rash_web_based_layout') { /* Transform to Web layout */
        $('link[rel="stylesheet"]').remove()
        var bootstrap_css = $(`<link rel="stylesheet" href="${current_path}bootstrap.min.css"/>`)
        var rash_css = $(`<link rel="stylesheet" href="${current_path}rash.css"/>`)
        bootstrap_css.appendTo($('head'))
        rash_css.appendTo($('head'))
        $('#layoutselection').text('Web-based')
        $(this).hideCSS()
        $('body').addHeaderHTML()
        $(this).orderCaptions(false)
      } else if (currentStyle == '#rash_lncs_layout') { /* Transform to Springer LNCS layout */
        $('link[rel="stylesheet"]').remove()
        var lncs_css = $(`<link rel="stylesheet" href="${current_path}lncs.css"/>`)
        lncs_css.appendTo($('head'))
        $('#layoutselection').text('Springer LNCS')
        $(this).hideCSS()
        $(this).addHeaderLNCS()
        $(this).orderCaptions(true, $(tablebox_selector))
      }
    }
  },
  toggleCSS: function () {
    $('.footer ul').toggle()
  },
  hideCSS: function () {
    $('.footer ul').hide()
  },
  addHeaderHTML: function () {
    /* Reset header */
    $('header').remove()
    $('p.keywords').remove()

    /* Header title */
    var header = $('<header class="page-header container cgen" data-rash-original-content=""></header>')
    $(this).prepend(header)
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
        var name_element_string = `<strong class="author_name">${author.name}</strong>`
        if (author['email'] != null) {
          name_element_string += `<code class="email"><a href="mailto:${author.email}">${author.email}</a></code>`
        }
        author_element.append(name_element_string)
      }

      for (var j = 0; j < author.affiliation.length; j++) {
        author_element.append(`<br /><span class="affiliation\">${author.affiliation[j].replace(/\s+/g, " ").replace(/, ?/g, ", ").trim()}</span>`)
      }
      if (i == 0) {
        author_element.insertAfter($("header h1"))
      } else {
        author_element.insertAfter($("header address:last-of-type"))
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
  },
  /* This function modifies the current structure of the page in order to follow the
   * layout specification of the Lecture Notes in Computer Science by Springer. */
  addHeaderLNCS: function () {
    /* Initialise the page again */
    $('body').addHeaderHTML()

    /* Authors */
    var authors = $('<address class="lead authors"></address>')

    /* Find all affiliations */
    var list_of_affiliations = []
    $('header .authors .affiliation').each(function () {
      var cur_affiliation = $(this).text().trim()
      if (list_of_affiliations.indexOf(cur_affiliation) == -1) {
        list_of_affiliations.push(cur_affiliation)
      }
    })

    /* Find all authors metadata */
    var author_names = []
    var author_affiliation_index = []
    var author_email = []
    $('header .authors').each(function () {
      /* Name */
      author_names.push($(this).find('.author_name').text().trim())

      /* Affiliation index */
      cur_affiliation_indexes = []
      $(this).find('.affiliation').each(function () {
        cur_affiliation_indexes.push(list_of_affiliations.indexOf($(this).text().trim()) + 1)
      })
      author_affiliation_index.push(cur_affiliation_indexes)

      /* Email */
      author_email.push($(this).find('.email a').text().trim())
    })

    /* Add authors' names + affiliation number */
    for (var i = 0; i < author_names.length; i++) {
      var cur_affiliation_index = ''
      if (list_of_affiliations.length > 1) {
        cur_affiliation_index += '<sup>'
        for (var j = 0; j < author_affiliation_index[i].length; j++) {
          if (j > 0) {
            cur_affiliation_index += ', '
          }
          cur_affiliation_index += author_affiliation_index[i][j]
        }
        cur_affiliation_index += '</sup>'
      }
      authors.append($('<strong class="author_name">' + author_names[i] + cur_affiliation_index + "</strong>"))
    }

    /* Affiliation */
    authors.append('<br /><br />')
    var affiliations = $('<span class="affiliation"></span>')
    for (var i = 0; i < list_of_affiliations.length; i++) {
      if (i > 0) {
        affiliations.append('<br />')
      }
      if (list_of_affiliations.length > 1) {
        affiliations.append(`<sup>${(i + 1)}</sup> `)
      }
      affiliations.append(list_of_affiliations[i])
    }
    affiliations.appendTo(authors)

    /* Emails */
    authors.append('<br />')
    var emails = $('<code class="email"></code>')
    for (var i = 0; i < author_email.length; i++) {
      if (i > 0) {
        emails.append(', ')
      }
      emails.append(author_email[i])
    }
    emails.appendTo(authors)

    /* Remove the all authors' metadata and add the new one */
    $('header address').remove()
    authors.appendTo($('header'))

    /* Keywords */
    $('header p.keywords').appendTo('section[role=doc-abstract]')
    /* /END Authors */
  },
  /* It reorder the captions */
  orderCaptions: function (captionFirst, listOfElements) {
    listOfElements = typeof listOfElements !== 'undefined' ?
      listOfElements : $(`${figurebox_selector},${tablebox_selector},${listingbox_selector}`)
    listOfElements.each(function () {
      var parent_figure = $(this).parents('figure')
      if (captionFirst) {
        parent_figure.find('figcaption').prependTo(parent_figure)
      } else {
        parent_figure.find('figcaption').appendTo(parent_figure)
      }
    })
  }
})

const figurebox_selector_img = 'p > img:not([role=math])'
const figurebox_selector_svg = 'p > svg'
const figurebox_selector = `figure > ${figurebox_selector_img}, figure > ${figurebox_selector_svg}`
const tablebox_selector_table = 'table'
const tablebox_selector = `figure > ${tablebox_selector_table}`
const formulabox_selector_img = 'p > img[role=math]'
const formulabox_selector_span = 'p > span[role=math]'
const formulabox_selector_math = 'p > math'
var formulabox_selector_svg = "p svg[role=math]"

var formulabox_selector = "figure > " + formulabox_selector_img + ", figure > " + formulabox_selector_span + ", figure > " + formulabox_selector_math + ", figure > " + formulabox_selector_svg
const listingbox_selector_pre = 'pre'
const listingbox_selector = `figure > ${listingbox_selector_pre}`

const annotation_sidebar_selector = 'aside#annotations'
const side_annotation_selector = `${annotation_sidebar_selector}>span.side_note`
const sidebody_annotation_selector = `${annotation_sidebar_selector}>div.side_note_body`

const html_annotations_selector = 'span[data-rash-annotation-type=wrap]'
const semantic_annotation_selector = 'script[type="application/ld+json"]'
const json_value_key = '@value'

/**
 * Create the rash modularized
 */
const rash = {

  run: () => {

    rash.codeBlock()
    rash.bibliographicReferenceList()
    rash.footnotesPartI()
    rash.captions()
    rash.references()
    rash.footnotesPartII()
    rash.headingDimensions()
    rash.setHeader()
    rash.footer()
    rash.initMathJax()
    rash.initCSS()
  },

  /* Init annotation sidebar */

  initAnnotationSidebar() {

    let annotation_sidebar = $(`
      <aside id="annotations" data-rash-original-content="" style="height:${$('html').outerHeight(true)}px">
        <header>
          <span id="toggleAnnotations" title="show/hide annotations" class="btn btn-default active">
            <span class="glyphicon glyphicon-eye-open" aria-hidden="true"></span>
          </span>
          <span id="toggleSidebar" title="show/hide annotation sidebar" class="btn btn-default">
            <span class="glyphicon glyphicon-chevron-right" aria-hidden="true"></span>
          </span>
        </header>
      </aside>
    `)

    annotation_sidebar.prependTo($('body'))

    $('#toggleAnnotations').on('click', function () {
      rash.toggleAnnotations()
    })

    $('#toggleSidebar').on('click', function () {
      rash.toggleSidebar()
    })
  },

  /* /END Init annotation sidebar */

  /* Code Block */

  codeBlock: () => {

    $('pre').each(function () {
      $(this).html($.trim($(this).html()))
    })

    $('pre > code').each(function () {
      $(this).html($.trim($(this).html()))
    })

  },

  /* /END Code Block */

  /* Bibliographic reference list */

  bibliographicReferenceList: () => {

    $('ul > li[role=doc-biblioentry]').sort((a, b) => {
      var a_text = $(a).text().replace(/\s+/g, " ").split()
      var b_text = $(b).text().replace(/\s+/g, " ").split()

      if (a_text < b_text)
        return -1

      else if (a_text > b_text)
        return 1

      else
        return 0

    }).appendTo('section[role=doc-bibliography] ul , section[role=doc-bibliography] ol')

    /* Highlights with a red '[X]' all the bibliographic references that are not cited in the paper */
    $('li[role=doc-biblioentry]').each(function () {
      var cur_entry_id = $(this).attr("id")

      if (cur_entry_id == undefined || cur_entry_id == false || $(`a[href='#${cur_entry_id}']`).length == 0)
        $(this).find('p').prepend('<span class="cgen notcited" data-rash-original-content="" title="This reference is not cited in the document.">[X] </span>')

    })
  },

  /* /END Bibliographic reference list */

  /* Footnotes (part one) */

  footnotesPartI: () => {

    $('section[role=doc-endnotes] section[role=doc-endnote], section[role=doc-footnotes] section[role=doc-footnote]').sort(function (a, b) {

      var all_footnote_pointers = $('a[href]').each(function () {
        if ($.trim($(this).text()) == '' && $($(this).attr('href')).parents('section[role=doc-endnotes], section[role=doc-footnotes]'))
          return $(this)

      })

      var a_index = all_footnote_pointers.index(all_footnote_pointers.filter(`a[href='#${$(a).attr('id')}']`))
      var b_index = all_footnote_pointers.index(all_footnote_pointers.filter(`a[href='#${$(b).attr('id')}']`))

      if (a_index < b_index)
        return -1

      else if (a_index > b_index)
        return 1

      else
        return 0

    }).appendTo('section[role=doc-endnotes], section[role=doc-footnotes]')

    $('section[role=doc-endnotes], section[role=doc-footnotes]').prepend('<h1 class="cgen" data-rash-original-content="">Footnotes</h1>')
  },

  /* /END Footnotes (part one) */

  /* Captions */

  captions: () => {

    $(figurebox_selector).each(function () {

      var cur_caption = $(this).parents('figure').find('figcaption')
      var cur_number = $(this).findNumber(figurebox_selector)

      cur_caption.html(`<strong contenteditable="false" class="cgen" data-rash-original-content="">Figure ${cur_number}. </strong>${cur_caption.html()}`)
    })

    $(tablebox_selector).each(function () {

      var cur_caption = $(this).parents('figure').find('figcaption')
      var cur_number = $(this).findNumber(tablebox_selector)

      cur_caption.html(`<strong contenteditable="false" class="cgen" data-rash-original-content="">Table ${cur_number}. </strong>${cur_caption.html()}`)
    })

    $(formulabox_selector).each(function () {

      var cur_caption = $(this).parents('figure').find('p')
      var cur_number = $(this).findNumber(formulabox_selector)

      cur_caption.html(`${cur_caption.html()}<span contenteditable="false" class="cgen" data-rash-original-content=""> (${cur_number})</span>`)
    })

    $(listingbox_selector).each(function () {

      var cur_caption = $(this).parents('figure').find('figcaption')
      var cur_number = $(this).findNumber(listingbox_selector)

      cur_caption.html(`<strong contenteditable="false" class="cgen" data-rash-original-content="">Listing ${cur_number}. </strong>${cur_caption.html()}`)
    })
  },

  /* /END Captions */

  /* References */

  references: () => {

    $('a[href]').each(function () {
      if ($.trim($(this).text()) == '') {

        var cur_id = $(this).attr('href')
        original_content = $(this).html()
        referenced_element = $(cur_id)

        if (referenced_element.length > 0) {
          referenced_element_figure = referenced_element.find(`${figurebox_selector_img},${figurebox_selector_svg}`)
          referenced_element_table = referenced_element.find(tablebox_selector_table)
          referenced_element_formula = referenced_element.find(`${formulabox_selector_img},${formulabox_selector_span},${formulabox_selector_math}`)
          referenced_element_listing = referenced_element.find(listingbox_selector_pre)

          /* Special sections */
          if (
            $(`section[role=doc-abstract]${cur_id}`).length > 0 ||
            $(`section[role=doc-bibliography]${cur_id}`).length > 0 ||
            $(`section[role=doc-endnotes]${cur_id}, section[role=doc-footnotes]${cur_id}`).length > 0 ||
            $(`section[role=doc-acknowledgements]${cur_id}`).length > 0)

            $(this).html(`<span class="cgen" data-rash-original-content="${original_content}">Section <q>${$(`${cur_id} > h1`).text()}</q></span>`)

          /* Bibliographic references */
          else if ($(cur_id).parents('section[role=doc-bibliography]').length > 0) {

            var cur_count = $(cur_id).prevAll('li').length + 1
            $(this).html(`<span class="cgen" data-rash-original-content="${original_content}" title="Bibliographic reference ${cur_count} : ${$(cur_id).text().replace(/\s+/g, " ").trim()}">[${cur_count}]</span>`)
          }

          /* Footnote references (doc-footnotes and doc-footnote included for easing back compatibility) */
          else if ($(cur_id).parents('section[role=doc-endnotes], section[role=doc-footnotes]').length > 0) {

            var cur_contents = $(this).parent().contents()
            var cur_index = cur_contents.index($(this))
            var prev_tmp = null
            while (cur_index > 0 && !prev_tmp) {

              cur_prev = cur_contents[cur_index - 1]

              if (cur_prev.nodeType != 3 || $(cur_prev).text().replace(/ /g, '') != '')
                prev_tmp = cur_prev

              else
                cur_index--

            }

            var prev_el = $(prev_tmp)
            var current_id = $(this).attr('href')
            var footnote_element = $(current_id)
            if (footnote_element.length > 0 && footnote_element.parent('section[role=doc-endnotes], section[role=doc-footnotes]').length > 0) {

              var count = $(current_id).prevAll('section').length + 1

              if (prev_el.find('sup').hasClass('fn'))
                $(this).before('<sup class="cgen" data-rash-original-content="">,</sup>')

              $(this).html(`<sup class="fn cgen" data-rash-original-content="${original_content}">
                                  <a name="fn_pointer_${current_id.replace("#", "")}" title="Footnote ${count}: ${$(current_id).text().replace(/\s+/g, " ").trim()}">${count}</a>
                              </sup>`)
            } else
              $(this).html(`<span class="error cgen" data-rash-original-content="${original_content}">ERR: footnote '${current_id.replace("#", "")}' does not exist</span>`)

            /* Common sections */
          } else if ($('section' + cur_id).length > 0) {

            var cur_count = $(cur_id).findHierarchicalNumber('section:not([role=doc-abstract]):not([role=doc-bibliography]):not([role=doc-endnotes]):not([role=doc-footnotes]):not([role=doc-acknowledgements])')

            if (cur_count != null && cur_count != "")
              $(this).html(`<span class="cgen" data-rash-original-content="${original_content}">Section ${cur_count}</span>`)

            /* Reference to figure boxes */
          } else if (referenced_element_figure.length > 0) {

            var cur_count = referenced_element_figure.findNumber(figurebox_selector)

            if (cur_count != 0)
              $(this).html(`<span class="cgen" data-rash-original-content="${original_content}">Figure ${cur_count}</span>`)

            /* Reference to table boxes */
          } else if (referenced_element_table.length > 0) {

            var cur_count = referenced_element_table.findNumber(tablebox_selector)

            if (cur_count != 0)
              $(this).html(`<span class="cgen" data-rash-original-content="${original_content}">Table ${cur_count}</span>`)

            /* Reference to formula boxes */
          } else if (referenced_element_formula.length > 0) {

            var cur_count = referenced_element_formula.findNumber(formulabox_selector)

            if (cur_count != 0)
              $(this).html(`<span class="cgen" data-rash-original-content="${original_content}">Formula ${cur_count}</span>`)

          }

          /* Reference to listing boxes */
          else if (referenced_element_listing.length > 0) {

            var cur_count = referenced_element_listing.findNumber(listingbox_selector)

            if (cur_count != 0)
              $(this).html(`<span class="cgen" data-rash-original-content="${original_content}">Listing ${cur_count}</span>`)

          } else
            $(this).html(`<span class="error cgen" data-rash-original-content="${original_content}">ERR: referenced element '${cur_id.replace("#", "")}' 
                          has not the correct type (it should be either a figure, a table, a formula, a listing, or a section)</span>`)

        } else
          $(this).replaceWith(`<span class="error cgen" data-rash-original-content="${original_content}">ERR: referenced element '${cur_id.replace("#", "")}' does not exist</span>`)

      }
    })
  },

  /* /END References */

  /* Footnotes (part 2) */

  footnotesPartII: () => {

    $('section[role=doc-endnotes] > section[role=doc-endnote], section[role=doc-footnotes] > section[role=doc-footnote]').each(function () {
      var current_id = $(this).attr('id')
      $(this).children(':last-child').append(`<sup class="hidden-print cgen" data-rash-original-content="${original_content}"><a href="#fn_pointer_${current_id}">[back]</a></sup>`)
    })

  },

  /* /END Footnotes (part 2) */

  /* Heading dimensions */

  headingDimensions: () => {

    $('h1').each(function () {

      var counter = 0

      $(this).parents('section').each(function () {
        if ($(this).children('h1,h2,h3,h4,h5,h6').length > 0)
          counter++

      })

      $(this).replaceWith(`<h${counter}>${$(this).html()}</h${counter}>`)
    })
  },

  /* /END Heading dimensions */

  /* Set header */

  setHeader: () =>
    $('body').addHeaderHTML(),

  /* /END Set header */

  /* Footer */

  footer: () => {

    var footer = $(`
    <footer class="footer hidden-print cgen" data-rash-original-content="">
        <p>
            <span>Words: ${$('body').countWords()}</span>
            <span>Figures: ${$('body').countElements(figurebox_selector)}</span>
            <span>Tables: ${$('body').countElements(tablebox_selector)}</span>
            <span>Formulas: ${$('body').countElements(formulabox_selector)}</span>
            <span>Listings: ${$('body').countElements(listingbox_selector)}</span>
            <div class="btn-group dropup">
                <button type="button" class="btn btn-default dropdown-toggle" data-toggle="dropdown" aria-expanded="false" onClick="$(this).toggleCSS()">
                    Layout: <span id="layoutselection">Web-based</span><span class="caret"></span>
                </button>
                <ul class="dropdown-menu" role="menu">
                    <li><a href="#rash_web_based_layout" onClick="$(this).changeCSS('#rash_web_based_layout')">Web-based</a></li>
                    <li><a href="#rash_lncs_layout" onClick="$(this).changeCSS('#rash_lncs_layout')">Springer LNCS</a></li>
                </ul>
            </div>
        </p>
    </footer>`)

    footer.appendTo($("body"))
  },

  /* /END Footer */

  /* AsciiMath and LaTeX formulas */

  initMathJax: () => {

    if (typeof MathJax !== 'undefined') {
      // MathJax should parse *only* math content within span with role=math
      var ignore_math_class = 'rash-nomath'
      var process_math_class = 'rash-math'
      $('body').attr('class', ignore_math_class)

      var ascii_math_left_delimiter = '``'
      var ascii_math_right_delimiter = '``'
      var tex_math_left_delimiter = '$$'
      var tex_math_right_delimiter = '$$'

      $('span[role=math]').each(function () {
        // We need to keep the outer span to let MathJax know that it should process its content
        // but we *must* absolutely change its role.
        $(this).attr('role', 'presentation')
        $(this).attr('class', process_math_class)

        var tex_math_regex = /\\.+(?![\ ])/g

        if (tex_math_regex.test($(this).text()))
          $(this).html(tex_math_left_delimiter + $(this).html() + tex_math_right_delimiter)

        else
          $(this).html(ascii_math_left_delimiter + $(this).html() + ascii_math_right_delimiter)

      })

      MathJax.Hub.Config({
        asciimath2jax: {
          // delimiters for AsciiMath formulas
          delimiters: [
            [ascii_math_left_delimiter, ascii_math_right_delimiter]
          ],
          processClass: process_math_class,
          ignoreClass: ignore_math_class
        },
        tex2jax: {
          // delimiters for LaTeX formulas
          inlineMath: [
            [tex_math_left_delimiter, tex_math_right_delimiter]
          ],
          processClass: process_math_class,
          ignoreClass: ignore_math_class
        }
      })
      // we changed the DOM, so we make MathJax typeset the document again.
      MathJax.Hub.Queue(['Typeset', MathJax.Hub])
    }
  },

  /* /END AsciiMath and LaTeX formulas */

  /* General function for loading CSS */

  initCSS: () => {

    var currentStyle = document.location.hash
    $(this).changeCSS(currentStyle)

    /* This will be run only when the status (via hash in the URL) changes */
    $(window).on('hashchange', function () {

      var currentStyle = document.location.hash
      if (!currentStyle)
        currentStyle = '#rash_web_based_layout'

      $(this).changeCSS(currentStyle)
    })
  },

  /* /END General function for loading CSS */

  /* Render semantic annotations */

  renderAnnotations: () => {
    AnnotationContext.render()
  },

  /* Render a single annotation */

  renderSingleAnnotation: semanticBody => {

    const newNote = new AnnotationContext(semanticBody).annotation
    ANNOTATIONS.set(newNote.getId(), newNote)
  },

  /* /END Render a single annotation */

  displayLastReplayArea: noteId => {

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
  },

  /* /END Render semantic annotations */

  /* Toggle annotations */

  toggleAnnotations: () => {

    $(annotation_sidebar_selector).removeClass('active')

    $(sidebody_annotation_selector).each(function () {
      $(this).removeClass('active')
    })

    $(html_annotations_selector).each(function () {

      $(this).toggleClass('annotation_hilight')
    })

    $(side_annotation_selector).each(function () {

      $(this).toggleClass('hidden')
    })
  },

  /* /END Toggle annotations */

  toggleSidebar: () => {

    $(annotation_sidebar_selector).toggleClass('active')

    ANNOTATIONS.forEach(annotation => {

      let side_note_body = $(annotation.side_note_body_selector)

      side_note_body.removeClass('active')
      side_note_body.find(side_note_reply_selector).removeClass('active')
    })
  },

  showAnnotation: titleList => {

    const getSelector = id => `div.cgen.side_note_body[data-rash-annotation-id="${id}"]`

    $(annotation_sidebar_selector).toggleClass('active')

    let selector = getSelector(titleList[0])

    for (let i = 1; i < titleList.length; i++)
      selector += `,${getSelector(titleList[i])}`

    $(selector).each(function () {
      $(this).toggleClass('active')
    })
  }
}

$(() => rash.run())

$(document).ready(function () {
  rash.initAnnotationSidebar()
  rash.renderAnnotations()
})
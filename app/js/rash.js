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

//#region Constants declaration

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

//#endregion

//#region Additional jQuery functions 
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

//#endregion

//#region Modularised RASH
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

    AnnotationRash.initEvents()
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
  }
}

$(() => rash.run())

//#endregion

//#region Constant declaration annotation
const ANNOTATIONS = new Map()

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

const toggle_annotation_selector = '#toggleAnnotations'
const toggle_sidebar_selector = '#toggleSidebar'

//#endregion 

//#region Annotation core

$(document).ready(function () {
  rash.initAnnotationSidebar()
  rash.renderAnnotations()
})

/**
 * 
 */
class AnnotationContext {

  /**
   * 
   * @param {*} semanticAnnotation 
   */
  constructor(semanticAnnotation) {

    let type

    try {
      type = (tinymce.activeEditor != null) ? raje_string : rash_string
    }

    // Catch ReferenceError thrown by TinyMce if it isn't called
    catch (ReferenceError) {
      type = rash_string
      console.log(ReferenceError)
    }

    switch (type) {

      case raje_string:
        this.annotation = new AnnotationRaje(semanticAnnotation)
        break

      case rash_string:
        this.annotation = new AnnotationRash(semanticAnnotation)
        break
    }
  }

  /**
   * 
   */
  static render() {

    let type

    try {
      type = (tinymce.activeEditor != null) ? raje_string : rash_string
    }

    // Catch ReferenceError thrown by TinyMce if it isn't called
    catch (ReferenceError) {
      type = rash_string
      console.log(ReferenceError)
    }

    switch (type) {

      case raje_string:
        AnnotationRaje.render()
        break

      case rash_string:
        AnnotationRash.render()
        break
    }
  }

  /**
   * 
   * @param {*} container 
   * @param {*} offset 
   * @param {*} path 
   */
  static getOffset(container, offset, path) {

    let type

    try {
      type = (tinymce.activeEditor != null) ? raje_string : rash_string
    }

    // Catch ReferenceError thrown by TinyMce if it isn't called
    catch (ReferenceError) {
      type = rash_string
      console.log(ReferenceError)
    }

    switch (type) {

      case raje_string:

        break

      case rash_string:

        break
    }

    // Execute Raje
    try {
      if (tinymce.activeEditor)
        return AnnotationRaje.getOffset(container, offset, path)
    }

    // Execute Rash
    catch (Exception) {
      return AnnotationRash.getOffset(container, offset, path)
    }
  }

  /**
   * 
   * @param {*} titleAttribute 
   */
  static showAnnotationFromAttribute(titleAttribute) {

    AnnotationContext.toggleAnnotationToolbar()
    titleAttribute = titleAttribute.split(',')

    let type

    try {
      type = (tinymce.activeEditor != null) ? raje_string : rash_string
    }

    // Catch ReferenceError thrown by TinyMce if it isn't called
    catch (ReferenceError) {
      type = rash_string
      console.log(ReferenceError)
    }

    switch (type) {

      case raje_string:
        AnnotationRaje.showAnnotationFromAttribute(titleAttribute)
        break

      case rash_string:
        AnnotationRash.showAnnotationFromAttribute(titleAttribute)
        break
    }
  }

  /**
   * 
   * @param {*} titleAttribute 
   */
  static highlightAnnotationFromAttribute(titleAttribute) {

    titleAttribute = titleAttribute.split(',')

    let type

    try {
      type = (tinymce.activeEditor != null) ? raje_string : rash_string
    }

    // Catch ReferenceError thrown by TinyMce if it isn't called
    catch (ReferenceError) {
      type = rash_string
      console.log(ReferenceError)
    }

    switch (type) {

      case raje_string:
        AnnotationRaje.highlightAnnotationFromAttribute(titleAttribute)
        break

      case rash_string:
        AnnotationRash.highlightAnnotationFromAttribute(titleAttribute)
        break
    }
  }

  /**
   * 
   * @param {*} titleAttribute 
   */
  static NormalizeAnnotationFromAttribute(titleAttribute) {

    titleAttribute = titleAttribute.split(',')

    AnnotationRaje.NormalizeAnnotationFromAttribute(titleAttribute)
  }

  /**
   * 
   */
  static toggleAnnotationToolbar() {

    let type

    try {
      type = (tinymce.activeEditor != null) ? raje_string : rash_string
    }

    // Catch ReferenceError thrown by TinyMce if it isn't called
    catch (ReferenceError) {
      type = rash_string
      console.log(ReferenceError)
    }

    switch (type) {

      case raje_string:
        AnnotationRaje.toggleAnnotationToolbar()
        break

      case rash_string:
        AnnotationRash.toggleAnnotationToolbar()
        break
    }
  }

  /**
   * 
   */
  static toggleAnnotation() {

    let type

    try {
      type = (tinymce.activeEditor != null) ? raje_string : rash_string
    }

    // Catch ReferenceError thrown by TinyMce if it isn't called
    catch (ReferenceError) {
      type = rash_string
      console.log(ReferenceError)
    }

    switch (type) {

      case raje_string:
        AnnotationRaje.toggleAnnotation()
        break

      case rash_string:
        AnnotationRash.toggleAnnotation()
        break
    }
  }

  static renderSingle(id, body) {
    Annotation.renderSingle(id, body)
  }

  static getCssSelector(node) {
    return Annotation.getCssSelector(node)
  }

  static getNextAnnotationId() {
    return Annotation.getNextAnnotationId()
  }

  static clearAnnotations() {

    ANNOTATIONS.forEach(annotation => {
      annotation.remove()
    })

    ANNOTATIONS.clear()
  }
}

/**
 * 
 */
class Annotation {

  constructor(semanticAnnotation) {

    //const replaceCssSelector = (selector) => selector.replace('&gt;', '>')

    this.semanticAnnotation = semanticAnnotation
    this.role = semanticAnnotation.Motivation
    this.id = semanticAnnotation.id

    // Save the html elements connected to the annotation
    this.side_note_selector = `.side_note[data-rash-annotation-id="${this.semanticAnnotation.id}"]`
    this.side_note_body_selector = `.side_note_body[data-rash-annotation-id="${this.semanticAnnotation.id}"]`

    this.note_selector = `[data-rash-annotation-id="${this.semanticAnnotation.id}"][data-rash-annotation-type="wrap"]`

    this.start_marker_selector = `span[data-rash-annotation-id="${this.semanticAnnotation.id}"][data-rash-annotation-role="${start_role}"]`
    this.end_marker_selector = `span[data-rash-annotation-id="${this.semanticAnnotation.id}"][data-rash-annotation-role="${end_role}"]`

    this.script_selector = `script#${this.id}[type="application/ld+json"]`

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

  _wrapElement(element) {

    element.addClass('annotation_element')
    element.attr('title', this.semanticAnnotation.id)
    element.attr('data-rash-annotation-id', this.semanticAnnotation.id)
    element.attr('data-rash-annotation-type', 'wrap')

    this.start_marker_selector = `.annotation_element[data-rash-annotation-id="${this.semanticAnnotation.id}"]`
    this.end_marker_selector = `.annotation_element[data-rash-annotation-id="${this.semanticAnnotation.id}"]`
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
      cssSelector += ` ${nodeName.toLowerCase()}`

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

//#region AnnotationRash

class AnnotationRash extends Annotation {

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

    const sideNoteElement = $(this.side_note_selector)
    if (sideNoteElement.length) {

      sideNoteElement.off('click')
      sideNoteElement.on('click', function () {
        AnnotationContext.showAnnotationFromAttribute($(instance.side_note_selector).attr('title'))
      })
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
  _setHoverEvents() {

    const instance = this

    if ($(this.side_note_selector).length)
      $(this.side_note_selector).on('mouseenter mouseleave', function () {
        AnnotationContext.highlightAnnotationFromAttribute($(instance.side_note_selector).attr('title'))
      })

    if ($(this.side_note_body_selector).length)
      $(this.side_note_body_selector).on('mouseenter mouseleave', function () {
        AnnotationContext.highlightAnnotationFromAttribute($(instance.side_note_body_selector).attr('data-rash-annotation-id'))
      })
  }

  /**
   * 
   */
  _addMarker() {

    // Save the elements
    this.startElement = $(this.startSelector.selector)
    this.endElement = $(this.endSelector.selector)

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
  }

  /**
   * 
   */
  /**
   * 
   */
  _addReply() {

    // Append the new annotation to its parent
    const parentSideNoteBody = $(this.getParentAnnotation().side_note_body_selector).first()

    const replyNoteElement = `<div data-rash-annotation-id="${this.semanticAnnotation.id}" class="side_note_body" ><hr/>${this._getAnnotationBody()}`
    parentSideNoteBody.find('.side_note_wrapper').append(replyNoteElement)
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
    const endMarker = $(this.end_marker_selector)[0]

    // Start from the next element of the starting marker and iterate until the endMarker is found
    let next = $(this.start_marker_selector)[0].nextSibling
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

      if (text.trim().length != 0) {

        text = text.replace(/"/g, '\\"')

        // If the element is a block element, wrap its content inside a wrapper
        if ($(node).is('p,:header'))
          $(node).html(`<span data-rash-original-parent-content="${text}" data-rash-annotation-index="${++index}" data-rash-annotation-type="wrap" title="#${this.semanticAnnotation.id}" data-rash-annotation-id="${this.semanticAnnotation.id}" class="cgen annotation_highlight">${$(text).html()}</span>`)

        // Or wrap its content in a note
        else
          $(node).replaceWith(`<span data-rash-original-content="${text.replace(/"/g, '&quot;')}" data-rash-annotation-index="${++index}" data-rash-annotation-type="wrap" title="#${this.semanticAnnotation.id}" data-rash-annotation-id="${this.semanticAnnotation.id}" class="cgen annotation_highlight">${text}</span>`)
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

      let nearAnnotations = []

      ANNOTATIONS.forEach(annotation => {
        if (Math.abs(top - annotation.top) < 100)
          nearAnnotations.push(annotation)
      })

      return nearAnnotations
    }

    this.coordinates = this._getCoordinates()

    // Get he average distance between the starting and the ending element
    this.top = (this.coordinates.start + this.coordinates.end) / 2

    let side_note

    // Check if there is another annotation
    let annotation = nearAnnotation(this.top)

    if (annotation.length) {

      annotation = annotation[0]

      side_note = $(`span.side_note[data-rash-annotation-id="${annotation.id}"]`)

      side_note.attr('title', `${side_note.attr('title')},${this.semanticAnnotation.id}`)
      side_note.text(parseInt(side_note.text(), 10) + parseInt(1, 10))

      this.top = annotation.top
    }

    // Create a new annotation in this way
    else {

      side_note = $(`<span style="top:${this.top}px" title="${this.semanticAnnotation.id}" data-rash-annotation-id="${this.semanticAnnotation.id}" class="btn btn-default cgen side_note">1</span>`)

      $(annotation_sidebar_selector).append(side_note)
    }

    // Create annotation body
    let side_note_body = $(`
      <div style="top:${this.top}px" class="cgen side_note_body" data-rash-annotation-id="${this.semanticAnnotation.id}">${this._getAnnotationBody()}</div>`)

    $(annotation_sidebar_selector).append(side_note_body)
  }

  /**
   * 
   */
  _removeMarkers() {

    // Remove markers only if they aren't a wrap (the same element)
    if (this.start_marker_selector != this.end_marker_selector) {
      $(this.start_marker_selector).remove()
      $(this.end_marker_selector).remove()
    }
  }

  /**
   * 
   */
  remove() {

    // Remove side note elements
    $(this.side_note_selector).remove()
    $(this.side_note_body_selector).remove()

    // Replace notes with content or parent content
    $(this.note_selector).each(function () {

      if ($(this).attr(data_rash_original_content))
        $(this).replaceWith($(this).attr(data_rash_original_content))

      else if ($(this).attr(data_rash_original_parent_content))
        $(this).parent().replaceWith($(this).attr(data_rash_original_parent_content))
    })
  }

  /**
   * 
   */
  removeAll() {
    this.remove()
    $(`script#${this.id}[type="application/ld+json"]`).remove()
  }

  /**
   * 
   */
  hide() {

    $(this.side_note_body_selector).removeClass(active_class)

    $(this.side_note_selector).toggleClass(hidden_class)
    $(this.note_selector).toggleClass(annotation_highlight_class)
  }

  /**
   * 
   * @param {*} start_selector 
   * @param {*} end_selector 
   */
  _getCoordinates() {

    let startRange = new Range()
    let endRange = new Range()

    startRange.selectNode($(this.start_marker_selector)[0])
    endRange.selectNode($(this.end_marker_selector)[0])

    startRange = startRange.getBoundingClientRect()
    endRange = endRange.getBoundingClientRect()

    const scroll = window.scrollY

    return {
      start: startRange.top + scroll,
      end: endRange.top + scroll
    }
  }

  /**
   * 
   */
  static render() {
    $(semantic_annotation_selector).each(function () {
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

    _analyzeContent($(path)[0])

    return offset
  }

  /**
   * 
   */
  static toggleAnnotationToolbar() {
    $(annotation_sidebar_selector).toggleClass(active_class)

    ANNOTATIONS.forEach(annotation => {
      $(annotation.side_note_body_selector).removeClass(active_class)
      $(annotation.side_note_body_selector).find(side_note_reply_selector).removeClass(active_class)
    })
  }

  /**
   * 
   */
  static toggleAnnotation() {

    $(annotation_sidebar_selector).removeClass(active_class)
    ANNOTATIONS.forEach(annotation => annotation.hide())
  }

  /**
   * 
   * @param {*} titleAttribute 
   */
  static highlightAnnotationFromAttribute(titleAttribute) {
    for (let id of titleAttribute)
      $(ANNOTATIONS.get(id).note_selector).toggleClass(selected_class)
  }

  /**
   * 
   * @param {*} titleAttribute 
   */
  static showAnnotationFromAttribute(titleAttribute) {
    for (let id of titleAttribute) {

      const sideNoteBodyElement = $(ANNOTATIONS.get(id).side_note_body_selector).first()

      sideNoteBodyElement.toggleClass(active_class)
    }
  }

  static initEvents() {

    $(toggle_annotation_selector).on('click', function () {
      AnnotationContext.toggleAnnotation()
    })

    $(toggle_sidebar_selector).on('click', function () {
      AnnotationContext.toggleAnnotationToolbar()
    })
  }
}

//#endregion


//#region AnnotationRaje class

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
  _getAnnotationBody() {

    return `
      <div class="side_note_wrapper">
        <i class="btnRemove glyphicon glyphicon-trash pull-right text-danger"></i>
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

        replyElement.find('textarea')[0].value = ''

        createAnnotationReplying(replayingText, parentAnnotationId)
      })
    }

    // Remove annotation
    const removeElement = tinymce.activeEditor.$(this.side_note_body_selector).find('.btnRemove')
    if (removeElement.length) {

      removeElement.off('click')
      removeElement.on('click', function () {

        tinymce.activeEditor.undoManager.transact(function () {

          const side_note_body_selector = '.side_note_body'
          const data_rash_annotation_id = 'data-rash-annotation-id'

          const currentSideNoteBody = tinymce.activeEditor.$(instance.side_note_body_selector).first()

          // Confirm delete
          if (confirm('Confirm annotation delete?')) {

            // Get the parent sideNote id
            const parentSideNoteId = currentSideNoteBody.parents(side_note_body_selector).first().attr(data_rash_annotation_id)

            // Check if the current sidenote has children annotation
            if (currentSideNoteBody.find(side_note_body_selector).length) {

              const childSideNoteId = currentSideNoteBody.find(side_note_body_selector).first().attr(data_rash_annotation_id)

              // Update annotation target
              ANNOTATIONS.get(childSideNoteId).semanticAnnotation.target = parentSideNoteId

              ANNOTATIONS.get(childSideNoteId).updateScript()

              let parent = tinymce.activeEditor.$(ANNOTATIONS.get(parentSideNoteId).side_note_body_selector).first()
              let child = tinymce.activeEditor.$(ANNOTATIONS.get(childSideNoteId).side_note_body_selector).first()

              // Append child node to parent node
              parent.append(child)
            }

            instance.removeAll()

            currentSideNoteBody.parents(side_note_body_selector).first().find(side_note_reply_selector).last().addClass(active_class)

            if (instance.semanticAnnotation.Motivation == commenting)
              AnnotationContext.toggleAnnotationToolbar()
          }
        })
      })
    }
  }

  /**
   * 
   */
  _setHoverEvents() {

    const instance = this

    if (tinymce.activeEditor.$(this.side_note_selector).length) {
      tinymce.activeEditor.$(this.side_note_selector).on('mouseenter', function () {
        AnnotationContext.highlightAnnotationFromAttribute(tinymce.activeEditor.$(instance.side_note_selector).attr('title'))
      })
      tinymce.activeEditor.$(this.side_note_selector).on('mouseleave', function () {
        AnnotationContext.NormalizeAnnotationFromAttribute(tinymce.activeEditor.$(instance.side_note_selector).attr('title'))
      })
    }

    if (tinymce.activeEditor.$(this.side_note_body_selector).length) {
      tinymce.activeEditor.$(this.side_note_body_selector).on('mouseenter', function () {
        AnnotationContext.highlightAnnotationFromAttribute(tinymce.activeEditor.$(instance.side_note_body_selector).attr('data-rash-annotation-id'))
      })
      tinymce.activeEditor.$(this.side_note_body_selector).on('mouseleave', function () {
        AnnotationContext.NormalizeAnnotationFromAttribute(tinymce.activeEditor.$(instance.side_note_body_selector).attr('data-rash-annotation-id'))
      })
    }
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
          $(node).replaceWith(`<span data-rash-original-content="${text.replace(/"/g, '&quot;')}" data-rash-annotation-index="${++index}" data-rash-annotation-type="wrap" title="#${this.semanticAnnotation.id}" data-rash-annotation-id="${this.semanticAnnotation.id}" class="cgen annotation_highlight">${text}</span>`)
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

      let nearAnnotations = []

      ANNOTATIONS.forEach(annotation => {
        if (Math.abs(top - annotation.top) < 100)
          nearAnnotations.push(annotation)
      })

      return nearAnnotations
    }

    this.coordinates = this._getCoordinates()

    // Get he average distance between the starting and the ending element
    this.top = (this.coordinates.start + this.coordinates.end) / 2

    let side_note

    // Check if there is another annotation
    let annotation = nearAnnotation(this.top)

    if (annotation.length) {

      annotation = annotation[0]

      side_note = tinymce.activeEditor.$(`span.side_note[data-rash-annotation-id="${annotation.id}"]`)

      side_note.attr('title', `${side_note.attr('title')},${this.semanticAnnotation.id}`)
      side_note.text(parseInt(side_note.text(), 10) + parseInt(1, 10))

      this.side_note_selector = annotation.side_note_selector

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

    // Remove markers only if they aren't a wrap (the same element)
    if (this.start_marker_selector != this.end_marker_selector) {
      tinymce.activeEditor.$(this.start_marker_selector).remove()
      tinymce.activeEditor.$(this.end_marker_selector).remove()
    }
  }

  updateScript() {
    tinymce.activeEditor.$(this.script_selector).html(JSON.stringify(this.semanticAnnotation, null, 2))
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

    startRange = startRange.getBoundingClientRect()
    endRange = endRange.getBoundingClientRect()

    const scroll = tinymce.DOM.getViewPort(tinymce.activeEditor.getWin()).y

    return {
      start: startRange.top + scroll,
      end: endRange.top + scroll
    }
  }

  /**
   * 
   */
  remove() {


    const tmp = tinymce.activeEditor.$(this.side_note_selector).first()

    let titleList = tmp.attr('title')
    titleList = titleList.split(',')

    if (titleList.length == 1)
      // Remove side note elements
      tinymce.activeEditor.$(this.side_note_selector).remove()

    else {

      for (let i = 0; i < titleList.length; i++)
        if (titleList[i] == this.id)
          //remove this element from array
          titleList.splice(i, 1)

      tinymce.activeEditor.$(this.side_note_selector).attr('title', titleList.join(','))

      //Update text

      let text = tinymce.activeEditor.$(this.side_note_selector).text()

      text = parseInt(text) - 1

      tinymce.activeEditor.$(this.side_note_selector).text(text)
    }


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
  removeAll() {
    this.remove()
    tinymce.activeEditor.$(`script#${this.id}[type="application/ld+json"]`).remove()
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
    const _analyzeContent = node => {

      do {

        if (node.nodeType == 1) {

          // If the element is the svg formula
          if ($(node).is('svg[data-math-original-input]'))
            minOffset += $(node).attr('data-math-original-input').length

          // Or do the normal behaviour
          else
            _analyzeContent(node.firstChild)
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

        node = node.nextSibling

        if (found)
          break
      }
      while (node != null)
    }

    let minOffset = 0
    let found = false

    _analyzeContent(tinymce.activeEditor.$(path)[0])

    return offset
  }

  /**
   * 
   */
  static toggleAnnotationToolbar() {
    tinymce.activeEditor.$(annotation_sidebar_selector).toggleClass(active_class)

    ANNOTATIONS.forEach(annotation => {
      tinymce.activeEditor.$(annotation.side_note_body_selector).removeClass(active_class)
      tinymce.activeEditor.$(annotation.side_note_body_selector).find(side_note_reply_selector).removeClass(active_class)
    })
  }

  /**
   * 
   */
  static toggleAnnotation() {

    tinymce.activeEditor.$(annotation_sidebar_selector).removeClass(active_class)
    ANNOTATIONS.forEach(annotation => annotation.hide())
  }

  /**
   * 
   * @param {*} titleAttribute 
   */
  static highlightAnnotationFromAttribute(titleAttribute) {
    for (let id of titleAttribute)
      tinymce.activeEditor.$(ANNOTATIONS.get(id).note_selector).addClass(selected_class)
  }

  /**
   * 
   * @param {*} titleAttribute 
   */
  static NormalizeAnnotationFromAttribute(titleAttribute) {
    for (let id of titleAttribute)
      tinymce.activeEditor.$(ANNOTATIONS.get(id).note_selector).removeClass(selected_class)
  }

  /**
   * 
   * @param {*} titleAttribute 
   */
  static showAnnotationFromAttribute(titleAttribute) {
    for (let id of titleAttribute) {

      const sideNoteBodyElement = tinymce.activeEditor.$(ANNOTATIONS.get(id).side_note_body_selector).first()

      sideNoteBodyElement.toggleClass(active_class)
      sideNoteBodyElement.find(side_note_reply_selector).last().addClass(active_class)
    }
  }
}

//#endregion

//#endregion
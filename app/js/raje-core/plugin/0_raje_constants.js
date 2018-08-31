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

//#endregion

const NON_EDITABLE_HEADER_SELECTOR = 'header.page-header.container.cgen'
const BIBLIOENTRY_SUFFIX = 'biblioentry_'
const ENDNOTE_SUFFIX = 'endnote_'


const ABSTRACT_SELECTOR = 'section[role=doc-abstract]'
const ACKNOWLEDGEMENTS_SELECTOR = 'section[role=doc-acknowledgements]'



const MENU_SELECTOR = 'div[id^=mceu_][id$=-body][role=menu]'

const DATA_UPGRADE = 'data-upgrade'
const DATA_DOWNGRADE = 'data-downgrade'





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


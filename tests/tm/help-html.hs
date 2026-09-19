; SYNTAX TEST v1 "text.hs" "embedded HTML scopes"

%inst
; <- markup.heading.hs
html{
; <- keyword.hs
<div>
;^^^ entity.name.tag.html
}html
; <- keyword.hs

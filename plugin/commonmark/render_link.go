package commonmark

import (
	"bytes"
	"net/url"
	"strings"

	"github.com/JohannesKaufmann/dom"
	"github.com/JohannesKaufmann/html-to-markdown/v2/converter"
	"github.com/JohannesKaufmann/html-to-markdown/v2/internal/textutils"
	"golang.org/x/net/html"
)

// link in commonmark contains
// - the link text (the visible text)
// - a link destination (the URI that is the link destination)
// - an optional link title
type link struct {
	*html.Node

	before  []byte
	content []byte
	after   []byte

	href  string
	title string
}

func (c *commonmark) renderLinkInlined(w converter.Writer, l *link) converter.RenderStatus {

	w.Write(l.before)
	w.WriteRune('[')
	w.Write(l.content)
	w.WriteRune(']')
	w.WriteRune('(')
	w.WriteString(l.href)
	if l.title != "" {
		// The destination and title must be separated by a space
		w.WriteRune(' ')
		w.Write(textutils.SurroundByQuotes([]byte(l.title)))
	}
	w.WriteRune(')')
	w.Write(l.after)

	return converter.RenderSuccess
}

func directImageChild(n *html.Node) *html.Node {
	var image *html.Node

	for child := n.FirstChild; child != nil; child = child.NextSibling {
		switch child.Type {
		case html.TextNode:
			if strings.TrimSpace(child.Data) != "" {
				return nil
			}
		case html.ElementNode:
			if child.Data != "img" || image != nil {
				return nil
			}
			image = child
		}
	}

	return image
}

func normalizeBloggerImageURL(raw string) (string, bool) {
	parsed, err := url.Parse(strings.TrimSpace(raw))
	if err != nil {
		return "", false
	}

	if !strings.EqualFold(parsed.Hostname(), "blogger.googleusercontent.com") {
		return "", false
	}

	parsed.RawQuery = ""
	parsed.Fragment = ""

	lastSlash := strings.LastIndex(parsed.Path, "/")
	if lastSlash >= 0 {
		lastSegment := parsed.Path[lastSlash+1:]
		if suffixStart := strings.Index(lastSegment, "="); suffixStart >= 0 {
			parsed.Path = parsed.Path[:lastSlash+1] + lastSegment[:suffixStart]
		}
	}

	return parsed.String(), true
}

func (c *commonmark) shouldRenderBloggerImageOnly(n *html.Node) bool {
	if !c.config.BloggerImageSupport {
		return false
	}

	image := directImageChild(n)
	if image == nil {
		return false
	}

	href := dom.GetAttributeOr(n, "href", "")
	src := dom.GetAttributeOr(image, "src", "")

	normalizedHref, okHref := normalizeBloggerImageURL(href)
	normalizedSrc, okSrc := normalizeBloggerImageURL(src)

	return okHref && okSrc && normalizedHref == normalizedSrc
}

func (c *commonmark) renderLink(ctx converter.Context, w converter.Writer, n *html.Node) converter.RenderStatus {
	if c.shouldRenderBloggerImageOnly(n) {
		image := directImageChild(n)
		if image != nil {
			return c.renderImage(ctx, w, image)
		}
	}

	ctx = ctx.WithValue("is_inside_link", true)

	href := dom.GetAttributeOr(n, "href", "")

	href = strings.TrimSpace(href)
	href = ctx.AssembleAbsoluteURL(ctx, "a", href)

	if href == "" && c.config.LinkEmptyHrefBehavior == LinkBehaviorSkip {
		// There is *no href* for the link. Now we have two options:
		// Continue rendering as a link OR skip to let other renderers take over.
		return converter.RenderTryNext
	}

	title := dom.GetAttributeOr(n, "title", "")
	title = strings.ReplaceAll(title, "\n", " ")

	l := &link{
		Node:  n,
		href:  href,
		title: title,
	}

	var buf bytes.Buffer
	ctx.RenderChildNodes(ctx, &buf, n)
	content := buf.Bytes()

	if len(bytes.TrimSpace(content)) == 0 && c.config.LinkEmptyContentBehavior == LinkBehaviorSkip {
		// There is *no content* inside the link. Now we have two options:
		// Continue rendering as a link OR skip to let other renderers take over.
		return converter.RenderTryNext
	}

	if l.href == "" {
		// A link without href is valid, like e.g. [text]()
		// But a title would make it invalid.
		l.title = ""
	}

	leftExtra, trimmed, rightExtra := textutils.SurroundingSpaces(content)

	// Note: We don't want to use `TrimUnnecessaryHardLineBreaks` here,
	// since `EscapeMultiLine` also takes care of newlines.
	trimmed = textutils.TrimConsecutiveNewlines(trimmed)
	trimmed = textutils.EscapeMultiLine(trimmed)

	l.before = leftExtra
	l.content = trimmed
	l.after = rightExtra

	switch c.LinkStyle {
	case LinkStyleInlined:
		return c.renderLinkInlined(w, l)
	default:
		return converter.RenderTryNext
	}
}

# Accessibility Standards (WCAG 2.2 AA)

This site targets WCAG 2.2 Level AA compliance.

## Quick Reference

### Interactive Elements

**Buttons and Links**
- All buttons need descriptive text or `aria-label`
- Links should describe their destination (avoid "click here")
- Focus styles: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500`
- Touch targets: minimum 24x24px (use padding if visual element is smaller)

**Forms**
- Every input needs a `<label>` with `htmlFor` matching the input's `id`
- Group related inputs with `<fieldset>` and `<legend>`
- Error messages should be associated with inputs via `aria-describedby`

**Expandable Content (Accordions, Menus)**
```tsx
<button
  aria-expanded={isOpen}
  aria-controls="content-id"
>
  Toggle
</button>
<div id="content-id" hidden={!isOpen}>
  Content here
</div>
```

### Images

**Meaningful Images**
```tsx
<img src="..." alt="Descriptive text explaining the image content" />
```

**Decorative Images**
```tsx
<img src="..." alt="" />
```

**Icons and Emojis**
```tsx
// Decorative - hide from screen readers
<span aria-hidden="true">...</span>
<svg aria-hidden="true">...</svg>

// Meaningful - provide label
<svg aria-label="Settings" role="img">...</svg>
```

### Text and Color

**Color Contrast**
- Normal text: 4.5:1 minimum (use `text-brand-700` for links, not brand-600)
- Large text (18pt+ or 14pt+ bold): 3:1 minimum
- UI components: 3:1 minimum

**Don't Rely on Color Alone**
- Add text labels, icons, or patterns alongside color indicators
- Example: Error states should have text, not just red color

### Navigation

**Skip Link** (implement in PublicLayout)
```tsx
<a href="#main-content" className="sr-only focus:not-sr-only ...">
  Skip to main content
</a>
```

**Landmark Regions**
- Use `<header>`, `<main>`, `<footer>`, `<nav>`, `<section>`
- Add `aria-label` when multiple of same landmark exist:
  ```tsx
  <nav aria-label="Main navigation">...</nav>
  <nav aria-label="Footer navigation">...</nav>
  ```

### Semantic HTML

**Headings**
- One `<h1>` per page
- Don't skip levels (h1 -> h2 -> h3, not h1 -> h3)
- Use headings for structure, not styling

**Lists**
- Use `<ul>` or `<ol>` for lists of items
- Use `<dl>` for key-value pairs

## Testing Checklist

Before deploying new pages/components:

1. **Keyboard test**: Tab through entire page, verify all interactive elements are reachable
2. **Focus visible**: Can you see where focus is at all times?
3. **Screen reader**: Test with NVDA (Windows) or VoiceOver (Mac)
4. **Zoom test**: Site usable at 200% browser zoom
5. **Automated**: Run axe DevTools browser extension

## Common Patterns in This Codebase

| Pattern | Location | Notes |
|---------|----------|-------|
| Skip link | `PublicLayout.tsx` | To be implemented |
| Story filters | `StoryFilters.tsx` | To be implemented — use fieldset/legend |
| Admin sidebar | `AdminLayout.tsx` | To be implemented — keyboard navigable |
| Story list | `StoryList.tsx` | To be implemented — use semantic table or list |
| Focus styles | All interactive elements | `focus-visible:ring-2` |

## Resources

- [WCAG 2.2 Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

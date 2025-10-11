# Edit Mode - User Guide

## Overview
Edit mode allows you to edit shoe data while previewing the source webpage in a split-screen view.

## How to Use

### 1. Selecting a Row
- **Single click** on any table row → Row becomes highlighted in **blue**
- Click another row to change selection

### 2. Entering Edit Mode
- **Double-click** on the **already selected** (blue) row
- Edit mode will activate automatically

### 3. Edit Mode Interface

**Top Section (15% height):**
- Edit form with all shoe fields:
  - Brand, Model, Use, Surface
  - Stack measurements (Heel, Forefoot, Drop)
  - Weight, Price
  - Features (Carbon Plate, Waterproof, Cushioning, Width, Breathability)
  - Source Link
- **Save** button - saves changes to database
- **Cancel** button - exits without saving

**Bottom Section (85% height):**
- Live preview of the source webpage (from Link field)
- Fully interactive (scrolling, clicking works)
- Use **Ctrl+F** (Windows) or **Cmd+F** (Mac) to search on the page
- If page cannot be loaded in iframe, "Open in New Tab" button appears

### 4. Saving Changes
1. Edit the fields you want to change
2. Click **Save** button
3. Changes are saved to database
4. Automatically returns to table view
5. Updated row will reflect new data

### 5. Canceling
- Click **Cancel** to exit without saving
- Returns to normal table view
- No changes are applied

## Features

### Field Validation
- Brand and Model are required
- Numeric fields accept only numbers
- Boolean fields have Yes/No/— options
- Dropdown fields have predefined values

### Link Preview
- Updates in real-time when you change the Link field
- Handles iframe loading errors gracefully
- Provides fallback "Open in New Tab" option

### Visual Feedback
- Selected row: **Blue background**
- Hover state: Lighter blue for selected, gray for others
- Saving state: "Saving..." text on button
- Error messages: Red alert box if save fails

## Keyboard Shortcuts

- **Ctrl+F / Cmd+F** - Search in preview page (when iframe is focused)
- **Esc** - (future) Quick cancel edit mode
- **Ctrl+S / Cmd+S** - (future) Quick save

## Technical Notes

### API Endpoint
- `PATCH /api/shoes/[id]` - Updates shoe data
- Returns updated record on success
- Returns error message on failure

### Security
- iframe uses `sandbox` attribute for safety
- Only allowed fields can be updated
- Service role key used for database updates

### Limitations
- Some websites block iframe embedding (X-Frame-Options)
- CORS policies may prevent loading certain pages
- Use "Open in New Tab" fallback for such cases

## Troubleshooting

**Issue: Row won't enter edit mode**
- Solution: Make sure row is selected (blue) before double-clicking

**Issue: Preview not loading**
- Solution: Check if Link URL is valid
- Solution: Click "Open in New Tab" to view externally

**Issue: Save fails**
- Solution: Check browser console for errors
- Solution: Ensure Brand and Model fields are filled
- Solution: Check database connection

**Issue: Changes not appearing**
- Solution: Refresh the page to reload data
- Solution: Check if filters are hiding the updated row

## File Structure

```
web-app/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── shoes/
│   │   │       └── [id]/
│   │   │           └── route.ts          # Update API
│   │   └── search/
│   │       └── page.tsx                  # Main page with edit logic
│   └── components/
│       └── EditMode.tsx                  # Edit mode component
```

## Future Enhancements

- [ ] Keyboard shortcuts (Esc to cancel, Ctrl+S to save)
- [ ] Undo/Redo functionality
- [ ] Bulk edit mode (edit multiple rows)
- [ ] History/audit log of changes
- [ ] Field auto-complete suggestions
- [ ] Preview tabs (switch between multiple sources)

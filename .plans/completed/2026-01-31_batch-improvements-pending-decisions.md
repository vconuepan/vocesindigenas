# User Feedback Needed

Items that require user input or pending database migrations from the improvement plans batch.

## Pending Database Migrations

_(Migrations that need to be applied and consolidated with Prisma)_

### Imp-04: Database Indexes
Added `@@index` directives to `schema.prisma` for Story and RefreshToken models. A migration needs to be generated and applied:
- `Story`: `[status, dateCrawled]`, `[feedId]`, `[status, relevancePre]`, `[status, relevance]`, `[datePublished]`
- `RefreshToken`: `[expiresAt]`

## Skipped Plans (Need User Input)

_(Plans that were skipped because they require user decisions)_

## Notes from Implemented Plans

_(Any notes or questions from plans that were implemented but have follow-up items)_

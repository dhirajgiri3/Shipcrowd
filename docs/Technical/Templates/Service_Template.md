# Service Documentation Template

## Service Overview

| Property | Value |
|----------|-------|
| **Name** | ServiceName |
| **Path** | `src/core/application/services/domain/service.ts` |
| **Layer** | Application / Domain / Infrastructure |
| **Dependencies** | List dependencies |

## Purpose

Brief description of the service's responsibility and when to use it.

---

## Methods

### `methodName(params): ReturnType`

**Description:** What this method does.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `param1` | string | Yes | Description |
| `param2` | number | No | Description |

**Returns:** `Promise<ReturnType>`

**Throws:**
- `AppError(404)` - When resource not found
- `AppError(400)` - When validation fails

**Example:**

```typescript
const result = await service.methodName({
  param1: 'value',
  param2: 123,
});
```

---

### `anotherMethod(params): ReturnType`

**Description:** What this method does.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|

**Returns:** `Promise<ReturnType>`

**Example:**

```typescript
// Example usage
```

---

## Business Rules

### Rule 1: [Name]

- Condition: When X happens
- Action: Do Y
- Reason: Because of Z

### Rule 2: [Name]

- Condition: When X happens
- Action: Do Y
- Reason: Because of Z

---

## Validation

| Field | Rule | Error Message |
|-------|------|---------------|
| `email` | Valid email format | "Invalid email format" |
| `amount` | Greater than 0 | "Amount must be positive" |

---

## Error Handling

### Expected Errors

| Error | Code | Condition | Recovery |
|-------|------|-----------|----------|
| Not Found | 404 | Resource doesn't exist | Inform user |
| Validation | 400 | Invalid input | Show field errors |

### Edge Cases

1. **Concurrent Updates:** Handle with optimistic locking
2. **Timeout:** Retry with exponential backoff
3. **Partial Failure:** Rollback transaction

---

## Testing

### Unit Tests

```typescript
describe('ServiceName', () => {
  describe('methodName', () => {
    it('should do X when Y', async () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

### Test Coverage Requirements

- [ ] Happy path tested
- [ ] Error cases tested
- [ ] Edge cases tested
- [ ] Integration points mocked

---

## Dependencies

### Internal

| Service | Purpose |
|---------|---------|
| UserService | User lookups |
| NotificationService | Sending emails |

### External

| Service | Purpose | Mock Available |
|---------|---------|----------------|
| VelocityShipfast | Courier API | Yes |
| Razorpay | Payments | Yes |

---

## Performance Considerations

- **Database Queries:** Indexed on commonly queried fields
- **Caching:** Consider Redis for frequently accessed data
- **Batch Operations:** Process in chunks of 100

---

## Security

- [ ] Input validated
- [ ] Authorization checked
- [ ] Sensitive data masked in logs
- [ ] Rate limiting applied

---

## Future Improvements

- [ ] Add caching layer
- [ ] Implement batch processing
- [ ] Add retry logic

---

**Last Updated:** YYYY-MM-DD  
**Maintainer:** Development Team

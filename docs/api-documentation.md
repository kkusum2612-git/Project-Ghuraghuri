# Ghuraghuri Internal API

## Base URL

Local development:

`http://localhost:5000/api/v1`

## Success Response

```json
{
  "success": true,
  "message": "Operation completed successfully.",
  "data": {}
}
```

## Error Response

```json
{
  "success": false,
  "message": "Operation could not be completed.",
  "errors": []
}
```

## Initial Endpoint

### Check API Health

`GET /health`

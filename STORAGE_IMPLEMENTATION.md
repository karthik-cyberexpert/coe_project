# Local Filesystem Storage Implementation

## Overview

This document describes the local filesystem storage implementation that replaces Supabase Storage. Files are stored on the local filesystem and accessed through REST API endpoints, maintaining API compatibility with the original Supabase storage interface.

## Architecture

### Backend Components

#### 1. Storage Directory Structure
- **Base Directory**: `migration/backend/storage/sheets/`
- Files are organized within this directory structure
- Directory is automatically created on server startup

#### 2. Storage API Endpoints

All endpoints require authentication via JWT Bearer token.

##### **POST /api/storage/upload**
Upload a new file to the storage.

**Request**:
- Method: `POST`
- Content-Type: `multipart/form-data`
- Headers: `Authorization: Bearer <token>`
- Body:
  - `file`: File/Blob to upload
  - `path`: Target path relative to storage directory

**Response**:
```json
{
  "message": "File uploaded successfully",
  "path": "relative/path/to/file.xlsx",
  "size": 12345
}
```

##### **POST /api/storage/update**
Update (overwrite) an existing file.

**Request**:
- Method: `POST`
- Content-Type: `multipart/form-data`
- Headers: `Authorization: Bearer <token>`
- Body:
  - `file`: New file content
  - `path`: Path to existing file

**Response**:
```json
{
  "message": "File updated successfully",
  "path": "relative/path/to/file.xlsx",
  "size": 12345
}
```

##### **GET /api/storage/download**
Download a file from storage.

**Request**:
- Method: `GET`
- Headers: `Authorization: Bearer <token>`
- Query Parameters:
  - `path`: File path to download

**Response**: Binary file content

##### **DELETE /api/storage/remove**
Delete a file from storage.

**Request**:
- Method: `DELETE`
- Headers: `Authorization: Bearer <token>`
- Query Parameters:
  - `path`: File path to delete

**Response**:
```json
{
  "message": "File deleted successfully"
}
```

##### **GET /api/storage/list**
List files in a directory.

**Request**:
- Method: `GET`
- Headers: `Authorization: Bearer <token>`
- Query Parameters:
  - `path`: Directory path (optional, defaults to root)

**Response**:
```json
{
  "files": [
    {
      "name": "file.xlsx",
      "path": "relative/path/file.xlsx",
      "isDirectory": false,
      "size": 12345,
      "modified": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### 3. Security Features

- **Authentication**: All endpoints require valid JWT token
- **Path Sanitization**: Prevents directory traversal attacks
  - Paths are normalized to remove `../` sequences
  - Resolved paths must be within the storage directory
- **File Size Limit**: 50MB per file (configurable via multer)
- **Authorization**: Uses existing JWT auth middleware

### Frontend Components

#### MySQL Client Adapter

The storage methods in `src/lib/mysqlClient.ts` have been fully implemented to call the backend endpoints:

```typescript
const storage = {
  from(bucket: string) {
    return {
      download(path: string): Promise<{ data: Blob | null; error: Error | null }>
      upload(path: string, file: File | Blob, options?: any): Promise<{ data: any; error: Error | null }>
      update(path: string, file: File | Blob, options?: any): Promise<{ data: any; error: Error | null }>
      remove(paths: string[]): Promise<{ data: any; error: Error | null }>
      list(path?: string, options?: any): Promise<{ data: any[]; error: Error | null }>
    }
  }
}
```

**API Compatibility**: The frontend storage API matches Supabase's interface, so existing code using `supabase.storage.from('sheets')` will work with `mysqlClient.storage.from('sheets')` without changes.

## Usage Examples

### Uploading a File

```typescript
const file = document.querySelector('input[type="file"]').files[0];
const { data, error } = await mysqlClient.storage
  .from('sheets')
  .upload('department/subject/file.xlsx', file);

if (error) {
  console.error('Upload failed:', error);
} else {
  console.log('File uploaded:', data);
}
```

### Downloading a File

```typescript
const { data, error } = await mysqlClient.storage
  .from('sheets')
  .download('department/subject/file.xlsx');

if (error) {
  console.error('Download failed:', error);
} else {
  // data is a Blob
  const url = URL.createObjectURL(data);
  // Use url for download link or display
}
```

### Updating a File

```typescript
const file = document.querySelector('input[type="file"]').files[0];
const { data, error } = await mysqlClient.storage
  .from('sheets')
  .update('department/subject/file.xlsx', file);
```

### Deleting Files

```typescript
const { data, error } = await mysqlClient.storage
  .from('sheets')
  .remove(['department/subject/file1.xlsx', 'department/subject/file2.xlsx']);
```

### Listing Files

```typescript
const { data, error } = await mysqlClient.storage
  .from('sheets')
  .list('department/subject');

if (!error) {
  data.forEach(file => {
    console.log(file.name, file.size, file.modified);
  });
}
```

## Implementation Details

### Backend (server.js)

1. **Multer Configuration**:
   - Uses memory storage (files buffered in memory)
   - 50MB file size limit
   - File content written manually to disk after validation

2. **Path Sanitization**:
   ```javascript
   const sanitizePath = (filePath) => {
     const normalized = path.normalize(filePath).replace(/^(\.\.[\\/])+/, '');
     const fullPath = path.join(STORAGE_DIR, normalized);
     if (!fullPath.startsWith(STORAGE_DIR)) {
       throw new Error('Invalid file path');
     }
     return fullPath;
   };
   ```

3. **Authentication**:
   - All endpoints use `authenticateToken` middleware
   - Token extracted from `Authorization: Bearer <token>` header
   - Invalid or expired tokens return 401 Unauthorized

### Frontend (mysqlClient.ts)

1. **File Upload/Update**:
   - Uses `FormData` to send files
   - Token automatically included in headers
   - Returns upload metadata

2. **File Download**:
   - Fetches file as `Blob`
   - Can be used with `URL.createObjectURL()` for display or download

3. **File Deletion**:
   - Processes multiple files sequentially
   - Returns on first error encountered

4. **Directory Listing**:
   - Returns array of file/directory metadata
   - Includes name, path, size, modified time, and isDirectory flag

## Storage Directory Structure

```
migration/backend/storage/sheets/
├── department1/
│   ├── subject1/
│   │   ├── sheet1.xlsx
│   │   └── sheet2.xlsx
│   └── subject2/
│       └── sheet3.xlsx
└── department2/
    └── subject3/
        └── sheet4.xlsx
```

## Migration Notes

1. **Existing Code**: Frontend code using `supabase.storage` should be updated to use `mysqlClient.storage`
2. **Bucket Names**: Bucket parameter (`bucket`) is accepted but not used—all files stored in same base directory
3. **File Paths**: Should use forward slashes (`/`) for consistency across platforms
4. **Storage Location**: Files stored in `migration/backend/storage/sheets/` by default

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Error message describing the issue",
  "details": "Optional additional error information"
}
```

Common error status codes:
- `400`: Bad request (missing file, invalid path)
- `401`: Unauthorized (no token or invalid token)
- `404`: File or directory not found
- `500`: Internal server error

## Future Enhancements

Possible improvements for future versions:

1. **Streaming**: Large file uploads/downloads using streaming instead of buffering
2. **File Versioning**: Keep historical versions of files
3. **Metadata Storage**: Store custom metadata for files in database
4. **Quota Management**: Per-user or per-department storage quotas
5. **Compression**: Automatic compression for eligible file types
6. **CDN Integration**: Optional CDN for public file serving
7. **Backup**: Automated backup of storage directory
8. **Cleanup**: Scheduled cleanup of orphaned files not referenced in database

## Testing

### Manual Testing with cURL

```bash
# Upload file
curl -X POST http://localhost:3001/api/storage/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test.xlsx" \
  -F "path=test/test.xlsx"

# Download file
curl http://localhost:3001/api/storage/download?path=test/test.xlsx \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o downloaded.xlsx

# List files
curl http://localhost:3001/api/storage/list?path=test \
  -H "Authorization: Bearer YOUR_TOKEN"

# Delete file
curl -X DELETE "http://localhost:3001/api/storage/remove?path=test/test.xlsx" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Automated Testing

Add tests for storage endpoints in `migration/backend/tests/storage.test.js`:

```javascript
describe('Storage Endpoints', () => {
  test('should upload file', async () => {
    // Test implementation
  });
  
  test('should download file', async () => {
    // Test implementation
  });
  
  test('should prevent directory traversal', async () => {
    // Test implementation
  });
});
```

## Deployment Considerations

1. **File Permissions**: Ensure storage directory has proper read/write permissions
2. **Disk Space**: Monitor available disk space for storage directory
3. **Backup**: Include storage directory in backup procedures
4. **Scaling**: Consider external storage (S3, Azure Blob) for production scaling
5. **HTTPS**: Use HTTPS in production for secure file transfers

## Summary

The local filesystem storage implementation provides a complete replacement for Supabase Storage with:

- ✅ Full CRUD operations (Create, Read, Update, Delete)
- ✅ Directory listing
- ✅ JWT authentication
- ✅ Path security (anti-traversal)
- ✅ File size limits
- ✅ API compatibility with Supabase storage interface
- ✅ Multipart file upload support

The implementation is production-ready for local/on-premise deployments and can be extended with additional features as needed.


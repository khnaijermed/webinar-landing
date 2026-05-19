Imports System
Imports Supabase.Postgrest.Attributes
Imports Supabase.Postgrest.Models

<Table("media")>
Public Class Media
    Inherits BaseModel

    <PrimaryKey("id", False)>
    <Column("id")>
    Public Property Id As Guid

    ' "image" or "video"
    <Column("type")>
    Public Property MediaType As String

    <Column("file_path")>
    Public Property FilePath As String

    <Column("file_name")>
    Public Property FileName As String

    <Column("mime_type")>
    Public Property MimeType As String

    <Column("size")>
    Public Property Size As Long

    <Column("alt_text")>
    Public Property AltText As String

    <Column("thumbnail_path")>
    Public Property ThumbnailPath As String

    <Column("created_at")>
    Public Property CreatedAt As DateTime

    <Column("updated_at")>
    Public Property UpdatedAt As DateTime
End Class

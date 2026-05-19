Imports System
Imports Supabase.Postgrest.Attributes
Imports Supabase.Postgrest.Models

<Table("sections")>
Public Class Section
    Inherits BaseModel

    <PrimaryKey("id", False)>
    <Column("id")>
    Public Property Id As Guid

    <Column("page_id")>
    Public Property PageId As Guid

    <Column("section_key")>
    Public Property SectionKey As String

    <Column("title")>
    Public Property Title As String

    <Column("subtitle")>
    Public Property Subtitle As String

    <Column("content")>
    Public Property Content As String

    <Column("image_id")>
    Public Property ImageId As Nullable(Of Guid)

    <Column("video_id")>
    Public Property VideoId As Nullable(Of Guid)

    <Column("button_text")>
    Public Property ButtonText As String

    <Column("button_link")>
    Public Property ButtonLink As String

    <Column("sort_order")>
    Public Property SortOrder As Integer

    <Column("is_active")>
    Public Property IsActive As Boolean

    <Column("created_at")>
    Public Property CreatedAt As DateTime

    <Column("updated_at")>
    Public Property UpdatedAt As DateTime
End Class

Imports System
Imports Supabase.Postgrest.Attributes
Imports Supabase.Postgrest.Models

<Table("pages")>
Public Class Page
    Inherits BaseModel

    <PrimaryKey("id", False)>
    <Column("id")>
    Public Property Id As Guid

    <Column("slug")>
    Public Property Slug As String

    <Column("title")>
    Public Property Title As String

    <Column("meta_description")>
    Public Property MetaDescription As String

    <Column("is_active")>
    Public Property IsActive As Boolean

    <Column("created_at")>
    Public Property CreatedAt As DateTime

    <Column("updated_at")>
    Public Property UpdatedAt As DateTime
End Class

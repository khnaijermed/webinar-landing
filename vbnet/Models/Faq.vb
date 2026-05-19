Imports System
Imports Supabase.Postgrest.Attributes
Imports Supabase.Postgrest.Models

<Table("faqs")>
Public Class Faq
    Inherits BaseModel

    <PrimaryKey("id", False)>
    <Column("id")>
    Public Property Id As Guid

    <Column("question")>
    Public Property Question As String

    <Column("answer")>
    Public Property Answer As String

    <Column("sort_order")>
    Public Property SortOrder As Integer

    <Column("is_active")>
    Public Property IsActive As Boolean

    <Column("created_at")>
    Public Property CreatedAt As DateTime

    <Column("updated_at")>
    Public Property UpdatedAt As DateTime
End Class

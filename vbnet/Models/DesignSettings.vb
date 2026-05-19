Imports System
Imports Supabase.Postgrest.Attributes
Imports Supabase.Postgrest.Models

<Table("design_settings")>
Public Class DesignSettings
    Inherits BaseModel

    <PrimaryKey("id", False)>
    <Column("id")>
    Public Property Id As Guid

    <Column("primary_color")>
    Public Property PrimaryColor As String

    <Column("secondary_color")>
    Public Property SecondaryColor As String

    <Column("background_color")>
    Public Property BackgroundColor As String

    <Column("section_background")>
    Public Property SectionBackground As String

    <Column("card_background")>
    Public Property CardBackground As String

    <Column("text_color")>
    Public Property TextColor As String

    <Column("heading_color")>
    Public Property HeadingColor As String

    <Column("border_color")>
    Public Property BorderColor As String

    <Column("font_family")>
    Public Property FontFamily As String

    <Column("hero_title_size")>
    Public Property HeroTitleSize As String

    <Column("section_title_size")>
    Public Property SectionTitleSize As String

    <Column("body_text_size")>
    Public Property BodyTextSize As String

    <Column("paragraph_spacing")>
    Public Property ParagraphSpacing As String

    <Column("section_spacing")>
    Public Property SectionSpacing As String

    <Column("video_width")>
    Public Property VideoWidth As String

    <Column("video_height")>
    Public Property VideoHeight As String

    <Column("button_radius")>
    Public Property ButtonRadius As String

    <Column("card_radius")>
    Public Property CardRadius As String

    <Column("shadow_enabled")>
    Public Property ShadowEnabled As Boolean

    <Column("whatsapp_number")>
    Public Property WhatsappNumber As String

    <Column("whatsapp_message")>
    Public Property WhatsappMessage As String

    ' "left" or "right"
    <Column("whatsapp_position")>
    Public Property WhatsappPosition As String

    <Column("sticky_cta_enabled")>
    Public Property StickyCtaEnabled As Boolean

    <Column("faq_popup_enabled")>
    Public Property FaqPopupEnabled As Boolean

    <Column("created_at")>
    Public Property CreatedAt As DateTime

    <Column("updated_at")>
    Public Property UpdatedAt As DateTime
End Class

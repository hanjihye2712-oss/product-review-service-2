from django.contrib import admin
from .models import CrawlTarget, CrawlRawData, CrawlJobLog


@admin.register(CrawlTarget)
class CrawlTargetAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "site",
        "target_type",
        "keyword",
        "title",
        "is_active",
        "last_crawled_at",
        "created_at",
    )
    list_filter = ("site", "target_type", "is_active")
    search_fields = ("keyword", "title", "url")
    ordering = ("site", "target_type", "-created_at")


@admin.register(CrawlRawData)
class CrawlRawDataAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "target",
        "record_type",   # [4단계 추가] 어떤 종류 데이터인지 바로 확인
        "item_title",
        "item_url",
        "unique_key",    # [4단계 추가] 중복 방지 키 확인
        "crawled_at",
    )
    list_filter = ("target__site", "record_type", "crawled_at")
    search_fields = ("item_title", "item_url", "page_title", "unique_key")
    ordering = ("-crawled_at",)


@admin.register(CrawlJobLog)
class CrawlJobLogAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "site",
        "command_name",
        "status",
        "total_targets",
        "success_count",
        "fail_count",
        "started_at",
        "finished_at",
    )
    list_filter = ("site", "status")
    search_fields = ("site", "message")
    ordering = ("-started_at",)
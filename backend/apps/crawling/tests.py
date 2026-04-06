from django.test import TestCase

from apps.crawling.models import CrawlRawData, CrawlTarget
from apps.crawling.services.save_service import save_search_result


class SaveSearchResultTest(TestCase):
    def setUp(self):
        self.target = CrawlTarget.objects.create(
            site="danawa",
            target_type="search",
            keyword="수분크림",
            title="다나와 수분크림 검색",
            url="https://search.danawa.com/dsearch.php?query=%EC%88%98%EB%B6%84%ED%81%AC%EB%A6%BC",
        )

        self.result = {
            "site": "danawa",
            "page_info": {
                "title": "테스트 페이지",
                "a_count": 10,
                "contains_review_word": True,
                "contains_keyword": True,
                "text_preview": "미리보기 텍스트",
            },
            "candidate_links": [
                {
                    "title": "상품 A",
                    "url": "https://prod.danawa.com/info/?pcode=111",
                },
                {
                    "title": "상품 B",
                    "url": "https://prod.danawa.com/info/?pcode=222",
                },
            ],
            "html": "<html><title>테스트 페이지</title></html>",
        }

    def test_first_save_creates_rows(self):
        summary = save_search_result(self.target, self.result)

        self.assertEqual(summary["created_count"], 3)   # page_info 1 + candidate 2
        self.assertEqual(summary["updated_count"], 0)
        self.assertEqual(CrawlRawData.objects.count(), 3)

    def test_second_save_updates_not_duplicates(self):
        save_search_result(self.target, self.result)
        summary = save_search_result(self.target, self.result)

        self.assertEqual(summary["created_count"], 0)
        self.assertEqual(summary["updated_count"], 3)
        self.assertEqual(CrawlRawData.objects.count(), 3)

    def test_candidate_title_changes_should_update_existing_row(self):
        save_search_result(self.target, self.result)

        modified = {
            **self.result,
            "candidate_links": [
                {
                    "title": "상품 A 수정됨",
                    "url": "https://prod.danawa.com/info/?pcode=111",
                },
                {
                    "title": "상품 B",
                    "url": "https://prod.danawa.com/info/?pcode=222",
                },
            ],
        }

        save_search_result(self.target, modified)

        row = CrawlRawData.objects.get(
            unique_key="danawa:candidate_link:https://prod.danawa.com/info/?pcode=111"
        )
        self.assertEqual(row.item_title, "상품 A 수정됨")
        self.assertEqual(CrawlRawData.objects.count(), 3)
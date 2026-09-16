import Foundation
import Testing
@testable import CodeBurnMenubar

@Suite("Today project details")
struct TodayProjectsTests {
    @Test("retains pricing coverage, cache writes, and stable thread identity")
    func preservesThreadMetadata() throws {
        let source = Data(#"{"id":"/work/a","name":"A","cost":2,"sessions":1,"cacheWriteTokens":40,"unpricedModels":["unknown"],"sessionDetails":[{"sessionId":"thread-a","provider":"codex","title":"Fix the widget","cost":2,"calls":1,"inputTokens":100,"cacheReadTokens":300,"cacheWriteTokens":40,"outputTokens":20,"date":"2026-09-16","unpricedModels":["unknown"],"models":[]}]}"#.utf8)
        let project = try JSONDecoder().decode(ProjectEntry.self, from: source)
        let object = try #require(JSONSerialization.jsonObject(with: JSONEncoder().encode(project)) as? [String: Any])
        let thread = try #require((object["sessionDetails"] as? [[String: Any]])?.first)
        #expect(object["cacheWriteTokens"] as? Int == 40)
        #expect(object["unpricedModels"] as? [String] == ["unknown"])
        #expect(thread["cacheWriteTokens"] as? Int == 40)
        #expect(thread["sessionId"] as? String == "thread-a")
        #expect(thread["provider"] as? String == "codex")
        #expect(thread["unpricedModels"] as? [String] == ["unknown"])
    }

    @Test("headline keeps disjoint cache tokens and missing pricing metadata")
    func preservesHeadlineMetadata() throws {
        let source = Data(#"{"label":"Today","cost":2,"calls":1,"sessions":1,"inputTokens":100,"outputTokens":20,"cacheReadTokens":300,"cacheWriteTokens":40,"unpricedModels":[{"model":"unknown","calls":1,"tokens":30}]}"#.utf8)
        let current = try JSONDecoder().decode(CurrentBlock.self, from: source)
        let object = try #require(JSONSerialization.jsonObject(with: JSONEncoder().encode(current)) as? [String: Any])
        #expect(object["cacheReadTokens"] as? Int == 300)
        #expect(object["cacheWriteTokens"] as? Int == 40)
        #expect((object["unpricedModels"] as? [[String: Any]])?.first?["model"] as? String == "unknown")
    }
}

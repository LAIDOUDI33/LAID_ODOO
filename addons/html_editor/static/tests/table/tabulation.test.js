import { describe, test } from "@odoo/hoot";
import { press } from "@odoo/hoot-dom";
import { testEditor } from "../_helpers/editor";
import { unformat } from "../_helpers/format";

describe("move selection with tab/shift+tab", () => {
    describe("tab", () => {
        test("should move cursor to the next th", async () => {
            await testEditor({
                contentBefore: unformat(`
                    <div class="o_table_wrapper"><table>
                        <tbody>
                            <tr>
                                <th>[]ab</th>
                                <th>cd</th>
                                <th>ef</th>
                            </tr>
                        </tbody>
                    </table></div>
                `),
                stepFunction: async () => press("Tab"),
                contentAfter: unformat(`
                    <div class="o_table_wrapper"><table>
                        <tbody>
                            <tr>
                                <th>ab</th>
                                <th>cd[]</th>
                                <th>ef</th>
                            </tr>
                        </tbody>
                    </table></div>
                `),
            });
        });
        test("should move cursor to the next td", async () => {
            await testEditor({
                contentBefore: unformat(`
                    <div class="o_table_wrapper"><table>
                        <tbody>
                            <tr>
                                <th>[]ab</th>
                                <td>cd</td>
                                <td>ef</td>
                            </tr>
                        </tbody>
                    </table></div>
                `),
                stepFunction: async () => press("Tab"),
                contentAfter: unformat(`
                    <div class="o_table_wrapper"><table>
                        <tbody>
                            <tr>
                                <th>ab</th>
                                <td>cd[]</td>
                                <td>ef</td>
                            </tr>
                        </tbody>
                    </table></div>
                `),
            });
        });
        test("should move cursor to the end of next cell", async () => {
            await testEditor({
                contentBefore: unformat(`
                    <div class="o_table_wrapper"><table>
                        <tbody>
                            <tr>
                                <td>[]ab</td>
                                <td>cd</td>
                                <td>ef</td>
                            </tr>
                        </tbody>
                    </table></div>
                `),
                stepFunction: async () => press("Tab"),
                contentAfter: unformat(`
                    <div class="o_table_wrapper"><table>
                        <tbody>
                            <tr>
                                <td>ab</td>
                                <td>cd[]</td>
                                <td>ef</td>
                            </tr>
                        </tbody>
                    </table></div>
                `),
            });
        });
        test.tags("iframe", "desktop");
        test("in iframe, desktop: should move cursor to the end of next cell in an iframe", async () => {
            await testEditor({
                props: { iframe: true },
                contentBefore: unformat(`
                    <div class="o_table_wrapper"><table>
                        <tbody>
                            <tr>
                                <td>[]ab</td>
                                <td>cd</td>
                                <td>ef</td>
                            </tr>
                        </tbody>
                    </table></div>
                `),
                stepFunction: async () => press("Tab"),
                contentAfter: unformat(`
                    <div class="o_table_wrapper"><table>
                        <tbody>
                            <tr>
                                <td>ab</td>
                                <td>cd[]</td>
                                <td>ef</td>
                            </tr>
                        </tbody>
                    </table></div>
                `),
            });
        });
        test.tags("iframe", "mobile");
        test("in iframe, mobile: should move cursor to the end of next cell in an iframe", async () => {
            await testEditor({
                props: { iframe: true, mobile: true },
                contentBefore: unformat(`
                    <div class="o_table_wrapper"><table>
                        <tbody>
                            <tr>
                                <td>[]ab</td>
                                <td>cd</td>
                                <td>ef</td>
                            </tr>
                        </tbody>
                    </table></div>
                `),
                stepFunction: async () => press("Tab"),
                contentAfter: unformat(`
                    <div class="o_table_wrapper"><table>
                        <tbody>
                            <tr>
                                <td>ab</td>
                                <td>cd[]</td>
                                <td>ef</td>
                            </tr>
                        </tbody>
                    </table></div>
                `),
            });
        });
        test("should move cursor to the end of next cell in the row below", async () => {
            await testEditor({
                contentBefore: unformat(`
                    <div class="o_table_wrapper"><table>
                        <tbody>
                            <tr>
                                <td>ab</td>
                                <td>[cd]</td>
                            </tr>
                            <tr>
                                <td>ef</td>
                                <td>gh</td>
                            </tr>
                        </tbody>
                    </table></div>
                `),
                stepFunction: async () => press("Tab"),
                contentAfter: unformat(`
                    <div class="o_table_wrapper"><table>
                        <tbody>
                            <tr>
                                <td>ab</td>
                                <td>cd</td>
                            </tr>
                            <tr>
                                <td>ef[]</td>
                                <td>gh</td>
                            </tr>
                        </tbody>
                    </table></div>
                `),
            });
        });
        test("move cursor to end of next cell when selection is inside table", async () => {
            await testEditor({
                contentBefore: unformat(`
                    <ul>
                        <li>
                            <br>
                            <div class="o_table_wrapper"><table>
                                <tbody>
                                    <tr>
                                        <td><p>[]ab</p></td>
                                        <td><p>cd</p></td>
                                    </tr>
                                </tbody>
                            </table></div>
                            <br>
                        </li>
                    </ul>
                `),
                stepFunction: async () => press("Tab"),
                contentAfter: unformat(`
                    <ul>
                        <li>
                            <br>
                            <div class="o_table_wrapper"><table>
                                <tbody>
                                    <tr>
                                        <td><p>ab</p></td>
                                        <td><p>cd[]</p></td>
                                    </tr>
                                </tbody>
                            </table></div>
                            <br>
                        </li>
                    </ul>
                `),
            });
        });
    });
    describe("shift+tab", () => {
        test("should move cursor to the end of previous cell", async () => {
            await testEditor({
                contentBefore: unformat(`
                    <div class="o_table_wrapper"><table>
                        <tbody>
                            <tr>
                                <td>ab</td>
                                <td>[]cd</td>
                                <td>ef</td>
                            </tr>
                        </tbody>
                    </table></div>
                `),
                stepFunction: async () => press(["Shift", "Tab"]),
                contentAfter: unformat(`
                    <div class="o_table_wrapper"><table>
                        <tbody>
                            <tr>
                                <td>ab[]</td>
                                <td>cd</td>
                                <td>ef</td>
                            </tr>
                        </tbody>
                    </table></div>
                `),
            });
        });
        test("should move cursor to the end of previous cell in the row above", async () => {
            await testEditor({
                contentBefore: unformat(`
                    <div class="o_table_wrapper"><table>
                        <tbody>
                            <tr>
                                <td>ab</td>
                                <td>cd</td>
                            </tr>
                            <tr>
                                <td>[ef]</td>
                                <td>gh</td>
                            </tr>
                        </tbody>
                    </table></div>
                `),
                stepFunction: async () => press(["Shift", "Tab"]),
                contentAfter: unformat(`
                    <div class="o_table_wrapper"><table>
                        <tbody>
                            <tr>
                                <td>ab</td>
                                <td>cd[]</td>
                            </tr>
                            <tr>
                                <td>ef</td>
                                <td>gh</td>
                            </tr>
                        </tbody>
                    </table></div>
                `),
            });
        });
        test("should not cursor if there is no previous cell", async () => {
            await testEditor({
                contentBefore: unformat(`
                    <div class="o_table_wrapper"><table>
                        <tbody>
                            <tr>
                                <td>[ab]</td>
                                <td>cd</td>
                                <td>ef</td>
                            </tr>
                        </tbody>
                    </table></div>
                `),
                stepFunction: async () => press(["Shift", "Tab"]),
                contentAfter: unformat(`
                    <div class="o_table_wrapper"><table>
                        <tbody>
                            <tr>
                                <td>[ab]</td>
                                <td>cd</td>
                                <td>ef</td>
                            </tr>
                        </tbody>
                    </table></div>
                `),
            });
        });
        test("move cursor to end of previous cell when selection is inside table", async () => {
            await testEditor({
                contentBefore: unformat(`
                    <ul>
                        <li>
                            <br>
                            <div class="o_table_wrapper"><table>
                                <tbody>
                                    <tr>
                                        <td><p>ab</p></td>
                                        <td><p>[]cd</p></td>
                                    </tr>
                                </tbody>
                            </table></div>
                            <br>
                        </li>
                    </ul>
                `),
                stepFunction: async () => press(["Shift", "Tab"]),
                contentAfter: unformat(`
                    <ul>
                        <li>
                            <br>
                            <div class="o_table_wrapper"><table>
                                <tbody>
                                    <tr>
                                        <td><p>ab[]</p></td>
                                        <td><p>cd</p></td>
                                    </tr>
                                </tbody>
                            </table></div>
                            <br>
                        </li>
                    </ul>
                `),
            });
        });
    });
});

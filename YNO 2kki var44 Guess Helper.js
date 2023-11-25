// ==UserScript==
// @name         YNOproject Yume2kki 变量44 推测
// @namespace    https://github.com/Exsper/
// @version      1.1.1
// @description  本工具通过从window.HEAPU8中检索入睡次数（变量#43）来推测变量#44的地址
// @author       Exsper
// @homepage     https://github.com/Exsper/yno2kkivar44guess#readme
// @supportURL   https://github.com/Exsper/yno2kkivar44guess/issues
// @match        https://ynoproject.net/2kki/
// @require      https://cdn.staticfile.org/jquery/2.1.3/jquery.min.js
// @grant        none
// @run-at       document-end
// ==/UserScript==



/**
 * @param {Array<number>} sourceArray 
 * @param {Array<number>} aimArray 
 */
function findDataIndex(sourceArray, aimArray) {
    let index = 0;
    let MAX_Index = sourceArray.length - 1;
    let cmpIndex = 0;
    let MAX_CmpIndex = aimArray.length - 1;
    let finds = [];
    while (index <= MAX_Index) {
        if (sourceArray[index + cmpIndex] == aimArray[cmpIndex]) {
            cmpIndex += 1;
            if (cmpIndex > MAX_CmpIndex) {
                finds.push(index);
                cmpIndex = 0;
                index += 1;
            }
        }
        else {
            cmpIndex = 0;
            index += 1;
        }
    }
    return finds;
}

function Int2HEAPU8Array(num) {
    let s = num.toString(16);
    let ol = s.length;
    for (let i = 0; i < 8 - ol; i++) {
        s = "0" + s;
    }
    let s1 = parseInt("0x" + s.substring(6, 8));
    let s2 = parseInt("0x" + s.substring(4, 6));
    let s3 = parseInt("0x" + s.substring(2, 4));
    let s4 = parseInt("0x" + s.substring(0, 2));
    return [s1, s2, s3, s4];
}

function getSeasonString(seasonNumber) {
    switch (seasonNumber) {
        case 0:
            return '冬';
        case 1:
            return '春';
        case 2:
            return '夏';
        case 3:
            return '秋';
        default:
            return '错误';
    }
}

function getSeason(sleepTimes) {
    sleepTimes = sleepTimes % 554400;
    return Math.floor((sleepTimes + 4) / 3) % 4;
}

function filterMemory(sleepIndexList, sleepCount) {
    let qualifiedList = [];
    for (let i = 0; i < sleepIndexList.length; i++) {
        let sleepCountFirst = sleepIndexList[i]; // 入睡次数第一个字节，属于#43
        if (sleepCountFirst % 4 != 0) continue; // 4字节存储
        let num44Index = sleepCountFirst + 4;
        // #44只有0-255，后三个字节均为0
        if (window.HEAPU8[num44Index + 1] != 0 || window.HEAPU8[num44Index + 2] != 0 || window.HEAPU8[num44Index + 3] != 0) continue;
        // #94为季节，检查#94的值
        if (window.HEAPU8[num44Index + 200] != getSeason(sleepCount)) continue;
        // 以下为可能值
        if (window.HEAPU8[num44Index] != 0) // #44很可能不为0，将不为0的位置前置
            qualifiedList.unshift(num44Index);
        else
            qualifiedList.push(num44Index);
    }
    return qualifiedList;
}

class Script {
    constructor() {
        this.memoryIndexs = [];
        this.correctNum44Index = -1;
    }

    init() {
        let $openButton = $('<button>', { text: "+", id: "rs-open", style: "float:left;top:30%;position:absolute;left:0%;" }).appendTo($("body"));
        $openButton.click(() => {
            $("#rs-div").show();
            $("#rs-open").hide();
        });
        let $mainDiv = $("<div>", { id: "rs-div", class: "modal", style: "top:30%;left:0%;width:180px;position:absolute;text-align:center;z-index:999;max-height:250px;overflow-y:auto;" });
        $mainDiv.hide();
        let $statLabel = $("<span>", { id: "rs-stat", text: "请输入睡眠次数，即存档后显示的Day数。如果已经在梦境中需要+1" }).appendTo($mainDiv);
        let $numBox = $("<input>", { type: "text", id: "rs-sleepcount", val: "100", style: "width:30px;align-self:center;" }).appendTo($mainDiv);
        let $checkButton = $('<button>', { type: "button", text: "确定", id: "rs-checkbtn", style: "width:fit-content;align-self:center;" }).appendTo($mainDiv);
        $checkButton.click(() => {
            $checkButton.attr("disabled", true);
            $checkButton.text("正在获取");
            let sleepCount = parseInt($numBox.val());
            if (sleepCount <= 0) {
                $checkButton.attr("disabled", false);
                $statLabel.text("请输入正整数");
                $checkButton.text("确定");
            }
            let result = filterMemory(findDataIndex(window.HEAPU8, Int2HEAPU8Array(sleepCount)), sleepCount);
            if (result.length <= 0) {
                $checkButton.attr("disabled", false);
                $statLabel.text("找不到符合条件的地址，请重试");
                $checkButton.text("确定");
            }
            else {
                this.memoryIndexs = result;
                this.isZero = this.memoryIndexs.map(mi => window.HEAPU8[mi] == 0);
                if (this.memoryIndexs.length > 1) {
                    $statLabel.text("找到多个符合条件的地址，请选择正确的#44变量。建议到伪部屋睡几次床，每次都会更新的就是#44变量");
                    this.updateSelectTable();
                }
                else {
                    this.correctNum44Index = this.memoryIndexs[0];
                    this.updateDataTable();
                }
                $numBox.hide();
                $checkButton.hide();
            }
        });
        let $closeButton = $('<button>', { text: "-", id: "rs-close", style: "align-self: end;" }).prependTo($mainDiv);
        $closeButton.click(() => {
            $("#rs-div").hide();
            $("#rs-open").show();
        });
        let $mainTable = $("<table>", { id: "rs-table", style: "table-layout:fixed;" }).appendTo($mainDiv);
        $mainDiv.appendTo($("body"));
    }

    updateSelectTable() {
        if (this.memoryIndexs.length <= 0) return;
        let $mainTable = $("#rs-table");
        $mainTable.empty();
        let $thead = $("<thead>").appendTo($mainTable);
        let $tr = $("<tr>").appendTo($thead);
        let $td = $("<td>", { style: "width:40%" }).appendTo($tr);
        $("<span>", { text: "地址" }).appendTo($td);
        $td = $("<td>", { style: "width:30%" }).appendTo($tr);
        $("<span>", { text: "数值" }).appendTo($td);
        $td = $("<td>", { style: "width:30%" }).appendTo($tr);
        $("<span>", { text: "" }).appendTo($td);
        let $tbody = $("<tbody>").appendTo($mainTable);
        this.memoryIndexs.map((mi, index) => {
            let $tr = $("<tr>", { style: "width:100%;" });
            let $td = $("<td>").appendTo($tr);
            $("<span>", { text: "0x" + mi.toString(16) }).appendTo($td);
            $td = $("<td>").appendTo($tr);
            $("<span>", { text: window.HEAPU8[mi] }).appendTo($td);
            $td = $("<td>").appendTo($tr);
            let $selbtn = $("<a>", { text: "选择", "data-index": mi, style: "cursor: pointer;" }).appendTo($td);
            $selbtn.click(() => {
                this.correctNum44Index = parseInt($selbtn.attr("data-index"));
                this.updateDataTable();
            });
            $tr.appendTo($tbody);
        });
        setTimeout(() => {
            if (this.correctNum44Index <= 0) this.updateSelectTable();
        }, 1000);
    }

    updateDataTable() {
        if (this.correctNum44Index <= 0) return;
        $("#rs-stat").text("当前状态");
        let $mainTable = $("#rs-table");
        $mainTable.empty();
        [
            { title: "变量#44", index: this.correctNum44Index, callFuc: null },
            { title: "季节", index: this.correctNum44Index + 200, callFuc: getSeasonString },
        ].map((varLineData) => {
            let $ltr = $("<tr>", { style: "width:100%;" });
            let $ltd = $("<td>", { style: "width:50%" }).appendTo($ltr);
            $("<span>", { text: varLineData.title }).appendTo($ltd);
            $ltd = $("<td>").appendTo($ltr);
            let data = window.HEAPU8[varLineData.index];
            if (varLineData.callFuc) data = varLineData.callFuc(data);
            $("<span>", { text: data }).appendTo($ltd);
            $ltr.appendTo($mainTable);
        });

        setTimeout(() => { this.updateDataTable(); }, 2000);
    }
}

$(document).ready(() => {
    let script = new Script();
    script.init();
});
// ==UserScript==
// @name         YNOproject Yume2kki 变量44 推测
// @namespace    https://github.com/Exsper/
// @version      1.2.3
// @description  本工具通过从HEAPU32中检索入睡次数（变量#43）来推测变量#44的地址
// @author       Exsper
// @homepage     https://github.com/Exsper/yno2kkivar44guess#readme
// @supportURL   https://github.com/Exsper/yno2kkivar44guess/issues
// @match        https://ynoproject.net/2kki/
// @require      https://cdn.staticfile.org/jquery/2.1.3/jquery.min.js
// @license      MIT License
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-end
// ==/UserScript==



/**
 * @param {Array<number>} sourceArray 
 * @param {Array<number>|number} aimArray 
 */
function findDataIndex(sourceArray, aimArray) {
    if (typeof aimArray == "number") aimArray = [aimArray];
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

function getSeasonString(sleepCount, seasonNumber) {
    if (seasonNumber !== getSeason(sleepCount)) return "错误";
    let dayIndex = (sleepCount + 1) % 3 + 1;
    switch (seasonNumber) {
        case 0:
            return '冬' + " 第" + dayIndex + "天";
        case 1:
            return '春' + " 第" + dayIndex + "天";
        case 2:
            return '夏' + " 第" + dayIndex + "天";
        case 3:
            return '秋' + " 第" + dayIndex + "天";
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
        let num44Index = sleepIndexList[i] + 1;
        // #44范围为0-255
        if (easyrpgPlayer["HEAPU32"][num44Index] > 255) continue;
        // #94为季节，检查#94的值
        if (easyrpgPlayer["HEAPU32"][num44Index + 50] != getSeason(sleepCount)) continue;
        // 以下为可能值
        if (easyrpgPlayer["HEAPU32"][num44Index] != 0)
            // #44很可能不为0，将不为0的位置前置
            qualifiedList.unshift(num44Index);
        else
            qualifiedList.push(num44Index);
    }
    return qualifiedList;
}

class CustomVariable {
    constructor(index, name) {
        this.index = index;
        this.name = name;
    }

    toTableData() {
        return { title: this.name, index: this.index, callFuc: null };
    }
}

class Script {
    constructor() {
        this.sleepCount = -1;
        this.memoryIndexs = [];
        this.correctNum44Index = -1;
        this.customVars = [];
    }

    loadStorage() {
        let customVarsData = GM_getValue("customVarsData", []);
        this.customVars.push(...(customVarsData.map((data) => new CustomVariable(data[0], data[1]))));
        this.sleepCount = GM_getValue("sleepCount", -1);
    }

    saveStorage() {
        let customVarsData = this.customVars.map((customVar) => [customVar.index, customVar.name]);
        GM_setValue("customVarsData", customVarsData);
        GM_setValue("sleepCount", this.sleepCount);
    }

    init() {
        this.loadStorage();
        let $openButton = $('<button>', { text: "+", id: "rs-open", style: "float:left;top:30%;position:absolute;left:0%;", title: "显示窗口" }).appendTo($("body"));
        $openButton.click(() => {
            $("#rs-div").show();
            $("#rs-open").hide();
        });
        let $mainDiv = $("<div>", { id: "rs-div", class: "modal", style: "top:30%;left:0%;width:180px;position:absolute;text-align:center;z-index:999;max-height:250px;overflow-y:auto;" });
        $mainDiv.hide();
        let $statLabel = $("<span>", { id: "rs-stat", text: "请输入睡眠次数，即存档后显示的Day数。如果已经在梦境中需要+1" }).appendTo($mainDiv);
        let $numBox = $("<input>", { type: "text", id: "rs-sleepcount", val: "100", style: "width:30px;align-self:center;" }).appendTo($mainDiv);
        if (this.sleepCount > 0) $numBox.val(this.sleepCount);
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
            let result = filterMemory(findDataIndex(easyrpgPlayer["HEAPU32"], sleepCount), sleepCount);
            if (result.length <= 0) {
                $checkButton.attr("disabled", false);
                $statLabel.text("找不到符合条件的地址，请重试");
                $checkButton.text("确定");
            }
            else {
                this.sleepCount = sleepCount;
                this.saveStorage();
                this.memoryIndexs = result;
                this.isZero = this.memoryIndexs.map(mi => easyrpgPlayer["HEAPU32"][mi] == 0);
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
        let $titleTable = $("<table>", { id: "rs-title", style: "table-layout:fixed;" }).prependTo($mainDiv);
        let $thead = $("<thead>").appendTo($titleTable);
        let $tr = $("<tr>").appendTo($thead);
        let $td = $("<td>").appendTo($tr);
        let $initSessionWsButton = $('<button>', { text: "⟳", id: "rs-reconnect", style: "float: left;", title: "尝试重连" }).appendTo($td);
        $initSessionWsButton.click(() => {
            initSessionWs();
        });
        let $addVarButton = $('<button>', { text: "+", id: "rs-addvar", style: "float: left;", title: "添加自定义变量" }).appendTo($td);
        $addVarButton.hide();
        $addVarButton.click(() => {
            let index;
            let name;
            while (!index || typeof index !== "number" || index < 0) {
                index = prompt("请输入变量ID，例如：3513");
                if (index === null) return;
                index = parseInt(index);
            }
            while (!name || name.trim() === "") {
                name = prompt("请给变量起个名字，例如：踏破率");
                if (name === null) return;
            }
            this.customVars.push(new CustomVariable(index, name));
            alert("添加成功！如需删除请点击变量名。");
            this.saveStorage();
        });
        $td = $("<td>").appendTo($tr);
        let $closeButton = $('<button>', { text: "-", id: "rs-close", style: "float: right;", title: "隐藏窗口" }).appendTo($td);
        $closeButton.click(() => {
            $("#rs-div").hide();
            $("#rs-open").show();
        });
        let $mainTable = $("<table>", { id: "rs-table", style: "table-layout:fixed;" }).appendTo($mainDiv);
        $mainDiv.appendTo($("body"));
    }

    updateSelectTable() {
        if (this.memoryIndexs.length <= 0) return;
        this.memoryIndexs = this.memoryIndexs.filter((mi) => easyrpgPlayer["HEAPU32"][mi] <= 255);
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
            $("<span>", { text: easyrpgPlayer["HEAPU32"][mi] }).appendTo($td);
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

    getVariableIndex(variableNum) {
        if (this.correctNum44Index <= 0) return -1;
        let base = this.correctNum44Index - 44;
        return base + variableNum;
    }

    updateDataTable() {
        if (this.correctNum44Index <= 0) return;
        $("#rs-stat").text("当前状态");
        $("#rs-addvar").show();
        let $mainTable = $("#rs-table");
        $mainTable.empty();
        // 默认项
        let dataTableData =
            [
                { title: "入梦次数", index: 43, callFuc: null },
                { title: "变量#44", index: 44, callFuc: null },
                { title: "季节", index: [43, 94], callFuc: getSeasonString },
            ];
        // 自定义项
        this.customVars.map((customData) => {
            dataTableData.push(customData.toTableData());
        });
        // 地图项
        let mapID = easyrpgPlayer["HEAPU32"][this.getVariableIndex(26)];
        dataTableData.push(...(MapVariable.getMapVariableData(mapID)));

        dataTableData.map((varLineData, index) => {
            let $ltr = $("<tr>", { style: "width:100%;" });
            let $ltd = $("<td>", { style: "width:50%" }).appendTo($ltr);
            $("<span>", { text: varLineData.title }).appendTo($ltd);
            if (index > 2) { // 自定义项
                $ltd.click(() => {
                    this.customVars = this.customVars.filter((customVarData) => customVarData.index !== varLineData.index);
                    this.saveStorage();
                    $ltd.parent().remove();
                });
            }
            $ltd = $("<td>").appendTo($ltr);
            let data;
            if (varLineData.index instanceof Array === true) {
                data = [];
                for (let i = 0; i < varLineData.index.length; i++) data.push(easyrpgPlayer["HEAPU32"][this.getVariableIndex(varLineData.index[i])]);
                if (varLineData.callFuc) data = varLineData.callFuc(...data);
                $("<span>", { text: data, title: "使用变量：" + varLineData.index.join(",") }).appendTo($ltd);
            }
            else {
                data = easyrpgPlayer["HEAPU32"][this.getVariableIndex(varLineData.index)];
                if (varLineData.callFuc) data = varLineData.callFuc(data);
                $("<span>", { text: data, title: "使用变量：" + varLineData.index }).appendTo($ltd);
            }
            $ltr.appendTo($mainTable);
        });

        setTimeout(() => { this.updateDataTable(); }, 1000);
    }
}

class MapVariable {
    static getMapVariableData(mapID) {
        switch (mapID) {
            // Black Building
            case 68: return [
                { title: "楼层数", index: 610, callFuc: this.callFuc_68_610 },
            ];
            // Infinite Library
            case 914: return [
                { title: "当前深度", index: 1, callFuc: this.callFuc_914_1 },
                { title: "预计深度", index: 2, callFuc: this.callFuc_914_2 },
            ];
            // Static Noise Hell
            // 变量8后续用于别处，此功能无效
            /*
            case 945: return [
                { title: "传送点位置", index: 8, callFuc: this.callFuc_945_8 },
            ];
            */
            // Smiley Face DECK
            case 1265: return [
                { title: "传送点位置", index: 2, callFuc: this.callFuc_1265_2 },
            ];
            // Bright Forest
            // 考虑到只用通过一次，可能会影响初次游戏体验，暂不启用该功能
            /*
            case 1348: return [
                { title: "传送点位置", index: [2,3,4,5], callFuc: this.callFuc_1348_2_3_4_5 },
            ];
            */
            default: return [];
        }
    }

    // 以下函数命名规则：callFuc_[地图ID]_[变量ID]

    static callFuc_68_610(val) {
        return val + "/45";
    }

    static callFuc_914_1(val) {
        return val + "/4";
    }

    static callFuc_914_2(val) {
        if (val > 4) val = 0;
        return "=>" + val;
    }

    /*
    static callFuc_945_8(val) {
        switch(val) {
            case 0: return "正上方偏左";
            case 1: return "左下角靠下";
            case 2: return "左下角靠左";
            case 3: return "最右上角";
            default: return "中间偏右上";
        }
    }
    */

    static callFuc_1265_2(val) {
        switch(val) {
            case 1: return "右边居中";
            case 2: return "右下";
            case 3: return "左下";
            case 4: return "右上";
            default: return "错误";
        }
    }

    /*
    static callFuc_1348_2_3_4_5(val2, val3, val4, val5) {
        if (val2 != 0) return "右上";
        else if (val3 != 0) return "右下";
        else if (val4 != 0) return "中间";
        else if (val5 != 0) return "左下";
    }
    */
}

$(document).ready(() => {
    let script = new Script();
    script.init();
});
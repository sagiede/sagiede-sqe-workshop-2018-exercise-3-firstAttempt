import $ from 'jquery';
import {createFlowChart} from './code-analyzer';

$(document).ready(function () {
    $('#codeSubmissionButton').click(() => {
        let codeToParse = $('#codePlaceholder').val();
        let userParams = $('#varsPlaceholder').val();
        let flowChart = createFlowChart(codeToParse,userParams);
        $('#output').html(flowChart);
    });
});


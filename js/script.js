// script.js - Updated with try/catch + loading overlay handling

var ISTMinors = [];
var ISTFaculty = [];

// ====================== HELPERS ======================
function isNull(x) {
    return x == null ? "" : x;
}

function showError(selector, message = 'Content temporarily unavailable') {
    const $el = $(selector);
    if ($el.length) {
        $el.html(`<div class="alert alert-warning text-center my-3">${message}</div>`);
    }
    console.warn(`[ERROR] ${selector}: ${message}`);
}

// Fetch wrapper with logging
function fetchData(path) {
    console.log(`[FETCH START] ${path}`);
    return $.ajax({
        url: 'proxy.php',
        data: { path },
        dataType: 'json',
        cache: false
    }).then(data => {
        console.log(`[FETCH SUCCESS] ${path} - keys: ${Object.keys(data).join(', ')}`);
        return data;
    }).catch(err => {
        console.error(`[FETCH FAILED] ${path}`, err);
        showError('#degree, #employment, #people, #resource', `Failed to load ${path}`);
        return null;
    });
}

// Populate degree accordion
function populateDegree(titleSel, descSel, listSel, data) {
    if (!data || data.error || !data.title) {
        showError(descSel, 'Degree information not available');
        return;
    }
    $(titleSel).text(data.title);
    $(descSel).text(data.description || '');
    const $list = $(listSel).empty();
    (data.concentrations || []).forEach(c => {
        $list.append(`<li class="list-group-item">${c}</li>`);
    });
    console.log(`[RENDER] Populated ${titleSel}`);
}

// ====================== MAIN ======================
$(document).ready(async function () {
    console.log('[APP] Page ready - starting fetches');

    try {
        const [
            aboutJson,
            wmcJson, hccJson, citJson,
            istJson, hciJson, nsaJson,
            gradCertsJson,
            employmentJson,
            peopleJson,
            researchJson,
            resourcesJson,
            footerJson
        ] = await Promise.all([
            fetchData('/about/'),
            fetchData('/degrees/undergraduate/degreeName=wmc'),
            fetchData('/degrees/undergraduate/degreeName=hcc'),
            fetchData('/degrees/undergraduate/degreeName=cit'),
            fetchData('/degrees/graduate/degreeName=ist'),
            fetchData('/degrees/graduate/degreeName=hci'),
            fetchData('/degrees/graduate/degreeName=nsa'),
            fetchData('/degrees/graduate/degreeName=graduate%20advanced%20certificates'),
            fetchData('/employment/'),
            fetchData('/people/'),
            fetchData('/research/'),
            fetchData('/resources/'),
            fetchData('/footer/')
        ]);

        console.log('[APP] All fetches finished');

        // ================== ABOUT ==================
        if (aboutJson && !aboutJson.error) {
            const html = `
                <h2 class="text-uppercase"><strong>${aboutJson.title}</strong></h2>
                <p class="text-faded mb-5 pt-2">${aboutJson.description}</p>
                <blockquote class="blockquote">
                    <p class="mb-0">${aboutJson.quote}</p>
                    <footer class="blockquote-footer text-warning pt-2">${aboutJson.quoteAuthor}</footer>
                </blockquote>
            `;
            $("#about").html(html);
        }

        // ================== UNDERGRADUATE DEGREES ==================
        populateDegree('#wmctitle', '#wmcdescription', '#wmclist', wmcJson);
        populateDegree('#hcctitle', '#hccdescription', '#hcclist', hccJson);
        populateDegree('#cittitle', '#citdescription', '#citlist', citJson);

        // ================== GRADUATE DEGREES ==================
        populateDegree('#isttitle', '#istdescription', '#istlist', istJson);
        populateDegree('#hcititle', '#hcidescription', '#hcilist', hciJson);
        populateDegree('#nsatitle', '#nsadescription', '#nsalist', nsaJson);

        // ================== ADVANCED CERTIFICATES ==================
        if (gradCertsJson && !gradCertsJson.error && gradCertsJson.availableCertificates?.length >= 2) {
            $("#web").text(gradCertsJson.availableCertificates[0]);
            $("#networking").text(gradCertsJson.availableCertificates[1]);
        }

        // ================== EMPLOYMENT ==================
        if (employmentJson && !employmentJson.error) {
            const intro = employmentJson.introduction || {};
            $("#introtitle").text(intro.title || '');
            $("#employtitle").text(intro.content?.[0]?.title || '');
            $("#employdescript").text(intro.content?.[0]?.description || '');
            $("#cooptitle").text(intro.content?.[1]?.title || '');
            $("#coopdescript").text(intro.content?.[1]?.description || '');

            const stats = employmentJson.degreeStatistics?.statistics || [];
            stats.forEach((stat, i) => {
                const prefix = ['salary', 'rank', 'percent', 'traffic'][i];
                if (prefix) {
                    $(`#${prefix}title`).text(stat.value || '');
                    $(`#${prefix}descript`).text(stat.description || '');
                }
            });

            $("#employerlist").html(
                (employmentJson.employers?.employerNames || []).map(n => `<li class="list-group-item">${n}</li>`).join('')
            );
            $("#careerlist").html(
                (employmentJson.careers?.careerNames || []).map(n => `<li class="list-group-item">${n}</li>`).join('')
            );

            $("#coopTable").html(
                (employmentJson.coopTable?.coopInformation || []).map(row => `
                    <tr><td>${row.employer || ''}</td><td>${row.degree || ''}</td><td>${row.city || ''}</td><td>${row.term || ''}</td></tr>
                `).join('')
            );

            $("#employertable").html(
                (employmentJson.employmentTable?.professionalEmploymentInformation || []).map(row => `
                    <tr>
                        <th scope="row">${row.employer || ''}</th>
                        <td>${row.degree || ''}</td>
                        <td>${row.city || ''}</td>
                        <td>${row.title || ''}</td>
                        <td>${row.startDate || ''}</td>
                    </tr>
                `).join('')
            );
        } else {
            showError('#employment', 'Employment data not available');
        }

        // ================== PEOPLE ==================
        if (peopleJson && !peopleJson.error) {
            $("#people-title").text(peopleJson.title || '');
            $("#people-subtitle").text(peopleJson.subTitle || '');

            // Faculty
            if (peopleJson.faculty?.length) {
                peopleJson.faculty.forEach(f => {
                    const id = f.username;
                    const name = isNull(f.name);
                    $(".faculty .row").append(`
                        <div class="col-sm-3 text-center">
                            <a href="#" data-toggle="modal" data-target="#${id}">
                                <img src="${f.imagePath || ''}" width="140" height="140" class="rounded-circle">
                            </a>
                            <h3>${name}</h3>
                        </div>
                    `);
                    $("#facultyDialog").append(`
                        <div class="modal fade" id="${id}" tabindex="-1" role="dialog" aria-labelledby="${id}ModalLabel" aria-hidden="true">
                            <div class="modal-dialog">
                                <div class="modal-content">
                                    <div class="modal-header">
                                        <h4 class="modal-title" id="${id}ModalLabel">More About ${name}</h4>
                                        <button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button>
                                    </div>
                                    <div class="modal-body text-center">
                                        <img src="${f.imagePath || ''}" width="140" height="140" class="rounded-circle">
                                        <h3>${name}</h3>
                                        <p class="text-primary">${isNull(f.tagline)}</p>
                                        <p class="text-primary">${isNull(f.title)}</p>
                                        <p class="text-primary">${isNull(f.office)}</p>
                                        <p class="text-primary">${isNull(f.website)}</p>
                                        <p class="text-primary">${isNull(f.phone)}</p>
                                    </div>
                                    <div class="modal-footer">
                                        <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `);
                    ISTFaculty.push({ username: id, imagePath: f.imagePath });
                });
            }

            // Staff
            if (peopleJson.staff?.length) {
                peopleJson.staff.forEach(s => {
                    const id = s.username;
                    const name = isNull(s.name);
                    $(".staff .row").append(`
                        <div class="col-sm-3 text-center">
                            <a href="#" data-toggle="modal" data-target="#${id}">
                                <img src="${s.imagePath || ''}" width="140" height="140" class="rounded-circle">
                            </a>
                            <h3>${name}</h3>
                        </div>
                    `);
                    $("#staffDialog").append(`
                        <div class="modal fade" id="${id}" tabindex="-1" role="dialog" aria-labelledby="${id}ModalLabel" aria-hidden="true">
                            <div class="modal-dialog">
                                <div class="modal-content">
                                    <div class="modal-header">
                                        <h4 class="modal-title" id="${id}ModalLabel">More About ${name}</h4>
                                        <button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button>
                                    </div>
                                    <div class="modal-body text-center">
                                        <img src="${s.imagePath || ''}" width="140" height="140" class="rounded-circle">
                                        <h3>${name}</h3>
                                        <p class="text-primary">${isNull(s.tagline)}</p>
                                        <p class="text-primary">${isNull(s.title)}</p>
                                        <p class="text-primary">${isNull(s.office)}</p>
                                        <p class="text-primary">${isNull(s.website)}</p>
                                        <p class="text-primary">${isNull(s.phone)}</p>
                                    </div>
                                    <div class="modal-footer">
                                        <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `);
                });
            }
        } else {
            showError('#people', 'People data not available');
        }

        // ================== RESEARCH ==================
        if (researchJson && !researchJson.error && researchJson.byFaculty?.length) {
            researchJson.byFaculty.forEach(fac => {
                let imgSrc = 'img/placeholder.jpg';
                const match = ISTFaculty.find(f => f.username === fac.username);
                if (match) imgSrc = match.imagePath;
                $(".faculty-research .row").append(`
                    <div class="col-sm-3 text-center">
                        <a href="#" data-toggle="modal" data-target="#${fac.username}-research">
                            <img src="${imgSrc}" width="140" height="140" class="rounded-circle">
                        </a>
                        <h3>${fac.facultyName || fac.username}</h3>
                    </div>
                `);
                $("#researchDialog").append(`
                    <div id="${fac.username}-research" class="modal fade text-dark" tabindex="-1" role="dialog">
                        <div class="modal-dialog modal-lg">
                            <div class="modal-content">
                                <div class="modal-header">
                                    <h5 class="modal-title">Research by ${fac.facultyName || fac.username}</h5>
                                    <button type="button" class="close" data-dismiss="modal">×</button>
                                </div>
                                <div class="modal-body">
                                    <table class="table">
                                        <thead class="bg-primary"><tr><th class="text-center">Citations</th></tr></thead>
                                        <tbody>
                                            ${(fac.citations || []).map(c => `<tr><td>${c}</td></tr>`).join('') || '<tr><td>No citations</td></tr>'}
                                        </tbody>
                                    </table>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-primary" data-dismiss="modal">Close</button>
                                </div>
                            </div>
                        </div>
                    </div>
                `);
            });
        }

        // ================== RESOURCES ==================
        if (resourcesJson && !resourcesJson.error) {
            $("#resourcetitle").text(resourcesJson.title || '');
            $('#resourcesubtitle').text(resourcesJson.subTitle || '');
            if (resourcesJson.coopEnrollment) {
                $("#enrollinfo").text(resourcesJson.coopEnrollment.title || '');
                let coopHTML = '';
                (resourcesJson.coopEnrollment.enrollmentInformationContent || []).forEach(item => {
                    coopHTML += `<h3>${item.title || ''}</h3><p>${item.description || ''}</p>`;
                });
                $("#enrollinfo").after(coopHTML);
            }
            if (resourcesJson.studentAmbassadors) {
                $("#studentAmbassadorsTitle").text(resourcesJson.studentAmbassadors.title || '');
                $(".studentAmbassdorsImage").attr("src", resourcesJson.studentAmbassadors.ambassadorsImageSource || '');
                let ambHTML = '';
                (resourcesJson.studentAmbassadors.subSectionContent || []).forEach(item => {
                    ambHTML += `<h3>${item.title || ''}</h3><p>${item.description || ''}</p>`;
                });
                $(".studentAmbassdorsImage").after(ambHTML);
            }
            if (resourcesJson.studentServices) {
                $("#studentServicesTitle").text(resourcesJson.studentServices.title || '');
                let servicesHTML = '';
                if (resourcesJson.studentServices.academicAdvisors) {
                    servicesHTML += `
                        <h3>${resourcesJson.studentServices.academicAdvisors.title || ''}</h3>
                        <p>${resourcesJson.studentServices.academicAdvisors.description || ''}</p>
                        <button type="button" class="btn btn-outline-primary mb-3">
                            <a href="${resourcesJson.studentServices.academicAdvisors.faq?.contentHref || '#'}">
                                ${resourcesJson.studentServices.academicAdvisors.faq?.title || 'FAQ'}
                            </a>
                        </button>
                    `;
                }
                $("#studentServicesTitle").after(servicesHTML);
                (resourcesJson.studentServices.istMinorAdvising?.minorAdvisorInformation || []).forEach(item => {
                    $("#minorAdvisorInformation tbody").append(`
                        <tr>
                            <td>${item.title || ''}</td>
                            <td>${item.advisor || ''}</td>
                            <td>${item.email || ''}</td>
                        </tr>
                    `);
                });
                (resourcesJson.studentServices.professonalAdvisors?.advisorInformation || []).forEach(item => {
                    $("#professionalAdvisorInformation tbody").append(`
                        <tr>
                            <td>${item.name || ''}</td>
                            <td>${item.department || ''}</td>
                            <td>${item.email || ''}</td>
                        </tr>
                    `);
                });
            }
            if (resourcesJson.studyAbroad) {
                $("#studyAbroadTitle").text(resourcesJson.studyAbroad.title || '');
                $("#studyAbroadTitle").after(`<p>${resourcesJson.studyAbroad.description || ''}</p>`);
                (resourcesJson.studyAbroad.places || []).forEach(place => {
                    $('.studyAbroadPlace').append(`
                        <div class="col-sm-6">
                            <div class="text-white bg-primary mb-3 mr-3 h-100" style="max-width: 18rem;">
                                <div class="card-body">
                                    <h5 class="card-title">${place.nameOfPlace || ''}</h5>
                                    <p class="card-text">${place.description || ''}</p>
                                </div>
                            </div>
                        </div>
                    `);
                });
            }
            if (resourcesJson.tutorsAndLabInformation) {
                $('#TutorsAndLabTitle').text(resourcesJson.tutorsAndLabInformation.title || '');
                let labHTML = `<p>${resourcesJson.tutorsAndLabInformation.description || ''}</p>`;
                if (resourcesJson.tutorsAndLabInformation.tutoringLabHoursLink) {
                    labHTML += `
                        <button type="button" class="btn btn-outline-primary mb-3">
                            <a href="${resourcesJson.tutorsAndLabInformation.tutoringLabHoursLink}">
                                ${resourcesJson.tutorsAndLabInformation.title || 'Lab Hours'}
                            </a>
                        </button>
                    `;
                }
                $('#TutorsAndLabTitle').after(labHTML);
            }
        }

        // ================== FOOTER ==================
        if (footerJson && !footerJson.error) {
            $(".rounded-social-buttons").html(footerJson.copyright?.html || '');
        }

        console.log('[APP] Rendering complete');

        // Hide loading overlay on success
        $('#loading-overlay').fadeOut(600, function() {
            $(this).remove();
        });

    } catch (err) {
        console.error('[APP] Critical error:', err);

        // Update loading overlay to show error
        $('#loading-overlay').html(`
            <div class="text-center">
                <div class="spinner-border text-danger" style="width: 5rem; height: 5rem;" role="status">
                    <span class="visually-hidden">Error</span>
                </div>
                <h3 class="fw-bold mt-4 text-danger">Failed to load content</h3>
                <p class="text-white">Please refresh the page or check your connection.</p>
            </div>
        `);

        // Hide after a delay even on error
        setTimeout(() => {
            $('#loading-overlay').fadeOut(600);
        }, 5000);
    }

    // Morphext & toggles
    $("#js-rotating").Morphext({
        animation: "flipInX",
        separator: ",",
        speed: 2000
    });

    $(".faculty-button").click(function () {
        $(".staff").hide();
        $(".faculty").fadeIn(100);
        $(this).addClass("active");
        $(".staff-button").removeClass("active");
    });

    $(".staff-button").click(function () {
        $(".faculty").hide();
        $(".staff").fadeIn(100);
        $(this).addClass("active");
        $(".faculty-button").removeClass("active");
    });
});